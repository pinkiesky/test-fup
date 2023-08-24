import "dotenv/config";

import { MongoClient } from "mongodb";
import { getLogger } from "../utils/logger";
import { sleep } from "../utils/sleep";

const logger = getLogger("init");

async function initDatabase() {
  const dropCollections = process.argv.includes("--drop-collections");
  if (dropCollections) {
    logger.warn("Dropping collections. 5 sec to abort...");
    await sleep(5000);
  }

  const mongoClient = await MongoClient.connect(process.env.MONGO_URL!);
  await mongoClient.connect();
  const db = mongoClient.db();

  if (dropCollections) {
    logger.warn("Dropping collections");
    await Promise.all([
      db.collection("customers").drop(),
      db.collection("customers_anonymised").drop(),
      db.collection("customers_meta").drop(),
    ]);
  }

  logger.info("Creating collection and indexes");
  await Promise.all([
    db.collection("customers").createIndex({ createdAt: 1 }),
    db.collection("customers_anonymised").createIndex({ createdAt: 1 }),
    db.collection("customers_meta").createIndex(
      { isSynced: 1, customerId: 1 },
      {
        partialFilterExpression: { isSynced: false },
      },
    ),
    db.collection("customers_meta").createIndex(
      { isSynced: 1, updatedAt: 1 },
      {
        partialFilterExpression: { isSynced: false },
      },
    ),
  ]);

  await mongoClient.close();
}

initDatabase().catch(console.error);
