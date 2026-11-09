import { workerData } from 'node:worker_threads';
import { join } from 'node:path';
import { dailySnapshot } from '../lib/backups';
import { FileBucket } from './storage';
import { PostgresDatabase } from './postgres';

const { data, databaseUrl } = workerData as { data: string; databaseUrl: string };
const db = new PostgresDatabase(databaseUrl, 1);
try {
  await dailySnapshot({ DB: db, BUCKET: new FileBucket(join(data, 'objects')) });
} finally {
  await db.close();
}
