import { Collection, MongoClient, ObjectId } from 'mongodb';
import { IChangedCustomersList, ICustomer } from '../types';
import { batchRunner } from '../utils/batchRunner';
import { sleep } from '../utils/sleep';
import { anonymizeCustomer } from '../utils/anonymizeCustomer';

interface ICustomerSyncRequest {
  customerId: ObjectId;
  changeListId: ObjectId;
}

export async function updateCustomers(
  reqs: ICustomerSyncRequest[],
  customersCollection: Collection<ICustomer>,
  customersAnonCollection: Collection<ICustomer>,
  customersChangesCollection: Collection<IChangedCustomersList>,
) {
  const customerIds = reqs.map((req) => req.customerId);
  const changeListIds = [...new Set(reqs.map((req) => req.changeListId))];

  const customersRaw = await customersCollection
    .find({ _id: { $in: customerIds } })
    .toArray();

  const customersAnon = customersRaw.map(anonymizeCustomer);
  const customerUpdateActions = customersAnon.map((cust) => ({
    updateOne: {
      filter: { _id: cust._id },
      update: { $set: cust },
      upsert: true,
    },
  }));

  await customersAnonCollection.bulkWrite(customerUpdateActions, {
    ordered: false,
  });
  await customersChangesCollection.deleteMany({ _id: { $in: changeListIds } });

  console.log('inserted', customersAnon.length, 'customers');
  console.log('deleted', changeListIds.length, 'change lists');
}

export async function incremenalSync(mongoUrl: string) {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db();

  const customersCollection = db.collection<ICustomer>('customers');
  const customersAnonCollection = db.collection<ICustomer>(
    'customers_anonymised',
  );
  const customersChangesCollection =
    db.collection<IChangedCustomersList>('changedCustomers');
  const insertCustomer = batchRunner<ICustomerSyncRequest>(
    async (customerIds: ICustomerSyncRequest[]) => {
      await updateCustomers(
        customerIds,
        customersCollection,
        customersAnonCollection,
        customersChangesCollection,
      );
    },
    {
      maxBatchSize: 1000,
      debounceTimeMs: 1000,
    },
  );

  while (true) {
    let lastUpdatedAt = new Date(0);
    const cursor = customersChangesCollection
      .find({ updatedAt: { $gt: lastUpdatedAt } })
      .sort({ updatedAt: 1 })
      .batchSize(1000);

    let hasData = false;
    while (await cursor.hasNext()) {
      const changesList = (await cursor.next())!;
      changesList.customerIds.forEach((customerId) => {
        insertCustomer({
          customerId,
          changeListId: changesList._id,
        });
      });

      hasData = true;
      lastUpdatedAt = changesList.updatedAt;
    }

    if (!hasData) {
      await sleep(100);
    }
  }
}
