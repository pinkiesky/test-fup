import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { faker } from '@faker-js/faker';
import { IUser, IChangedUsersList } from '../types';
import { generateRandomInt } from '../utils/random';
import { sleep } from '../utils/sleep';

function generateRandomUser(): IUser {
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
  const usersCollection = db.collection<IUser>('users');
  const usersChangesCollection =
    db.collection<IChangedUsersList>('changedUsers');

  while (true) {
    const numberOfUser = generateRandomInt(1, 10);
    const users = Array.from({ length: numberOfUser }, generateRandomUser);

    await session.withTransaction(async () => {
      const result = await usersCollection.insertMany(users, { session });
      const insertedIds = Object.values(result.insertedIds);
      const changesList: IChangedUsersList = {
        userIds: insertedIds,
        operationType: 'insert',
        createdAt: new Date(),
      };
      await usersChangesCollection.insertOne(changesList, { session });
    });

    await sleep(200);
  }
}

main();
