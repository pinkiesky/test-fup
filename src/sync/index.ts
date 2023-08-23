import 'dotenv/config';

import { fullSync } from './fullSync';
import { incremenalSync } from './incrementalSync';
import { getLogger } from '../utils/logger';

const mainLogger = getLogger('main');

async function main() {
  const runFullSync = process.argv.includes('--full-reindex');
  if (runFullSync) {
    mainLogger.info('Running full sync');
    await fullSync(process.env.MONGO_URL!);
  } else {
    mainLogger.info('Running incremental sync');
    await incremenalSync(process.env.MONGO_URL!);
  }
}

main().catch(mainLogger.error);
