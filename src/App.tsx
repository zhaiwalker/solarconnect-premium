import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from 'motion/react';
import { ArrowUpRight, ArrowRight, Sun, House, Buildings, Plant, BatteryCharging, Check, Plus, Minus, X, List, WhatsappLogo, Phone, MapPin, ShieldCheck, Lightning, CaretDown, Moon, InstagramLogo } from '@phosphor-icons/react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import planData from './plans.json';
import PremiumHero from './PremiumHero';
import EnergyExperience from './EnergyExperience';
import { CommerceActions, EquipmentSections, PopularProducts, PartnerBanner, ServiceBlocks, ShopRoute } from './shop/Storefront';
import { lazy, Suspense } from 'react';
import { useShop } from './shop/ShopContext';
import { amount, formatPrice } from './shop/model';
const Admin = lazy(()=>import('./shop/Admin'));

type Plan = typeof planData[number];
const wa = (message: string) => `https://wa.me/77713169033?text=${encodeURIComponent(message)}`;
const ease = [0.22, 1, 0.36, 1] as const;
const categories = [
  { id: 'home', label: 'Дом', icon: House, text: 'Сетевые станции для частных домов. Собственная энергия для привычного комфорта.' },
  { id: 'offgrid', label: 'Автономка', icon: BatteryCharging, text: 'Станции с накопителями для объектов без сети или с частыми отключениями.' },
  { id: 'business', label: 'Предприятие', icon: Buildings, text: 'Трёхфазные станции для магазинов, цехов и складов с дневным потреблением.' },
  { id: 'farm', label: 'Ферма', icon: Plant, text: 'Энергия для насосов, холодильников и техники в удалённых хозяйствах.' },
];
const solutions = [
  { id:'home', title:'Для дома', power:'3–15 кВт', image:'home', icon:House, description:'Меньше счетов. Больше независимости.', detail:'Подбираем станцию по потреблению вашего дома. Для защиты от отключений добавляем гибридный инвертор и накопитель.' },
  { id:'business', title:'Для бизнеса', power:'20–500 кВт', image:'business', icon:Buildings, description:'Энергия, которая работает на ваш бизнес.', detail:'Промышленные СЭС для цехов, СТО, складов и торговых центров. Проектируем под график работы и дневную нагрузку.' },
  { id:'farm', title:'Для агросектора', power:'10–100 кВт', image:'farm', icon:Plant, description:'Надёжное питание. Даже вдали от сети.', detail:'Питание насосов, поилок и холодильников там, где нет стабильной сети. Подбираем накопители для работы после заката.' },
];
const questions = [
  ['Работают ли солнечные панели зимой?', 'Да. Выработка зависит прежде всего от количества солнечного света и длины дня. Зимой генерация снижается, поэтому при проектировании учитываем сезонность и потребление вашего объекта.'],
  ['Будет ли электричество при отключении сети?', 'Для работы при отключениях нужны гибридный инвертор и аккумулятор. Обычная сетевая станция без резервного питания отключается вместе с сетью. Подберём накопитель под важные для вас приборы.'],
  ['Что входит в стоимость под ключ?', 'Оборудование, крепления, кабельная продукция, монтаж и пусконаладка. В каждом комплекте можно посмотреть подробный состав. Финальную спецификацию инженер подтверждает после обследования объекта.'],
  ['За сколько окупится станция?', 'Это зависит от тарифа, графика потребления, региона и выбранной системы. Для домашних комплектов на сайте указаны ориентиры от 5 до 7 лет. Точный расчёт подготовим по вашим счетам за электричество.'],
  ['Можно ли оформить рассрочку?', 'Возможна рассрочка Kaspi и BCC. Актуальные условия и доступность для выбранного комплекта уточним при расчёте.'],
  ['В каких регионах вы работаете?', 'Проектируем, устанавливаем и обслуживаем солнечные станции по всему Казахстану. Центральный офис находится в Алматы: улица Жарокова, 284/3.'],
];

function Brand() { return <a href="/" className="brand" aria-label="Solarconnect, на главную"><img src="/images/mark.webp" alt="" width="39" height="39" /><span>SOLAR<span className="brand-light">CONNECT</span></span></a>; }

