import type {IncomingMessage,ServerResponse} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {transaction,configured} from '../server/store.js';
import {pageHtml,escapeHtml,productSeo} from '../server/seo.js';
export default async function handler(req:IncomingMessage,res:ServerResponse){
  try{
    const url=new URL(req.url||'/',`https://${req.headers.host}`);const slug=url.searchParams.get('slug')||'';
    const product=configured()?await transaction(s=>s.products.find(p=>p.slug===slug&&p.published&&p.approved)):undefined;
    const template=await readFile(path.resolve('dist/index.html'),'utf8');
    res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
    res.statusCode=product?200:404;
    const basePath=(url.searchParams.get('region')==='ru'?'/ru':'')+'/product/'+encodeURIComponent(slug);
    res.end(pageHtml(template,{title:product?`${product.name} — Solarconnect`:'Товар не найден — Solarconnect',description:product?.description.slice(0,170)||'Подбор оборудования Deye в Solarconnect.',path:basePath,noindex:!product,jsonLd:product?productSeo(product):undefined,body:product?`<h1>${escapeHtml(product.name)}</h1><p>Артикул: ${escapeHtml(product.sku)}</p><p>${escapeHtml(product.description)}</p>${product.images[0]?`<img src="${escapeHtml(product.images[0])}" width="350" alt="${escapeHtml(product.name)}"/>`:''}<dl>${product.specs.map(r=>`<dt>${escapeHtml(r.label)}</dt><dd>${escapeHtml(r.value)}</dd>`).join('')}</dl><a href="${escapeHtml(product.datasheet)}">Datasheet</a> · <a href="/partners">Получить оптовую цену</a>`:'<h1>Товар не найден</h1><a href="/catalog">Перейти в каталог</a>'}));
  }catch{res.statusCode=503;res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<h1>Страница временно недоступна</h1><a href="/catalog">Перейти в каталог</a>');}
}
