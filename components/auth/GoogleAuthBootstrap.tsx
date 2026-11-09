'use client';
import {useEffect,useRef} from 'react';
import {watchGoogle} from '../../lib/firebase-client';
export default function GoogleAuthBootstrap({refresh,notify}:any){const callbacks=useRef({refresh,notify});callbacks.current={refresh,notify};useEffect(()=>{let cancelled=false,stop:(()=>void)|undefined;watchGoogle(()=>{if(!cancelled)callbacks.current.refresh()},message=>{if(!cancelled)callbacks.current.notify(message)}).then(fn=>{if(cancelled)fn();else stop=fn}).catch(()=>{if(!cancelled)callbacks.current.notify('Chưa kết nối được dịch vụ đăng nhập Google. Hãy thử lại sau.')});return()=>{cancelled=true;stop?.()}},[]);return null}
