import {Hono} from 'hono';
import {serveStatic} from '@hono/node-server/serve-static';
import {getConnInfo} from '@hono/node-server/conninfo';
import {join} from 'node:path';
import {createHmac,randomBytes} from 'node:crypto';
import {dailySnapshot} from '../lib/backups';
import {createApi} from '../lib/api-handler';
import {createGoogleVerifier,type GoogleIdentity} from './firebase-identity';
import {createSessions} from './sessions';
import {clientIp} from './network';
import type {ApiEnvironment} from '../lib/runtime';
export type VpsOptions={snapshotJob?:()=>Promise<void>;env:ApiEnvironment;origin:string;firebaseConfig:{projectId:string;[key:string]:unknown};clientDir?:string;trustedProxyIps?:string[];verifyIdentity?:(token:string)=>Promise<GoogleIdentity>};
export function createVpsApp(options:VpsOptions){
 const {env,firebaseConfig}=options;if(!env.DB)throw Error('Database is required');const origin=new URL(options.origin).origin,secure=origin.startsWith('https:');
 if(!secure&&!(process.env.NODE_ENV!=='production'&&['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname)))throw Error('Production PUBLIC_ORIGIN must use HTTPS');
 const sessions=createSessions(env.DB,secure),verify=options.verifyIdentity||createGoogleVerifier(firebaseConfig.projectId),api=createApi({env,getUser:req=>sessions.user(req),authProvider:'firebase'}),app=new Hono();
 let snapshot:Promise<void>|null=null,snapshotDay='',retrySnapshotAfter=0;
 app.use('*',async(c,next)=>{c.header('X-Frame-Options','DENY');c.header('Content-Security-Policy',"frame-ancestors 'none'; object-src 'none'; base-uri 'self'");c.header('X-Content-Type-Options','nosniff');c.header('Referrer-Policy','strict-origin-when-cross-origin');c.header('Permissions-Policy','geolocation=(self), camera=(), microphone=()');if(secure)c.header('Strict-Transport-Security','max-age=31536000');await next()});
 app.get('/healthz',c=>c.json({ok:true,auth:'firebase'}));
 app.all('/api/*',async c=>{
  const raw=c.req.raw,uri=new URL(raw.url),h=new Headers(raw.headers);h.delete('x-hnag-client-ip');for(const key of [...h.keys()])if(key.startsWith('oai-authenticated-'))h.delete(key);
  let remote:string|undefined;try{remote=getConnInfo(c).remote.address}catch{/* In-process request tests have no socket. */}
  const ip=clientIp(remote,h,options.trustedProxyIps||[]);if(ip)h.set('x-hnag-client-ip',ip);
  const req=new Request(origin+uri.pathname+uri.search,raw);const clean=new Request(req,{headers:h}),path=uri.pathname;
  if(path.startsWith('/api/auth/')){
   const reply=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
   if(path==='/api/auth/config'&&clean.method==='GET')return reply({provider:'firebase',config:firebaseConfig});
   if(clean.method!=='POST')return reply({error:'Không tìm thấy thao tác.'},404);
   if(clean.headers.get('origin')!==origin)return reply({error:'Yêu cầu không hợp lệ.'},403);
   if(path==='/api/auth/logout'){const cookie=await sessions.close(clean);const response=reply({ok:true});response.headers.set('Set-Cookie',cookie);return response;}
   if(path!=='/api/auth/session')return reply({error:'Không tìm thấy thao tác.'},404);
   // Rate limit attempts, not just valid tokens. Missing IP does not collapse
   // unrelated people into one fake network; the normal review caps still apply.
   if(ip){await env.DB!.prepare("INSERT OR IGNORE INTO abuse_config(key,value) VALUES('network_hmac',?)").bind(randomBytes(32).toString('hex')).run();const config=await env.DB!.prepare("SELECT value FROM abuse_config WHERE key='network_hmac'").first<any>();const fingerprint=createHmac('sha256',config.value).update(ip).digest('hex');const key='auth:'+fingerprint+':'+Math.floor(Date.now()/600000);await env.DB!.prepare('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=limits.count+1').bind(key,Date.now()+600000).run();const row=await env.DB!.prepare('SELECT count FROM limits WHERE key=?').bind(key).first<any>();if(row.count>30)return reply({error:'Bạn đăng nhập quá nhanh. Thử lại sau ít phút.'},429);}
   await env.DB!.prepare('DELETE FROM limits WHERE key IN (SELECT key FROM limits WHERE expires<? LIMIT 500)').bind(Date.now()).run();
   if(!ip&&process.env.NODE_ENV==='production'){
    const response=reply({error:'Chưa xác định được địa chỉ kết nối. Vui lòng liên hệ quản trị viên.'},503);
    response.headers.set('Retry-After','60');
    return response;
   }
   if(!ip){
    const key='auth:unattributed:'+Math.floor(Date.now()/600000);
    await env.DB!.prepare('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=limits.count+1').bind(key,Date.now()+600000).run();
    const attempts=await env.DB!.prepare('SELECT count FROM limits WHERE key=?').bind(key).first<any>();
    if(attempts.count>120){const response=reply({error:'Đăng nhập đang quá tải. Vui lòng thử lại.'},429);response.headers.set('Retry-After','600');return response;}
   }
   let token='';try{const reader=clean.body?.getReader();if(!reader)throw Error();let size=0;const parts:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>17000){await reader.cancel();throw Error();}parts.push(value)}const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length}const body=JSON.parse(new TextDecoder().decode(bytes));token=body.idToken;if(typeof token!=='string')throw Error();}catch{return reply({error:'Yêu cầu đăng nhập không hợp lệ.'},400)}
   let identity:GoogleIdentity;try{identity=await verify(token)}catch{return reply({error:'Phiên Google không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'},401)}
   const cookie=await sessions.open(clean,identity);if(!cookie)return reply({error:'Tài khoản hoặc phiên đăng nhập đã bị thu hồi. Hãy đăng nhập Google lại.'},401);const response=reply({ok:true});response.headers.set('Set-Cookie',cookie);return response;
  }
  const response=await api(clean);const day=new Date().toISOString().slice(0,10);if(!['GET','HEAD'].includes(clean.method)&&response.status<400&&snapshotDay!==day&&!snapshot&&Date.now()>=retrySnapshotAfter){snapshot=(options.snapshotJob?.()??dailySnapshot(env)).then(()=>{snapshotDay=day}).catch(()=>{retrySnapshotAfter=Date.now()+60000;console.warn('Daily community snapshot failed')}).finally(()=>{snapshot=null})}return response;
 });
 if(options.clientDir){const root=options.clientDir;app.use('/assets/*',async(c,next)=>{await next();if(c.res.status===200)c.header('Cache-Control','public,max-age=31536000,immutable')});app.use('*',serveStatic({root}));app.get('*',async c=>{if(!c.req.header('accept')?.includes('text/html'))return c.notFound();c.header('Cache-Control','no-cache');return serveStatic({path:join(root,'index.html')})(c,async()=>{})});}
 app.onError((_error,c)=>c.json({error:'Máy chủ chưa thể xử lý yêu cầu. Vui lòng thử lại.'},500));
 return app;
}
