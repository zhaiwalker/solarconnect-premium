import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import handler from './server/api';
export default defineConfig(({mode})=>{
  Object.assign(process.env,loadEnv(mode,process.cwd(),''));
  return {plugins:[react(),{name:'solarconnect-api',configureServer(server){server.middlewares.use('/api/shop',(req,res)=>{void handler(req,res);});}}]};
});
