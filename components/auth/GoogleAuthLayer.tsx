'use client';
import GoogleAuthBootstrap from './GoogleAuthBootstrap';
import GoogleAuthModal from './GoogleAuthModal';
export default function GoogleAuthLayer({open,close,refresh,notify}:any){return <><GoogleAuthBootstrap refresh={refresh} notify={notify}/>{open&&<GoogleAuthModal close={close} done={()=>{close();refresh()}}/>}</>}
