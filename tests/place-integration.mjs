// Uses loopback ONLY and the local-only SPEC fixtures created by integration.mjs.
import assert from 'node:assert/strict';import fs from 'node:fs';
const base='http://127.0.0.1:8787';
const users={regular:['spec_regular','regular@example.test'],second:['spec_second','second@example.test'],third:['spec_third','third@example.test'],burst:['spec_burst','burst@example.test'],mod:['spec_mod','mod@example.test'],anonymous:[]};
function headers(user='regular'){const [id,email]=users[user];return {Origin:base,'x-hnag-client-ip':'203.0.113.250',...(id?{'oai-authenticated-user-id':id,'oai-authenticated-user-email':email}:{})}}
async function api(path,{user='regular',method='GET',body}={}){const r=await fetch(base+'/api/'+path,{method,headers:{...headers(user),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
const pic=fs.readFileSync('outputs/spec-photo-id.txt','utf8');
assert.equal((await api('place/spec_r0')).data.total,0);
const b={restaurant:'spec_r0',author:'SPEC photo reviewer',date:'2026-11-07',rating:1,content:'SPEC local-only review with a photograph and a low rating.',media:[pic]};
assert.equal((await api('place-reviews',{user:'anonymous',method:'POST',body:b})).status,401);
assert.equal((await api('place-reviews',{method:'POST',body:{...b,date:'2026-02-30'}})).status,400);
assert.equal((await api('place-reviews',{method:'POST',body:{...b,media:[pic,pic]}})).status,400);
assert.equal((await api('place-reviews',{user:'second',method:'POST',body:b})).status,400);
assert.equal((await api('place-reviews',{method:'POST',body:b})).status,200);
assert.equal((await api('place-reviews',{method:'POST',body:{...b,content:''}})).status,400);
let place=(await api('place/spec_r0')).data;assert.equal(place.total,0);assert.equal(place.mine.status,'pending');const first=place.mine.id;
const five=[pic];for(let i=0;i<4;i++){const r=await fetch(base+'/api/upload',{method:'POST',headers:{...headers(),'Content-Type':'image/jpeg'},body:fs.readFileSync('public/images/pho.jpg')});assert.equal(r.status,200);five.push((await r.json()).id);}
assert.equal((await api('place-reviews',{method:'PATCH',body:{...b,id:first,media:five}})).status,200);assert.equal((await api('place/spec_r0')).data.mine.media.length,5);
assert.equal((await api('video-upload',{method:'POST',body:{}})).status,404);
assert.equal((await api('place-reviews',{method:'PATCH',body:{...b,id:first,media:['a','b','c','d','e','f']}})).status,400);
assert.equal((await api('place-reviews',{user:'second',method:'POST',body:{...b,author:'SPEC second reviewer',rating:3,content:'SPEC second reviewer describes tables, service and the menu in this local-only test.',media:[]}})).status,200);
assert.equal((await api('place-reviews',{user:'third',method:'POST',body:{...b,author:'SPEC text reviewer',rating:5,content:'SPEC third reviewer writes about a different visit and the local fixture restaurant.',media:[]}})).status,200);
const ids=(await api('admin',{user:'mod'})).data.placeQueue.filter(r=>r.restaurant==='spec_r0').map(r=>r.id);assert.equal(ids.length,3);
assert.equal((await api('admin',{method:'POST',body:{action:'approve',kind:'place',id:first}})).status,403);
for(const id of ids)assert.equal((await api('admin',{user:'mod',method:'POST',body:{action:'approve',kind:'place',id}})).status,200);
place=(await api('place/spec_r0',{user:'anonymous'})).data;assert.equal(place.total,3);assert.equal(place.rating,3);assert.equal(place.mine,null);assert.equal(place.reviews[0].author,'SPEC photo reviewer');assert.deepEqual(new Set(place.reviews.slice(1).map(r=>r.author)),new Set(['SPEC second reviewer','SPEC text reviewer']));assert(!JSON.stringify(place.reviews).includes('owner'));assert(!JSON.stringify(place.reviews).includes('@example.test'));
assert.equal((await api('place-reviews',{user:'second',method:'PATCH',body:{...b,id:first}})).status,400);
assert.equal((await api('helpful',{user:'second',method:'POST',body:{id:first}})).status,200);
assert.equal((await api('helpful',{method:'POST',body:{id:first}})).status,400);
assert.equal((await api('report',{method:'POST',body:{target:first,reason:'SPEC local-only moderation report.'}})).status,200);
assert.equal((await api('place-reviews',{method:'PATCH',body:{...b,id:first,content:b.content+' Updated.'}})).status,200);
assert.equal((await api('place/spec_r0')).data.total,2);assert.equal((await api('place/spec_r0')).data.mine.status,'pending');
assert.equal((await api('admin',{user:'mod',method:'POST',body:{action:'hide',kind:'place',id:first,reason:'SPEC local test hide'}})).status,200);
assert.equal((await api('place/spec_r0')).data.mine.reason,'SPEC local test hide');
assert.equal((await api('place-reviews',{method:'DELETE',body:{id:first}})).status,200);
assert.equal((await api('mine')).data.placeReviews.find(r=>r.id===first).status,'deleted');
assert.equal((await api('state')).data.eligibleTypes,10);assert.equal((await api('place/spec_r0?page=999')).data.reviews.length,0);
assert.equal((await api('place-reviews',{user:'burst',method:'POST',body:{...b,media:[],content:'SPEC second reviewer describes tables, service and the menu in this local-only test.'}})).status,400); // duplicate other author's text
const burst={...b,author:'SPEC burst test',media:[],content:'SPEC burst account posts a distinct review for testing rolling account rate limits.'};
assert.equal((await api('place-reviews',{user:'burst',method:'POST',body:burst})).status,200);const burstId=(await api('place/spec_r0',{user:'burst'})).data.mine.id;
for(let i=0;i<4;i++)assert.equal((await api('place-reviews',{user:'burst',method:'PATCH',body:{...burst,id:burstId,content:burst.content+' Edit '+i}})).status,200);
assert.equal((await api('place-reviews',{user:'burst',method:'PATCH',body:{...burst,id:burstId}})).status,429);
assert((await api('admin',{user:'mod'})).data.placeQueue.find(r=>r.id===burstId).risk_flags.includes('network_unavailable'));
console.log('PASS: multiple reviewers per place; owner isolation; video endpoint removed; maximum 5 images; server-owned media; media-first low-star inclusion; averages approved-only; moderator boundary; update reapproval; soft delete; voting/reporting; random threshold unchanged; duplicate content blocked; rolling account limit enforced; unavailable trusted IP explicitly flagged.');
