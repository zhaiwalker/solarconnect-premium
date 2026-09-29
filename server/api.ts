import type {IncomingMessage,ServerResponse} from 'node:http';
import {createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {transaction,configured} from './store.js';
import {seed,type Store} from './seed.js';
import {fetchRate,refreshAutomaticRate} from './fx.js';
import {productSchema,publicationIssues,fxSchema,partnerSchema,orderSchema,unitPrice,amount,type Submission} from '../src/shop/model.js';
class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
const fail=(status:number,message:string):never=>{throw new HttpError(status,message);};
const secret=()=>process.env.ADMIN_PASSWORD||'';
const sign=(v:string)=>createHmac('sha256',secret()).update(v).digest('hex');
const equal=(a:string,b:string)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);};
function isAdmin(req:IncomingMessage){
  if(secret().length<16)return false;
  const token=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('solar_admin='))?.slice(12)||'';
  const [expiry,signature]=token.split('.');
  return Number(expiry)>Date.now()&&Number(expiry)<Date.now()+9*3600000&&equal(signature||'',sign(expiry));
}
function cookie(res:ServerResponse,value:string,maxAge:number){res.setHeader('Set-Cookie',`solar_admin=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${process.env.VERCEL||process.env.NODE_ENV==='production'?'; Secure':''}`);}
function limit(state:Store,key:string,max:number){
  const now=Date.now();for(const [k,v] of Object.entries(state.limits))if(v.until<now)delete state.limits[k];
  const entry=state.limits[key]??={count:0,until:now+900000};return ++entry.count<=max;
}
export function orderTotal(state:Store,order:z.infer<typeof orderSchema>){
  const lines=order.items.map(item=>{
    const p=state.products.find(p=>p.id===item.id&&p.published&&p.approved);
    if(!p||p.availability==='unavailable'||p.availability==='unknown')return fail(409,'Один из товаров недоступен. Обновите корзину.');
    const price=unitPrice(p);if(price===null)return fail(409,'Для товара необходимо уточнить цену.');
    const converted=amount(price,order.currency,state.fx);if(converted===null)return fail(409,'Расчёт в выбранной валюте временно недоступен. Выберите KZT или свяжитесь с нами.');
    if(p.category==='bundle'&&p.components.some(c=>!state.products.some(q=>q.id===c.id&&q.published&&q.approved&&['in_stock','on_order'].includes(q.availability))))return fail(409,'Уточните состав комплекта у менеджера.');
    return {id:p.id,sku:p.sku,name:p.name,quantity:item.quantity,unitPrice:converted,total:converted*item.quantity};
  });
  const total=lines.reduce((sum,line)=>sum+line.total,0);
  if(total!==order.expectedTotal)return fail(409,'Цена изменилась. Обновите корзину и подтвердите новую сумму.');
  return {lines,total};
}
async function body(req:IncomingMessage&{body?:unknown}){
  if(req.body!==undefined){if(JSON.stringify(req.body).length>1024*1024)fail(413,'Слишком большой запрос.');return typeof req.body==='string'?JSON.parse(req.body):req.body;}
  let size=0;const chunks:Buffer[]=[];for await(const raw of req){const chunk=Buffer.from(raw);size+=chunk.length;if(size>1024*1024)fail(413,'Слишком большой запрос.');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');
}
async function deliver(record:Submission){
  if(!process.env.CRM_WEBHOOK_URL)return 'unconfigured' as const;
  try{
    if(!process.env.CRM_WEBHOOK_URL.startsWith('https://'))throw new Error('HTTPS required');
    const r=await fetch(process.env.CRM_WEBHOOK_URL,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json','Idempotency-Key':record.id,...(process.env.CRM_WEBHOOK_TOKEN?{Authorization:`Bearer ${process.env.CRM_WEBHOOK_TOKEN}`}:{})},body:JSON.stringify(record),signal:AbortSignal.timeout(8000)});
    return r.ok?'sent' as const:'failed' as const;
  }catch{return 'failed' as const;}
}
export default async function handler(req:IncomingMessage&{body?:unknown},res:ServerResponse){
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try{
    const url=new URL(req.url||'/',`https://${req.headers.host}`);const action=url.searchParams.get('action')||'catalog';
    if(req.method==='GET'&&action==='catalog'){
      let state:Store=seed();let available=false;
      if(configured()){try{await refreshAutomaticRate();state=await transaction(s=>structuredClone(s));available=true;}catch{available=false;}}
      if(state.fx.mode==='automatic'&&(!state.fx.updatedAt||Date.now()-Date.parse(state.fx.updatedAt)>7*86400000))state.fx.rubPerKzt=null;
      const country=process.env.VERCEL&&req.headers['x-vercel-ip-country']==='RU'?'RU':'KZ';
      res.end(JSON.stringify({products:state.products.filter(p=>p.published&&p.approved),fx:state.fx,country,ordersEnabled:available}));return;
    }
    if(req.method!=='GET'&&req.method!=='POST')fail(405,'Метод не поддерживается.');
    if(req.method==='POST'){
      const origin=req.headers.origin;
      if(!origin||new URL(origin).host!==req.headers.host)fail(403,'Обновите страницу и повторите попытку.');
      if(!req.headers['content-type']?.startsWith('application/json'))fail(415,'Требуется JSON.');
    }
    if(!configured())fail(503,'Онлайн-приём временно недоступен. Свяжитесь с нами в WhatsApp.');
    const key=createHash('sha256').update(String(process.env.VERCEL?req.headers['x-forwarded-for']:req.socket.remoteAddress)).digest('hex');
    if(action==='login'&&req.method==='POST'){
      if(secret().length<16)fail(503,'Вход администратора не настроен.');
      if(!await transaction(s=>limit(s,'login:'+key,8)))fail(429,'Слишком много попыток. Повторите через 15 минут.');
      const data=z.object({password:z.string().max(300)}).parse(await body(req));
      if(!equal(sign(data.password),sign(secret())))fail(401,'Неверный пароль.');
      const expiry=String(Date.now()+8*3600000);cookie(res,`${expiry}.${sign(expiry)}`,8*3600);res.end('{"ok":true}');return;
    }
    if(action==='order'||action==='partner'){
      if(req.method!=='POST')fail(405,'Требуется POST.');
      if(!await transaction(s=>limit(s,'submit:'+key,12)))fail(429,'Слишком много заявок. Попробуйте позже.');
      const input=await body(req);
      const order=action==='order'?orderSchema.parse(input):null;
      const partner=action==='partner'?z.object({data:partnerSchema,requestId:z.uuid()}).parse(input):null;
      const id=order?.requestId||partner!.requestId;
      const result=await transaction(s=>{
        const existing=s.submissions.find(r=>r.id===id);
        if(existing)return {id,created:false};
        const data=order?{customer:order.customer,currency:order.currency,...orderTotal(s,order),fx:structuredClone(s.fx)}:partner!.data;
        const record:Submission={id,kind:order?'order':'partner',data,createdAt:new Date().toISOString(),status:'new',crm:process.env.CRM_WEBHOOK_URL?'pending':'unconfigured'};
        s.submissions.unshift(record);return {id,created:true,record};
      });
      if(result.created&&result.record){const crm=await deliver(result.record);await transaction(s=>{const r=s.submissions.find(r=>r.id===id);if(r)r.crm=crm;});}
      res.statusCode=201;res.end(JSON.stringify({id:result.id,ok:true}));return;
    }
    if(!isAdmin(req))fail(401,'Войдите в панель управления.');
    if(action==='logout'){cookie(res,'',0);res.end('{"ok":true}');return;}
    if(action==='admin'&&req.method==='GET'){res.end(JSON.stringify(await transaction(s=>({products:s.products,fx:s.fx,submissions:s.submissions,revision:s.revision,crmConfigured:!!process.env.CRM_WEBHOOK_URL,fxAutomaticConfigured:!!process.env.FX_API_URL}))));return;}
    if(req.method!=='POST')fail(405,'Требуется POST.');
    const input=await body(req);
    if(action==='save-product'){
      const {product,revision}=z.object({product:productSchema,revision:z.number().int()}).parse(input);
      await transaction(s=>{
        if(revision!==s.revision)fail(409,'Данные изменились. Обновите панель перед сохранением.');
        if(product.components.some(c=>!s.products.some(p=>p.id===c.id&&p.category!=='bundle')))fail(400,'Проверьте компоненты комплекта.');
        if(product.category==='bundle'&&product.components.length){product.priceKzt=product.components.reduce((sum,c)=>sum+(unitPrice(s.products.find(p=>p.id===c.id)!)||0)*c.quantity,0);product.discount=0;}
        if(product.published){const issues=publicationIssues(product);if(issues.length)fail(400,issues.join(' '));}
        if(s.products.some(p=>p.id!==product.id&&(p.slug===product.slug||(product.sku&&p.sku===product.sku))))fail(400,'Артикул или адрес уже занят.');
        if(product.components.some(c=>c.id===product.id||!s.products.some(p=>p.id===c.id&&p.category!=='bundle')))fail(400,'Проверьте компоненты комплекта.');
        s.products=s.products.filter(p=>p.id!==product.id);s.products.push(product);
        for(const bundle of s.products.filter(p=>p.category==='bundle')){
          const components=bundle.components.map(c=>({product:s.products.find(p=>p.id===c.id),quantity:c.quantity}));
          const complete=components.length>0&&components.every(c=>c.product&&unitPrice(c.product)!==null);
          bundle.priceKzt=complete?components.reduce((sum,c)=>sum+unitPrice(c.product!)!*c.quantity,0):null;
          bundle.discount=0;
          if(!complete||components.some(c=>!c.product?.published||!c.product.approved||!['in_stock','on_order'].includes(c.product.availability)))bundle.published=false;
        }
        s.revision++;
      });
    }else if(action==='delete-product'){
      const {id}=z.object({id:z.string()}).parse(input);await transaction(s=>{if(s.products.some(p=>p.components.some(c=>c.id===id)))fail(409,'Товар входит в комплект. Сначала измените комплект.');s.products=s.products.filter(p=>p.id!==id);s.products.forEach(p=>p.compatibleIds=p.compatibleIds.filter(k=>k!==id));s.revision++;});
    }else if(action==='save-fx'){
      const fx=fxSchema.parse(input);if(fx.mode==='automatic'&&!process.env.FX_API_URL)fail(400,'Сначала настройте источник курса на сервере.');
      await transaction(s=>{s.fx={...fx,updatedAt:new Date().toISOString()};s.revision++;});
    }else if(action==='refresh-fx'){
      const rate=await fetchRate();
      await transaction(s=>{s.fx={...s.fx,rubPerKzt:rate.rubPerKzt,sourceName:rate.source,updatedAt:rate.asOf};s.revision++;});
    }else if(action==='status'){
      const {id,status}=z.object({id:z.string(),status:z.enum(['new','processing','done'])}).parse(input);await transaction(s=>{const r=s.submissions.find(r=>r.id===id);if(!r)fail(404,'Заявка не найдена.');r!.status=status;});
    }else if(action==='retry-crm'){
      const {id}=z.object({id:z.string()}).parse(input);const record=await transaction(s=>s.submissions.find(r=>r.id===id));if(!record)fail(404,'Заявка не найдена.');
      const status=await deliver(record!);await transaction(s=>{const r=s.submissions.find(r=>r.id===id);if(r)r.crm=status;});
    }else fail(404,'Неизвестный запрос.');
    res.end('{"ok":true}');
  }catch(error){
    res.statusCode=error instanceof HttpError?error.status:error instanceof z.ZodError?400:503;
    const message=error instanceof HttpError?error.message:error instanceof z.ZodError?error.issues.map(i=>i.message).join(' '):'Сервис временно недоступен. Попробуйте позже или свяжитесь с нами.';
    res.end(JSON.stringify({error:message}));
  }
}
