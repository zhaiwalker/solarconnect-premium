import {z} from 'zod';
import {transaction} from './store.js';
let refresh:Promise<void>|undefined;
export async function fetchRate(){
  const url=process.env.FX_API_URL;if(!url?.startsWith('https://'))throw new Error('Источник курса не настроен.');
  const response=await fetch(url,{headers:process.env.FX_API_TOKEN?{Authorization:`Bearer ${process.env.FX_API_TOKEN}`}:{},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error('Источник курса недоступен.');
  const data=z.object({rubPerKzt:z.number().positive().max(100),source:z.string().min(1).max(120),asOf:z.iso.datetime()}).parse(await response.json());
  if(Math.abs(Date.now()-Date.parse(data.asOf))>7*86400000)throw new Error('Источник вернул устаревший курс.');
  return data;
}
export async function refreshAutomaticRate(){
  const settings=await transaction(s=>s.fx);
  if(settings.mode!=='automatic'||!process.env.FX_API_URL)return;
  if(settings.updatedAt&&Date.now()-Date.parse(settings.updatedAt)<3600000)return;
  if(!refresh)refresh=(async()=>{
    try{const rate=await fetchRate();await transaction(s=>{if(s.fx.mode==='automatic'){s.fx={...s.fx,rubPerKzt:rate.rubPerKzt,sourceName:rate.source,updatedAt:rate.asOf};s.revision++;}});}catch{/* Preserve last known rate; public catalog suppresses stale automatic rates. */}
  })().finally(()=>{refresh=undefined;});
  await refresh;
}
