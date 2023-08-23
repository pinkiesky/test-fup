import 'dotenv/config';

import { MongoClient } from 'mongodb';
import { faker } from '@faker-js/faker';
import { ICustomer, ICustomerMeta } from '../types';
import { generateRandomInt } from '../utils/random';
import { getLogger } from '../utils/logger';
import { sleep } from '../utils/sleep';

const logger = getLogger('app');

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
  const mongoClient = await MongoClient.connect(process.env.MONGO_URL!);
  await mongoClient.connect();
  const session = mongoClient.startSession();

  const db = mongoClient.db();
  const customersCollection = db.collection<ICustomer>('customers');
  const customersMetaCollection =
    db.collection<ICustomerMeta>('customers_meta');

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
      const insertedIds = Object.entries(result.insertedIds);

      const now = new Date();
      const metas: ICustomerMeta[] = insertedIds.map(([index, id]) => ({
        customerId: id,
        version: 1,
        isSynced: false,
        createdAt: now,
        updatedAt: now,
        customerObject: {
          ...customers[Number(index)],
          _id: id,
        },
      }));

      await customersMetaCollection.insertMany(metas, { session });
      stat.insert += insertedIds.length;
    });

    logger.info('inserted amount', stat.insert, 'customers');

    await sleep(200);
  }
}

main();
