import "dotenv/config";

import { ClientSession, Db, MongoClient, WithId } from "mongodb";
import { faker } from "@faker-js/faker";
import { ICustomer, ICustomerMeta } from "../types";
import { generateRandomInt, mergeRandom } from "../utils/random";
import { getLogger } from "../utils/logger";
import { sleep } from "../utils/sleep";

const logger = getLogger("app");

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
      state: faker.location.state({ abbreviated: true }),
      country: faker.location.countryCode(),
    },
    createdAt: new Date(),
  };
}

async function insertLogic(db: Db, session: ClientSession) {
  const customersCollection = db.collection<ICustomer>("customers");
  const customersMetaCollection =
    db.collection<ICustomerMeta>("customers_meta");

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
      logger.info("inserted", metas.length, "customers");
    });

    await sleep(200);
  }
}

async function updateLogic(db: Db, session: ClientSession) {
  const customersCollection = db.collection<ICustomer>("customers");
  const customersMetaCollection =
    db.collection<ICustomerMeta>("customers_meta");

  while (true) {
    await session.withTransaction(async () => {
      const size = generateRandomInt(1, 10);
      const customers = await customersCollection
        .aggregate<WithId<ICustomer>>([{ $sample: { size } }], {
          session,
        })
        .toArray();

      if (!customers.length) {
        return;
      }

      const patchedCustomers = customers.map((customer) => {
        return mergeRandom<WithId<ICustomer>>(
          customer,
          generateRandomCustomer(),
        );
      });

      const updateCustomers = patchedCustomers.map((customer) => {
        return {
          updateOne: {
            filter: { _id: customer._id },
            update: { $set: { ...customer, updatedAt: new Date() } },
          },
        };
      });
      const updateCustomersMeta = patchedCustomers.map((customer) => {
        return {
          updateOne: {
            filter: { customerId: customer._id! },
            update: {
              $inc: { version: 1 },
              $set: {
                isSynced: false,
                updatedAt: new Date(),
                customerObject: customer,
              },
            },
          },
        };
      });
      await Promise.all([
        customersCollection.bulkWrite(updateCustomers, {
          session,
        }),
        customersMetaCollection.bulkWrite(updateCustomersMeta, {
          session,
        }),
      ]);

      logger.info("updated", patchedCustomers.length, "customers");
    });

    await sleep(1000);
  }
}

async function main() {
  const mongoClient = await MongoClient.connect(process.env.MONGO_URL!);
  await mongoClient.connect();

  await Promise.all([
    insertLogic(mongoClient.db(), mongoClient.startSession()),
    updateLogic(mongoClient.db(), mongoClient.startSession()),
  ]);
}

main().catch(logger.error.bind(logger));
