import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import {seed,type Store} from './seed.js';
let pool:pg.Pool|undefined;
let queue=Promise.resolve();
export function configured(){return !!process.env.DATABASE_URL||(!process.env.VERCEL&&process.env.NODE_ENV!=='production');}
async function database(){
  pool??=new pg.Pool({connectionString:process.env.DATABASE_URL,max:3});
  return pool;
}
export async function transaction<T>(fn:(store:Store)=>T|Promise<T>):Promise<T>{
  if(process.env.DATABASE_URL){
    const client=await (await database()).connect();
    try{
      await client.query('BEGIN');
      const r=await client.query('SELECT data FROM solarconnect_private.store WHERE id = $1 FOR UPDATE',['main']);
      if(!r.rows[0])throw new Error('Database not initialized');
      const state=r.rows[0].data as Store;
      const result=await fn(state);
      await client.query('UPDATE solarconnect_private.store SET data=$1 WHERE id=$2',[JSON.stringify(state),'main']);
      await client.query('COMMIT'); return result;
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
  if(!configured())throw new Error('Storage unavailable');
  let release!:()=>void;const previous=queue;queue=new Promise<void>(r=>{release=r;});await previous;
  try{
    const dir=process.env.SOLAR_DATA_DIR||path.resolve('.solar-data');await mkdir(dir,{recursive:true});
    const file=path.join(dir,'store.json');let state:Store;
    try{state=JSON.parse(await readFile(file,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;state=seed();}
    const result=await fn(state);await writeFile(file+'.tmp',JSON.stringify(state,null,2),{mode:0o600});await rename(file+'.tmp',file);return result;
  }finally{release();}
}
export async function initializeDatabase(){
  if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL first');
  const db=await database();
  await db.query('CREATE SCHEMA IF NOT EXISTS solarconnect_private');
  await db.query('REVOKE ALL ON SCHEMA solarconnect_private FROM PUBLIC');
  await db.query('CREATE TABLE IF NOT EXISTS solarconnect_private.store (id TEXT PRIMARY KEY, data JSONB NOT NULL)');
  await db.query('INSERT INTO solarconnect_private.store(id,data) VALUES($1,$2) ON CONFLICT DO NOTHING',['main',JSON.stringify(seed())]);
  await db.end();
}
