import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createGoogleVerifier} from '../vps/firebase-identity';
import {SqliteDatabase,FileBucket} from '../vps/storage';
import {createVpsApp} from '../vps/app';
import {clientIp,normalizeIp} from '../vps/network';
const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk=await exportJWK(publicKey);jwk.kid='test-only';const project='hom-nay-an',verify=createGoogleVerifier(project,createLocalJWKSet({keys:[jwk]}));
const now=Math.floor(Date.now()/1000);
async function token(changes:Record<string,any>={}){return new SignJWT({aud:project,iss:'https://securetoken.google.com/'+project,sub:'test-google-user',iat:now,exp:now+3600,auth_time:now,email:'test@example.test',email_verified:true,name:'Người thử nghiệm',firebase:{sign_in_provider:'google.com'},...changes}).setProtectedHeader({alg:'RS256',kid:'test-only'}).sign(privateKey)}
assert.equal((await verify(await token())).uid,'test-google-user');
for(const changes of [{aud:'another-project'},{aud:[project,'another']},{iss:'https://bad.test/'},{exp:now-10},{iat:now+100},{auth_time:now+100},{email_verified:false},{email:undefined},{sub:''},{firebase:{sign_in_provider:'password'}},{exp:now+7200}])await assert.rejects(verify(await token(changes)));
const bad=await token();await assert.rejects(verify(bad.slice(0,-16)+'AAAAAAAAAAAAAAAA'));await assert.rejects(verify('plain-text'));
assert.equal(normalizeIp('::ffff:7f00:1'),'127.0.0.1');assert.equal(clientIp('198.51.100.1',new Headers({'X-Real-IP':'203.0.113.1'}),[]),'198.51.100.1');assert.equal(clientIp('127.0.0.1',new Headers({'X-Real-IP':'203.0.113.1'}),['127.0.0.1']),'203.0.113.1');assert.equal(clientIp('127.0.0.1',new Headers({'X-Real-IP':'203.0.113.1'}),[]),null);
async function json(r:Response):Promise<any>{return r.json()}
const dir=await mkdtemp(join(tmpdir(),'hnag-auth-')),db=new SqliteDatabase(join(dir,'app.sqlite'),resolve('drizzle')),bucket=new FileBucket(join(dir,'objects'));const origin='https://example.test';const app=createVpsApp({env:{DB:db,BUCKET:bucket,ADMIN_EMAILS:'admin@example.test'},origin,firebaseConfig:{projectId:project},verifyIdentity:verify});
async function request(path:string,method='GET',body?:any,cookie?:string,reqOrigin=origin){return app.request(origin+path,{method,headers:{...(method!=='GET'?{Origin:reqOrigin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)})}
try{
 assert.throws(()=>createVpsApp({env:{DB:db},origin:'http://example.test',firebaseConfig:{projectId:project}}));
 const head=await request('/api/state','HEAD');assert.equal(head.status,200);assert.equal(await head.text(),'');
 const spoof=await app.request(origin+'/api/state',{headers:{'oai-authenticated-user-id':'stolen','oai-authenticated-user-email':'admin@example.test'}});assert.equal((await json(spoof)).user,null);
 assert.equal((await request('/api/auth/session','POST',{idToken:await token()},undefined,'https://evil.test')).status,403);
 assert.equal((await request('/api/auth/session','POST',{idToken:'forged'})).status,401);
 assert.equal((await request('/api/auth/session','POST',{idToken:await token({email_verified:false})})).status,401);
 const login=await request('/api/auth/session','POST',{idToken:await token(),uid:'victim',email:'admin@example.test',role:'superadmin'});assert.equal(login.status,200);const full=login.headers.get('Set-Cookie')!;assert.match(full,/__Host-hnag_session=/);assert.match(full,/HttpOnly/);assert.match(full,/Secure/);assert.match(full,/SameSite=Lax/);const cookie=full.split(';')[0];
 const state=await json(await request('/api/state','GET',undefined,cookie));assert.equal(state.authProvider,'firebase');assert.equal(state.user.id,'firebase:test-google-user');assert.equal(state.user.name,'Người thử nghiệm');assert.equal(state.user.admin,false);assert(!JSON.stringify(state.user).includes('@'));
 assert.equal((await request('/api/admin','GET',undefined,cookie)).status,403);
 const row=db.sqlite.prepare('SELECT * FROM app_sessions').get() as any;assert(!row.hash.includes(cookie.split('=')[1]));assert.equal(row.hash.length,64);
 const second=await request('/api/auth/session','POST',{idToken:await token({name:'Tên cập nhật'})},cookie);assert.equal(second.status,200);assert.equal((db.sqlite.prepare('SELECT COUNT(*) n FROM app_users').get() as {n:number}).n,1);assert.equal((await json(await request('/api/state','GET',undefined,cookie))).user,null);const cookie2=second.headers.get('Set-Cookie')!.split(';')[0];
 const admin=await request('/api/auth/session','POST',{idToken:await token({sub:'admin-user',email:'admin@example.test'})});assert.equal(admin.status,200);assert.equal((await request('/api/admin','GET',undefined,admin.headers.get('Set-Cookie')!.split(';')[0])).status,200);

 db.sqlite.prepare('INSERT INTO restaurants(id,name,address,city,district,lat,lng,hours,front,status,owner,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('auth-test-place','AUTH TEST ONLY','Địa chỉ thử nghiệm','Test City','Test District',21,105,'24/7','','active','old-sites-owner',Date.now());
 const uploaded=await app.request(origin+'/api/upload',{method:'POST',headers:{Origin:origin,Cookie:cookie2,'Content-Type':'image/jpeg'},body:await readFile('public/images/pho.jpg')});assert.equal(uploaded.status,200);const photoId=(await json(uploaded)).id;
 assert.equal((await request('/api/photo/'+photoId)).status,403);
 const reviewBody={restaurant:'auth-test-place',author:'Người thử nghiệm',date:new Date().toISOString().slice(0,10),rating:2,content:'AUTH local-only integration test: a detailed restaurant experience with an uploaded photograph.',media:[photoId],owner:'old-sites-owner'};
 assert.equal((await request('/api/place-reviews','POST',reviewBody,cookie2)).status,200);
 const review=await db.prepare('SELECT * FROM place_reviews WHERE restaurant=?').bind('auth-test-place').first<any>();assert.equal(review.owner,'firebase:test-google-user');assert.equal(review.status,'pending');
 const other=await request('/api/auth/session','POST',{idToken:await token({sub:'other-user',email:'other@example.test'})});const otherCookie=other.headers.get('Set-Cookie')!.split(';')[0];
 assert.equal((await request('/api/place-reviews','PATCH',{...reviewBody,id:review.id},otherCookie)).status,400);assert.equal((await request('/api/place-reviews','DELETE',{id:review.id},otherCookie)).status,400);
 const adminCookie=admin.headers.get('Set-Cookie')!.split(';')[0];assert.equal((await request('/api/admin','POST',{action:'approve',kind:'place',id:review.id},adminCookie)).status,200);
 assert.equal((await json(await request('/api/place/auth-test-place'))).total,1);const picture=await request('/api/photo/'+photoId);assert.equal(picture.status,200);assert.equal(picture.headers.get('content-type'),'image/jpeg');assert((await picture.arrayBuffer()).byteLength>100);
 assert.equal((await request('/api/helpful','POST',{id:review.id},otherCookie)).status,200);assert.equal((await request('/api/place-reviews','DELETE',{id:review.id},cookie2)).status,200);assert.equal((await request('/api/photo/'+photoId)).status,403);
 assert.equal((await json(await request('/api/state'))).eligibleTypes,0);
 // A browser-provided UID/role cannot change the signed identity.
 assert.equal((await json(await request('/api/state','GET',undefined,cookie2))).user.id,'firebase:test-google-user');
 const logout=await request('/api/auth/logout','POST',{},cookie2);assert.equal(logout.status,200);assert.match(logout.headers.get('Set-Cookie')!,/Max-Age=0/);assert.equal((await json(await request('/api/state','GET',undefined,cookie2))).user,null);
 db.sqlite.prepare('UPDATE app_sessions SET expires=?').run(Date.now()-1);assert.equal((await json(await request('/api/state','GET',undefined,admin.headers.get('Set-Cookie')!.split(';')[0]))).user,null);
 assert.equal((await request('/api/auth/session','POST',{idToken:'x'.repeat(18000)})).status,400);assert.equal((await request('/api/video-upload','POST',{},cookie2)).status,401);

 // Shared-database access revocation blocks existing sessions and stale signed tokens.
 const revLogin=await request('/api/auth/session','POST',{idToken:await token({sub:'revocation-test'})});
 const revokedCookie=revLogin.headers.get('Set-Cookie')!.split(';')[0];
 db.sqlite.prepare('INSERT INTO account_access VALUES(?,?,?)').run('revocation-test',1,Date.now());
 assert.equal((await json(await request('/api/state','GET',undefined,revokedCookie))).user,null);
 assert.equal((await request('/api/auth/session','POST',{idToken:await token({sub:'revocation-test'})})).status,401);
 db.sqlite.prepare('UPDATE account_access SET disabled=0 WHERE google_uid=?').run('revocation-test');
 assert.equal((await request('/api/auth/session','POST',{idToken:await token({sub:'revocation-test'})})).status,401);
 db.sqlite.prepare('UPDATE account_access SET revoked_before=0 WHERE google_uid=?').run('revocation-test');
 assert.equal((await request('/api/auth/session','POST',{idToken:await token({sub:'revocation-test'})})).status,200);
 db.sqlite.prepare('DELETE FROM app_sessions WHERE user_id=?').run('firebase:revocation-test');
 db.sqlite.prepare('UPDATE account_access SET revoked_before=? WHERE google_uid=?').run(Date.now(),'revocation-test');
 assert.equal((db.sqlite.prepare('SELECT COUNT(*) n FROM app_sessions WHERE user_id=?').get('firebase:revocation-test') as {n:number}).n,0);
 assert.equal((await request('/api/auth/session','POST',{idToken:await token({sub:'revocation-test'})})).status,401);
 const previousNodeEnv=process.env.NODE_ENV;
 Reflect.set(process.env,'NODE_ENV','production');
 try { assert.equal((await request('/api/auth/session','POST',{idToken:'invalid'})).status,503); }
 finally { if(previousNodeEnv===undefined)Reflect.deleteProperty(process.env,'NODE_ENV');else Reflect.set(process.env,'NODE_ENV',previousNodeEnv); }
 db.sqlite.prepare("INSERT INTO limits VALUES('expired-auth',1,0)").run();
 await request('/api/auth/session','POST',{idToken:'invalid'});
 assert.equal(db.sqlite.prepare("SELECT * FROM limits WHERE key='expired-auth'").get(),undefined);
 db.sqlite.prepare("DELETE FROM limits WHERE key LIKE 'auth:unattributed:%'").run();
 for(let i=0;i<120;i++)assert.equal((await request('/api/auth/session','POST',{idToken:'invalid'})).status,401);
 assert.equal((await request('/api/auth/session','POST',{idToken:'invalid'})).status,429);
 await bucket.put('backups/test.json','{"ok":true}');assert(await bucket.head('backups/test.json'));assert((await bucket.list({prefix:'backups/',limit:10})).objects.some(o=>o.key==='backups/test.json'));await assert.rejects(bucket.get('../secret'));await bucket.delete('backups/test.json');
 console.log('PASS: signed Google-only identity; project/issuer/expiry/verified email/signature checks; trusted proxy IP; real SQLite migrations; CSRF; spoofed Sites headers ignored; hashed HttpOnly sessions; rotation/logout/expiry; stable user profile; server-controlled admin roles; Google-owned photo/review submission; cross-account edit/delete denied; moderation and private/public photos; private object storage. Test signing keys are injected only in this test process.');
}finally{db.close();await rm(dir,{recursive:true,force:true})}
