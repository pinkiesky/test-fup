import 'dotenv/config';

import { fullSync } from './fullSync';
import { incremenalSync } from './incrementalSync';

async function main() {
  const runFullSync = process.argv.includes('--full-sync');
  if (runFullSync) {
    await fullSync(process.env.MONGO_URL!);
  } else {
    await incremenalSync(process.env.MONGO_URL!);
  }
}

main().catch(console.error);
