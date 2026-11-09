import Sqlite from 'better-sqlite3';
import pg from 'pg';
const file = process.argv[2];
if (!file || !process.env.DATABASE_URL) throw new Error('Usage: DATABASE_URL=... node scripts/import-sqlite.mjs SOURCE.sqlite');
const source = new Sqlite(file,{readonly:true,fileMustExist:true});
const client = new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try {
 source.exec('BEGIN');
 await client.query('BEGIN');
 await client.query('SELECT pg_advisory_xact_lock(180511)');
 const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('_pg_migrations','place_review_quota') ORDER BY tablename")).rows.map(r=>r.tablename);
 for (const table of tables) {
  if (!/^[a-z_]+$/.test(table)) throw new Error('Unexpected table');
  await client.query('LOCK TABLE "'+table+'" IN ACCESS EXCLUSIVE MODE');
  if ((await client.query('SELECT 1 FROM "'+table+'" LIMIT 1')).rowCount) throw new Error('Import requires empty destination');
 }
 const sourceTables = new Set(source.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
 for (const table of tables) {
  if (!sourceTables.has(table)) continue;
  for (const row of source.prepare('SELECT * FROM "'+table+'"').iterate()) {
   const columns=Object.keys(row);
   if (!columns.every(n=>/^[a-z_]+$/.test(n))) throw new Error('Unexpected column');
   await client.query('INSERT INTO "'+table+'" ('+columns.map(n=>'"'+n+'"').join(',')+') VALUES ('+columns.map((_,i)=>'$'+(i+1)).join(',')+')',columns.map(n=>row[n]));
  }
 }
 await client.query('COMMIT');
 source.exec('COMMIT');
 console.log('SQLite import committed. Copy the private objects directory separately while writes are stopped.');
} catch(error) { await client.query('ROLLBACK'); throw error; }
finally { source.close(); await client.end(); }
