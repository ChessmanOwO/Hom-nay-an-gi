'use client';
import {useEffect,useRef,useState} from 'react';
import {Soup,Search,MapPin,ArrowUpRight,ArrowRight,Dices,Plus,Heart,Camera,SlidersHorizontal,Map as MapIcon,Grid2X2,X,Star,Check,ChevronDown,LocateFixed,ShieldCheck,UserRound,Bookmark,Flag,ThumbsUp,Share2,Clock,LoaderCircle,UtensilsCrossed,LockKeyhole,CheckCircle2,Info} from 'lucide-react';
export function Field({label,children}:{label:string,children:React.ReactNode}){return <label className="field"><span>{label}</span>{children}</label>}
export function StateNote({children}:{children:React.ReactNode}){return <div className="notice"><Info size={17}/><span>{children}</span></div>}
