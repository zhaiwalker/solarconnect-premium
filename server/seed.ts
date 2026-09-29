import {defaultFx,type Product,type FxSettings,type Submission} from '../src/shop/model.js';
export type Store={products:Product[];fx:FxSettings;submissions:Submission[];limits:Record<string,{count:number;until:number}>;revision:number};
const requirements: [Product['category'],Product['phases'],Product['battery'],number[]][]=[
  ['grid','1','none',[10,12,15]],['grid','3','none',[10,15,20,25,30,50,100]],
  ['hybrid','1','LV',[6,8,12]],['hybrid','3','LV',[15,16,20]],['hybrid','3','HV',[25,30,40,50]],
  ['battery','none','LV',[5,16]],['battery','none','HV',[5,14.3]],
];
export function seed():Store {
  const products= requirements.flatMap(([category,phases,battery,powers])=>powers.map(power=>{
    const id=`draft-${category}-${phases}-${battery.toLowerCase()}-${String(power).replace('.','-')}`;
    return {id,slug:id,sku:'',name:`${category==='battery'?'АКБ':'Инвертор'} Deye ${power} ${category==='battery'?'кВт·ч':'кВт'} · ${battery==='none'?'сетевой':battery}`,category,power,phases,battery,purpose:[],priceKzt:null,discount:0,availability:'unknown',published:false,approved:false,featured:false,description:'',images:[],specs:[],datasheet:'',manual:'',source:'',certificates:[],compatibleIds:[],components:[]} as Product;
  }));
  const example=products.find(p=>p.id==='draft-hybrid-3-hv-50')!;
  Object.assign(example,{sku:'SUN-50K-SG01HP3-EU-BM4',slug:'deye-sun-50k-sg01hp3-eu-bm4',name:'Гибридный инвертор Deye 50 кВт SUN-50K-SG01HP3-EU-BM4',purpose:['business','industry'],description:'Трёхфазный гибридный инвертор для систем с высоковольтными литий-ионными аккумуляторами. Объединяет солнечную генерацию, сеть и накопитель. Подбор аккумуляторов, защит и режима резервирования выполняется по проекту и документации производителя.',images:['/images/deye-hybrid.png'],source:'https://www.deyeinverter.com/product/hybrid-inverter-1/sun29-9-30-35-40-50ksg01hp3eubm3-4-29-950kw-three-phase-2-3-4-mppt-hybrid-inverter-hv-battery-supported-339.html',datasheet:'https://www.deyeinverter.com/deyeinverter/2026/09/12/BDatasheetSUN-299-50K-SG01HP3-EU-BM420260911en.pdf',manual:'https://www.deyeinverter.com/deyeinverter/2026/05/18/rand/6181/%E3%80%90b%E3%80%91manual_sun-29.9-50k-sg01hp3-eu-bm4_20260224_en.pdf',specs:[
    {label:'Номинальная мощность',value:'50 кВт'},{label:'Фазы',value:'3'},{label:'Тип АКБ',value:'HV, литий-ионные'},{label:'Напряжение АКБ',value:'160–800 В'},
    {label:'Макс. подключаемая мощность PV',value:'100 кВт'},{label:'Макс. входная мощность PV',value:'80 кВт'},{label:'Количество MPPT',value:'4'},{label:'Макс. рабочий ток MPPT',value:'36 + 36 + 36 + 36 А'},
    {label:'Максимальный КПД',value:'97,6%'},{label:'Степень защиты',value:'IP65'},{label:'Размеры Ш × В × Г',value:'527 × 894 × 294 мм, без разъёмов и кронштейнов'},{label:'Масса',value:'80 кг'},{label:'Гарантия производителя',value:'5 лет / до 10 лет; зависит от страны установки и условий производителя'}
  ]});
  return {products,fx:{...defaultFx},submissions:[],limits:{},revision:0};
}
