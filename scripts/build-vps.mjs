import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {cpSync,mkdirSync,existsSync,copyFileSync} from 'node:fs';

if (!existsSync('config/firebase-web.json') && existsSync('config/firebase-web.example.json')) {
  copyFileSync('config/firebase-web.example.json', 'config/firebase-web.json');
}

function run(cmd,args){const r=spawnSync(cmd,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1)}
run(process.execPath,['node_modules/vite/bin/vite.js','build','--config','vite.vps.config.ts']);
await build({entryPoints:{server:'vps/main.ts','snapshot-worker':'vps/snapshot-worker.ts'},bundle:true,platform:'node',format:'esm',packages:'external',outdir:'vps/dist',outExtension:{'.js':'.mjs'}});
mkdirSync('vps/dist/migrations',{recursive:true});
cpSync('drizzle','vps/dist/migrations',{recursive:true});
cpSync('postgres','vps/dist/postgres',{recursive:true});
