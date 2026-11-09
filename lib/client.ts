export const money=(v:number)=>new Intl.NumberFormat('vi-VN').format(v)+'đ';
export const unit=(s:string)=>s==='nguoi'?'người':s==='combo'?'combo':'phần';
export const photo=(id:string)=>'/api/photo/'+id;
export const date=(v:string|number)=>new Date(v).toLocaleDateString('vi-VN');

export const budgets=[['Mọi mức giá',''],['Dưới 30k','0:30000'],['30k – dưới 50k','30000:50000'],['50k – dưới 100k','50000:100000'],['100k – dưới 200k','100000:200000'],['Từ 200k','200000:1000000000'],['Tùy chọn','custom']];
export async function api(path:string,method='GET',body?:any):Promise<any>{const r=await fetch('/api/'+path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});const d:any=await r.json();if(!r.ok)throw Error(d.error||'Không thể xử lý yêu cầu.');return d}

export function sitesLogin(){const a=document.createElement('a');a.href='/signin-with-chatgpt?return_to='+encodeURIComponent(location.pathname+location.search);a.target='_top';document.body.appendChild(a);a.click();a.remove()}

export function catalogParams(filter:any,tab:string,geo:any,page=1){const p=new URLSearchParams();p.set('page',String(page));p.set('limit','24');if(tab==='saved')p.set('saved','1');for(const k of ['q','city','district','category','meal'])if(filter[k])p.set(k,filter[k]);for(const id of filter.foods||[])p.append('food',id);if(filter.family!=='all')p.set('family',filter.family);if(filter.budget==='custom'){if(filter.min)p.set('min',filter.min);if(filter.max)p.set('max',filter.max)}else if(filter.budget){const [a,b]=filter.budget.split(':');p.set('min',a);p.set('max',b)}if(filter.veg)p.set('veg','1');if(filter.front)p.set('front','1');if(geo){p.set('lat',geo.lat);p.set('lng',geo.lng);p.set('radius',filter.radius)}return p.toString()}

export function scrollExplore(){document.getElementById('explore')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'})}
