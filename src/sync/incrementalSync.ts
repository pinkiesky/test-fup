import { Collection, MongoClient, ObjectId } from 'mongodb';
import { ICustomerMeta, ICustomer } from '../types';
import { batchRunner } from '../utils/batchRunner';
import { sleep } from '../utils/sleep';
import { anonymizeCustomer } from '../utils/anonymizeCustomer';
import { getLogger } from '../utils/logger';

const logger = getLogger('incrementalSync');

export async function updateCustomers(
  syncMeta: ICustomerMeta[],
  customersAnonCollection: Collection<ICustomer>,
  customersMetaCollection: Collection<ICustomerMeta>,
) {
  let syncedCount = 0;
  for (const meta of syncMeta) {
    const actualMeta = await customersMetaCollection.findOneAndUpdate(
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
    const isUpdated = !!actualMeta.value;

    if (isUpdated) {
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

        syncedCount++;
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
  }

  logger.info('synced', syncedCount, 'customers');
}

export async function incremenalSync(mongoUrl: string) {
  const client = new MongoClient(mongoUrl, {
    readPreference: 'primary',
    readConcern: { level: 'majority' },
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
      await updateCustomers(
        metas,
        customersAnonCollection,
        customersMetaCollection,
      );
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
      .batchSize(1000);

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
  }
}
