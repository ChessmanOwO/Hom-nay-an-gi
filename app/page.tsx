'use client';
import {useEffect,useRef,useState} from 'react';
import {Soup,Search,MapPin,ArrowUpRight,ArrowRight,Dices,Plus,Heart,Camera,SlidersHorizontal,Map as MapIcon,Grid2X2,X,Star,Check,ChevronDown,LocateFixed,ShieldCheck,UserRound,Bookmark,Flag,ThumbsUp,Share2,Clock,LoaderCircle,UtensilsCrossed,LockKeyhole,CheckCircle2,Info,Sparkles,Coffee} from 'lucide-react';
import dynamic from 'next/dynamic';
import {StateNote} from '../components/FormControls';
import SkeletonCards from '../components/SkeletonCards';
const FoodCard=dynamic(()=>import('../components/FoodCard'),{ssr:false,loading:()=> <div className="food-card skeleton" style={{height:370}}/>});
const CommunityNote=dynamic(()=>import('../components/CommunityNote'),{ssr:false,loading:()=> <div style={{minHeight:220}}/>});
const AccountPanel=dynamic(()=>import('../components/AccountPanel'),{ssr:false});
import FoodMap from '../components/LazyFoodMap';
import {api,money,unit,photo,date,sitesLogin,catalogParams,scrollExplore} from '../lib/client';
const DiscoveryPanel=dynamic(()=>import('../components/DiscoveryPanel'),{ssr:false});
const PostFormModal=dynamic(()=>import('../components/modals/PostFormModal'),{ssr:false});
const AdminModal=dynamic(()=>import('../components/modals/AdminModal'),{ssr:false});
const DetailModal=dynamic(()=>import('../components/modals/DetailModal'),{ssr:false});
const RandomModal=dynamic(()=>import('../components/modals/RandomModal'),{ssr:false});
const RouteGuideModal=dynamic(()=>import('../components/modals/RouteGuideModal'),{ssr:false});
const GoogleAuthLayer=dynamic(()=>import('../components/auth/GoogleAuthLayer'),{ssr:false});
const PlaceModal=dynamic(()=>import('../components/modals/PlaceModal'),{ssr:false});
const AboutModal=dynamic(()=>import('../components/modals/AboutModal'),{ssr:false});
const DonateModal=dynamic(()=>import('../components/modals/DonateModal'),{ssr:false});

const TWINKLE_NODES=[
  {top:'7%',left:'6%',size:22,delay:'0s',dur:'2.4s',tone:'cyan'},
  {top:'14%',left:'28%',size:16,delay:'-0.8s',dur:'2.1s',tone:'mint'},
  {top:'9%',left:'47%',size:24,delay:'-1.4s',dur:'2.7s',tone:'sky'},
  {top:'12%',left:'88%',size:26,delay:'-0.4s',dur:'2.3s',tone:'cyan'},
  {top:'24%',left:'4%',size:18,delay:'-1.9s',dur:'2.6s',tone:'mint'},
  {top:'29%',left:'44%',size:20,delay:'-0.6s',dur:'2.2s',tone:'sky'},
  {top:'36%',left:'93%',size:22,delay:'-1.2s',dur:'2.5s',tone:'mint'},
  {top:'48%',left:'8%',size:24,delay:'-0.3s',dur:'2.4s',tone:'sky'},
  {top:'52%',left:'49%',size:17,delay:'-1.6s',dur:'2.1s',tone:'cyan'},
  {top:'56%',left:'91%',size:25,delay:'-0.9s',dur:'2.8s',tone:'sky'},
  {top:'68%',left:'5%',size:19,delay:'-2.1s',dur:'2.3s',tone:'mint'},
  {top:'74%',left:'89%',size:21,delay:'-0.5s',dur:'2.5s',tone:'cyan'},
  {top:'85%',left:'12%',size:23,delay:'-1.3s',dur:'2.6s',tone:'sky'},
  {top:'88%',left:'84%',size:20,delay:'-1.7s',dur:'2.2s',tone:'mint'}
];

