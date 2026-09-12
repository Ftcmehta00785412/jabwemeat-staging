import React from 'react';
import { ShieldCheck, Snowflake, BadgeIndianRupee, Truck, Search, ArrowRight, MapPin, Clock3, Sparkles, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '../data';
import { ProductCard } from './ProductCard';
import type { CartItem, Product } from '../types';

const CATEGORY_ICONS:Record<string,string>={'All':'✦','Chicken':'🍗','Mutton':'🥩','Fish & Seafood':'🐟','Eggs':'🥚','Ready to Cook':'🍢','Combos':'🛍️'};
type Props={products:Product[]; cart:CartItem[]; category:string; setCategory:(v:string)=>void; search:string; setSearch:(v:string)=>void; pincode:string; serviceable:boolean; onAdd:(p:Product)=>void; onRemove:(id:string)=>void};
export const Storefront: React.FC<Props> = ({products,cart,category,setCategory,search,setSearch,pincode,serviceable,onAdd,onRemove}) => {
 const filtered=products.filter(p=>(category==='All'||p.category===category)&&(`${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase())));
 return <main>
  <section className="hero-section">
    <div className="hero-glow hero-glow-one"/><div className="hero-glow hero-glow-two"/>
    <div className="hero-inner">
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={14}/> Ranchi’s fresh meat destination</span>
        <h1>Fresh cuts.<br/><em>Honest goodness.</em></h1>
        <p>Carefully selected, hygienically packed and delivered fresh to your doorstep—right when you choose.</p>
        <div className="hero-cta-row"><button className="primary-cta" onClick={()=>document.getElementById('shop')?.scrollIntoView()}><span>Shop fresh cuts</span><ArrowRight size={18}/></button><div className="rating"><strong>4.9</strong><span>★★★★★</span><small>Early customer love</small></div></div>
        <div className="hero-trust"><span><ShieldCheck size={17}/> Quality checked</span><span><Snowflake size={17}/> Chilled delivery</span><span><Clock3 size={17}/> Your chosen slot</span></div>
      </div>
      <div className="hero-visual">
        <div className="hero-image"><img src="https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=1200&q=88" alt="Fresh premium cuts"/></div>
        <div className="floating-card freshness"><span>100%</span><p>Freshness<br/>promise</p></div>
        <div className="floating-card offer"><b>₹100 OFF</b><small>on your first order</small></div>
      </div>
    </div>
  </section>

  <section className="quick-benefits"><div className="quick-benefits-inner">
   <div><span className="benefit-icon"><Truck/></span><p><strong>Free delivery</strong><small>On your first 3 orders</small></p></div>
   <div><span className="benefit-icon"><BadgeIndianRupee/></span><p><strong>Pay at your door</strong><small>Cash on delivery</small></p></div>
   <div><span className="benefit-icon"><Clock3/></span><p><strong>Four daily slots</strong><small>Delivery on your schedule</small></p></div>
   <div><span className="benefit-icon"><MapPin/></span><p><strong>Made for Ranchi</strong><small>Local, dependable service</small></p></div>
  </div></section>

  <section className="store-container" id="shop">
   <div className={`service-banner ${serviceable?'available':'unavailable'}`}><span><MapPin size={19}/></span><div><strong>{serviceable?`We deliver to ${pincode}`:`We’re not at ${pincode} yet`}</strong><small>{serviceable?'Fresh delivery slots are available today.':'Currently serving 834002, 834003 and 834004.'}</small></div><button>Change PIN <ChevronRight size={15}/></button></div>
   <label className="mobile-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search fresh products…"/></label>

   <div className="section-heading"><div><span>SHOP BY CATEGORY</span><h2>What are you craving today?</h2></div><p>Freshly prepared after you order</p></div>
   <div className="category-strip">{CATEGORIES.map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}><span>{CATEGORY_ICONS[c]}</span><b>{c}</b></button>)}</div>

   <div className="section-heading products-heading"><div><span>HANDPICKED FOR YOU</span><h2>{category==='All'?'Ranchi favourites':category}</h2></div><p>{filtered.length} fresh selections</p></div>
   {filtered.length?<div className="product-grid">{filtered.map(p=><ProductCard key={p.id} product={p} quantity={cart.find(i=>i.id===p.id)?.quantity||0} onAdd={()=>onAdd(p)} onRemove={()=>onRemove(p.id)}/>)}</div>:<div className="empty-products"><Search size={36}/><h3>No matching products</h3><p>Try another search or category.</p></div>}
  </section>

  <section className="promise-section"><div className="promise-inner"><div className="promise-title"><span>THE JABWEMEAT PROMISE</span><h2>Good food begins with<br/>ingredients you can trust.</h2><p>From thoughtful sourcing to chilled doorstep delivery, every step is designed around freshness, hygiene and your confidence.</p></div><div className="promise-grid">{[[ShieldCheck,'Hygiene first','Careful handling and clean preparation standards.'],[Snowflake,'Always chilled','Temperature-aware packing from us to your door.'],[BadgeIndianRupee,'Honest value','Clear weights, fair prices and no hidden surprises.'],[Truck,'Reliable slots','Choose from four convenient windows every day.']].map(([Icon,title,body]:any)=><div className="promise-card" key={title}><span><Icon/></span><h3>{title}</h3><p>{body}</p></div>)}</div></div></section>
 </main>
};
