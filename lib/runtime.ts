export type AppUser={userId:string;email:string;fullName:string|null;displayName:string};
export interface PreparedQuery{bind(...args:any[]):PreparedQuery;all():Promise<{results:any[];meta?:any}>;first<T=any>():Promise<T|null>;run():Promise<{meta:{changes:number};results?:any[]}>}
export interface DatabaseBinding{prepare(sql:string):PreparedQuery;batch(queries:PreparedQuery[]):Promise<{results:any[];meta?:any}[]>}
export interface BucketBinding{get(key:string):Promise<{body:ReadableStream}|null>;head(key:string):Promise<{size:number}|null>;put(key:string,value:string|Uint8Array,options?:any):Promise<any>;list(options:{prefix:string;limit:number}):Promise<{objects:{key:string;uploaded:Date}[]}>;delete(keys:string|string[]):Promise<any>}
export type ApiEnvironment={DB?:DatabaseBinding;BUCKET?:BucketBinding;ADMIN_EMAILS?:string;MODERATOR_EMAILS?:string};
