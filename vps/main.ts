import {PostgresDatabase} from './postgres';
import { Worker } from 'node:worker_threads';
import {serve} from '@hono/node-server';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {FileBucket} from './storage';
import {createVpsApp} from './app';
import firebaseConfig from '../config/firebase-web.json';
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  process.exit(1);
});

const dir=dirname(fileURLToPath(import.meta.url)),data=resolve(process.env.DATA_DIR||'vps/data'),origin=process.env.PUBLIC_ORIGIN||'http://localhost:3000';
if(process.env.FIREBASE_PROJECT_ID&&process.env.FIREBASE_PROJECT_ID!==firebaseConfig.projectId)throw Error('FIREBASE_PROJECT_ID does not match the registered web app');
const db=new PostgresDatabase(process.env.DATABASE_URL||'',Number(process.env.PG_POOL_MAX||10));

for (let attempt = 1; attempt <= 10; attempt++) {
  try {
    await db.migrate(join(dir, 'postgres'));
    break;
  } catch (error) {
    console.warn(`[DB] Migration attempt ${attempt}/10 failed: ${(error as Error).message}. Retrying in 2s...`);
    if (attempt === 10) throw error;
    await new Promise(r => setTimeout(r, 2000));
  }
}
const bucket=new FileBucket(join(data,'objects'));
function snapshotJob(): Promise<void> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./snapshot-worker.mjs', import.meta.url), {
      workerData: { data, databaseUrl: process.env.DATABASE_URL }
    });
    worker.once('error', reject);
    worker.once('exit', code => code === 0 ? resolve() : reject(new Error('Snapshot worker failed')));
  });
}
const app=createVpsApp({snapshotJob,env:{DB:db,BUCKET:bucket,ADMIN_EMAILS:process.env.ADMIN_EMAILS,MODERATOR_EMAILS:process.env.MODERATOR_EMAILS},origin,firebaseConfig,clientDir:join(dir,'client'),trustedProxyIps:(process.env.TRUSTED_PROXY_IPS||'').split(',').map(s=>s.trim()).filter(Boolean)});
const port=Number(process.env.APP_PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid PORT');
const server=serve({fetch:app.fetch,port,hostname:process.env.APP_HOST||'127.0.0.1'},()=>console.log(`Hôm nay ăn gì? đang chạy tại ${origin}`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.close(()=>{db.close().then(()=>process.exit(0)).catch(()=>process.exit(1))});setTimeout(()=>process.exit(1),10000).unref()});
