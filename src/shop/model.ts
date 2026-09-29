import { z } from 'zod';

export const sections = [
  { id: 'grid', title: 'Сетевые инверторы', note: 'Энергия солнца для ежедневных задач.', range: 'Одна и три фазы', icon: 'sun' },
  { id: 'hybrid', title: 'Гибридные инверторы', note: 'Генерация, накопление и резерв.', range: 'Low Voltage / High Voltage', icon: 'bolt' },
  { id: 'battery', title: 'Аккумуляторные системы', note: 'Сохраните энергию на потом.', range: 'LV и HV системы', icon: 'battery' },
  { id: 'accessory', title: 'Компоненты и аксессуары', note: 'Всё для согласованной работы системы.', range: 'BMS, PDU, стойки и кабели', icon: 'box' },
] as const;
const safeUrl = z.string().max(1200).refine(v => !v || /^https:\/\/[^\s]+$/i.test(v) || /^\/(?!\/)[\w/.-]+$/.test(v), 'Укажите HTTPS-ссылку или путь /images/…');
export const productSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,100}$/), slug: z.string().regex(/^[a-z0-9-]{1,140}$/),
  sku: z.string().trim().max(120), name: z.string().trim().min(3).max(180),
  category: z.enum(['grid','hybrid','battery','accessory','bundle']),
  power: z.number().finite().min(0).max(100000), phases: z.enum(['none','1','3']), battery: z.enum(['none','LV','HV']),
  purpose: z.array(z.enum(['home','business','industry'])).max(3),
  priceKzt: z.number().finite().positive().max(1e10).nullable(), discount: z.number().min(0).max(90),
  availability: z.enum(['unknown','in_stock','on_order','unavailable']),
  published: z.boolean(), approved: z.boolean(), featured: z.boolean(),
  description: z.string().max(10000), images: z.array(safeUrl).max(10),
  specs: z.array(z.object({label:z.string().min(1).max(120),value:z.string().min(1).max(500)})).max(70),
  datasheet: safeUrl, manual: safeUrl, source: safeUrl,
  certificates: z.array(z.object({name:z.string().min(1).max(100),url:safeUrl})).max(20),
  compatibleIds: z.array(z.string().max(100)).max(50),
  components: z.array(z.object({id:z.string().max(100),quantity:z.number().int().min(1).max(100)})).max(50),
});
export type Product = z.infer<typeof productSchema>;
export const fxSchema = z.object({
  mode:z.enum(['manual','automatic']), rubPerKzt:z.number().positive().max(100).nullable(),
  markup:z.number().min(0.1).max(10), rounding:z.number().int().min(1).max(10000),
  sourceName:z.string().max(120), updatedAt:z.string().max(50),
});
export type FxSettings = z.infer<typeof fxSchema>;
export type Currency = 'KZT'|'RUB';
export const defaultFx:FxSettings={mode:'manual',rubPerKzt:null,markup:1,rounding:1,sourceName:'',updatedAt:''};
export type CartItem={id:string;quantity:number};
export const availabilityLabels={unknown:'Наличие уточняется',in_stock:'В наличии',on_order:'Под заказ',unavailable:'Нет в наличии'};
export function amount(kzt:number,currency:Currency,fx:FxSettings){
  if(currency==='KZT')return Math.round(kzt);
  if(!fx.rubPerKzt)return null;
  if(fx.mode==='automatic'&&(!Number.isFinite(Date.parse(fx.updatedAt))||Math.abs(Date.now()-Date.parse(fx.updatedAt))>7*86400000))return null;
  return Math.round(kzt*fx.rubPerKzt*fx.markup/fx.rounding)*fx.rounding;
}
export function unitPrice(p:Product){return p.priceKzt===null?null:Math.round(p.priceKzt*(1-p.discount/100));}
export function formatPrice(value:number|null,currency:Currency){return value===null?'Цена по запросу':`${value.toLocaleString('ru-RU')} ${currency==='KZT'?'₸':'₽'}`;}
export function publicationIssues(p:Product){
  const issues:string[]=[];
  if(!p.approved)issues.push('Подтвердите согласование SKU с Solarconnect.');
  if(!p.sku)issues.push('Укажите точный артикул производителя.');
  if(!p.priceKzt)issues.push('Укажите утверждённую цену в тенге.');
  if(p.availability==='unknown')issues.push('Подтвердите наличие или поставку под заказ.');
  if(!p.images.length||!p.images[0])issues.push('Добавьте фотографию товара.');
  if(p.description.trim().length<60)issues.push('Добавьте полезное описание товара.');
  if(!p.specs.length)issues.push('Заполните технические характеристики.');
  if(p.category!=='bundle'&&(!p.datasheet||!p.source))issues.push('Укажите Datasheet и официальный источник.');
  if(['grid','hybrid','battery'].includes(p.category)&&!p.manual)issues.push('Добавьте инструкцию производителя.');
  if(p.category==='bundle'&&!p.components.length)issues.push('Добавьте компоненты комплекта.');
  return issues;
}
const text=z.string().trim().min(1,'Заполните поле').max(160);
const phone=z.string().trim().max(30).refine(v=>/^[78]\d{10}$/.test(v.replace(/\D/g,'')),'Укажите телефон в формате +7 777 123 45 67');
export const customerSchema=z.object({name:text,phone,whatsapp:z.union([z.literal(''),phone]),email:z.email('Проверьте e-mail').max(200),city:text,country:z.enum(['KZ','RU']),customerType:z.enum(['person','company']),delivery:z.enum(['pickup','transport','discuss']),comment:z.string().max(2000),consent:z.literal(true),website:z.string().max(0).optional()});
export const partnerSchema=customerSchema.pick({name:true,phone:true,whatsapp:true,email:true,city:true,country:true,consent:true,website:true}).extend({company:text,taxId:z.string().regex(/^(\d{10}|\d{12})$/,'БИН — 12 цифр, ИНН — 10 или 12'),activity:text,role:z.enum(['installer','trade','dealer','design','epc']),equipment:text,volume:text});
export type Customer=z.infer<typeof customerSchema>;
export type Partner=z.infer<typeof partnerSchema>;
export const orderSchema=z.object({customer:customerSchema,currency:z.enum(['KZT','RUB']),items:z.array(z.object({id:z.string().max(100),quantity:z.number().int().min(1).max(100)})).min(1).max(50),expectedTotal:z.number().nonnegative(),requestId:z.uuid()});
export type Submission={id:string;kind:'order'|'partner';createdAt:string;status:'new'|'processing'|'done';data:unknown;crm:'pending'|'sent'|'unconfigured'|'failed'};
export type CatalogResponse={products:Product[];fx:FxSettings;country:'KZ'|'RU';ordersEnabled:boolean};
export const whatsapp=(message:string)=>`https://wa.me/77713169033?text=${encodeURIComponent(message)}`;
