'use client';
import {useState} from 'react';import dynamic from 'next/dynamic';import {photo} from '../lib/client';
const Lightbox=dynamic(()=>import('./modals/Lightbox'),{ssr:false});
export default function ImageGallery({images,alt='Ảnh do cộng đồng cung cấp',className='review-photos'}:{images:string[],alt?:string,className?:string}){
 const [index,setIndex]=useState<number|null>(null);
 return <><div className={className}>{images.map((id,i)=><button className="gallery-image" key={id+'-'+i} aria-label={'Xem ảnh '+(i+1)+': '+alt} onClick={()=>setIndex(i)}><img src={photo(id)} alt={alt} loading="lazy"/></button>)}</div>{index!==null&&<Lightbox images={images.map(photo)} index={index} setIndex={setIndex} close={()=>setIndex(null)} alt={alt}/>}</>
}
