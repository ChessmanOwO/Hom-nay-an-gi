import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {createApi} from '../lib/api-handler';
const sql=new DatabaseSync(':memory:');
const migrations=readdirSync('drizzle').filter(n=>n.endsWith('.sql')).sort();
for(const f of migrations.filter(n=>!n.startsWith('0008')))sql.exec(readFileSync('drizzle/'+f,'utf8'));
sql.prepare("INSERT INTO restaurants VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").run('r','Test','Test address','City','Area',21,105,'','','active','fixture',1);
function seed(id:string,owner:string,restaurant='r'){sql.prepare('INSERT INTO place_reviews VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,restaurant,owner,'Tester','2026-11-08',4,'Synthetic review content long enough for validation','[]',0,0,'pending','',1,1)}
seed('legacy','legacy');
sql.exec(readFileSync('drizzle/0008_place_review_limit.sql','utf8'));
assert.equal(sql.prepare('SELECT COUNT(*) n FROM place_reviews').get()!.n,1);
class Q{constructor(public q:string,public v:any[]=[]){ } bind(...v:any[]){return new Q(this.q,v)}async first(){return sql.prepare(this.q).get(...this.v)||null}async all(){return{results:sql.prepare(this.q).all(...this.v)}}async run(){return{meta:{changes:Number(sql.prepare(this.q).run(...this.v).changes)}}}}
const db:any={prepare:(q:string)=>new Q(q),batch:async(qs:Q[])=>{sql.exec('BEGIN');try{const out=[];for(const q of qs)out.push(await q.run());sql.exec('COMMIT');return out}catch(e){sql.exec('ROLLBACK');throw e}}};
const api=createApi({env:{DB:db},getUser:async(req)=>req.headers.get('test-user')?{userId:req.headers.get('test-user')!,email:'fixture@example.test',fullName:'Fixture',displayName:'Fixture'}:null});
const body={restaurant:'r',author:'Fixture',date:'2026-11-08',rating:4,content:'This synthetic test describes a restaurant visit for checking the review limit.',media:[]};
async function call(method:string,b:any,user='member'){return api(new Request('http://localhost/api/place-reviews',{method,headers:{origin:'http://localhost','content-type':'application/json','test-user':user},body:JSON.stringify(b)}))}
// Retain the rolling anti-spam policy; simulate time-separated posts with fixture cleanup.
for(let i=0;i<10;i++){sql.exec('DELETE FROM review_events');assert.equal((await call('POST',body)).status,200)}
assert.equal((await call('POST',body)).status,409);
const rows=sql.prepare("SELECT * FROM place_reviews WHERE owner='member'").all();
assert.equal(rows.length,10);
sql.exec('DELETE FROM review_events');
assert.equal((await call('PATCH',{...body,id:rows[0].id})).status,200);
assert.equal((await call('PATCH',{...body,id:rows[0].id},'other')).status,400);
assert.equal((await call('DELETE',{id:rows[0].id})).status,200);
assert.equal((await call('POST',body)).status,409);
assert.equal((await call('PATCH',{...body,id:rows[0].id})).status,400);
for(let i=0;i<9;i++)seed('race'+i,'race');
sql.exec('DELETE FROM review_events');
const race=await Promise.all([call('POST',{...body,content:'Race fixture has a separate detailed description about its own restaurant experience.'},'race'),call('POST',{...body,content:'Race fixture has a separate detailed description about its own restaurant experience.'},'race')]);
assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
assert.equal(sql.prepare("SELECT COUNT(*) n FROM place_reviews WHERE owner='race'").get()!.n,10);
const read=await api(new Request('http://localhost/api/place/r',{headers:{'test-user':'member'}}));const data:any=await read.json();
assert.equal(data.mineReviews.length,10);assert.equal(data.reviewCount,10);assert.equal(data.reviewLimit,10);
assert.equal((await call('POST',{...body,content:'Independent fixture describes the atmosphere and tables during a different visit.'},'independent')).status,200);
assert.equal((await call('POST',body,'')).status,401);
assert.throws(()=>seed('direct11','member'),/PLACE_REVIEW_LIMIT/);
console.log('PASS migration preservation, posts 1–10, 11 rejected, edit, ownership, soft-delete lifetime cap, parallel boundary, independent user, anonymous, database direct cap and API list.');
sql.close();




