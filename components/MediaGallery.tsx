'use client';
import ImageGallery from './ImageGallery';
export type Media={id:string,kind:'image'};
export default function MediaGallery({media=[]}:{media:Media[]}){return <ImageGallery images={media.filter(m=>m.kind==='image').map(m=>m.id)} alt="Ảnh do thành viên cung cấp"/>}