function DiamondStar({className='',size=20}:{className?:string;size?:number}){
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 0C12.7 6.8 17.2 11.3 24 12C17.2 12.7 12.7 17.2 12 24C11.3 17.2 6.8 12.7 0 12C6.8 11.3 11.3 6.8 12 0Z" fill="currentColor"/>
      <circle cx="12" cy="12" r="2.2" fill="#ffffff"/>
    </svg>
  );
}

export default function Home(){
const [data,D]=useState<any>({items:[],types:[],restaurants:[],saved:[],total:0,page:1,hasMore:false,eligibleTypes:0,user:null,unlocked:false}),[loading,L]=useState(true),[loadingMore,LM]=useState(false),[moreError,ME]=useState(''),[error,E]=useState(''),[toast,Toast]=useState(''),[tab,T]=useState('discover'),[mode,M]=useState('grid'),[filter,F]=useState<any>({q:'',city:'',district:'',budget:'',category:'',foods:[],family:'all',meal:'',veg:false,front:false,min:'',max:'',radius:5}),[more,More]=useState(false),[showAllFoods,ShowAllFoods]=useState(false),[geo,Geo]=useState<any>(null),[dialog,S]=useState(''),[detail,Detail]=useState<any>(null),[selected,Select]=useState<any>(null),[edit,Edit]=useState<any>(null),[mine,Mine]=useState<any[]>([]),[randomBusy,RB]=useState(false),[randomResult,RR]=useState<any>(null),[destination,Destination]=useState<any>(null),[placeId,PlaceId]=useState('');const toastTimer=useRef<any>(null),lastRest=useRef(''),catalogVersion=useRef(0),sparkleLayerRef=useRef<HTMLDivElement|null>(null),lastSparkleTs=useRef(0);
function notify(s:string){Toast(s);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>Toast(''),5000)}
function params(page=1){return catalogParams(filter,tab,geo,page)}
async function load(){L(true);try{const d=await api('state?'+params());D(d);E('')}catch(e:any){E(e.message)}finally{L(false)}}
useEffect(()=>{catalogVersion.current++;LM(false);ME('');const c=new AbortController(),timer=setTimeout(async()=>{L(true);try{const r=await fetch('/api/state?'+params(),{signal:c.signal}),d:any=await r.json();if(!r.ok)throw Error(d.error);D(d);E('')}catch(e:any){if(e.name!=='AbortError')E(e.message)}finally{if(!c.signal.aborted)L(false)}},250);return()=>{clearTimeout(timer);c.abort()}},[JSON.stringify(filter),JSON.stringify(geo),tab]);
useEffect(()=>{const id=new URLSearchParams(location.search).get('mon');if(id)open(id);const place=new URLSearchParams(location.search).get('quan');if(place)openPlace(place)},[]);
useEffect(()=>{
  if(typeof window==='undefined')return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(media.matches)return;
  const onMove=(e:PointerEvent)=>{
    document.documentElement.style.setProperty('--mx',`${e.clientX}px`);
    document.documentElement.style.setProperty('--my',`${e.clientY}px`);
    const now=performance.now();
    if(now-lastSparkleTs.current<55||!sparkleLayerRef.current)return;
    lastSparkleTs.current=now;
    const node=document.createElement('span');
    node.className='cursor-sparkle';
    const offsetX=(Math.random()-0.5)*22;
    const offsetY=(Math.random()-0.5)*22;
    node.style.left=`${e.clientX+offsetX}px`;
    node.style.top=`${e.clientY+offsetY}px`;
    node.style.setProperty('--sp-scale',`${(0.65+Math.random()*0.65).toFixed(2)}`);
    sparkleLayerRef.current.appendChild(node);
    window.setTimeout(()=>node.remove(),720);
  };
  window.addEventListener('pointermove',onMove,{passive:true});
  return()=>window.removeEventListener('pointermove',onMove);
},[]);
async function loadMore(){const version=catalogVersion.current;LM(true);ME('');try{const d=await api('state?'+params(data.page+1));if(version!==catalogVersion.current)return;D((prev:any)=>({...d,items:[...prev.items,...d.items.filter((item:any)=>!prev.items.some((old:any)=>old.id===item.id))]}))}catch(e:any){if(version===catalogVersion.current)ME(e.message)}finally{if(version===catalogVersion.current)LM(false)}}
function login(){if(data.authProvider==='firebase')S('login');else sitesLogin()}
function post(item?:any){if(!data.user)return login();Select(item||null);Edit(null);S('post')}
function openPlace(id:string){PlaceId(id);S('place')}
async function open(id:string){Detail(null);S('detail');try{Detail(await api('detail/'+id))}catch(e:any){notify(e.message);S('')}}
async function save(target:string,kind='dish'){if(!data.user)return login();try{const r=await api('save','POST',{target,kind});notify(r.saved?'Đã lưu vào sổ ăn uống.':'Đã bỏ lưu.');await load()}catch(e:any){notify(e.message)}}
async function changeTab(t:string){if((t==='mine'||t==='saved')&&!data.user)return login();T(t);if(t==='mine'){try{const d=await api('mine');Mine([...d.placeReviews.map((r:any)=>({...r,kind:'place'})),...d.reviews])}catch(e:any){notify(e.message)}}scrollExplore()}
async function random(){if(!data.user)return login();RB(true);try{const r=await api('random?'+params()+'&exclude='+encodeURIComponent(lastRest.current),'POST');lastRest.current=r.item.restaurant;RR(r);S('random')}catch(e:any){notify(e.message);await load()}finally{RB(false)}}
function routeTo(r:any){Destination(r);S('route')}
function locate(){if(!navigator.geolocation)return notify('Thiết bị chưa hỗ trợ vị trí. Bạn có thể nhập khu vực.');navigator.geolocation.getCurrentPosition(p=>{Geo({lat:p.coords.latitude,lng:p.coords.longitude});notify('Đang tìm quán trong bán kính bạn chọn.')},()=>notify('Chưa lấy được vị trí. Hãy cấp quyền hoặc nhập khu vực thủ công.'),{enableHighAccuracy:false,timeout:10000})}
const set=(k:string,v:any)=>F((x:any)=>({...x,[k]:v}));const saved=(id:string,kind='dish')=>data.saved.some((s:any)=>s.target===id&&s.kind===kind);const items=data.items.filter((r:any)=>tab!=='saved'||saved(r.id)||saved(r.restaurant,'restaurant'));
function card(r:any){return <FoodCard key={r.id} item={r} saved={saved(r.id)} onOpen={open} onSave={save} onPlace={openPlace}/>}
function close(){S('');Select(null);Edit(null)}
return <>
<div className="ambient-magic" aria-hidden="true">
  <div className="aurora-blob b1"/>
  <div className="aurora-blob b2"/>
  <div className="aurora-blob b3"/>
  <div className="aurora-blob b4"/>
  <div className="mouse-spotlight"/>
  {TWINKLE_NODES.map((n,i)=>(
    <span key={i} className={`twinkle-star tone-${n.tone}`} style={{top:n.top,left:n.left,['--tw-delay' as any]:n.delay,['--tw-dur' as any]:n.dur}}>
      <DiamondStar size={n.size}/>
    </span>
  ))}
  <div ref={sparkleLayerRef} className="cursor-sparkle-layer"/>
