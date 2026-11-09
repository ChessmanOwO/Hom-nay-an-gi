'use client';
import {useEffect,useState} from 'react';
import {Soup,Check,LoaderCircle,CheckCircle2,Info,Trash2,Ban,UserX,ShieldCheck} from 'lucide-react';
import ImageGallery from '../ImageGallery';
import MediaGallery from '../MediaGallery';
const riskLabels:Record<string,string>={shared_network:'Nhiều tài khoản cùng mạng đánh giá quán trong 10 phút',similar_text:'Nội dung gần giống bài khác tại quán',network_unavailable:'Chưa có IP đáng tin cậy: chỉ kiểm tra tài khoản và nội dung'};
import Modal from './Modal';
import {Field,StateNote} from '../FormControls';
import {api,money,unit,photo,date} from '../../lib/client';

function Admin({notify,refresh}:{notify:(s:string)=>void,refresh:()=>void}){
  const [d,D]=useState<any>(null),[err,E]=useState(''),[tab,T]=useState('queue'),[busy,B]=useState(false);
  const [blockIpVal,setBlockIpVal]=useState(''),[blockIpReason,setBlockIpReason]=useState('');
  const [banUserVal,setBanUserVal]=useState(''),[banUserReason,setBanUserReason]=useState('');

  async function load(){
    try{
      const n=await api('admin');
      n.queue=[...n.placeQueue.map((r:any)=>({...r,kind:'place'})),...n.queue].sort((a:any,b:any)=>(a.status==='pending'?0:1)-(b.status==='pending'?0:1)||b.updated-a.updated);
      D(n);
    }catch(e:any){E(e.message)}
  }

  useEffect(()=>{load()},[]);

  async function act(b:any){
    B(true);
    try{
      const r=await api('admin','POST',b);
      notify(r.message);
      await load();
      refresh();
    }catch(e:any){E(e.message)}
    finally{B(false)}
  }

  if(!d)return <p>{err||'Đang tải hàng đợi…'}</p>;

  return <>
    <p className="muted small">Chống seeding: tối đa 5 lượt gửi/sửa mỗi tài khoản trong 1 giờ. {d.networkDetection?.available?'Kiểm tra IP khả dụng: tối đa 3 lượt cho cùng quán trong 10 phút từ một IP.':'Chưa nhận được IP người dùng đáng tin cậy; giới hạn theo IP chưa áp dụng trên kết nối này. Vẫn kiểm tra tài khoản và nội dung.'}</p>
    <StateNote>Duyệt bài cũng duyệt quán, loại món và món mới liên quan đang ở trạng thái chờ. Xóa cmt/bài viết sẽ tự động khôi phục lại 1 lượt đăng cho tài khoản đó ở quán tương ứng.</StateNote>
    {d.role==='superadmin'&&<>
      <a className="button secondary" href="/api/backup" target="_blank" rel="noreferrer">Tải bản sao dữ liệu hôm nay</a>
      <p className="muted small">Bản sao tự tạo sau thao tác ghi đầu tiên trong ngày, lưu riêng tư 30 ngày. Nên tải bản sao định kỳ ra nơi lưu trữ độc lập.</p>
    </>}
    <div className="subtabs">
      {[
        ['queue','Trải nghiệm'],
        ['restaurants','Quán'],
        ['types','Loại món'],
        ['reports','Báo cáo'],
        ['moderation','Chặn IP & Khóa tài khoản'],
        ['audit','Nhật ký']
      ].filter(([key])=>d.role==='superadmin'||['queue','reports','moderation'].includes(key)).map(([v,t])=>(
        <button className={tab===v?'selected':''} onClick={()=>{T(v);E('')}} key={v}>{t}</button>
      ))}
    </div>
    {err&&<p className="error" role="alert">{err}</p>}

    {tab==='queue'&&(d.queue.length?d.queue.map((r:any)=>(
      <article className="admin-row" key={r.id}>
        <span className={'status '+r.status}>{({pending:'Chờ duyệt',approved:'Công khai',hidden:'Đã ẩn'} as any)[r.status]}</span>
        <small className="muted">Mã bài: {r.id}</small>
        {JSON.parse(r.risk_flags||'[]').map((flag:string)=><p className="review-risk" key={flag}>{riskLabels[flag]||flag}</p>)}
        <h3>{r.kind==='place'?'Đánh giá địa điểm':r.dish} <small>{r.type_name?'· '+r.type_name:''}</small></h3>
        <p>{r.restaurant_name} · {r.address}, {r.district}, {r.city}</p>
        <p><strong>{r.author}</strong> (ID: {r.owner}) · {date(r.date)} · {r.kind!=='place'?money(r.total)+' tổng · ':''}{r.rating}/5 {r.sponsored?'· Có tài trợ':''}</p>
        <p className="preserve">{r.content||r.taste}</p>
        <p>{r.portion} {r.value}</p>
        <>{r.kind==='place'?<MediaGallery media={JSON.parse(r.media)}/>:<ImageGallery images={JSON.parse(r.photos)} alt="Ảnh cần duyệt"/>}</>
        <div className="actions" style={{flexWrap:'wrap',gap:'8px'}}>
          <button disabled={busy} className="button primary" onClick={()=>act({action:'approve',id:r.id,kind:r.kind})}><Check size={15}/> Duyệt công khai</button>
          <button disabled={busy} className="button secondary" onClick={()=>{const reason=prompt('Lý do ẩn bài (ít nhất 5 ký tự)');if(reason)act({action:'hide',id:r.id,kind:r.kind,reason})}}>Ẩn bài</button>
          <button disabled={busy} className="button secondary" style={{color:'#dc2626',borderColor:'#fecaca'}} onClick={()=>{const reason=prompt('Lý do xóa bài (sẽ khôi phục 1 lượt đăng quán này cho user):','Bài seeding vi phạm tiêu chuẩn');if(reason)act({action:'deleteReview',id:r.id,kind:r.kind,reason})}}><Trash2 size={14}/> Xóa bài (Khôi phục 1 lượt)</button>
          {r.owner&&<button disabled={busy} className="button secondary" style={{color:'#991b1b',borderColor:'#fca5a5'}} onClick={()=>{const reason=prompt(`Khóa tài khoản ${r.author} (${r.owner})? Mọi phiên đăng nhập sẽ bị thu hồi:`, 'Spammer seeding');if(reason)act({action:'banUser',userId:r.owner,reason})}}><Ban size={14}/> Khóa tài khoản này</button>}
        </div>
      </article>
    )):<p className="muted">Chưa có trải nghiệm cần duyệt.</p>)}

    {tab==='moderation'&&<div className="moderation-panel" style={{display:'flex',flexDirection:'column',gap:'28px'}}>
      <section className="moderation-section">
        <h3>🛡️ Chặn địa chỉ IP (Chống Spam / Seeding mạng)</h3>
        <p className="muted small">IP bị chặn sẽ không thể gửi bất kỳ yêu cầu đọc hoặc ghi nào tới hệ thống.</p>
        <form className="form-grid" style={{marginTop:'12px'}} onSubmit={e=>{e.preventDefault();if(!blockIpVal)return;act({action:'blockIp',ip:blockIpVal.trim(),reason:blockIpReason.trim()||'Admin chặn IP vi phạm'}).then(()=>{setBlockIpVal('');setBlockIpReason('')})}}>
          <Field label="Địa chỉ IP cần chặn"><input placeholder="Ví dụ: 14.162.140.23" value={blockIpVal} onChange={e=>setBlockIpVal(e.target.value)} required/></Field>
          <Field label="Lý do chặn"><input placeholder="Ví dụ: Tool spam seeding hàng loạt" value={blockIpReason} onChange={e=>setBlockIpReason(e.target.value)}/></Field>
          <div style={{display:'flex',alignItems:'flex-end'}}><button disabled={busy||!blockIpVal} className="button primary" style={{background:'#dc2626'}}><Ban size={15}/> Chặn IP</button></div>
        </form>
        <div style={{marginTop:'16px'}}>
          <strong>Danh sách IP đang bị chặn ({d.blockedIps?.length||0}):</strong>
          {d.blockedIps&&d.blockedIps.length>0?(
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginTop:'8px'}}>
              {d.blockedIps.map((b:any)=>(
                <div key={b.ip} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--surface)',border:'1px solid var(--line)',borderRadius:'8px'}}>
                  <div>
                    <span style={{fontFamily:'monospace',fontWeight:700,color:'#dc2626'}}>{b.ip}</span>
                    <span style={{marginLeft:'12px',color:'var(--ink-secondary)',fontSize:'12px'}}>{b.reason||'Không có lý do'}</span>
                    <span style={{marginLeft:'12px',color:'var(--ink-secondary)',fontSize:'11px'}}>({date(b.created)})</span>
                  </div>
                  <button disabled={busy} className="button secondary" style={{padding:'6px 12px',minHeight:'32px',fontSize:'11px'}} onClick={()=>act({action:'unblockIp',ip:b.ip})}>Bỏ chặn</button>
                </div>
              ))}
            </div>
          ):<p className="muted small" style={{marginTop:'6px'}}>Chưa có IP nào bị chặn.</p>}
        </div>
      </section>

      <section className="moderation-section" style={{borderTop:'1px solid var(--line)',paddingTop:'20px'}}>
        <h3>🚫 Quản lý khóa tài khoản người dùng</h3>
        <p className="muted small">Tài khoản bị khóa sẽ bị hủy ngay lập tức mọi phiên đăng nhập và không thể thực hiện thao tác trên hệ thống.</p>
        <form className="form-grid" style={{marginTop:'12px'}} onSubmit={e=>{e.preventDefault();if(!banUserVal)return;act({action:'banUser',userId:banUserVal.trim(),reason:banUserReason.trim()||'Tài khoản vi phạm'}).then(()=>{setBanUserVal('');setBanUserReason('')})}}>
          <Field label="Google UID / User ID"><input placeholder="Nhập ID tài khoản người dùng" value={banUserVal} onChange={e=>setBanUserVal(e.target.value)} required/></Field>
          <Field label="Lý do khóa"><input placeholder="Ví dụ: Gian lận đánh giá" value={banUserReason} onChange={e=>setBanUserReason(e.target.value)}/></Field>
          <div style={{display:'flex',alignItems:'flex-end'}}><button disabled={busy||!banUserVal} className="button primary" style={{background:'#b91c1c'}}><UserX size={15}/> Khóa tài khoản</button></div>
        </form>
        <div style={{marginTop:'16px'}}>
          <strong>Danh sách tài khoản đang bị khóa ({d.bannedUsers?.length||0}):</strong>
          {d.bannedUsers&&d.bannedUsers.length>0?(
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginTop:'8px'}}>
              {d.bannedUsers.map((u:any)=>(
                <div key={u.id||u.google_uid} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',background:'var(--surface)',border:'1px solid var(--line)',borderRadius:'8px'}}>
                  <div>
                    <strong style={{color:'#b91c1c'}}>{u.display_name||'Tài khoản'}</strong>
                    <span style={{marginLeft:'8px',fontFamily:'monospace',fontSize:'11px',color:'var(--ink-secondary)'}}>(UID: {u.google_uid||u.id})</span>
                    {u.email&&<span style={{marginLeft:'8px',fontSize:'12px',color:'var(--ink-secondary)'}}>· {u.email}</span>}
                  </div>
                  <button disabled={busy} className="button secondary" style={{padding:'6px 12px',minHeight:'32px',fontSize:'11px'}} onClick={()=>act({action:'unbanUser',userId:u.google_uid||u.id})}>Mở khóa</button>
                </div>
              ))}
            </div>
          ):<p className="muted small" style={{marginTop:'6px'}}>Chưa có tài khoản nào bị khóa.</p>}
        </div>
      </section>
    </div>}

    {tab==='types'&&d.types.map((t:any)=>(
      <form className="admin-row" key={t.id} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);act({action:'type',id:t.id,name:f.get('name'),status:f.get('status')})}}>
        <div className="form-grid">
          <Field label="Tên chuẩn"><input name="name" defaultValue={t.name} required/></Field>
          <Field label="Trạng thái"><select name="status" defaultValue={t.status}><option value="pending">Chờ duyệt</option><option value="approved">Được duyệt</option><option value="hidden">Ẩn / đã gộp</option></select></Field>
        </div>
        <div className="actions">
          <button disabled={busy} className="button primary">Lưu loại món</button>
          <select id={'merge-'+t.id} defaultValue=""><option value="">Gộp vào loại…</option>{d.types.filter((x:any)=>x.id!==t.id&&x.status!=='hidden').map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <button type="button" disabled={busy} className="button secondary" onClick={()=>{const target=(document.getElementById('merge-'+t.id) as unknown as HTMLSelectElement).value;if(target&&confirm('Gộp loại này và chuyển các món sang loại được chọn?'))act({action:'mergeType',id:t.id,target,reason:'Gộp tên loại trùng'})}}>Gộp loại</button>
        </div>
      </form>
    ))}

    {tab==='restaurants'&&d.restaurants.map((r:any)=>(
      <form className="admin-row" key={r.id} onSubmit={e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.currentTarget));act({action:'restaurant',id:r.id,...f})}}>
        <h3>{r.name}</h3>
        <div className="form-grid">
          {[['name','Tên quán'],['address','Địa chỉ'],['city','Tỉnh / thành'],['district','Khu vực'],['lat','Vĩ độ'],['lng','Kinh độ'],['hours','Giờ mở cửa']].map(([k,t])=><Field key={k} label={t}><input name={k} defaultValue={r[k]} required={k!=='hours'}/></Field>)}
          <Field label="Trạng thái"><select name="status" defaultValue={r.status==='merged'?'pending':r.status}><option value="active">Đang hoạt động</option><option value="closed">Đã đóng cửa</option><option value="pending">Chờ xác minh</option></select></Field>
        </div>
        <div className="actions">
          <button className="button primary" disabled={busy}>Lưu quán</button>
          <select defaultValue="" id={'restmerge-'+r.id}><option value="">Gộp vào quán…</option>{d.restaurants.filter((x:any)=>x.id!==r.id&&x.status!=='merged').map((x:any)=><option key={x.id} value={x.id}>{x.name} · {x.address}</option>)}</select>
          <button type="button" disabled={busy} className="button secondary" onClick={()=>{const target=(document.getElementById('restmerge-'+r.id) as unknown as HTMLSelectElement).value;if(target&&confirm('Gộp quán trùng và chuyển các món sang quán đích?'))act({action:'mergeRestaurant',id:r.id,target,reason:'Gộp địa điểm trùng'})}}>Gộp quán</button>
        </div>
      </form>
    ))}

    {tab==='reports'&&(d.reports.length?d.reports.map((r:any)=>(
      <article className="admin-row" key={r.id}>
        <p>{r.reason}</p>
        <small>Mã nội dung: {r.target} · {date(r.created)}</small>
        <div className="actions">
          <button className="button secondary" onClick={()=>{T('queue');notify('Đối chiếu mã nội dung trong danh sách bài trước khi quyết định ẩn.')}}>Xem danh sách bài</button>
          <button className="button primary" disabled={busy} onClick={()=>act({action:'resolve',id:r.id,reason:'Đã xem xét báo cáo'})}>Đánh dấu đã xử lý</button>
        </div>
      </article>
    )):<p className="muted">Chưa có báo cáo.</p>)}

    {tab==='audit'&&d.audit.map((r:any,i:number)=>(
      <p className="audit" key={i}><strong>{r.action}</strong> · {date(r.created)}<br/><small>{r.target} · {r.reason||'Không có ghi chú'}</small></p>
    ))}
  </>;
}

export default function AdminModal({notify,refresh,close}:any){
  return <Modal title="Sổ quản trị cộng đồng" wide close={close}><Admin notify={notify} refresh={refresh}/></Modal>;
}
