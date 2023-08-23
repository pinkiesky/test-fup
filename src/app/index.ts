import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { faker } from '@faker-js/faker';
import { ICustomer, IChangedCustomersList } from '../types';
import { generateRandomInt } from '../utils/random';
import { sleep } from '../utils/sleep';

function generateRandomCustomer(): ICustomer {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    address: {
      line1: faker.location.streetAddress(),
      line2: faker.location.secondaryAddress(),
      postcode: faker.location.zipCode(),
      city: faker.location.city(),
      state: faker.location.state(),
      country: faker.location.country(),
    },
    createdAt: new Date(),
  };
}

async function main() {
  const mongoClient = await MongoClient.connect(process.env.MONGO_URL);
  await mongoClient.connect();
  const session = mongoClient.startSession();

  const db = mongoClient.db();
  const customersCollection = db.collection<ICustomer>('customers');
  const customersChangesCollection =
    db.collection<IChangedCustomersList>('changedCustomers');

  const stat = {
    insert: 0,
    update: 0,
  };
  while (true) {
    const numberOfCustomer = generateRandomInt(1, 10);
    const customers = Array.from(
      { length: numberOfCustomer },
      generateRandomCustomer,
    );

    await session.withTransaction(async () => {
      const result = await customersCollection.insertMany(customers, {
        session,
      });
      const insertedIds = Object.values(result.insertedIds);

      const now = new Date();
      const changesList: IChangedCustomersList = {
        customerIds: insertedIds,
        operationType: 'insert',
        createdAt: now,
        updatedAt: now,
      };
      await customersChangesCollection.insertOne(changesList, { session });
      stat.insert += insertedIds.length;
    });

    console.log('inserted amount', stat.insert, 'documents');

    // await sleep(0);
  }
}

main();
