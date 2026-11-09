import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from 'jose';
export type GoogleIdentity={uid:string;email:string;name:string;authTime:number;expires:number};
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),{timeoutDuration:5000,cooldownDuration:30000,cacheMaxAge:3600000});
export function createGoogleVerifier(projectId:string,getKey:JWTVerifyGetKey=googleKeys){
 if(!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId))throw Error('Invalid Firebase project ID');
 return async(token:string):Promise<GoogleIdentity>=>{
  if(typeof token!=='string'||token.length>16000)throw Error('Invalid token');
  const {payload:p}=await jwtVerify(token,getKey,{algorithms:['RS256'],audience:projectId,issuer:'https://securetoken.google.com/'+projectId,requiredClaims:['exp','iat','sub','auth_time'],clockTolerance:5});
  const now=Math.floor(Date.now()/1000),f=p.firebase as {sign_in_provider?:string}|undefined;
  if(p.aud!==projectId||!p.sub||p.sub.length>128||p.sub.includes(':')||typeof p.iat!=='number'||p.iat>now+5||typeof p.auth_time!=='number'||p.auth_time>now+5||p.auth_time<0||typeof p.exp!=='number'||p.exp<=now||p.exp-p.iat>3700||p.email_verified!==true||typeof p.email!=='string'||p.email.length>254||!p.email.includes('@')||f?.sign_in_provider!=='google.com')throw Error('A verified Google account is required');
  return{authTime:p.auth_time*1000,uid:p.sub,email:p.email.trim().toLowerCase(),name:typeof p.name==='string'?p.name.trim().slice(0,60):'Thành viên',expires:p.exp*1000};
 };
}
