import { MongoClient } from 'mongodb';
import { batchRunner } from '../utils/batchRunner';
import { ICustomer } from '../types';
import { anonymizeCustomer } from '../utils/anonymizeCustomer';
import { getLogger } from '../utils/logger';

const logger = getLogger('fullSync');

export async function fullSync(mongoUrl: string) {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db();

  const customersCollection = db.collection<ICustomer>('customers');
  const customersAnonCollection = db.collection<ICustomer>(
    'customers_anonymised',
  );

  const stat = {
    sync: 0,
    start: Date.now(),
  };

  const batchWriter = batchRunner<ICustomer>(
    async (custs: ICustomer[]) => {
      const writeActions = custs.map((cust) => ({
        updateOne: {
          filter: { _id: cust._id },
          update: { $set: cust },
          upsert: true,
        },
      }));
      await customersAnonCollection.bulkWrite(writeActions);

      logger.info('synced', custs.length, 'customers');
      stat.sync += custs.length;
    },
    {
      maxBatchSize: 1000,
      debounceTimeMs: 0,
    },
  );

  const cursor = customersCollection
    .find()
    .sort({ createdAt: 1 })
    .batchSize(1000);
  while (await cursor.hasNext()) {
    const customer = await cursor.next();
    batchWriter.pushToBatch(anonymizeCustomer(customer!));
  }

  await batchWriter.close();
  await client.close();

  const duration = Date.now() - stat.start;
  const durationSec = Math.round(duration / 1000);
  logger.info('synced', stat.sync, 'customers in', durationSec, 'sec');
}
