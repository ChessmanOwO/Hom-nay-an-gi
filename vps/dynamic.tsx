import {lazy,Suspense,type ComponentType} from 'react';
// The VPS client renders in the browser; shared components keep their lazy
// boundaries without importing the Next/Sites server runtime.
export default function dynamic(loader:()=>Promise<any>,options:{ssr?:boolean;loading?:ComponentType<any>}={}){const Lazy=lazy(loader),Loading=options.loading;return function LazyComponent(props:any){return <Suspense fallback={Loading?<Loading/>:null}><Lazy {...props}/></Suspense>}}
