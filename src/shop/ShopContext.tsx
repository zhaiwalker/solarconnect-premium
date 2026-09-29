import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {defaultFx,type CatalogResponse,type CartItem,type Currency,type Product,unitPrice,amount,formatPrice} from './model';
export async function api<T>(action:string,data?:unknown):Promise<T>{
  const r=await fetch(`/api/shop?action=${encodeURIComponent(action)}`,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(15000)});
  const result=await r.json();if(!r.ok)throw new Error(result.error||'Не удалось выполнить запрос.');return result;
}
function read<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function save(key:string,value:unknown){try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Browsing also works without storage. */}}
export function track(name:string,detail:Record<string,unknown>){window.dispatchEvent(new CustomEvent('solar:analytics',{detail:{event:name,...detail}}));}
function useShopState(){
  const [catalog,setCatalog]=useState<CatalogResponse>({products:[],fx:defaultFx,country:'KZ',ordersEnabled:false});
  const [loading,setLoading]=useState(true);const [loadError,setLoadError]=useState('');
  const [currency,setCurrencyState]=useState<Currency>(()=>read<string>('solar-currency','KZT')==='RUB'?'RUB':'KZT');
  const userCurrency=useRef<Currency|null>(read('solar-currency',null));
  const [cart,setCart]=useState<CartItem[]>(()=>{const items=read<unknown>('solar-cart',[]);return Array.isArray(items)?items.filter((i):i is CartItem=>!!i&&typeof i.id==='string'&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=100).slice(0,50):[];});
  const [favorites,setFavorites]=useState<string[]>(()=>{const a=read<unknown>('solar-favorites',[]);return Array.isArray(a)?a.filter(x=>typeof x==='string').slice(0,100):[];});
  const [compare,setCompare]=useState<string[]>(()=>{const a=read<unknown>('solar-compare',[]);return Array.isArray(a)?a.filter(x=>typeof x==='string').slice(0,4):[];});
  const [notice,setNotice]=useState('');
  const [orderReceipt,setOrderReceipt]=useState('');
  async function reload(){try{const data=await api<CatalogResponse>('catalog');setCatalog(data);setLoadError('');if(!userCurrency.current)setCurrencyState(data.country==='RU'||window.location.pathname.startsWith('/ru/')?'RUB':'KZT');}catch{setLoadError('Не удалось загрузить каталог. Попробуйте ещё раз.');}finally{setLoading(false);}}
  useEffect(()=>{void reload();},[]);
  useEffect(()=>save('solar-cart',cart),[cart]);useEffect(()=>save('solar-favorites',favorites),[favorites]);useEffect(()=>save('solar-compare',compare),[compare]);
  useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),4500);return()=>clearTimeout(id);},[notice]);
  function setCurrency(value:Currency){userCurrency.current=value;setCurrencyState(value);save('solar-currency',value);}
  function add(product:Product){
    const incoming=product.category==='bundle'?product.components:[{id:product.id,quantity:1}];
    if(!incoming.length)return;
    if(incoming.some(i=>!catalog.products.some(p=>p.id===i.id&&p.availability!=='unavailable'))){setNotice('Уточните состав комплекта у менеджера.');return;}
    setCart(previous=>{const next=[...previous];for(const item of incoming){const row=next.find(r=>r.id===item.id);if(row)row.quantity=Math.min(100,row.quantity+item.quantity);else if(next.length<50)next.push({...item});}return next;});
    setNotice('Товар добавлен в корзину');track('add_to_cart',{sku:product.sku});
  }
  function toggleFavorite(id:string){setFavorites(previous=>previous.includes(id)?previous.filter(x=>x!==id):[...previous,id].slice(-100));}
  function toggleCompare(id:string){if(!compare.includes(id)&&compare.length===4){setNotice('Можно сравнить до четырёх товаров.');return;}setCompare(previous=>previous.includes(id)?previous.filter(x=>x!==id):[...previous,id]);}
  function price(p:Product){const value=unitPrice(p);return formatPrice(value===null?null:amount(value,currency,catalog.fx),currency);}
  return {...catalog,loading,loadError,reload,currency,setCurrency,cart,setCart,favorites,toggleFavorite,compare,toggleCompare,add,price,notice,orderReceipt,setOrderReceipt};
}
type ShopState=ReturnType<typeof useShopState>;
const Context=createContext<ShopState|null>(null);
export function ShopProvider({children}:{children:ReactNode}){const state=useShopState();return <Context.Provider value={state}>{children}{state.notice&&<div className="shop-toast" role="status">{state.notice}<a href="/cart">Корзина →</a></div>}</Context.Provider>;}
export function useShop(){const value=useContext(Context);if(!value)throw new Error('ShopProvider required');return value;}