function App() {
  const path = window.location.pathname.replace(/^\/ru(?=\/|$)/,'').replace(/\/$/,'') || '/';
  const home = path === '/';
  const shop = useShop();
  const planPrice = (value:string) => formatPrice(amount(Number(value.replace(/\D/g,'')),shop.currency,shop.fx),shop.currency);
  const [category, setCategory] = useState('home');
  const [selected, setSelected] = useState<Plan|null>(null);
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState<number|null>(0);
  const [step, setStep] = useState(0);
  const [bill, setBill] = useState(30000);
  const [ready, setReady] = useState('');
  const [formError, setFormError] = useState('');
  const [invalidField, setInvalidField] = useState<'name'|'phone'|'city'|null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const wasReady = useRef(false);
  const [contact, setContact] = useState({name:'',phone:'',city:''});
  const [dark, setDark] = useState(()=>{try{return localStorage.getItem('solar-theme')==='dark';}catch{return false;}});
  const reduced = useReducedMotion();
  const lastPlanTrigger = useRef<HTMLButtonElement|null>(null);
  const chosen = planData.filter(p=>p.group===category);
  const steps = [
    {title:'Заявка', text:'Обсуждаем вашу задачу и считаем текущее потребление. Достаточно последнего счёта за электричество.',icon:Phone},
    {title:'Аудит',text:'Обследуем объект, проверяем инсоляцию, состояние крыши и точку подключения.',icon:Sun},
    {title:'Проект',text:'Готовим схему, спецификацию оборудования и точный расчёт окупаемости.',icon:Buildings},
    {title:'Монтаж',text:'Устанавливаем оборудование и запускаем систему. Монтаж и пусконаладка занимают 3–10 дней.',icon:Lightning},
    {title:'Сервис',text:'Настраиваем мониторинг выработки в приложении. Обеспечиваем обслуживание и гарантийную поддержку.',icon:ShieldCheck},
  ];
  useEffect(()=>{document.documentElement.dataset.theme = dark?'dark':'light';try{localStorage.setItem('solar-theme',dark?'dark':'light');}catch{/* Theme still works without storage. */}},[dark]);
  useEffect(()=>{
    if(ready) resultHeading.current?.focus();
    else if(wasReady.current) document.getElementById('name')?.focus();
    wasReady.current=!!ready;
  },[ready]);
  const chooseCategory = (value:string) => {
    setCategory(value);
    document.getElementById('pricing')?.scrollIntoView({behavior:reduced?'instant':'smooth'});
    requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`.category-tab[data-state="active"]`)?.focus({preventScroll:true}));
  };
  const submit = (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name=String(data.get('name')||'').trim(),phone=String(data.get('phone')||'').trim(),city=String(data.get('city')||'').trim();
    const fail=(field:'name'|'phone'|'city',message:string)=>{setInvalidField(field);setFormError(message);document.getElementById(field)?.focus();};
    if(!name) {fail('name','Укажите ваше имя.');return;}
    if(!/^(?:7|8)\d{10}$/.test(phone.replace(/\D/g,''))) {fail('phone','Укажите телефон в формате +7 777 123 45 67.');return;}
    if(!city) {fail('city','Укажите ваш город.');return;}
    setFormError('');setInvalidField(null);setReady(`Здравствуйте! Хочу рассчитать солнечную станцию. Имя: ${name}. Телефон: ${phone}. Город: ${city}. Счёт за электричество: ${bill.toLocaleString('ru-RU')} ₸ в месяц.`);
  };
  return <MotionConfig reducedMotion="user"><div id="top">
    <a className="skip-link" href="#main">К содержанию</a>
    <header className="header">
      <div className="nav-inner container"><Brand/>
        <nav className="desktop-nav" aria-label="Основная навигация"><a href="/catalog">Каталог Deye <CaretDown size={12}/></a><a href="/#pricing">Комплекты</a><a href="/partners">Партнёрам</a><a href="/delivery">Доставка</a><a href="/support">Поддержка</a></nav>
        <div className="nav-actions"><CommerceActions/><a className="nav-phone" href="tel:+77713169033">+7 771 316 90 33</a><a href="/#contact" className="button nav-cta">Получить расчёт <ArrowUpRight size={16}/></a>
        <button className="icon-button theme-button" onClick={()=>setDark(!dark)} aria-label={dark?'Включить светлую тему':'Включить тёмную тему'}>{dark?<Sun size={20}/>:<Moon size={20}/>}</button>
        <Dialog.Root open={menu} onOpenChange={setMenu}><Dialog.Trigger asChild><button className="icon-button mobile-menu" aria-label="Открыть меню"><List size={25}/></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="modal-overlay"/><Dialog.Content className="menu-panel"><Dialog.Title>Solarconnect</Dialog.Title><Dialog.Description>Солнечные станции под ключ</Dialog.Description><Dialog.Close asChild><button className="icon-button modal-close" aria-label="Закрыть меню"><X size={24}/></button></Dialog.Close><nav aria-label="Мобильная навигация">{[['/catalog','Каталог Deye'],['/#pricing','Комплекты'],['/partners','Партнёрам'],['/delivery','Доставка'],['/support','Поддержка'],['/favorites','Избранное'],['/compare','Сравнение'],['/#contact','Контакты']].map(([href,label])=><a key={href} href={href} onClick={()=>setMenu(false)}>{label}<ArrowUpRight size={23}/></a>)}</nav><a href="tel:+77713169033">+7 771 316 90 33</a></Dialog.Content></Dialog.Portal></Dialog.Root></div>
      </div>
    </header>
    <main id="main">
      {home ? <><PremiumHero/><EquipmentSections/><PopularProducts/><PartnerBanner/>
      <section id="solutions" className="section container solutions">
        <div className="section-heading"><span className="eyebrow">Энергия под вашу задачу</span><h2>Найдите свою<br/>солнечную сторону.</h2><p>Подбираем мощность под реальное потребление объекта.</p></div>
        <div className="solution-grid">{solutions.map((s,i)=><motion.article key={s.id} className="solution-card" initial={{opacity:0,y:reduced?0:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.15}} transition={{duration:.65,delay:i*.08,ease}}><button className="solution-image" onClick={()=>chooseCategory(s.id)} aria-label={`Подобрать решение ${s.title.toLowerCase()}`}><img src={`/images/${s.image}.webp`} alt={`${s.title}: солнечная электростанция`} loading="lazy" width="650" height="700"/><span className="solution-arrow"><ArrowUpRight size={25}/></span></button><div className="solution-title"><h3><s.icon size={23} weight="light"/>{s.title}</h3><span>{s.power}</span></div><h4>{s.description}</h4><p>{s.detail}</p></motion.article>)}</div>
        <div className="backup-note"><BatteryCharging size={23}/><p>Нужен свет при отключении сети? <button onClick={()=>chooseCategory('offgrid')}>Посмотрите решения с накопителями <ArrowUpRight size={16}/></button></p></div>
      </section>

      <EnergyExperience/><section id="why" className="section why-section container">
        <div className="why-picture"><img src="/images/house.webp" alt="Современный частный дом с солнечными панелями на крыше" loading="lazy" width="800" height="950"/></div>
        <div className="why-copy"><span className="eyebrow">Почему Solarconnect</span><h2>Сильная инженерия.<br/>Спокойствие на годы.</h2><p className="section-description">Берём на себя весь путь к собственной энергии. Вы знаете, что устанавливаем, как это работает и кто отвечает за результат.</p><div className="benefit-list">
          <div><ShieldCheck size={27} weight="light"/><div><h3>Оборудование, которому доверяем</h3><p>Панели Longi и Jinko, инверторы Deye и Solarconnect. Официальные дилеры Victron Energy и Fronius.</p></div></div>
          <div><Sun size={27} weight="light"/><div><h3>Опыт в энергетике 20 лет</h3><p>Инженеры и монтажники с практическим опытом. Проектируем и устанавливаем по всему Казахстану.</p></div></div>
          <div><Lightning size={27} weight="light"/><div><h3>Поддержка после запуска</h3><p>Мониторинг выработки в приложении, сервис 24/7 и выезд сервисной группы в течение 48 часов.</p></div></div>
        </div><a href="#process" className="text-link">Как мы работаем <ArrowRight size={19}/></a></div>
      </section>

      <section id="pricing" className="section pricing-section">
        <div className="container"><div className="section-heading"><span className="eyebrow">Прозрачно. Под ключ.</span><h2>Какая станция<br/>подходит вам?</h2><p>Оборудование, монтаж и пусконаладка уже включены.</p></div>
        <Tabs.Root value={category} onValueChange={setCategory}><Tabs.List className="category-tabs" aria-label="Категории решений">{categories.map(c=><Tabs.Trigger key={c.id} value={c.id} className="category-tab">{category===c.id&&<motion.span className="tab-background" layoutId="category-indicator" transition={{type:'spring',bounce:0,duration:.3}}/>}<c.icon size={19}/><span>{c.label}</span></Tabs.Trigger>)}</Tabs.List>
        <p className="category-description">{categories.find(c=>c.id===category)?.text}</p>
        {categories.map(c=><Tabs.Content key={c.id} value={c.id}><div className="plans">{chosen.map((p,i)=><motion.article key={p.name} className={`plan ${i===1?'featured':''}`} initial={{opacity:0,y:reduced?0:10}} animate={{opacity:1,y:0}} transition={{duration:.3,delay:i*.04}}>
          <div className="plan-heading"><h3>{p.name}</h3><Sun size={22} weight="light"/></div><p className="plan-power">{p.power.replace('генерация ','')}</p><p className="plan-case">{p.caseText}</p><div className="plan-price">{planPrice(p.price)}</div><span className="plan-price-note">за готовую станцию под ключ</span><div className="plan-divider"/><ul className="plan-list"><li><Check size={17}/>{p.yieldYear.replace('~','≈ ')}</li><li><Check size={17}/>Окупаемость: {p.payback}</li><li><Check size={17}/>Монтаж и пусконаладка</li></ul><button className={`button ${i===1?'primary':'outline'} plan-button`} onClick={e=>{lastPlanTrigger.current=e.currentTarget;setSelected(p);}}>Состав комплекта <ArrowUpRight size={18}/></button>
        </motion.article>)}</div></Tabs.Content>)}</Tabs.Root>
        <div className="pricing-bottom"><p>Цены и показатели ориентировочные, по данным solarconnect.kz. Расчёт при тарифе около 30 ₸/кВт·ч. Точный состав и окупаемость подтвердит инженер.</p><div className="installment"><span>Доступна рассрочка</span><strong>Kaspi <span>/</span> BCC</strong></div></div>
        </div>
      </section>

      <section id="process" className="section container process-section"><div className="section-heading"><h2>Всё под ключ.<br/>Всё под контролем.</h2><p>Одна команда на всех этапах. Никаких лишних забот.</p></div><div className="process-layout"><div className="process-steps" role="tablist" aria-label="Этапы установки">{steps.map((s,i)=><button key={s.title} id={`step-${i}`} role="tab" aria-selected={step===i} aria-controls="step-panel" tabIndex={step===i?0:-1} onKeyDown={e=>{if(['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?4:(i+(['ArrowDown','ArrowRight'].includes(e.key)?1:4))%5;setStep(next);document.getElementById(`step-${next}`)?.focus();}}} onClick={()=>setStep(i)} className={step===i?'active':''}><span>0{i+1}</span>{s.title}<ArrowUpRight size={22}/></button>)}</div><div id="step-panel" role="tabpanel" aria-labelledby={`step-${step}`} className="process-panel"><AnimatePresence mode="sync"><motion.div key={step} initial={{opacity:0,y:reduced?0:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:reduced?0:-8}} transition={{duration:.22}}><div className="process-icon">{(() => {const Icon=steps[step].icon;return <Icon size={64} weight="thin"/>;})()}</div><span className="process-progress">Шаг {step+1} из 5</span><h3>{steps[step].title}</h3><p>{steps[step].text}</p><button className="text-link" onClick={()=>step<4?setStep(step+1):document.getElementById('contact')?.scrollIntoView({behavior:reduced?'instant':'smooth'})}>{step<4?'Следующий шаг':'Обсудить мой проект'}<ArrowRight size={18}/></button></motion.div></AnimatePresence></div></div></section>

      <section id="articles" className="section container articles-section"><div className="section-heading"><h2>Полезно знать.<br/>Легко разобраться.</h2><a href="https://solarconnect.kz/articles" className="text-link" target="_blank" rel="noreferrer">Все статьи <ArrowUpRight size={18}/></a></div><div className="article-grid">{[
        {title:'Сколько панелей нужно вашему дому?',topic:'Выбор станции',image:'home',url:'skolko-paneley-nuzhno-dlya-doma'},
        {title:'Когда солнечная станция окупит себя?',topic:'Экономика',image:'hero',url:'okupayutsya-li-solnechnye-paneli-v-kazahstane'},
        {title:'Солнечные панели зимой: как это работает',topic:'Полезно знать',image:'farm',url:'rabotayut-li-paneli-zimoy'},
      ].map(a=><a className="article" key={a.url} href={`https://solarconnect.kz/articles/${a.url}`} target="_blank" rel="noreferrer"><div className="article-image"><img src={`/images/${a.image}.webp`} loading="lazy" alt="Солнечные панели" width="500" height="320"/></div><span className="article-topic">{a.topic}</span><div className="article-title"><h3>{a.title}</h3><ArrowUpRight size={22}/></div></a>)}</div></section>

      <section className="section faq-section container"><div className="faq-heading"><h2>Есть вопросы?<br/>Всё объясним.</h2><p>Собрали то, что чаще всего<br/>спрашивают перед установкой.</p><a className="text-link" href={wa('Здравствуйте! Есть вопрос о солнечных станциях.')} target="_blank" rel="noreferrer">Задать свой вопрос <ArrowUpRight size={18}/></a></div><div className="faq-list">{questions.map(([q,a],i)=><div className="faq-item" key={q}><h3><button aria-expanded={faq===i} aria-controls={`faq-${i}`} id={`question-${i}`} onClick={()=>setFaq(faq===i?null:i)}>{q}{faq===i?<Minus size={21}/>:<Plus size={21}/>}</button></h3><div className={`faq-answer ${faq===i?'open':''}`} id={`faq-${i}`} role="region" aria-labelledby={`question-${i}`} inert={faq!==i}><div><p>{a}</p></div></div></div>)}</div></section>

      <section id="contact" className="section contact-section container"><div className="contact-shell"><div className="contact-copy"><span className="eyebrow">Начнём с вашего объекта</span><h2>У вашего солнца<br/>есть потенциал.<br/>Давайте посчитаем.</h2><p>Подготовим решение под ваше потребление<br/>и покажем экономику в тенге.</p><div className="contact-links"><a href="tel:+77713169033"><Phone size={21}/>+7 771 316 90 33</a><a href="https://2gis.kz/almaty/firm/70000001090574221" target="_blank" rel="noreferrer"><MapPin size={21}/>Алматы, Жарокова, 284/3</a></div><Sun className="contact-sun" size={230} weight="thin" aria-hidden="true"/></div><div className="contact-form-area">
        {!ready?<form onSubmit={submit}><h3>Расчёт вашей станции</h3><label className="bill-label" htmlFor="bill">Ваш счёт за свет в месяц<strong>{bill.toLocaleString('ru-RU')} ₸</strong></label><input id="bill" className="bill-range" type="range" min="5000" max="300000" step="5000" value={bill} onChange={e=>setBill(Number(e.target.value))}/><div className="range-labels"><span>5 000 ₸</span><span>300 000 ₸</span></div><label htmlFor="name">Ваше имя</label><input id="name" name="name" aria-invalid={invalidField==="name"||undefined} aria-describedby={invalidField==="name"?"form-error":undefined} value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})} placeholder="Как к вам обращаться?" autoComplete="given-name" required maxLength={80}/><label htmlFor="phone">Телефон</label><input id="phone" name="phone" type="tel" value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})} placeholder="+7 777 123 45 67" autoComplete="tel" required maxLength={24} aria-describedby={invalidField==='phone'?'form-error':undefined} aria-invalid={invalidField==='phone'||undefined}/><label htmlFor="city">Город</label><input id="city" name="city" aria-invalid={invalidField==="city"||undefined} aria-describedby={invalidField==="city"?"form-error":undefined} value={contact.city} onChange={e=>setContact({...contact,city:e.target.value})} placeholder="Например, Алматы" autoComplete="address-level2" required maxLength={80}/>{formError&&<p role="alert" id="form-error" className="form-error">{formError}</p>}<button type="submit" className="button primary form-submit">Подготовить заявку <ArrowUpRight size={20}/></button><p className="form-note">Подготовим сообщение для WhatsApp. Вы сможете проверить его перед отправкой.</p></form>:<div className="form-result" role="status"><span className="result-icon"><Check size={30}/></span><h3 ref={resultHeading} tabIndex={-1}>Всё готово к знакомству</h3><p>Проверьте сообщение и отправьте его нашему инженеру в WhatsApp.</p><blockquote>{ready}</blockquote><a className="button primary" href={wa(ready)} target="_blank" rel="noreferrer"><WhatsappLogo size={21}/>Открыть WhatsApp <ArrowUpRight size={18}/></a><button className="text-link" onClick={()=>setReady('')}>Изменить данные</button></div>}
      </div></div></section>
      <ServiceBlocks/></> : path==='/admin' ? <Suspense fallback={<div className="container shop-page">Загрузка панели…</div>}><Admin/></Suspense> : <ShopRoute path={path}/>}
    </main>
    <footer className="footer container"><div className="footer-main"><div><Brand/><p>Собственная энергия.<br/>Больше возможностей.</p><div className="socials"><a href="https://www.instagram.com/solarconnect_pro/" aria-label="Instagram Solarconnect" target="_blank" rel="noreferrer"><InstagramLogo size={22}/></a><a href={wa('Здравствуйте! Хочу узнать о солнечных станциях.')} aria-label="WhatsApp Solarconnect" target="_blank" rel="noreferrer"><WhatsappLogo size={22}/></a></div></div><nav aria-label="Решения в подвале"><h3>Решения</h3><a href="https://solarconnect.kz/dlya-doma" target="_blank" rel="noreferrer">Для дома</a><a href="https://solarconnect.kz/dlya-biznesa" target="_blank" rel="noreferrer">Для бизнеса</a><a href="https://solarconnect.kz/agro" target="_blank" rel="noreferrer">Для агросектора</a><a href="https://solarconnect.kz/rezervnoe-pitanie" target="_blank" rel="noreferrer">Резервное питание</a></nav><nav aria-label="Компания в подвале"><h3>Компания</h3><a href="/#why">О Solarconnect</a><a href="/#process">Как мы работаем</a><a href="https://solarconnect.kz/articles" target="_blank" rel="noreferrer">Статьи</a><a href="/partners">Партнёрам</a><a href="/delivery">Доставка</a><a href="/support">Поддержка</a></nav><div className="footer-contact"><h3>Будем на связи</h3><a href="tel:+77713169033">+7 771 316 90 33</a><p>Алматы, улица Жарокова, 284/3<br/>Работаем по всему Казахстану</p><a href="https://solarconnect.kz/solnechnye-paneli-almaty" target="_blank" rel="noreferrer">Солнечные панели Алматы <ArrowUpRight size={14}/></a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Solarconnect</span><span>Солнца хватит на всех.</span><a href="#top">Наверх <ArrowUpRight size={15}/></a></div></footer>
    <a className="floating-contact" href={wa('Здравствуйте! Хочу обсудить солнечную станцию.')} target="_blank" rel="noreferrer" aria-label="Написать в WhatsApp"><WhatsappLogo size={27}/></a>
    <Dialog.Root open={!!selected} onOpenChange={open=>{if(!open)setSelected(null);}}><Dialog.Portal><Dialog.Overlay className="modal-overlay"/><Dialog.Content className="plan-modal" onCloseAutoFocus={event=>{event.preventDefault();lastPlanTrigger.current?.focus();}}><Dialog.Close asChild><button className="icon-button modal-close" aria-label="Закрыть состав комплекта"><X size={24}/></button></Dialog.Close>{selected&&<><span className="eyebrow">Солнечная станция под ключ</span><Dialog.Title>{selected.name}</Dialog.Title><Dialog.Description>{selected.power}. {selected.caseText}</Dialog.Description><strong className="modal-price">{planPrice(selected.price)}</strong><h3>Что входит в комплект</h3><div className="bom-table"><table><thead><tr><th>Оборудование и работы</th><th>Количество</th></tr></thead><tbody>{selected.bom.map(([name,quantity])=><tr key={name}><td>{name}</td><td>{quantity}</td></tr>)}</tbody></table></div><div className="modal-performance"><span>{selected.yieldYear}</span><span>Окупаемость {selected.payback}</span></div><p className="modal-note">Ориентировочно: {selected.saveYear}. Показатели и состав уточняются после обследования объекта.</p><h3>Подходит для</h3><ul className="modal-load">{selected.load.map(item=><li key={item}><Check size={15}/>{item}</li>)}</ul><a className="button primary" href={wa(`Здравствуйте! Интересует комплект ${selected.name} за ${selected.price}. Хочу уточнить состав и рассчитать станцию для моего объекта.`)} target="_blank" rel="noreferrer">Обсудить этот комплект <WhatsappLogo size={21}/></a></>}</Dialog.Content></Dialog.Portal></Dialog.Root>
  </div></MotionConfig>;
}
export default App;



