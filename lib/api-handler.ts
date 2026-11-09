import {reviewAbuse} from './review-abuse';
import {placeRead,placeWrite} from './place-api';
import {paginate} from './pagination';
import {getAdminRole,canAdminAction} from './admin-role';
import {POST_CATEGORIES,matchesDiscovery} from './discovery';
import {cleanImage,canonical,haversine} from './security';
import {extractMapsCoords,isShortGoogleMapsUrl} from './maps';
import type {ApiEnvironment,AppUser} from './runtime';

export function createApi({env,getUser,authProvider='sites'}:{env:ApiEnvironment;getUser:(req:Request)=>Promise<AppUser|null>;authProvider?:'sites'|'firebase'}){
const db=()=>{if(!env.DB)throw Error('Kho dữ liệu chưa được kết nối.');return env.DB};
const stmt=(q:string,...v:any[])=>db().prepare(q).bind(...v);
const all=async(q:string,...v:any[])=>(await stmt(q,...v).all()).results as any[];
const one=(q:string,...v:any[])=>stmt(q,...v).first<any>();
const uuid=()=>crypto.randomUUID();
const json=(x:any,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const text=(v:any,max=500)=>typeof v==='string'?v.trim().slice(0,max):'';
const must=(condition:any,message:string)=>{if(!condition)throw Error(message)};

async function limit(id:string,action:string,max:number){
 const now=Date.now(),key=id+':'+action+':'+Math.floor(now/600000);
 await stmt('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=limits.count+1',key,now+600000).run();
 const r=await one('SELECT count FROM limits WHERE key=?',key);
 must(r.count<=max,'Bạn thao tác hơi nhanh. Hãy thử lại sau ít phút.');
 if(Math.random()<.05)await stmt('DELETE FROM limits WHERE key IN (SELECT key FROM limits WHERE expires<? LIMIT 100)',now).run();
}

async function photoCheck(ids:any,u:any){
 must(Array.isArray(ids)&&ids.length<=5,'Tối đa 5 ảnh.');
 for(const id of ids)must(typeof id==='string'&&await one("SELECT id FROM photos WHERE id=? AND owner=? AND mime IN ('image/jpeg','image/png')",id,u.userId),'Ảnh không thuộc tài khoản của bạn.');
 return ids;
}

async function countTypes(){
 const r=await one(`SELECT COUNT(DISTINCT t.id) n FROM food_types t JOIN offerings o ON o.type=t.id JOIN restaurants r ON r.id=o.restaurant WHERE t.status='approved' AND o.status='approved' AND r.status='active' AND EXISTS(SELECT 1 FROM reviews v WHERE v.offering=o.id AND v.status='approved')`);
 return r.n as number;
}

async function filteredCatalog(params:URLSearchParams,owner?:string,restaurantId?:string){
 if(params.get('saved')==='1'&&!owner)return [];
 const conditions:string[]=[],values:any[]=[];
 if(restaurantId){conditions.push('r.id=?');values.push(restaurantId)}
 if(params.get('saved')==='1'){conditions.push("EXISTS (SELECT 1 FROM saves s WHERE s.owner=? AND ((s.kind='dish' AND s.target=o.id) OR (s.kind='restaurant' AND s.target=r.id)))");values.push(owner)}
 const rows=await all(`SELECT o.id,o.restaurant,o.type,o.name,o.category,o.meal,o.vegetarian,o.status,o.created,r.name restaurant_name,r.address,r.city,r.district,r.lat,r.lng,r.hours,r.front,t.name type_name,v.total,v.portions,v.people,v.unit,v.date price_date,v.photos,v.id latest_review,(SELECT AVG(v2.rating) FROM reviews v2 WHERE v2.offering=o.id AND v2.status='approved') rating,(SELECT COUNT(*) FROM reviews v2 WHERE v2.offering=o.id AND v2.status='approved') review_count FROM offerings o JOIN restaurants r ON r.id=o.restaurant JOIN food_types t ON t.id=o.type JOIN reviews v ON v.id=(SELECT vv.id FROM reviews vv WHERE vv.offering=o.id AND vv.status='approved' ORDER BY vv.date DESC,vv.updated DESC LIMIT 1) WHERE o.status='approved' AND r.status='active' AND t.status='approved' ${conditions.length?' AND '+conditions.join(' AND '):''} ORDER BY v.date DESC,v.updated DESC,o.id ASC`,...values);
 const q=canonical(params.get('q')||''),city=canonical(params.get('city')||''),district=canonical(params.get('district')||''),min=Number(params.get('min')||0),max=Number(params.get('max')||1e9),selected=params.getAll('food'),family=params.get('family'),cat=params.get('category'),meal=params.get('meal'),lat=Number(params.get('lat')),lng=Number(params.get('lng')),geo=params.has('lat')&&params.has('lng')&&Number.isFinite(lat)&&Number.isFinite(lng),radius=Math.max(0,Number(params.get('radius')||5));
 return rows.map(r=>({...r,photos:JSON.parse(r.photos),price:Math.round(r.total/(r.unit==='nguoi'?r.people:r.unit==='phan'?r.portions:1)),distance:geo?haversine(lat,lng,r.lat,r.lng):null})).filter(r=>(!q||canonical(r.name+' '+r.restaurant_name+' '+r.type_name).includes(q))&&(!city||canonical(r.city).includes(city))&&(!district||canonical(r.district+' '+r.address).includes(district))&&r.price>=min&&r.price<max&&(!cat||r.category===cat)&&matchesDiscovery(r,selected,family)&&(!meal||r.meal.split(',').includes(meal))&&(params.get('veg')!=='1'||r.vegetarian===1)&&(params.get('front')!=='1'||r.front)&&(!geo||r.distance<=radius)).sort((a,b)=>geo?a.distance-b.distance:0);
}

async function catalog(params:URLSearchParams,owner?:string){return paginate(await filteredCatalog(params,owner),params)}

async function readLimited(req:Request,max:number){
 const reader=req.body?.getReader();if(!reader)return new Uint8Array();
 let size=0;const chunks:Uint8Array[]=[];
 while(true){
  const {done,value}=await reader.read();if(done)break;size+=value.length;
  if(size>max){await reader.cancel();throw Error('Dữ liệu vượt giới hạn cho phép.')}
  chunks.push(value);
 }
 const out=new Uint8Array(size);let n=0;
 for(const c of chunks){out.set(c,n);n+=c.length}
 return out;
}

async function handle(req:Request,method:string){try{
 const checkAbuse=(data:any)=>reviewAbuse({...data,ip:req.headers.get('x-hnag-client-ip')},{one,all,stmt,must});
 const url=new URL(req.url),path=url.pathname.replace(/^\/api\//,'').split('/'),u=await getUser(req),role=getAdminRole(u,env as any),admin=role!==null;

 const clientIpAddr=req.headers.get('x-hnag-client-ip');
 if(clientIpAddr){
  try{
   const blocked=await one('SELECT 1 FROM blocked_ips WHERE ip=?',clientIpAddr);
   if(blocked)return json({error:'Địa chỉ IP của bạn đã bị chặn do vi phạm chính sách cộng đồng.'},403);
  }catch{}
 }
 if(u){
  try{
   const banned=await one('SELECT disabled FROM account_access WHERE google_uid=?',u.userId.replace(/^firebase:/,''));
   if(banned&&banned.disabled)return json({error:'Tài khoản của bạn đã bị khóa do vi phạm chính sách cộng đồng.'},403);
  }catch{}
 }

 if(method==='GET'){
  if(path[0]==='place')return await placeRead(path[1],url.searchParams,u,{one,all,json});
  if(path[0]==='backup'){
   if(role!=='superadmin')return json({error:'Bạn không có quyền quản trị.'},403);
   const day=url.searchParams.get('day')||new Date().toISOString().slice(0,10);
   must(/^\d{4}-\d{2}-\d{2}$/.test(day),'Ngày không hợp lệ.');
   const file=await env.BUCKET?.get('backups/'+day+'.json');
   if(!file)return json({error:'Chưa có bản sao cho ngày này. Bản sao tự tạo sau thao tác ghi thành công đầu tiên trong ngày.'},404);
   return new Response(file.body,{headers:{'Content-Type':'application/json','Content-Disposition':`attachment; filename="hom-nay-an-gi-${day}.json"`,'Cache-Control':'private,no-store','X-Content-Type-Options':'nosniff'}});
  }
  if(path[0]==='state'){
   const n=await countTypes();
   let topContributors:any[]=[];
   try{
    topContributors=await all(`
     SELECT author, owner, COUNT(*) as count,
       SUM(CASE WHEN kind='place' THEN 1 ELSE 0 END) as places,
       SUM(CASE WHEN kind='dish' THEN 1 ELSE 0 END) as dishes
     FROM (
       SELECT author, owner, 'dish' as kind FROM reviews WHERE status='approved'
       UNION ALL
       SELECT author, owner, 'place' as kind FROM place_reviews WHERE status='approved'
     ) sub
     GROUP BY owner, author
     ORDER BY count DESC, author ASC
     LIMIT 5
    `);
   }catch{}
   return json({
    authProvider,
    user:u?{id:u.userId,name:u.fullName||'Thành viên '+u.userId.slice(-5),admin,role}:null,
    eligibleTypes:n,
    unlocked:n>=10,
    topContributors,
    ...await catalog(url.searchParams,u?.userId),
    cities:(await all("SELECT DISTINCT city FROM restaurants WHERE status='active' ORDER BY city")).map(r=>r.city),
    saved:u?await all('SELECT kind,target FROM saves WHERE owner=?',u.userId):[]
   });
  }
  if(path[0]==='detail'){
   const id=path[1];
   const item=await one("SELECT o.id,o.restaurant,o.type,o.name,o.category,o.meal,o.vegetarian,o.status,o.created,r.name restaurant_name,r.address,r.city,r.district,r.lat,r.lng,r.hours,r.front FROM offerings o JOIN restaurants r ON r.id=o.restaurant JOIN food_types t ON t.id=o.type WHERE o.id=? AND o.status='approved' AND r.status='active' AND t.status='approved'",id);
   must(item,'Món này chưa công khai hoặc quán đã ngừng hoạt động.');
   const rr=await all(`SELECT v.id,v.author,v.owner,v.date,v.total,v.portions,v.people,v.unit,v.rating,v.taste,v.portion,v.value,v.photos,v.sponsored,v.updated,(SELECT COUNT(*) FROM votes WHERE review=v.id) helpful FROM reviews v WHERE offering=? AND status='approved' ORDER BY date DESC,updated DESC`,id);
   return json({item,siblings:await filteredCatalog(new URLSearchParams(),undefined,item.restaurant),reviews:rr.map(v=>({...v,photos:JSON.parse(v.photos)})),history:await all("SELECT h.date,h.total,h.portions,h.people,h.unit FROM price_history h JOIN reviews v ON v.id=h.review WHERE v.offering=? AND v.status='approved' ORDER BY h.date DESC LIMIT 40",id)});
  }
  if(path[0]==='photo'){
   const id=path[1];must(/^[a-zA-Z0-9_-]{1,100}$/.test(id),'Mã ảnh không hợp lệ.');const p=await one('SELECT * FROM photos WHERE id=?',id);must(p,'Không tìm thấy ảnh.');
   const visible=await one("SELECT v.id FROM reviews v JOIN offerings o ON o.id=v.offering JOIN restaurants r ON r.id=o.restaurant JOIN food_types t ON t.id=o.type WHERE v.status='approved' AND o.status='approved' AND r.status='active' AND t.status='approved' AND v.photos LIKE ? LIMIT 1",'%"'+id+'"%')||await one("SELECT p.id FROM place_reviews p JOIN restaurants r ON r.id=p.restaurant WHERE p.status='approved' AND r.status='active' AND p.media LIKE ? LIMIT 1",'%"'+id+'"%')||await one("SELECT id FROM restaurants WHERE status='active' AND front=?",id);
   if(!visible&&p.owner!==u?.userId&&!admin)return json({error:'Ảnh chưa công khai'},403);
   must(['image/jpeg','image/png'].includes(p.mime),'Chỉ hỗ trợ ảnh JPEG/PNG.');const f=await env.BUCKET?.get(id);if(!f)return json({error:'Không tìm thấy ảnh'},404);
   return new Response(f.body,{headers:{'Content-Type':p.mime,'Cache-Control':visible?'public,max-age=300':'private,no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'"}});
  }
  if(path[0]==='lookups'){
   if(!u)return json({error:'Bạn cần đăng nhập.'},401);
   const q='%'+text(url.searchParams.get('q'),100)+'%';
   return json({types:await all("SELECT id,name FROM food_types WHERE status='approved' ORDER BY name LIMIT 200"),restaurants:await all("SELECT id,name,address,city,district,lat,lng,hours FROM restaurants WHERE status='active' AND (name LIKE ? OR address LIKE ? OR city LIKE ?) ORDER BY name LIMIT 200",q,q,q)});
  }
  if(path[0]==='mine'){
   if(!u)return json({error:'Bạn cần đăng nhập.'},401);
   return json({placeReviews:await all('SELECT v.*,r.name restaurant_name FROM place_reviews v JOIN restaurants r ON r.id=v.restaurant WHERE v.owner=? ORDER BY v.updated DESC',u.userId),reviews:await all('SELECT v.*,o.name dish,r.name restaurant_name FROM reviews v JOIN offerings o ON o.id=v.offering JOIN restaurants r ON r.id=o.restaurant WHERE v.owner=? ORDER BY v.updated DESC',u.userId)});
  }
  if(path[0]==='admin'){
   if(!admin)return json({error:'Bạn không có quyền quản trị.'},403);
   let blockedIps:any[]=[],bannedUsers:any[]=[];
   try{blockedIps=await all('SELECT * FROM blocked_ips ORDER BY created DESC LIMIT 100')}catch{}
   try{bannedUsers=await all('SELECT u.id, u.email, u.display_name, a.disabled, a.revoked_before FROM app_users u JOIN account_access a ON a.google_uid=u.google_uid WHERE a.disabled=1 LIMIT 100')}catch{}
   return json({
    role,
    networkDetection:{available:!!req.headers.get('x-hnag-client-ip')},
    placeQueue:await all("SELECT v.*,(SELECT flags FROM review_events WHERE target=v.id ORDER BY created DESC LIMIT 1) risk_flags,r.name restaurant_name,r.address,r.city,r.district FROM place_reviews v JOIN restaurants r ON r.id=v.restaurant WHERE v.status!='deleted' ORDER BY CASE v.status WHEN 'pending' THEN 0 ELSE 1 END,v.updated DESC LIMIT 200"),
    queue:await all("SELECT v.*,(SELECT flags FROM review_events WHERE target=v.id ORDER BY created DESC LIMIT 1) risk_flags,o.name dish,o.category,t.name type_name,o.type,o.restaurant,r.name restaurant_name,r.address,r.city,r.district FROM reviews v JOIN offerings o ON o.id=v.offering JOIN food_types t ON t.id=o.type JOIN restaurants r ON r.id=o.restaurant WHERE v.status!='deleted' ORDER BY CASE v.status WHEN 'pending' THEN 0 ELSE 1 END,v.updated DESC LIMIT 200"),
    blockedIps,
    bannedUsers,
    types:role==='superadmin'?await all('SELECT * FROM food_types ORDER BY name'):[],
    restaurants:role==='superadmin'?await all('SELECT * FROM restaurants ORDER BY created DESC LIMIT 300'):[],
    reports:await all("SELECT * FROM reports WHERE status='open' ORDER BY created DESC"),
    audit:role==='superadmin'?await all('SELECT action,target,reason,created FROM audit ORDER BY created DESC LIMIT 60'):[]
   });
  }
  return json({error:'Không tìm thấy.'},404);
 }

 const origin=req.headers.get('origin');if(!origin||origin!==url.origin)return json({error:'Yêu cầu không hợp lệ.'},403);
 if(path[0]==='random'){
  if(!u)return json({error:'Đăng nhập để chọn quán.'},401);await limit(u.userId,'random',60);const n=await countTypes();if(n<10)return json({error:`Mới có ${n}/10 loại món hợp lệ.`,eligibleTypes:n},409);
  let items=await filteredCatalog(url.searchParams,u.userId);const ids=[...new Set(items.map(i=>i.restaurant))],exclude=url.searchParams.get('exclude');let pool=ids.length>1?ids.filter(i=>i!==exclude):ids;must(pool.length,'Chưa có quán phù hợp. Hãy điều chỉnh bộ lọc.');const array=new Uint32Array(1),bound=Math.floor(0x100000000/pool.length)*pool.length;do{crypto.getRandomValues(array)}while(array[0]>=bound);const id=pool[array[0]%pool.length];return json({item:items.find(i=>i.restaurant===id),count:ids.length});
 }
 if(!u)return json({error:'Bạn cần đăng nhập để tiếp tục.'},401);
 if(path[0]==='upload'){
  await limit(u.userId,'upload',20);must(Number(req.headers.get('content-length')||0)<=3_000_000,'Ảnh quá lớn.');const b=await readLimited(req,3_000_000);const img=cleanImage(b),id=uuid();must(env.BUCKET,'Kho ảnh chưa được kết nối.');await env.BUCKET!.put(id,img.data,{httpMetadata:{contentType:img.mime}});await stmt('INSERT INTO photos(id,owner,mime,created) VALUES(?,?,?,?)',id,u.userId,img.mime,Date.now()).run();return json({id});
 }
 must(Number(req.headers.get('content-length')||0)<40000,'Dữ liệu quá lớn.');const b:any=JSON.parse(new TextDecoder().decode(await readLimited(req,40000)));await limit(u.userId,'write',35);
 if(path[0]==='resolve-maps'){
  const rawUrl=text(b.url,2000);must(rawUrl,'Vui lòng nhập liên kết Google Maps.');
  try{
   let target=rawUrl;
   if(isShortGoogleMapsUrl(target)){
    const res=await fetch(target,{method:'GET',redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'}});
    target=res.url;
   }
   const parsed=extractMapsCoords(target);
   must(parsed,'Không tìm thấy tọa độ trong liên kết này. Hãy thử liên kết đầy đủ hoặc bấm bản đồ.');
   return json({lat:parsed!.lat,lng:parsed!.lng,name:parsed!.name||'',url:target});
  }catch(err:any){
   return json({error:err.message||'Không thể trích xuất liên kết Google Maps.'},400);
  }
 }
 if(path[0]==='place-reviews')return await placeWrite(method,b,u,{one,stmt,db,must,text,json,uuid,checkAbuse});
 if(path[0]==='reviews'&&method==='POST'){
  const now=Date.now(),author=text(b.author,60),date=text(b.date,10),rating=Number(b.rating),total=Number(b.total),portions=Number(b.portions),people=Number(b.people),unit=text(b.unit,10),photos=await photoCheck(b.photos,u);
  must(author.length>=2,'Nhập tên hiển thị ít nhất 2 ký tự.');must(/^\d{4}-\d{2}-\d{2}$/.test(date)&&!isNaN(Date.parse(date))&&date<=new Date().toISOString().slice(0,10),'Ngày trải nghiệm không hợp lệ.');must(Number.isInteger(rating)&&rating>=1&&rating<=5,'Điểm từ 1 đến 5.');must(Number.isInteger(total)&&total>=1000&&total<=100000000,'Số tiền từ 1.000 đến 100.000.000 đồng.');must(Number.isInteger(portions)&&portions>=1&&portions<=100&&Number.isInteger(people)&&people>=1&&people<=100,'Số người và số phần từ 1 đến 100.');must(['phan','nguoi','combo'].includes(unit),'Đơn vị giá không hợp lệ.');must(photos.length>=1,'Thêm ít nhất một ảnh bạn tự chụp.');const taste=text(b.taste,1200),portion=text(b.portion,600),value=text(b.value,600);must(taste.length>=20,'Mô tả hương vị ít nhất 20 ký tự.');
  let restaurant=text(b.restaurant,100),type='',offering=text(b.offering,100);let ops:any[]=[];
  if(offering){const o=await one("SELECT * FROM offerings WHERE id=? AND status='approved'",offering);must(o,'Món chưa được duyệt.');restaurant=o.restaurant;type=o.type;}
  else {
   const dish=text(b.dish,100),tn=text(b.typeName,70),category=text(b.category,30),meal=text(b.meal,60);must(dish.length>=2&&canonical(tn).length>=2,'Nhập tên món và loại món.');must(POST_CATEGORIES.includes(category),'Chọn nhóm món hợp lệ.');must(meal.split(',').every((m:string)=>['Sáng','Trưa','Tối','Ăn khuya'].includes(m)),'Chọn bữa ăn.');
   if(restaurant){must(await one("SELECT id FROM restaurants WHERE id=? AND status='active'",restaurant),'Quán chưa được duyệt.');}
   else {const name=text(b.restaurantName,100),address=text(b.address,250),city=text(b.city,80),district=text(b.district,80),lat=Number(b.lat),lng=Number(b.lng),front=text(b.front,100),hours=text(b.hours,150);must(name.length>=2&&address.length>=5&&city&&district,'Nhập đủ tên quán, địa chỉ và khu vực.');must(b.lat!==''&&b.lng!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180,'Ghim vị trí quán trên bản đồ.');if(front)await photoCheck([front],u);const existing=await all("SELECT id,name,address FROM restaurants WHERE city=? AND status!='merged'",city);must(!existing.some(r=>canonical(r.name)===canonical(name)&&canonical(r.address)===canonical(address)),'Quán đã tồn tại. Hãy chọn quán trong danh sách.');restaurant=uuid();ops.push(stmt('INSERT INTO restaurants(id,name,address,city,district,lat,lng,hours,front,status,owner,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',restaurant,name,address,city,district,lat,lng,hours,front,'pending',u.userId,now));}
   const t=await one('SELECT * FROM food_types WHERE key=?',canonical(tn));if(t){must(t.status!=='hidden','Loại món này đang bị ẩn.');type=t.id}else{type=uuid();ops.push(stmt('INSERT INTO food_types(id,name,key,status,owner) VALUES(?,?,?,?,?)',type,tn,canonical(tn),'pending',u.userId));}
   const old=await one('SELECT id FROM offerings WHERE restaurant=? AND type=? AND name=?',restaurant,type,dish);offering=old?.id||uuid();if(!old)ops.push(stmt('INSERT INTO offerings(id,restaurant,type,name,category,meal,vegetarian,status,owner,created) VALUES(?,?,?,?,?,?,?,?,?,?)',offering,restaurant,type,dish,category,meal,b.vegetarian?1:0,'pending',u.userId,now));
  }
  const prev=await one("SELECT id,owner FROM reviews WHERE owner=? AND offering=? AND status!='deleted'",u.userId,offering);must(!prev,'Bạn đã đánh giá món này. Hãy cập nhật bài cũ ở mục Của tôi.');if(b.front)await photoCheck([b.front],u);const id=uuid();await checkAbuse({owner:u.userId,restaurant,target:id,content:taste});ops.push(stmt('INSERT INTO reviews(id,offering,owner,author,date,total,portions,people,unit,rating,taste,portion,value,photos,front,sponsored,status,reason,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',id,offering,u.userId,author,date,total,portions,people,unit,rating,taste,portion,value,JSON.stringify(photos),text(b.front,100),b.sponsored?1:0,'pending','',now,now));ops.push(stmt('INSERT INTO price_history(id,review,date,total,portions,people,unit,created) VALUES(?,?,?,?,?,?,?,?)',uuid(),id,date,total,portions,people,unit,now));await db().batch(ops);return json({id,message:'Đã gửi trải nghiệm. Bài và địa điểm mới sẽ hiển thị sau khi được duyệt.'});
 }
 if(path[0]==='reviews'&&['PATCH','DELETE'].includes(method)){
  const r=await one('SELECT * FROM reviews WHERE id=? AND owner=? AND status!=?',text(b.id,100),u.userId,'deleted');must(r,'Không tìm thấy bài của bạn.');if(method==='DELETE'){await stmt("UPDATE reviews SET status='deleted',updated=? WHERE id=? AND owner=?",Date.now(),r.id,u.userId).run();return json({ok:true,message:'Đã xóa bài đánh giá và khôi phục 1 lượt đánh giá.'});}
  const taste=text(b.taste,1200),portion=text(b.portion,600),value=text(b.value,600),rating=Number(b.rating),total=Number(b.total),portions=Number(b.portions),people=Number(b.people),unit=text(b.unit,10),date=text(b.date,10);must(taste.length>=20&&Number.isInteger(rating)&&rating>=1&&rating<=5,'Nhận xét ít nhất 20 ký tự; điểm từ 1 đến 5.');must(Number.isInteger(total)&&total>=1000&&total<=1e8&&Number.isInteger(portions)&&portions>=1&&portions<=100&&Number.isInteger(people)&&people>=1&&people<=100&&['phan','nguoi','combo'].includes(unit),'Giá hoặc số phần/người không hợp lệ.');must(/^\d{4}-\d{2}-\d{2}$/.test(date)&&!isNaN(Date.parse(date))&&date<=new Date().toISOString().slice(0,10),'Ngày không hợp lệ.');const place=await one('SELECT restaurant FROM offerings WHERE id=?',r.offering);await checkAbuse({owner:u.userId,restaurant:place.restaurant,target:r.id,content:taste});await db().batch([stmt("UPDATE reviews SET date=?,rating=?,total=?,portions=?,people=?,unit=?,taste=?,portion=?,value=?,sponsored=?,status='pending',reason='',updated=? WHERE id=? AND owner=?",date,rating,total,portions,people,unit,taste,portion,value,b.sponsored?1:0,Date.now(),r.id,u.userId),stmt('INSERT INTO price_history(id,review,date,total,portions,people,unit,created) VALUES(?,?,?,?,?,?,?,?)',uuid(),r.id,date,total,portions,people,unit,Date.now())]);return json({message:'Bài cập nhật đang chờ duyệt. Lịch sử giá vẫn được giữ.'});
 }
 if(path[0]==='save'){const kind=text(b.kind,20),target=text(b.target,100);must(['dish','restaurant'].includes(kind),'Loại lưu không hợp lệ.');must(await one(kind==='dish'?"SELECT id FROM offerings WHERE id=? AND status='approved'":"SELECT id FROM restaurants WHERE id=? AND status='active'",target),'Nội dung chưa công khai.');const old=await one('SELECT id FROM saves WHERE owner=? AND kind=? AND target=?',u.userId,kind,target);if(old)await stmt('DELETE FROM saves WHERE id=? AND owner=?',old.id,u.userId).run();else await stmt('INSERT INTO saves(id,owner,kind,target) VALUES(?,?,?,?)',uuid(),u.userId,kind,target).run();return json({saved:!old});}
 if(path[0]==='helpful'){const id=text(b.id,100);must(await one("SELECT id FROM reviews WHERE id=? AND status='approved' AND owner!=?",id,u.userId)||await one("SELECT p.id FROM place_reviews p JOIN restaurants r ON r.id=p.restaurant WHERE p.id=? AND p.status='approved' AND r.status='active' AND p.owner!=?",id,u.userId),'Chỉ đánh dấu hữu ích cho bài công khai của thành viên khác.');const old=await one('SELECT id FROM votes WHERE owner=? AND review=?',u.userId,id);if(old)await stmt('DELETE FROM votes WHERE id=?',old.id).run();else await stmt('INSERT INTO votes(id,owner,review) VALUES(?,?,?)',uuid(),u.userId,id).run();return json({ok:true});}
 if(path[0]==='report'){const target=text(b.target,100),reason=text(b.reason,600);must(reason.length>=10,'Mô tả lý do ít nhất 10 ký tự.');must(await one("SELECT id FROM reviews WHERE id=? AND status='approved'",target)||await one("SELECT id FROM place_reviews WHERE id=? AND status='approved'",target)||await one('SELECT id FROM restaurants WHERE id=?',target),'Không tìm thấy nội dung.');const existingReport=await one('SELECT id FROM reports WHERE owner=? AND target=?',u.userId,target);must(!existingReport,'Bạn đã gửi báo cáo cho nội dung này rồi.');await stmt("INSERT INTO reports(id,owner,target,reason,status,created) VALUES(?,?,?,?,'open',?)",uuid(),u.userId,target,reason,Date.now()).run();return json({message:'Đã gửi báo cáo đến quản trị viên.'});}

 if(path[0]==='admin'){
  if(!admin)return json({error:'Bạn không có quyền quản trị.'},403);
  const action=text(b.action,30),id=text(b.id,100),reason=text(b.reason,600);
  if(!canAdminAction(role,action))return json({error:'Bạn không có quyền thực hiện thao tác này.'},403);
  let ops:any[]=[];
  let replyMessage='Đã cập nhật.';

  if(action==='deleteReview'){
   if(b.kind==='place'){
    const v=await one("SELECT id FROM place_reviews WHERE id=? AND status!='deleted'",id);must(v,'Không tìm thấy đánh giá.');
    ops.push(stmt("UPDATE place_reviews SET status='deleted',reason=?,updated=? WHERE id=?",reason||'Admin đã xóa vi phạm',Date.now(),id));
   }else{
    const v=await one("SELECT id FROM reviews WHERE id=? AND status!='deleted'",id);must(v,'Không tìm thấy bài.');
    ops.push(stmt("UPDATE reviews SET status='deleted',reason=?,updated=? WHERE id=?",reason||'Admin đã xóa vi phạm',Date.now(),id));
   }
   replyMessage='Đã xóa bài đánh giá và khôi phục lại lượt đăng cho người dùng.';
  }
  else if(action==='banUser'){
   const targetUid=text(b.userId||b.googleUid||id,128).replace(/^firebase:/,'');
   must(targetUid,'Mã tài khoản không hợp lệ.');
   ops.push(
    stmt("INSERT INTO account_access(google_uid,disabled,revoked_before) VALUES(?,1,?) ON CONFLICT(google_uid) DO UPDATE SET disabled=1,revoked_before=excluded.revoked_before",targetUid,Date.now()),
    stmt("DELETE FROM app_sessions WHERE user_id=? OR user_id=?",'firebase:'+targetUid,targetUid)
   );
   replyMessage='Đã khóa tài khoản và hủy toàn bộ phiên đăng nhập.';
  }
  else if(action==='unbanUser'){
   const targetUid=text(b.userId||b.googleUid||id,128).replace(/^firebase:/,'');
   must(targetUid,'Mã tài khoản không hợp lệ.');
   ops.push(stmt("UPDATE account_access SET disabled=0 WHERE google_uid=?",targetUid));
   replyMessage='Đã mở khóa tài khoản thành công.';
  }
  else if(action==='blockIp'){
   const targetIp=text(b.ip,100);must(targetIp,'Địa chỉ IP không hợp lệ.');
   ops.push(stmt("INSERT INTO blocked_ips(ip,reason,created) VALUES(?,?,?) ON CONFLICT(ip) DO UPDATE SET reason=excluded.reason",targetIp,text(reason||'Admin chặn IP vi phạm',250),Date.now()));
   replyMessage='Đã chặn địa chỉ IP: '+targetIp;
  }
  else if(action==='unblockIp'){
   const targetIp=text(b.ip,100);must(targetIp,'Địa chỉ IP không hợp lệ.');
   ops.push(stmt("DELETE FROM blocked_ips WHERE ip=?",targetIp));
   replyMessage='Đã gỡ chặn địa chỉ IP: '+targetIp;
  }
  else if((action==='approve'||action==='hide')&&b.kind==='place'){
   const v=await one("SELECT id FROM place_reviews WHERE id=? AND status!='deleted'",id);must(v,'Không tìm thấy đánh giá.');
   if(action==='hide')must(reason.length>=5,'Nhập lý do ẩn.');
   ops.push(stmt('UPDATE place_reviews SET status=?,reason=?,updated=? WHERE id=?',action==='approve'?'approved':'hidden',reason,Date.now(),id));
  }
  else if(action==='approve'||action==='hide'){
   const v=await one("SELECT v.*,o.type,o.restaurant FROM reviews v JOIN offerings o ON o.id=v.offering WHERE v.id=? AND v.status!='deleted'",id);
   must(v,'Không tìm thấy bài.');
   if(action==='hide')must(reason.length>=5,'Nhập lý do ẩn.');
   ops.push(stmt('UPDATE reviews SET status=?,reason=?,updated=? WHERE id=?',action==='approve'?'approved':'hidden',reason,Date.now(),id));
   if(action==='approve')ops.push(stmt("UPDATE restaurants SET status='active' WHERE id=? AND status='pending'",v.restaurant),stmt("UPDATE food_types SET status='approved' WHERE id=? AND status='pending'",v.type),stmt("UPDATE offerings SET status='approved' WHERE id=? AND status='pending'",v.offering));
   if(action==='approve'&&v.front)ops.push(stmt('UPDATE restaurants SET front=? WHERE id=?',v.front,v.restaurant));
  }
  else if(action==='restaurant'){
   must(await one('SELECT id FROM restaurants WHERE id=?',id),'Không tìm thấy quán.');
   must(['active','closed','pending'].includes(b.status),'Trạng thái quán không hợp lệ.');
   const lat=Number(b.lat),lng=Number(b.lng);
   must(b.lat!==''&&b.lng!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180,'Tọa độ không hợp lệ.');
   const name=text(b.name,100),address=text(b.address,250),city=text(b.city,80),district=text(b.district,80);
   must(name&&address&&city&&district,'Thiếu thông tin quán.');
   ops.push(stmt('UPDATE restaurants SET name=?,address=?,city=?,district=?,lat=?,lng=?,hours=?,status=? WHERE id=?',name,address,city,district,lat,lng,text(b.hours,150),b.status,id));
  }
  else if(action==='mergeType'){
   const target=text(b.target,100);must(target!==id&&await one('SELECT id FROM food_types WHERE id=?',target)&&await one('SELECT id FROM food_types WHERE id=?',id),'Chọn hai loại khác nhau.');
   const rows=await all('SELECT id,restaurant,name FROM offerings WHERE type=?',id);
   for(const o of rows)must(!await one('SELECT id FROM offerings WHERE type=? AND restaurant=? AND name=?',target,o.restaurant,o.name),'Có món trùng tại cùng quán. Hãy xử lý món trùng trước khi gộp.');
   ops.push(stmt('UPDATE offerings SET type=? WHERE type=?',target,id),stmt("UPDATE food_types SET status='hidden' WHERE id=?",id));
  }
  else if(action==='type'){
   must(['approved','pending','hidden'].includes(b.status),'Trạng thái loại không hợp lệ.');
   const name=text(b.name,70);must(canonical(name).length>=2,'Tên loại quá ngắn.');
   ops.push(stmt('UPDATE food_types SET name=?,key=?,status=? WHERE id=?',name,canonical(name),b.status,id));
  }
  else if(action==='mergeRestaurant'){
   const target=text(b.target,100);must(target!==id&&await one("SELECT id FROM restaurants WHERE id=? AND status!='merged'",target)&&await one('SELECT id FROM restaurants WHERE id=?',id),'Chọn hai quán khác nhau.');
   const duplicates=await one("SELECT owner FROM place_reviews WHERE restaurant IN (?,?) AND status!='deleted' GROUP BY owner HAVING COUNT(*)>10 LIMIT 1",id,target);
   must(!duplicates,'Gộp quán sẽ vượt giới hạn 10 bài mỗi tài khoản. Không thể gộp.');
   ops.push(stmt('UPDATE place_reviews SET restaurant=? WHERE restaurant=?',target,id));
   const rows=await all('SELECT type,name FROM offerings WHERE restaurant=?',id);
   for(const o of rows)must(!await one('SELECT id FROM offerings WHERE restaurant=? AND type=? AND name=?',target,o.type,o.name),'Hai quán có món trùng. Hãy xử lý món trùng trước khi gộp.');
   ops.push(stmt('UPDATE offerings SET restaurant=? WHERE restaurant=?',target,id),stmt("UPDATE restaurants SET status='merged' WHERE id=?",id),stmt('DELETE FROM saves WHERE target=? AND kind=?',id,'restaurant'));
  }
  else if(action==='resolve')ops.push(stmt("UPDATE reports SET status='resolved' WHERE id=?",id));
  else throw Error('Thao tác không hợp lệ.');

  ops.push(stmt('INSERT INTO audit(id,actor,action,target,reason,created) VALUES(?,?,?,?,?,?)',uuid(),u.userId,action,id,reason,Date.now()));
  await db().batch(ops);
  return json({message:replyMessage});
 }
 return json({error:'Không tìm thấy thao tác.'},404);
 }catch(e:any){
  if(e?.status===429){const response=json({error:e.message,retryAfter:e.retryAfter},429);response.headers.set('Retry-After',String(e.retryAfter));return response;}
  const message=e?.message||'';
  if(e?.code==='23505')return json({error:'Dữ liệu đã tồn tại.'},409);
  if(['40001','40P01','55P03','57014','53300','08006','ECONNREFUSED'].includes(e?.code))return json({error:'Máy chủ đang bận. Vui lòng thử lại.'},503);
  if(e?.severity&&e?.code&&!message.includes('PLACE_REVIEW_LIMIT'))return json({error:'Máy chủ chưa thể xử lý dữ liệu.'},500);
  if(message.includes('PLACE_REVIEW_LIMIT'))return json({error:'Bạn đã đạt giới hạn 10 bài đánh giá cho quán này.'},409);
  if(/UNIQUE constraint.*reports\.owner.*reports\.target/i.test(message))return json({error:'Bạn đã gửi báo cáo cho nội dung này rồi.'},409);
  if(/UNIQUE constraint/.test(message))return json({error:'Dữ liệu đã tồn tại. Hãy tải lại và chọn bản ghi có sẵn.'},409);
  if(e?.code==='SQLITE_BUSY'||/database is locked/i.test(message)){const retry=json({error:'Máy chủ đang bận. Vui lòng thử lại.'},503);retry.headers.set('Retry-After','1');return retry}
  if(/SQL|D1_|no such|binding|constraint|database|ENOENT|ENOSPC|EACCES|EPERM|EIO/i.test(message))return json({error:'Máy chủ chưa thể xử lý yêu cầu.'},500);
  if(e instanceof SyntaxError)return json({error:'Dữ liệu JSON không hợp lệ.'},400);
  return json({error:message||'Có lỗi xảy ra.'},400);
 }}
 return async(req:Request)=>{const response=await handle(req,req.method==='HEAD'?'GET':req.method);if(req.method==='HEAD'){await response.body?.cancel();return new Response(null,response)}return response};
}
