import {isIP} from 'node:net';
import {canonical} from './security';
export const ABUSE={accountWindow:3600000,accountMax:5,networkWindow:600000,networkMax:3,similarity:.88};
// The Worker overwrites the internal header on EVERY request. Never trust XFF.
export function trustedClientIp(req:Request&{cf?:{colo?:unknown}}):string|null{
 if(typeof req.cf?.colo!=='string')return null;
 const raw=req.headers.get('cf-connecting-ip')?.trim()||'';
 if(!isIP(raw))return null;
 const ip=isIP(raw)===6?new URL('http://['+raw+']').hostname.slice(1,-1).toLowerCase():raw;
 if(ip==='2a06:98c0:3600::103'||ip==='::1'||ip==='::'||ip.startsWith('127.')||ip==='0.0.0.0')return null;
 return ip;
}
export function similarity(a:string,b:string){const x=new Set(canonical(a).split(' ').filter(Boolean)),y=new Set(canonical(b).split(' ').filter(Boolean));if(x.size<12||y.size<12)return 0;let n=0;for(const w of x)if(y.has(w))n++;return n/(x.size+y.size-n)}
export function duplicateKind(content:string,other:string):'exact'|'similar'|null{const a=canonical(content),b=canonical(other);if(a.length>=20&&a===b)return 'exact';return a.length>=80&&b.length>=80&&similarity(a,b)>=ABUSE.similarity?'similar':null}
export const abuseLabels:Record<string,string>={shared_network:'Nhiều tài khoản cùng mạng đánh giá quán trong 10 phút',similar_text:'Nội dung gần giống bài khác tại quán',network_unavailable:'Chưa có IP người dùng đáng tin cậy; chỉ áp dụng kiểm tra tài khoản/nội dung'};
export async function reviewAbuse({owner,restaurant,target,content,ip}:{owner:string,restaurant:string,target:string,content:string,ip:string|null},{one,all,stmt,must}:any){
 const now=Date.now(),flags:string[]=[];
 const previous=await all(`SELECT owner,taste content,updated FROM reviews WHERE offering IN (SELECT id FROM offerings WHERE restaurant=?) AND owner!=? AND updated>? UNION ALL SELECT owner,content,updated FROM place_reviews WHERE restaurant=? AND owner!=? AND updated>? ORDER BY updated DESC LIMIT 100`,restaurant,owner,now-30*86400000,restaurant,owner,now-30*86400000);
 for(const p of previous){const match=duplicateKind(content,p.content);must(match!=='exact','Nội dung này đã được tài khoản khác gửi cho quán. Hãy viết trải nghiệm riêng của bạn.');if(match==='similar'&&!flags.includes('similar_text'))flags.push('similar_text');}
 let network='';if(ip){await stmt("INSERT OR IGNORE INTO abuse_config(key,value) VALUES('network_hmac',?)",crypto.randomUUID()+crypto.randomUUID()).run();const config=await one("SELECT value FROM abuse_config WHERE key='network_hmac'");const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(config.value),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ip)));network=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  const peers=await one('SELECT COUNT(DISTINCT owner) n FROM review_events WHERE network=? AND restaurant=? AND owner!=? AND created>?',network,restaurant,owner,now-ABUSE.networkWindow);if(peers.n>0)flags.push('shared_network');
 }else flags.push('network_unavailable');
 // One atomic INSERT protects the rolling thresholds against parallel requests.
 const eventId=crypto.randomUUID();const result=await stmt(`INSERT INTO review_events(id,owner,network,restaurant,target,flags,created) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM review_events WHERE owner=? AND created>?)<? AND (?='' OR (SELECT COUNT(*) FROM review_events WHERE network=? AND restaurant=? AND created>?)<?)`,eventId,owner,network,restaurant,target,JSON.stringify(flags),now,owner,now-ABUSE.accountWindow,ABUSE.accountMax,network,network,restaurant,now-ABUSE.networkWindow,ABUSE.networkMax).run();
 if(!result.meta.changes){const own=await one('SELECT COUNT(*) n,MIN(created) first FROM review_events WHERE owner=? AND created>?',owner,now-ABUSE.accountWindow);const group=network?await one('SELECT COUNT(*) n,MIN(created) first FROM review_events WHERE network=? AND restaurant=? AND created>?',network,restaurant,now-ABUSE.networkWindow):null;const wait=Math.max(1,Math.ceil(((own.n>=ABUSE.accountMax?own.first+ABUSE.accountWindow:group.first+ABUSE.networkWindow)-now)/1000));throw Object.assign(Error(`Đã đạt giới hạn gửi đánh giá${own.n>=ABUSE.accountMax?' của tài khoản':' cho quán từ mạng này'}. Thử lại sau khoảng ${Math.ceil(wait/60)} phút.`),{status:429,retryAfter:wait});}
 if(network&&!flags.includes('shared_network')){const peers=await one('SELECT COUNT(DISTINCT owner) n FROM review_events WHERE network=? AND restaurant=? AND owner!=? AND created>?',network,restaurant,owner,now-ABUSE.networkWindow);if(peers.n>0){flags.push('shared_network');await stmt('UPDATE review_events SET flags=? WHERE id=?',JSON.stringify(flags),eventId).run();}}
 await stmt('DELETE FROM review_events WHERE id IN (SELECT id FROM review_events WHERE created<? LIMIT 500)',now-30*86400000).run();
 return flags;
}
