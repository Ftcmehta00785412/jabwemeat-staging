import React from 'react';
import { ShieldCheck, Snowflake, BadgeIndianRupee, Truck, Search, ArrowRight, MapPin, Clock3, Leaf, PackageCheck, ChevronRight } from 'lucide-react';
import { CATEGORIES } from '../data';
import { ProductCard } from './ProductCard';
import type { CartItem, Product } from '../types';

const CATEGORY_IMAGES:Record<string,string>={
 'All':'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=600&q=84',
 'Chicken':'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=600&q=84',
 'Mutton':'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=600&q=84',
 'Fish & Seafood':'https://images.unsplash.com/photo-1534948216015-843149f72be3?auto=format&fit=crop&w=600&q=84',
 'Eggs':'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=600&q=84',
 'Ready to Cook':'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=600&q=84',
 'Combos':'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=84'
};
type Props={products:Product[]; cart:CartItem[]; category:string; setCategory:(v:string)=>void; search:string; setSearch:(v:string)=>void; pincode:string; serviceable:boolean; onAdd:(p:Product)=>void; onRemove:(id:string)=>void};
export const Storefront: React.FC<Props> = ({products,cart,category,setCategory,search,setSearch,pincode,serviceable,onAdd,onRemove}) => {
 const filtered=products.filter(p=>(category==='All'||p.category===category)&&(`${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase())));
 return <main>
  <section className="hero-section">
   <img className="hero-bg" src="https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?auto=format&fit=crop&w=1800&q=90" alt="Premium fresh cuts"/>
   <div className="hero-overlay"/><div className="hero-inner"><div className="hero-copy"><span className="eyebrow">FRESHLY PREPARED IN RANCHI</span><h1>Premium cuts,<br/>delivered <em>fresh.</em></h1><p>Clean cuts. Careful packing. Dependable slot-based delivery from our kitchen to yours.</p><button className="primary-cta" onClick={()=>document.getElementById('shop')?.scrollIntoView()}><span>SHOP NOW</span><ArrowRight size={17}/></button><div className="hero-badges"><span><ShieldCheck/>Quality checked</span><span><Snowflake/>Chilled handling</span><span><PackageCheck/>Cleanly packed</span></div></div></div>
  </section>

  <section className="quick-benefits"><div className="quick-benefits-inner">
   <div><span className="benefit-icon"><ShieldCheck/></span><p><strong>HYGIENE CHECKED</strong><small>Carefully handled cuts</small></p></div>
   <div><span className="benefit-icon"><Leaf/></span><p><strong>FARM FRESH QUALITY</strong><small>Selected for freshness</small></p></div>
   <div><span className="benefit-icon"><Truck/></span><p><strong>RELIABLE DELIVERY</strong><small>Four daily time slots</small></p></div>
   <div><span className="benefit-icon"><BadgeIndianRupee/></span><p><strong>HONEST VALUE</strong><small>Transparent prices & weight</small></p></div>
  </div></section>

  <section className="store-container" id="shop">
   <div className={`service-banner ${serviceable?'available':'unavailable'}`}><span><MapPin/></span><div><strong>{serviceable?`Delivering to ${pincode}`:`We’re not at ${pincode} yet`}</strong><small>{serviceable?'Choose from today’s available delivery slots.':'Currently serving 834002, 834003 and 834004.'}</small></div><button>CHANGE PIN <ChevronRight/></button></div>
   <label className="mobile-search"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search fresh products…"/></label>

   <div className="section-heading centered"><span>EXPLORE OUR RANGE</span><h2>Shop by category</h2><i/></div>
   <div className="category-strip">{CATEGORIES.map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}><img src={CATEGORY_IMAGES[c]} alt=""/><span/><b>{c==='All'?'All Products':c}</b><small>SHOP NOW</small></button>)}</div>

   <div className="section-heading centered products-heading"><span>FRESH PICKS</span><h2>{category==='All'?'Our best sellers':category}</h2><i/></div>
   {filtered.length?<div className="product-grid">{filtered.map(p=><ProductCard key={p.id} product={p} quantity={cart.find(i=>i.id===p.id)?.quantity||0} onAdd={()=>onAdd(p)} onRemove={()=>onRemove(p.id)}/>)}</div>:<div className="empty-products"><Search/><h3>No matching products</h3><p>Try another search or category.</p></div>}
  </section>

  <section className="launch-offer"><div><span>WELCOME TO JABWEMEAT™</span><h2>₹100 off your very first order</h2><p>Discover better freshness without paying a third-party marketing premium.</p></div><div><b>₹100</b><small>FIRST ORDER<br/>SAVINGS</small></div></section>

  <section className="promise-section"><div className="promise-inner"><div className="promise-title"><span>OUR PROMISE</span><h2>Quality you can see.<br/>Freshness you can taste.</h2><p>Our process is built around careful sourcing, hygienic preparation, chilled handling and transparent value.</p></div><div className="promise-grid">{[[ShieldCheck,'Hygiene first','Clean preparation and careful handling at every step.'],[Snowflake,'Chilled, not frozen','Temperature-aware packing through dispatch.'],[Clock3,'Your delivery window','Four convenient delivery slots each day.'],[Truck,'Ranchi focused','Local service across selected PIN codes.']].map(([Icon,title,body]:any)=><div className="promise-card" key={title}><span><Icon/></span><div><h3>{title}</h3><p>{body}</p></div></div>)}</div></div></section>
 </main>
};
