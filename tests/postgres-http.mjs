import assert from 'node:assert/strict';
import pg from 'pg';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {randomUUID,createHash} from 'node:crypto';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const admin=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await admin.connect();
const name='test_'+randomUUID().replaceAll('-','');
await admin.query('CREATE DATABASE "'+name+'"');
const url=new URL(process.env.TEST_DATABASE_URL);url.pathname='/'+name;
const tmp=await mkdtemp(join(tmpdir(),'hnag-http-'));
const port=await new Promise(resolve=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})});
const base='http://127.0.0.1:'+port;
const proc=spawn(process.execPath,['vps/dist/server.mjs'],{env:{...process.env,DATABASE_URL:url.href,APP_HOST:'127.0.0.1',APP_PORT:String(port),PUBLIC_ORIGIN:base,DATA_DIR:tmp,NODE_ENV:'development'},stdio:'ignore'});
let db;
try{
 for(let i=0;i<100;i++){try{if((await fetch(base+'/healthz')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
 db=new pg.Client({connectionString:url.href});await db.connect();
 await db.query("INSERT INTO restaurants VALUES('r','Fixture','Address','City','Area',21,105,'','','active','fixture',1)");
 await db.query("INSERT INTO app_users VALUES('u','uid','fixture@example.test','Fixture',1,1)");
 const cookie='X'.repeat(43);await db.query('INSERT INTO app_sessions VALUES($1,$2,$3,$4)',[createHash('sha256').update(cookie).digest('hex'),'u',Date.now()+600000,1]);
 const statuses=[];
 for(let group=0;group<3;group++){
  statuses.push(...await Promise.all(Array.from({length:32},async(_,i)=>{
   const write=i%4===0;
   const response=await fetch(base+(write?'/api/save':'/api/state'),{method:write?'POST':'GET',headers:{Cookie:'hnag_session='+cookie,Origin:base,'Content-Type':'application/json'},body:write?JSON.stringify({kind:'restaurant',target:'r'}):undefined});
   if(!write){const body=await response.json();assert.equal(body.user.id,'u')}
   return response.status;
  })));
 }
 // Concurrent save toggles may race at the application level but must never return server failures.
 assert(statuses.every(s=>s===200||s===409),JSON.stringify(statuses));
 assert(statuses.includes(200));
 for(let i=0;i<50;i++){try{if((await readdir(join(tmp,'objects','backups'))).length)break}catch{}await new Promise(r=>setTimeout(r,100))}
 assert((await readdir(join(tmp,'objects','backups'))).length);
 console.log('PASS PostgreSQL built HTTP server: 96 mixed requests / concurrency 32, valid sessions, save race yields only 200/409, background snapshot worker.');
}finally{
 proc.kill();await new Promise(resolve=>proc.once('exit',resolve));
 if(db)await db.end();
 await admin.query('DROP DATABASE "'+name+'" WITH (FORCE)');await admin.end();await rm(tmp,{recursive:true,force:true});
}