</div>
<header className="site-header"><div className="header-inner"><a className="brand" href="/"><span className="brand-icon"><Soup size={26}/></span><span>hôm nay<br/><b>ăn gì?</b></span></a><nav aria-label="Điều hướng chính"><button className={tab==='discover'&&mode==='grid'?'active':''} onClick={()=>{M('grid');changeTab('discover')}}>Khám phá</button><button className={tab==='discover'&&mode==='map'?'active':''} onClick={()=>{M('map');changeTab('discover')}}>Bản đồ quán</button><button className={tab==='saved'?'active':''} onClick={()=>changeTab('saved')}><Bookmark size={15}/> Đã lưu</button></nav><div className="header-actions"><button className="header-random icon-button" aria-label="Chọn quán ngẫu nhiên" title={data.unlocked?'Chọn quán giúp tôi':'Cần 10 loại món hợp lệ để mở'} disabled={!data.unlocked||loading||randomBusy} onClick={random}><Dices size={20}/></button>{data.user?.admin&&<button className="icon-button" onClick={()=>S('admin')} aria-label="Quản trị"><ShieldCheck size={21}/></button>}<button aria-label={data.user?'Của tôi':'Đăng nhập'} className="account-button" onClick={()=>data.user?changeTab('mine'):login()}><UserRound size={18}/><span>{data.user?'Của tôi':'Đăng nhập'}</span></button><button aria-label="Mời cà phê" className="button secondary donate-header-btn" style={{display:'inline-flex',alignItems:'center',gap:'6px',borderColor:'#fed7aa',backgroundColor:'#fff7ed',color:'#ea580c',fontWeight:600}} onClick={()=>S('donate')}><Coffee size={16}/><span>Mời cà phê</span></button><button aria-label="Góp một món ngon" className="button primary" onClick={()=>post()}><Plus size={17}/><span>Góp một món ngon</span></button></div></div></header>
<main><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="tiny-sun">✳</span> SỔ ĂN UỐNG CỦA CHÚNG MÌNH <Sparkles size={13} className="eyebrow-sparkle" aria-hidden="true"/></div><h1>Hôm nay<br/>ăn <span className="title-em-wrap"><em>gì nhỉ?</em></span></h1><p className="hero-subtitle">Tìm một món vừa túi tiền, ghé một quán quen rồi cùng nhau chia sẻ.</p><div className="hero-search"><Search size={21}/><input aria-label="Tìm món hoặc tên quán" placeholder="Bạn đang thèm món gì?" value={filter.q} onChange={e=>set('q',e.target.value)} onKeyDown={e=>e.key==='Enter'&&scrollExplore()}/><button className="button primary" onClick={()=>scrollExplore()}>Tìm món <ArrowRight size={17}/></button></div><div className="hero-trust"><span><CheckCircle2 size={15}/> Trải nghiệm từ cộng đồng</span><span><Camera size={15}/> Ảnh do người ăn chụp</span></div></div><div className="hero-visual"><div className="hero-orbit-ring" aria-hidden="true"/><div className="pho-steam" aria-hidden="true"><span className="steam-wisp w1"/><span className="steam-wisp w2"/><span className="steam-wisp w3"/></div><span className="hero-sparkle s1" aria-hidden="true"><DiamondStar size={32}/></span><span className="hero-sparkle s2" aria-hidden="true"><DiamondStar size={24}/></span><span className="hero-sparkle s3" aria-hidden="true"><DiamondStar size={30}/></span><span className="hero-sparkle s4" aria-hidden="true"><DiamondStar size={22}/></span><span className="hero-sparkle s5" aria-hidden="true"><DiamondStar size={26}/></span><div className="photo-frame"><img src="/images/pho.jpg" alt="Ảnh chụp tô phở Việt Nam, hình bìa minh họa"/><div className="photo-credit">Ảnh bìa minh họa · Pexels</div></div><div className="floating-note"><span>Ăn ngon là một chuyện</span><strong>Ăn cùng nhau mới vui</strong><Soup size={28}/></div></div></section>
<section className="random-strip"><div className="random-symbol"><Dices size={27}/></div><div className="random-copy"><h2>Không biết chọn gì? Để may mắn chọn quán.</h2><p>{data.unlocked?'Đủ món rồi! Chọn quán ngẫu nhiên theo túi tiền và khu vực của bạn.':<>Cùng góp đủ <b>10 loại món</b> để mở vòng quay quán ngon.</>}</p><div className="unlock-progress"><div className="progress-track"><span style={{width:Math.min(100,data.eligibleTypes*10)+'%'}}/></div><span>{loading?'…':data.eligibleTypes}/10 loại món hợp lệ</span></div></div><button className="button random-button" disabled={!data.unlocked||loading||randomBusy} onClick={random}>{randomBusy?<LoaderCircle size={18} className="spin"/>:data.unlocked?<Dices size={18}/>:<LockKeyhole size={17}/>} Chọn quán giúp tôi</button></section>
<section className="top-contributors-section"><div className="section-title"><div><span className="eyebrow"><Sparkles size={13} className="eyebrow-sparkle"/> BẢNG VINH DANH CỘNG ĐỒNG</span><h2>Top 5 người đóng góp nhiều nhất</h2><p className="explore-intro">Cảm ơn những bạn ăn sành đã chia sẻ và lưu lại những địa chỉ ẩm thực chân thực nhất.</p></div></div>{data.topContributors&&data.topContributors.length>0?<div className="contributors-grid">{data.topContributors.map((c:any,idx:number)=>{const medal=idx===0?'🥇':idx===1?'🥈':idx===2?'🥉':`#${idx+1}`;const rankClass=idx===0?'rank-1':idx===1?'rank-2':idx===2?'rank-3':'rank-normal';return <div key={c.owner||idx} className={`contributor-card ${rankClass}`}><div className="contributor-rank-badge">{medal}</div><div className="contributor-avatar">{(c.author||'U').charAt(0).toUpperCase()}</div><div className="contributor-details"><strong className="contributor-name" title={c.author}>{c.author||'Thành viên'}</strong><div className="contributor-count-pill">{c.count} bài đóng góp</div><span className="contributor-meta">{c.places||0} quán · {c.dishes||0} món</span></div></div>})}</div>:<div className="empty-contributors"><p>Chưa có bảng vinh danh. Hãy là người đầu tiên chia sẻ món ngon để xuất hiện tại đây!</p><button className="button primary" onClick={()=>post()}><Plus size={16}/> Góp một món ngon</button></div>}</section>
<section id="explore" className="explore"><div className="section-title"><div><span className="eyebrow">THEO CHIẾC BỤNG ĐÓI, TÌM MỘT NIỀM VUI</span><h2>{tab==='saved'?'Sổ món ngon đã lưu':tab==='mine'?'Những lần bạn ghé ăn':'Hôm nay, bạn thèm gì?'}</h2>{tab!=='mine'&&<p className="explore-intro">Bữa no, ăn vặt hay một ly cà phê — chọn theo cơn thèm của bạn.</p>}</div><div className="view-toggle"><button aria-label="Xem dạng danh sách" className={mode==='grid'?'selected':''} onClick={()=>M('grid')}><Grid2X2 size={18}/></button><button aria-label="Xem bản đồ" className={mode==='map'?'selected':''} onClick={()=>M('map')}><MapIcon size={18}/></button></div></div>
{tab==='mine'?<AccountPanel authProvider={data.authProvider} {...{mine,Edit,Select,S,notify,changeTab,load,post,openPlace}}/>:<><DiscoveryPanel {...{filter,F,set,more,More,showAllFoods,ShowAllFoods,data,geo,Geo,locate}}/><div className="results-meta"><span>{loading?'Đang tìm món ngon…':`${data.total} món phù hợp${data.total>items.length?' · Đã xem '+items.length:''}`}</span><button className="text-button" onClick={()=>{F({q:'',city:'',district:'',budget:'',category:'',foods:[],family:'all',meal:'',veg:false,front:false,min:'',max:'',radius:5});Geo(null)}}>Xóa bộ lọc</button></div>{error?<div className="empty-state"><Info/><h3>Chưa tải được danh sách</h3><p>{error}</p><button className="button secondary" onClick={load}>Thử lại</button></div>:loading?<SkeletonCards/>:mode==='map'?<><FoodMap items={items} onOpen={open} current={geo?[geo.lat,geo.lng]:undefined} radius={geo?Number(filter.radius):undefined}/>{!items.length&&<StateNote>Chưa có địa điểm được duyệt phù hợp bộ lọc. Bản đồ chưa có ghim cộng đồng.</StateNote>}<div className="food-grid compact">{items.map(card)}</div></>:items.length?<div className="food-grid">{items.map(card)}</div>:<div className="empty-state"><div className="empty-illustration"><Soup size={48}/><span>+</span></div><span className="eyebrow">MÓN NGON BẮT ĐẦU TỪ MỘT LỜI KỂ</span><h3>{tab==='saved'?'Bạn chưa lưu món nào. Hãy bấm biểu tượng Đã lưu ở các món bạn thích nhé!':data.eligibleTypes===0?'Bạn có một quán ruột chứ?':'Chưa tìm thấy món phù hợp.'}</h3><p>{data.eligibleTypes===0?'Chúng mình đang gom những địa chỉ đầu tiên. Một tấm ảnh tự chụp, giá đã trả và cảm nhận của bạn là đủ để bắt đầu.':'Thử đổi khu vực, khoảng giá hoặc góp thêm một địa chỉ bạn đã ghé.'}</p><button className="button primary" onClick={()=>post()}><Plus size={17}/> Góp thêm món bạn đã ăn</button><small>Không có đánh giá tự tạo. Không dùng dữ liệu mẫu để mở random.</small></div>}{!loading&&!error&&data.hasMore&&<div className="load-more"><button className="button secondary" disabled={loadingMore} onClick={loadMore}>{loadingMore?<LoaderCircle size={17} className="spin"/>:<Plus size={17}/>} {loadingMore?'Đang tải thêm…':'Xem thêm món ngon'}</button>{moreError&&<p className="error" role="alert">{moreError}</p>}<small>{items.length} / {data.total} món</small></div>}</>}
</section><CommunityNote post={()=>post()}/></main>
<footer><a className="brand" href="/"><span className="brand-icon"><Soup size={22}/></span><b>hôm nay ăn gì?</b></a><p>Một chiếc sổ nhỏ cho những bữa ăn ngon.</p><div><button onClick={()=>S('donate')}>☕ Mời cà phê</button><button onClick={()=>S('about')}>Về cộng đồng & quyền riêng tư</button><a href="https://www.pexels.com/photo/cooked-noodles-1001773/" target="_blank" rel="noreferrer">Ảnh bìa: Pexels</a></div><small>Giá là trải nghiệm tại thời điểm đăng, có thể thay đổi khi bạn đến quán.</small></footer>
{toast&&<div className="toast" role="status"><CheckCircle2 size={18}/>{toast}<button onClick={()=>Toast('')} aria-label="Đóng thông báo"><X size={15}/></button></div>}
{data.authProvider==='firebase'&&<GoogleAuthLayer open={dialog==='login'} close={close} refresh={load} notify={notify}/>}
{dialog==='post'&&<PostFormModal data={data} existing={selected} editing={edit} close={close} done={()=>{close();load();if(tab==='mine')changeTab('mine')}} notify={notify}/>}
{dialog==='admin'&&<AdminModal notify={notify} refresh={load} close={close}/>}
{dialog==='random'&&<RandomModal {...{randomResult,close,card,randomBusy,random,save,routeTo}}/>}
{dialog==='detail'&&<DetailModal {...{detail,close,save,saved,post,routeTo,notify,login,data,Detail,open,openPlace}}/>}
{dialog==='route'&&destination&&<RouteGuideModal restaurant={destination} geo={geo} setGeo={Geo} close={close}/>}
{dialog==='place'&&!loading&&<PlaceModal restaurantId={placeId} user={data.user} {...{close,login,notify,routeTo}}/>}
{dialog==='about'&&<AboutModal close={close}/>}
{dialog==='donate'&&<DonateModal close={close}/>}
</>}
