'use client';
import {useEffect,useRef} from 'react';
import {X,ChevronLeft,ChevronRight} from 'lucide-react';
export default function Lightbox({images,index,setIndex,close,alt}:{images:string[],index:number,setIndex:(n:number)=>void,close:()=>void,alt:string}){
 const dialog=useRef<HTMLDialogElement>(null);const move=(n:number)=>setIndex((index+n+images.length)%images.length);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close()},[]);
 return <dialog className="lightbox" ref={dialog} aria-label="Xem ảnh toàn màn hình" onCancel={e=>{e.preventDefault();e.stopPropagation();close()}} onKeyDown={e=>{if(e.key==='ArrowLeft'){e.preventDefault();move(-1)}if(e.key==='ArrowRight'){e.preventDefault();move(1)}}} onClick={e=>{if(e.target===e.currentTarget)close()}}><div className="lightbox-head"><span>{index+1} / {images.length}</span><button aria-label="Đóng ảnh" onClick={close}><X/></button></div><div className="lightbox-content">{images.length>1&&<button className="lightbox-prev" aria-label="Ảnh trước" onClick={()=>move(-1)}><ChevronLeft/></button>}<img src={images[index]} alt={alt+' '+(index+1)}/>{images.length>1&&<button className="lightbox-next" aria-label="Ảnh tiếp theo" onClick={()=>move(1)}><ChevronRight/></button>}</div><p className="lightbox-caption">{alt}</p></dialog>
}
