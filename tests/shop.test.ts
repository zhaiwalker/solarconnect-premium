import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {amount,defaultFx,publicationIssues,productSchema,partnerSchema,customerSchema} from '../src/shop/model';
import {seed} from '../server/seed';
import handler,{orderTotal} from '../server/api';
import {transaction} from '../server/store';
process.env.SOLAR_DATA_DIR=path.resolve('.test-data',randomUUID());
process.env.ADMIN_PASSWORD='local-test-password-not-a-production-secret';
delete process.env.DATABASE_URL;delete process.env.VERCEL;delete process.env.CRM_WEBHOOK_URL;
const customer={name:'Тест',phone:'+7 777 123 45 67',whatsapp:'',email:'test@example.invalid',city:'Алматы',country:'KZ' as const,customerType:'person' as const,delivery:'discuss' as const,comment:'Тестовая заявка',consent:true as const};
const state=seed();const fixture=structuredClone(state.products.find(p=>p.sku)!);
Object.assign(fixture,{id:'test-fixture',slug:'test-fixture',sku:'TEST-NOT-FOR-SALE',name:'Тестовый товар',priceKzt:100000,discount:10,approved:true,published:true,availability:'in_stock'});
test('Publication rejects missing commercial data and all initial SKUs remain drafts',()=>{
  assert.equal(state.products.length,24);assert.equal(state.products.filter(p=>p.published).length,0);
  assert.ok(publicationIssues(state.products[0]).length>=5);assert.equal(publicationIssues(fixture).length,0);
  assert.equal(productSchema.safeParse({...fixture,images:['javascript:alert(1)']}).success,false);
});
test('KZT/RUB conversion includes markup and rounding without inventing a rate',()=>{
  assert.equal(amount(100000,'KZT',defaultFx),100000);assert.equal(amount(100000,'RUB',defaultFx),null);
  assert.equal(amount(100001,'RUB',{...defaultFx,rubPerKzt:.2,markup:1.1,rounding:100}),22000);
  assert.equal(amount(100000,'RUB',{...defaultFx,mode:'automatic',rubPerKzt:.2,updatedAt:new Date(Date.now()-8*86400000).toISOString()}),null);
  assert.equal(amount(100000,'RUB',{...defaultFx,mode:'automatic',rubPerKzt:.2,updatedAt:'invalid'}),null);
  assert.equal(amount(100000,'RUB',{...defaultFx,mode:'automatic',rubPerKzt:.2,updatedAt:new Date().toISOString()}),20000);
});
test('Order total is recomputed server-side and stale totals or unavailable items are rejected',()=>{
  state.products=[fixture];const order={customer,currency:'KZT' as const,items:[{id:fixture.id,quantity:2}],expectedTotal:180000,requestId:randomUUID()};
  assert.equal(orderTotal(state,order).total,180000);
  assert.throws(()=>orderTotal(state,{...order,expectedTotal:1}),/Цена изменилась/);
  assert.throws(()=>orderTotal(state,{...order,currency:'RUB'}),/валюте/);
  assert.throws(()=>orderTotal(state,{...order,items:[{id:'missing',quantity:1}]}),/недоступен/);
});
test('Forms validate contact information, consent and tax IDs',()=>{
  assert.ok(customerSchema.safeParse(customer).success);
  assert.equal(customerSchema.safeParse({...customer,name:' ',consent:false}).success,false);
  assert.equal(partnerSchema.safeParse({...customer,company:'Test',taxId:'123',role:'dealer',activity:'Test',equipment:'Test',volume:'Test'}).success,false);
});
const server=createServer((req,res)=>void handler(req,res));
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
const address=server.address();if(!address||typeof address==='string')throw new Error('No address');
const base=`http://127.0.0.1:${address.port}`;
after(()=>server.close());
async function request(action:string,data?:unknown,cookie?:string,origin=base){return fetch(`${base}/api/shop?action=${action}`,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',Origin:origin,...(cookie?{Cookie:cookie}:{})},body:data===undefined?undefined:JSON.stringify(data)});}
test('API authentication, publication, order persistence and duplicate protection',async()=>{
  assert.equal((await request('admin')).status,401);
  assert.equal((await request('login',{password:process.env.ADMIN_PASSWORD},undefined,'https://example.invalid')).status,403);
  const login=await request('login',{password:process.env.ADMIN_PASSWORD});assert.equal(login.status,200);
  const cookie=login.headers.get('set-cookie')!.split(';')[0];assert.ok(login.headers.get('set-cookie')!.includes('HttpOnly'));
  assert.equal((await request('save-product',{product:fixture,revision:0},cookie)).status,200);
  const catalog=await (await request('catalog')).json();assert.equal(catalog.products.length,1);assert.equal(catalog.products[0].sku,fixture.sku);
  assert.equal((await request('save-product',{product:fixture,revision:0},cookie)).status,409);
  const id=randomUUID();const order={customer,currency:'KZT',items:[{id:fixture.id,quantity:1}],expectedTotal:90000,requestId:id};
  assert.equal((await request('order',{...order,expectedTotal:1})).status,409);
  assert.equal((await request('order',order)).status,201);
  assert.equal((await request('order',order)).status,201);
  const records=await transaction(s=>s.submissions);assert.equal(records.length,1);assert.equal(records[0].id,id);assert.equal(records[0].crm,'unconfigured');
  const admin=await (await request('admin',undefined,cookie)).json();assert.equal(admin.submissions.length,1);
  assert.equal((await request('logout',{},cookie)).status,200);
});
