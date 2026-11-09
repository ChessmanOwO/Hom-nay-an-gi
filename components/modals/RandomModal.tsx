'use client';
import {useEffect,useRef,useState} from 'react';
import {Soup,Search,MapPin,ArrowUpRight,ArrowRight,Dices,Plus,Heart,Camera,SlidersHorizontal,Map as MapIcon,Grid2X2,X,Star,Check,ChevronDown,LocateFixed,ShieldCheck,UserRound,Bookmark,Flag,ThumbsUp,Share2,Clock,LoaderCircle,UtensilsCrossed,LockKeyhole,CheckCircle2,Info} from 'lucide-react';
import {directionsUrl} from '../../lib/directions';
import Modal from './Modal';
import FoodMap from '../LazyFoodMap';
import {Field,StateNote} from '../FormControls';
import {api,money,unit,photo,date} from '../../lib/client';
export default function RandomModal({randomResult,close,card,randomBusy,random,save,routeTo}:any){return <Modal title="Hôm nay, ghé quán này nhé!" close={close}><div className="random-result"><span className="eyebrow"><Dices size={16}/> LỰA CHỌN NGẪU NHIÊN</span>{card(randomResult.item)}<p className="muted">{randomResult.item.address}, {randomResult.item.district}, {randomResult.item.city}</p><p className="small">{randomResult.count===1?'Chỉ có 1 quán phù hợp.':`Lượt này có ${randomResult.count} quán phù hợp. Khi đổi, quán vừa chọn sẽ được loại khỏi lượt kế tiếp.`}</p><div className="actions"><button className="button primary" disabled={randomBusy||randomResult.count<2} onClick={random}><Dices size={17}/> Đổi quán</button><button className="button secondary" onClick={()=>save(randomResult.item.restaurant,'restaurant')}><Bookmark size={17}/> Lưu quán</button><a className="button secondary" href={directionsUrl(randomResult.item)} target="_blank" rel="noreferrer"><MapPin size={17}/> Google Maps</a><button className="button primary" onClick={()=>routeTo(randomResult.item)}><MapIcon size={16}/> Bản đồ đường đi</button></div></div></Modal>}
