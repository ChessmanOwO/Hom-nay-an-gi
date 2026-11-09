import Sqlite from 'better-sqlite3';
import {mkdir,readFile,writeFile,rename,stat,readdir,rm} from 'node:fs/promises';
import {mkdirSync,readdirSync,readFileSync,chmodSync} from 'node:fs';
import {resolve,join,dirname,relative,isAbsolute,sep} from 'node:path';
import {createReadStream} from 'node:fs';
import {Readable} from 'node:stream';
import type {DatabaseBinding,PreparedQuery,BucketBinding} from '../lib/runtime';
export class SqliteDatabase implements DatabaseBinding{
 readonly sqlite:Sqlite.Database;
 constructor(file:string,migrations:string){mkdirSync(dirname(file),{recursive:true,mode:0o700});this.sqlite=new Sqlite(file);chmodSync(file,0o600);this.sqlite.pragma('busy_timeout = 5000');
  // Concurrent first boots can both try to upgrade the initial journal mode.
  const deadline = Date.now() + 5000;
  const delay = new Int32Array(new SharedArrayBuffer(4));
  for (;;) {
    try {
      this.sqlite.pragma('journal_mode = WAL');
      break;
    } catch (error) {
      if ((error as {code?: string}).code !== 'SQLITE_BUSY' || Date.now() >= deadline) throw error;
      Atomics.wait(delay, 0, 0, 50);
    }
  }
  this.sqlite.pragma('foreign_keys = ON');
  this.sqlite.exec('CREATE TABLE IF NOT EXISTS _app_migrations(name TEXT PRIMARY KEY)');
  const migrate = this.sqlite.transaction((name: string) => {
    if (this.sqlite.prepare('SELECT 1 FROM _app_migrations WHERE name=?').get(name)) return;
    this.sqlite.exec(readFileSync(join(migrations, name), 'utf8'));
    this.sqlite.prepare('INSERT INTO _app_migrations(name) VALUES(?)').run(name);
  });
  for (const name of readdirSync(migrations).filter(n => /^\d+.*\.sql$/.test(n)).sort()) {
    migrate.immediate(name);
  }
 }
 prepare(sql:string):PreparedQuery{return new Query(this,sql,[])}
 async batch(queries:PreparedQuery[]){return this.sqlite.transaction(()=>queries.map(q=>{if(!(q instanceof Query)||q.db!==this)throw Error('Invalid database batch');return q.execute()}))()}
 close(){this.sqlite.close()}
}
class Query implements PreparedQuery{
 constructor(readonly db:SqliteDatabase,readonly sql:string,readonly args:any[]){}
 bind(...args:any[]){return new Query(this.db,this.sql,args)}
 execute(){const s=this.db.sqlite.prepare(this.sql);if(s.reader)return{results:s.all(...this.args),meta:{changes:0}};const r=s.run(...this.args);return{results:[],meta:{changes:r.changes}}}
 async all(){return this.execute()}
 async first<T=any>(){return (this.db.sqlite.prepare(this.sql).get(...this.args) as T)||null}
 async run(){return this.execute()}
}
// Local object storage is private. Every browser read still passes the API's
// ownership/publication check; never mount this directory as static content.
export class FileBucket implements BucketBinding{
 constructor(readonly root:string){mkdirSync(root,{recursive:true,mode:0o700})}
 private file(key:string){if(!/^[a-zA-Z0-9][a-zA-Z0-9_./-]{0,250}$/.test(key)||key.split('/').some(p=>p==='..'||p==='.'||!p))throw Error('Invalid object key');const base=resolve(this.root),p=resolve(base,key),local=relative(base,p);if(!local||local==='..'||local.startsWith('..'+sep)||isAbsolute(local))throw Error('Invalid object key');return p}
 async head(key:string){try{const s=await stat(this.file(key));return s.isFile()?{size:s.size}:null}catch(e:any){if(e.code==='ENOENT')return null;throw e}}
 async get(key:string){const file=this.file(key);if(!await this.head(key))return null;return{body:Readable.toWeb(createReadStream(file)) as ReadableStream}}
 async put(key:string,value:string|Uint8Array){const file=this.file(key);await mkdir(dirname(file),{recursive:true,mode:0o700});const temp=file+'.'+crypto.randomUUID()+'.tmp';try{await writeFile(temp,value,{mode:0o600});await rename(temp,file)}finally{await rm(temp,{force:true})}return{key}}
 async delete(keys:string|string[]){for(const key of Array.isArray(keys)?keys:[keys])await rm(this.file(key),{force:true})}
 async list({prefix,limit}:{prefix:string;limit:number}){const objects:{key:string;uploaded:Date}[]=[];const dir=this.file(prefix.replace(/\/$/,''));try{for(const name of await readdir(dir)){const key=prefix+name,s=await stat(this.file(key));if(s.isFile()&&!name.endsWith('.tmp'))objects.push({key,uploaded:s.mtime});if(objects.length>=limit)break}}catch(e:any){if(e.code!=='ENOENT')throw e}return{objects}}
}
