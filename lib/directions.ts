export type TravelMode='two-wheeler'|'driving'|'walking';
export function directionsUrl(destination:{lat:number,lng:number},origin?:{lat:number,lng:number}|null,mode:TravelMode='two-wheeler'){
 const p=new URLSearchParams({api:'1',destination:`${destination.lat},${destination.lng}`,travelmode:mode});
 if(origin)p.set('origin',`${origin.lat},${origin.lng}`);
 return 'https://www.google.com/maps/dir/?'+p.toString();
}
