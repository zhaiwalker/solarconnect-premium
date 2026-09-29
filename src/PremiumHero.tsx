import { useEffect, useRef } from 'react';
import { animate, motion, useInView, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { ArrowRight, CaretRight } from '@phosphor-icons/react';

const ease = [0.22, 1, 0.36, 1] as const;
function Count({value,suffix=''}:{value:number;suffix?:string}) {
  const ref=useRef<HTMLSpanElement>(null);
  const inView=useInView(ref,{once:true});
  const reduced=useReducedMotion();
  useEffect(()=>{
    if(!inView||reduced)return;
    const control=animate(value*.75,value,{duration:1.1,ease,onUpdate:n=>{if(ref.current)ref.current.textContent=Math.round(n).toLocaleString('ru-RU')+suffix;}});
    return ()=>control.stop();
  },[inView,reduced,value,suffix]);
  return <span ref={ref}>{value.toLocaleString('ru-RU')}{suffix}</span>;
}

export default function PremiumHero(){
  const ref=useRef<HTMLElement>(null);
  const reduced=useReducedMotion();
  const {scrollYProgress}=useScroll({target:ref,offset:['start start','end start']});
  const y=useTransform(scrollYProgress,[0,.8],[0,38]);
  const scale=useTransform(scrollYProgress,[0,.8],[1,.94]);
  return <>
    <section ref={ref} className="product-hero deye-hero" aria-labelledby="hero-heading">
      <div className="product-hero-copy container">
        <p className="product-name">SOLARCONNECT × <span className="deye-wordmark">Deye</span></p>
        <motion.h1 id="hero-heading" initial={{opacity:.75,transform:reduced?'none':'translateY(14px)'}} animate={{opacity:1,transform:'translateY(0px)'}} transition={{duration:.8,ease}}>Официальный представитель<br/>Deye в Казахстане.</motion.h1>
        <p className="product-subtitle">Инверторы и аккумуляторные системы Deye<br className="mobile-break"/> для дома, бизнеса и промышленности.</p>
        <div className="product-hero-actions"><a href="/catalog" className="button primary">Перейти в каталог</a><a href="/partners#application" className="text-link">Получить оптовые условия <CaretRight size={17}/></a></div>
      </div>
      <motion.div className="product-stage" style={reduced?{}:{y,scale}}>
        <div className="deye-cutout"><img className="product-render deye-render" src="/images/deye-hybrid.png" alt="Гибридный инвертор Deye серии SUN-29.9–50K-SG01HP3-EU" width="650" height="650" fetchPriority="high"/></div>
      </motion.div>
      <div className="product-caption"><span>Генерация. Накопление. Резерв.</span><span>Одна продуманная система.</span></div>
    </section>
    <section className="manifesto container" aria-labelledby="manifesto-heading">
      <div className="manifesto-heading"><h2 id="manifesto-heading">Много солнца.<br/>Ещё больше возможностей.</h2><p>Солнечная энергия уже рядом. Мы помогаем сделать её вашей: проектируем систему, устанавливаем оборудование и остаёмся на связи после запуска.</p></div>
      <div className="stats">
        <div><strong><Count value={2700} suffix="+"/></strong><span>солнечных часов в год<br/>в Казахстане</span></div>
        <div><strong><Count value={480}/></strong><span>установленных<br/>солнечных станций</span></div>
        <div><strong><Count value={25}/> <small>лет</small></strong><span>гарантии<br/>на панели</span></div>
        <div><strong>20 <small>лет</small></strong><span>опыта инженеров<br/>в энергетике</span></div>
      </div>
    </section>
    <section className="sunscape" aria-label="Солнечная энергия Казахстана">
      <img src="/images/hero.webp" alt="Солнечные панели на закате в степи Казахстана" width="1600" height="907" loading="lazy"/>
      <div className="sunscape-shade"/>
      <div className="sunscape-copy"><p>Природа даёт энергию.</p><h2>Вы решаете,<br/>как её использовать.</h2><a href="#solutions" className="sunscape-link">Найти своё решение <ArrowRight size={20}/></a></div>
    </section>
  </>;
}
