import type {Product} from '../src/shop/model.js';
import {unitPrice} from '../src/shop/model.js';
export const siteUrl='https://solarconnect-premium-20260908.vercel.app';
export function escapeHtml(v:string){return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
export function pageHtml(template:string,{title,description,path,body,noindex=false,jsonLd}:{title:string;description:string;path:string;body:string;noindex?:boolean;jsonLd?:unknown}){
  const canonical=siteUrl+path;const base=path.replace(/^\/ru(?=\/|$)/,'')||'/';
  return template.replace(/<title>.*?<\/title>/,`<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/,`<meta name="description" content="${escapeHtml(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/,`<meta property="og:title" content="${escapeHtml(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/,`<meta property="og:description" content="${escapeHtml(description)}" />`)
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:url" content="${canonical}"/><meta name="robots" content="${noindex?'noindex,follow':'index,follow'}"/>${noindex?'':`<link rel="alternate" hreflang="ru-KZ" href="${siteUrl+base}"/><link rel="alternate" hreflang="ru-RU" href="${siteUrl+'/ru'+base}"/>`}${jsonLd?`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g,'\\u003c')}</script>`:''}</head>`)
    .replace('<div id="root"></div>',`<div id="root"><header style="padding:24px"><a href="/">Solarconnect</a> · <a href="/catalog">Каталог Deye</a> · <a href="/partners">Партнёрам</a></header><main style="max-width:1040px;margin:60px auto;padding:24px">${body}</main></div>`);
}
export function productSeo(p:Product){return {'@context':'https://schema.org','@type':'Product',name:p.name,sku:p.sku,mpn:p.sku,brand:{'@type':'Brand',name:'Deye'},description:p.description,image:p.images.map(src=>src.startsWith('/')?siteUrl+src:src),additionalProperty:p.specs.map(s=>({'@type':'PropertyValue',name:s.label,value:s.value})),...(unitPrice(p)!==null?{offers:{'@type':'Offer',priceCurrency:'KZT',price:unitPrice(p),availability:`https://schema.org/${p.availability==='in_stock'?'InStock':p.availability==='on_order'?'PreOrder':'OutOfStock'}`,url:siteUrl+'/product/'+p.slug,seller:{'@type':'Organization',name:'Solarconnect'}}}:{})};}
