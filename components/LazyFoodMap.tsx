'use client';
import dynamic from 'next/dynamic';
const FoodMap=dynamic(()=>import('./FoodMap'),{ssr:false,loading:()=> <div className="map-loading" aria-label="Đang tải bản đồ"/>});
export default FoodMap;
