import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({root:resolve('vps'),publicDir:resolve('public'),plugins:[react()],resolve:{alias:{'next/dynamic':resolve('vps/dynamic.tsx')}},build:{outDir:resolve('vps/dist/client'),emptyOutDir:true}});
