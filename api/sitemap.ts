import type {IncomingMessage,ServerResponse} from 'node:http';
import {readFile} from 'node:fs/promises';
import {transaction,configured} from '../server/store.js';
import {siteUrl,escapeHtml} from '../server/seo.js';
export default async function handler(_req:IncomingMessage,res:ServerResponse){
  try{
    const base=await readFile('dist/sitemap-static.xml','utf8');
    const products=configured()?await transaction(s=>s.products.filter(p=>p.published&&p.approved)):[];
    res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, max-age=60');
    res.end(base.replace('</urlset>',products.map(p=>`<url><loc>${siteUrl}/product/${escapeHtml(p.slug)}</loc></url>`).join('')+'</urlset>'));
  }catch{res.statusCode=503;res.end();}
}
