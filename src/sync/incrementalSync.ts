import { Collection, MongoClient } from 'mongodb';
import Queue from 'queue';
import { debounce } from 'lodash';
import { once } from 'node:events';
import { ICustomerMeta, ICustomer } from '../types';
import { batchRunner } from '../utils/batchRunner';
import { sleep } from '../utils/sleep';
import { anonymizeCustomer } from '../utils/anonymizeCustomer';
import { getLogger } from '../utils/logger';

const logger = getLogger('incrementalSync');

async function updateCustomer(
  meta: ICustomerMeta,
  customersAnonCollection: Collection<ICustomer>,
  customersMetaCollection: Collection<ICustomerMeta>,
) {
  const metaUpdateResult = await customersMetaCollection.findOneAndUpdate(
    {
      isSynced: false,
      customerId: meta.customerId,
      version: meta.version,
    },
    {
      $set: {
        isSynced: true,
        updatedAt: new Date(),
      },
    },
  );

  const isUpdated = !!metaUpdateResult.value;
  if (!isUpdated) {
    return;
  }

  try {
    await customersAnonCollection.updateOne(
      {
        _id: meta.customerId,
      },
      {
        $set: anonymizeCustomer(meta.customerObject),
      },
      {
        upsert: true,
      },
    );
  } catch (err) {
    logger.error('failed to update customer', meta.customerId, err);
    await customersMetaCollection.updateOne(
      {
        _id: meta._id,
        isSynced: true,
      },
      {
        $set: {
          isSynced: false,
          updatedAt: new Date(),
        },
      },
    );
  }
}

function getUpdatingQueue() {
  const q = new Queue({
    autostart: true,
    concurrency: 4,
  });
  const queueStat = {
    sync: 0,
    errors: 0,
  };

  const writeStat = debounce(
    () => {
      logger.info('synced', queueStat, 'customers');
    },
    1000,
    { maxWait: 5000 },
  );

  q.on('success', () => {
    queueStat.sync++;
    writeStat();
  });
  q.on('error', () => {
    queueStat.errors++;
    writeStat();
  });

  return q;
}

export async function incremenalSync(mongoUrl: string) {
  const updatingQueue = getUpdatingQueue();

  const client = new MongoClient(mongoUrl, {
    readPreference: 'primary',
  });
  await client.connect();
  const db = client.db();

  const customersAnonCollection = db.collection<ICustomer>(
    'customers_anonymised',
  );
  const customersMetaCollection =
    db.collection<ICustomerMeta>('customers_meta');

  const customerWriter = batchRunner<ICustomerMeta>(
    async (metas: ICustomerMeta[]) => {
      for (const meta of metas) {
        updatingQueue.push(() =>
          updateCustomer(
            meta,
            customersAnonCollection,
            customersMetaCollection,
          ),
        );
      }
    },
    {
      maxBatchSize: 1000,
      debounceTimeMs: 1000,
    },
  );

  let lastUpdatedAt = new Date(0);
  while (true) {
    const cursor = customersMetaCollection
      .find(
        {
          isSynced: false,
          updatedAt: { $gt: lastUpdatedAt },
        },
        {
          readPreference: 'primary',
        },
      )
      .sort({ updatedAt: 1 })
      .batchSize(1000)
      .limit(5000);

    let hasData = false;
    while (await cursor.hasNext()) {
      const meta = (await cursor.next())!;
      customerWriter.pushToBatch(meta);

      lastUpdatedAt = meta.updatedAt;
      hasData = true;
    }

    if (!hasData) {
      await sleep(100);
    }

    if (updatingQueue.length > 5000) {
      logger.warn('queue is full, waiting for it to drain');
      await once(updatingQueue, 'end');
    }
  }
}
