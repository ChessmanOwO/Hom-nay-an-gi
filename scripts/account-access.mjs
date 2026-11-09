import pg from 'pg';
const [action, uid] = process.argv.slice(2);
if (!['disable','enable','revoke'].includes(action) || !uid || uid.length > 128 || uid.includes(':')) throw new Error('Usage: node scripts/account-access.mjs disable|enable|revoke FIREBASE_UID');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try {
 await client.query('BEGIN');
 const user = (await client.query('SELECT id FROM app_users WHERE google_uid=$1',[uid])).rows[0];
 if (!user) throw new Error('Unknown account');
 await client.query('INSERT INTO account_access(google_uid) VALUES($1) ON CONFLICT DO NOTHING',[uid]);
 if (action === 'enable') await client.query('UPDATE account_access SET disabled=0 WHERE google_uid=$1',[uid]);
 else {
  await client.query('UPDATE account_access SET disabled=CASE WHEN $1 THEN 1 ELSE disabled END,revoked_before=$2 WHERE google_uid=$3',[action==='disable',Date.now(),uid]);
  await client.query('DELETE FROM app_sessions WHERE user_id=$1',[user.id]);
 }
 await client.query('COMMIT');
 console.log('Account access updated');
} catch(error) { await client.query('ROLLBACK'); throw error; }
finally { await client.end(); }
