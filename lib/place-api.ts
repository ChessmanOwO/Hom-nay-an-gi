// Same trusted Sites identity and moderation boundary as dish experiences.
export async function placeRead(id:string,p:URLSearchParams,u:any,{one,all,json}:any){
 const item=await one("SELECT id,name,address,city,district,lat,lng,hours,front FROM restaurants WHERE id=? AND status='active'",id);
 if(!item)return json({error:'Quán chưa công khai hoặc đã ngừng hoạt động.'},404);
 const scores=await all("SELECT rating,COUNT(*) count FROM place_reviews WHERE restaurant=? AND status='approved' GROUP BY rating",id);
 const total=scores.reduce((n:number,r:any)=>n+r.count,0),rating=total?scores.reduce((n:number,r:any)=>n+r.rating*r.count,0)/total:null;
 const page=Math.max(1,Math.min(1000000,parseInt(p.get('page')||'1')||1)),size=12;
 const sort=p.get('sort')||'media';
 // Sort expressions are allowlisted; ratings never influence priority.
 const order=sort==='newest'?'v.updated DESC,v.id DESC':sort==='helpful'?'helpful DESC,v.updated DESC,v.id DESC':"CASE WHEN v.photo_count>0 THEN 1 ELSE 0 END DESC,helpful DESC,v.updated DESC,v.id DESC";
 const rows=await all(`SELECT v.id,v.author,v.date,v.rating,v.content,v.media,v.sponsored,v.updated,(SELECT COUNT(*) FROM votes WHERE review=v.id) helpful FROM place_reviews v WHERE restaurant=? AND status='approved' ORDER BY ${order} LIMIT ? OFFSET ?`,id,size,(page-1)*size);
 const mineReviews=u?await all('SELECT * FROM place_reviews WHERE restaurant=? AND owner=? ORDER BY created DESC,id DESC',id,u.userId):[];
 const mine=mineReviews[0]||null;
 return json({mineReviews:mineReviews.map((r:any)=>({...r,media:JSON.parse(r.media)})),reviewLimit:10,reviewCount:mineReviews.length,item,total,rating,scores,page,hasMore:page*size<total,reviews:rows.map((r:any)=>({...r,media:JSON.parse(r.media)})),mine:mine?{...mine,media:JSON.parse(mine.media)}:null});
}
export async function placeWrite(method:string,b:any,u:any,{one,stmt,db,must,text,json,uuid,checkAbuse}:any){
 const id=text(b.id,100),now=Date.now();let old:any=null;
 if(method!=='POST'){old=await one('SELECT * FROM place_reviews WHERE id=? AND owner=?',id,u.userId);must(old&&old.status!=='deleted','Không tìm thấy đánh giá còn hoạt động của bạn.');}
 if(method==='DELETE'){await stmt("UPDATE place_reviews SET status='deleted',updated=? WHERE id=? AND owner=?",now,id,u.userId).run();return json({message:'Đã xóa đánh giá.'});}
 must(['POST','PATCH'].includes(method),'Phương thức không hợp lệ.');
 const restaurant=old?.restaurant||text(b.restaurant,100);must(await one("SELECT id FROM restaurants WHERE id=? AND status='active'",restaurant),'Quán chưa công khai.');
 if(method==='POST'){const count=await one('SELECT COUNT(*) n FROM place_reviews WHERE restaurant=? AND owner=?',restaurant,u.userId);if(count.n>=10)return json({error:'Bạn đã đạt giới hạn 10 bài đánh giá cho quán này. Hãy cập nhật bài cũ.'},409);}
 const author=text(b.author,60),date=text(b.date,10),rating=Number(b.rating),content=text(b.content,2000),ids=b.media;
 must(author.length>=2,'Tên hiển thị ít nhất 2 ký tự.');must(/^\d{4}-\d{2}-\d{2}$/.test(date)&&!isNaN(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date&&date<=new Date().toISOString().slice(0,10),'Ngày ghé quán không hợp lệ.');
 must(Number.isInteger(rating)&&rating>=1&&rating<=5,'Chọn điểm từ 1 đến 5.');must(content.length>=30,'Kể cụ thể trải nghiệm của bạn, ít nhất 30 ký tự.');
 must(Array.isArray(ids)&&ids.length<=5&&new Set(ids).size===ids.length,'Tối đa 5 ảnh khác nhau.');const media=[];let photos=0;
 for(const id of ids){must(typeof id==='string'&&id.length<=100,'Ảnh không hợp lệ.');const p=await one('SELECT id,mime FROM photos WHERE id=? AND owner=?',id,u.userId);must(p,'Ảnh không thuộc tài khoản của bạn.');must(['image/jpeg','image/png'].includes(p.mime),'Định dạng không hỗ trợ.');photos++;media.push({id:p.id,kind:'image'});}
 const reviewId=old?.id||uuid();await checkAbuse({owner:u.userId,restaurant,target:reviewId,content});
 if(old){await stmt("UPDATE place_reviews SET author=?,date=?,rating=?,content=?,media=?,photo_count=?,sponsored=?,status='pending',reason='',updated=? WHERE id=? AND owner=?",author,date,rating,content,JSON.stringify(media),photos,b.sponsored?1:0,now,id,u.userId).run();}
 else{await stmt('INSERT INTO place_reviews(id,restaurant,owner,author,date,rating,content,media,photo_count,sponsored,status,reason,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',reviewId,restaurant,u.userId,author,date,rating,content,JSON.stringify(media),photos,b.sponsored?1:0,'pending','',now,now).run();}
 return json({message:'Đã gửi đánh giá quán để duyệt. Ảnh không đồng nghĩa với đã xác minh.'});
}
