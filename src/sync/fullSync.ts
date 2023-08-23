import { MongoClient } from 'mongodb';
import { batchRunner } from '../utils/batchRunner';
import { ICustomer } from '../types';
import { anonymizeCustomer } from '../utils/anonymizeCustomer';

export async function fullSync(mongoUrl: string) {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db();

  const customersCollection = db.collection<ICustomer>('customers');
  const customersAnonCollection = db.collection<ICustomer>(
    'customers_anonymised',
  );

  const insertCustomer = batchRunner<ICustomer>(
    async (custs: ICustomer[]) => {
      const writeActions = custs.map((cust) => ({
        updateOne: {
          filter: { _id: cust._id },
          update: { $set: cust },
          upsert: true,
        },
      }));
      await customersAnonCollection.bulkWrite(writeActions);
      console.info('inserted', custs.length, 'documents');
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
    insertCustomer(anonymizeCustomer(customer!));
  }

  await insertCustomer.close();
  await client.close();
}
