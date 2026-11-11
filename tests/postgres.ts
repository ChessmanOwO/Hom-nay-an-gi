import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import Sqlite from 'better-sqlite3';
import {PostgresDatabase,postgresSql} from '../vps/postgres';
import {SqliteDatabase} from '../vps/storage';
import {createApi} from '../lib/api-handler';
import {createVpsApp} from '../vps/app';

const base=process.env.TEST_DATABASE_URL;
if(!base)throw Error('TEST_DATABASE_URL must point at a disposable local PostgreSQL server');
const admin=new pg.Client({connectionString:base});await admin.connect();
const names=['test_'+randomUUID().replaceAll('-',''),'test_'+randomUUID().replaceAll('-','')];
for(const name of names)await admin.query('CREATE DATABASE "'+name+'"');
const url=(name:string)=>{const u=new URL(base);u.pathname='/'+name;return u.href};
const db=new PostgresDatabase(url(names[0]),8),other=new PostgresDatabase(url(names[0]),8);
const temp=mkdtempSync(join(tmpdir(),'hnag-pg-'));
try {
 await Promise.all([db.migrate(resolve('postgres')),other.migrate(resolve('postgres'))]);
 assert.equal(postgresSql("SELECT '?' x WHERE a=?"),"SELECT '?' x WHERE a=$1");
 await db.prepare("INSERT INTO restaurants VALUES('r','Fixture','Address','City','Area',21,105,'','','active','owner',1)").run();
 const api=createApi({env:{DB:db,ADMIN_EMAILS:'admin@example.test',MODERATOR_EMAILS:'moderator@example.test'},getUser:async req=>{const id=req.headers.get('fixture-user');return id?{userId:id,email:id+'@example.test',fullName:id,displayName:id}:null}});
 const body={restaurant:'r',author:'Fixture',date:'2026-11-01',rating:4,content:'A detailed synthetic visit to this restaurant used for PostgreSQL verification.',media:[]};
 async function request(path:string,method='GET',value?:any,user='member',extraHeaders:Record<string,string>={}) {
  return api(new Request('http://localhost/api/'+path,{method,headers:{Origin:'http://localhost','Content-Type':'application/json','fixture-user':user,...extraHeaders},body:value?JSON.stringify(value):undefined}));
 }
 for(let i=0;i<10;i++){await db.prepare('DELETE FROM review_events').run();assert.equal((await request('place-reviews','POST',body)).status,200)}
 assert.equal((await request('place-reviews','POST',body)).status,409);
 const mine:any=await (await request('place/r')).json();assert.equal(mine.reviewCount,10);
 const id=mine.mineReviews[0].id;
 await db.prepare('DELETE FROM review_events').run();
 assert.equal((await request('place-reviews','PATCH',{...body,id})).status,200);
 assert.equal((await request('place-reviews','DELETE',{id},'other')).status,400);
 assert.equal((await request('admin','POST',{action:'approve',kind:'place',id},'admin')).status,200);
 const publicPlace:any=await (await request('place/r','GET',undefined,'')).json();
 assert.equal(publicPlace.total,1);assert.equal(publicPlace.reviews[0].owner,undefined);
 const modPlace:any=await (await request('place/r','GET',undefined,'moderator')).json();
 assert.equal(modPlace.reviews[0].owner,undefined);
 const adminPlace:any=await (await request('place/r','GET',undefined,'admin')).json();
 assert.equal(adminPlace.reviews[0].owner,'member');
 const modAdmin:any=await (await request('admin','GET',undefined,'moderator')).json();
 assert.equal(modAdmin.placeQueue[0].owner,undefined);
 assert.equal(modAdmin.reports[0]?.owner,undefined);
 assert.equal((await request('admin','POST',{action:'banUser',userId:'member'},'moderator')).status,403);
 assert.equal((await request('admin','POST',{action:'blockIp',ip:'203.0.113.77',reason:'Test PG IP block'},'admin')).status,200);
 assert.equal((await request('state','GET',undefined,'',{'x-hnag-client-ip':'203.0.113.77'})).status,403);
 assert.equal((await request('admin','POST',{action:'unblockIp',ip:'203.0.113.77'},'admin')).status,200);
 assert.equal((await request('state','GET',undefined,'',{'x-hnag-client-ip':'203.0.113.77'})).status,200);
 assert.equal((await request('place-reviews','DELETE',{id})).status,200);
 await db.prepare('DELETE FROM review_events').run();
 assert.equal((await request('place-reviews','POST',body)).status,200);
 assert.equal((await request('place-reviews','POST',body)).status,409);
 await db.prepare("UPDATE place_review_quota SET used=0 WHERE owner='member' AND restaurant='r'").run();
 await db.pool.query(readFileSync('postgres/002_restore_place_review_quota.sql','utf8'));
 assert.equal((await db.prepare("SELECT used FROM place_review_quota WHERE owner='member' AND restaurant='r'").first<any>()).used,10);
 const insert="INSERT INTO place_reviews VALUES(?,'r','parallel','Fixture','2026-11-01',4,'Parallel fixture','[]',0,0,'pending','',1,1)";
 const races=await Promise.allSettled(Array.from({length:16},(_,i)=>(i%2?db:other).pool.query(postgresSql(insert),['p'+i])));
 assert.equal(races.filter(r=>r.status==='fulfilled').length,10);
 assert.equal((await db.prepare("SELECT COUNT(*) n FROM place_reviews WHERE owner='parallel'").first<any>()).n,10);
 await assert.rejects(db.batch([db.prepare("INSERT INTO abuse_config VALUES('rollback','a')"),db.prepare("INSERT INTO abuse_config VALUES('rollback','b')")]));
 assert.equal(await db.prepare("SELECT * FROM abuse_config WHERE key='rollback'").first(),null);
 const app=createVpsApp({env:{DB:db},origin:'http://localhost',firebaseConfig:{projectId:'hom-nay-an'},verifyIdentity:async()=>({uid:'signed-fixture',email:'fixture@example.test',name:'Fixture',authTime:Date.now(),expires:Date.now()+60000})});
 const login=await app.request('http://localhost/api/auth/session',{method:'POST',headers:{Origin:'http://localhost'},body:JSON.stringify({idToken:'fixture'})});
 assert.equal(login.status,200);const cookie=login.headers.get('Set-Cookie')!.split(';')[0];
 assert(((await (await app.request('http://localhost/api/state',{headers:{Cookie:cookie}})).json()) as any).user);
 execFileSync(process.execPath,['scripts/account-access.mjs','disable','signed-fixture'],{env:{...process.env,DATABASE_URL:url(names[0])}});
 assert.equal(((await (await app.request('http://localhost/api/state',{headers:{Cookie:cookie}})).json()) as any).user,null);
 const imported=new PostgresDatabase(url(names[1]));
 try {
  await imported.migrate(resolve('postgres'));
  const file=join(temp,'source.sqlite');const sqlite=new SqliteDatabase(file,resolve('drizzle'));
  sqlite.sqlite.prepare("INSERT INTO restaurants VALUES('old','Old','Address','City','Area',21,105,'','','active','owner',1)").run();sqlite.close();
  execFileSync(process.execPath,['scripts/import-sqlite.mjs',file],{env:{...process.env,DATABASE_URL:url(names[1])}});
  assert.equal((await imported.prepare("SELECT name FROM restaurants WHERE id='old'").first<any>()).name,'Old');
  assert.throws(()=>execFileSync(process.execPath,['scripts/import-sqlite.mjs',file],{env:{...process.env,DATABASE_URL:url(names[1])},stdio:'pipe'}));
 }finally{await imported.close()}
 console.log('PASS PostgreSQL: concurrent migration, API moderation/ownership/10 cap, direct concurrent quota across pools, transaction rollback, sessions and disable CLI, SQLite import and nonempty refusal.');
}finally{
 await db.close();await other.close();
 for(const name of names)await admin.query('DROP DATABASE "'+name+'" WITH (FORCE)');
 await admin.end();rmSync(temp,{recursive:true,force:true});
}
