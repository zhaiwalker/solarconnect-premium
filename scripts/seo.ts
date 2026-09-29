import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pageHtml,siteUrl,escapeHtml} from '../server/seo';
const template=await readFile('dist/index.html','utf8');
const pages:[string,string,string][]=[
  ['/catalog','Каталог Deye в Казахстане','Инверторы и аккумуляторные системы Deye для дома, бизнеса и промышленности. Подбор оборудования Solarconnect.'],
  ['/catalog/grid','Сетевые инверторы Deye','Однофазные и трёхфазные сетевые инверторы Deye. Подбор оборудования для солнечной электростанции.'],
  ['/catalog/hybrid','Гибридные инверторы Deye','Гибридные инверторы Deye для низковольтных и высоковольтных аккумуляторов. Генерация, накопление и резерв.'],
  ['/catalog/battery','Аккумуляторы Deye — LV и HV','Аккумуляторные системы Deye. Подбор батарей и компонентов для дома и коммерческих объектов.'],
  ['/catalog/accessory','Компоненты солнечных систем Deye','BMS, PDU, стойки, кабели и соединительные комплекты. Согласование совместимости с инженером.'],
  ['/catalog/bundle','Готовые комплекты Deye','Комплектация солнечных электростанций: инвертор, аккумуляторы и необходимые компоненты.'],
  ['/partners','Оборудование Deye оптом — партнёрам Solarconnect','Специальные условия для монтажных, торговых, проектных и EPC-компаний. Поддержка по подбору и настройке.'],
  ['/delivery','Доставка оборудования Deye по Казахстану','Самовывоз в Алматы и доставка транспортной компанией. Условия и сроки согласуются перед оплатой.'],
  ['/support','Техническая поддержка Deye — Solarconnect','Подбор оборудования, совместимость, документация и помощь после поставки.'],
  ['/projects','Проекты Solarconnect','Обсудите опыт команды и решения для частного дома, коммерческого объекта и промышленности.'],
];
const urls=['/'];
for(const [route,title,description] of pages){for(const regional of [false,true]){
  const routePath=(regional?'/ru':'')+route;const heading=regional?title.replace('в Казахстане','в России').replace('по Казахстану','в Россию'):title;
  const body=`<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p><nav><a href="/catalog/grid">Сетевые инверторы</a> · <a href="/catalog/hybrid">Гибридные инверторы</a> · <a href="/catalog/battery">Аккумуляторные системы</a></nav><p><a href="/partners#application">Получить индивидуальные условия</a></p>`;
  await mkdir('dist'+routePath,{recursive:true});await writeFile('dist'+routePath+'/index.html',pageHtml(template,{title:heading+' | Solarconnect',description,path:routePath,body}));urls.push(routePath);
}}
for(const route of ['/cart','/favorites','/compare','/admin']){await mkdir('dist'+route,{recursive:true});await writeFile('dist'+route+'/index.html',pageHtml(template,{title:'Solarconnect',description:'Оборудование Deye',path:route,body:'<h1>Solarconnect</h1>',noindex:true}));}
await writeFile('dist/robots.txt',`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /cart\nDisallow: /favorites\nDisallow: /compare\nSitemap: ${siteUrl}/sitemap.xml\n`);
await writeFile('dist/sitemap-static.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${siteUrl+u}</loc></url>`).join('')}</urlset>`);
console.log(`SEO pages generated: ${urls.length}`);
