import React from 'react';
import { MapPin, Search, ShoppingCart, UserRound, Menu, Phone } from 'lucide-react';
import type { AppView } from '../types';

type Props = { view: AppView; setView:(v:AppView)=>void; onCategory:(v:string)=>void; pincode:string; setPincode:(v:string)=>void; search:string; setSearch:(v:string)=>void; cartCount:number; onCart:()=>void; onAccount:()=>void; accountEmail?:string|null };
const links=[['Home','All'],['Shop All','All'],['Chicken','Chicken'],['Mutton','Mutton'],['Fish & Seafood','Fish & Seafood'],['Eggs','Eggs'],['Ready to Cook','Ready to Cook'],['Combos','Combos']];

export const Header: React.FC<Props> = ({view,setView,onCategory,pincode,setPincode,search,setSearch,cartCount,onCart,onAccount,accountEmail}) => {
 const explore=(category:string,home=false)=>{setView('store');onCategory(category);requestAnimationFrame(()=>document.getElementById(home?'top':'shop')?.scrollIntoView({behavior:'smooth'}))};
 return <>
  <div className="offer-bar">₹100 off your first order · First 3 deliveries free · Cash on delivery</div>
  <header className="site-header">
   <div className="header-main">
    <button className="mobile-menu" aria-label="Open menu"><Menu size={23}/></button>
    <button className="brand" onClick={()=>explore('All',true)}><span className="brand-mark"><span>J</span><i/></span><span className="brand-copy"><b>JAB<span>WE</span>MEAT<sup>™</sup></b><small>FRESHNESS YOU CAN TRUST</small></span></button>
    <label className="desktop-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search fresh chicken, mutton, fish…"/></label>
    <div className="delivery-location"><MapPin size={18}/><div><small>Deliver to Ranchi</small><b>{pincode||'Enter PIN'}</b></div><input aria-label="Delivery PIN" maxLength={6} value={pincode} onChange={e=>setPincode(e.target.value.replace(/\D/g,''))}/></div>
    <nav className="header-actions"><button className="nav-action" onClick={onAccount} aria-label="Open account"><UserRound/><span>{accountEmail ? 'Account' : 'Account'}</span></button><button className="cart-button" onClick={onCart}><ShoppingCart/><span>Cart</span>{cartCount>0&&<b>{cartCount}</b>}</button></nav>
   </div>
   <div className="category-nav"><nav>{links.map(([label,cat],i)=><button key={label} onClick={()=>explore(cat,i===0)} className={i===0?'active':''}>{label}</button>)}</nav><span><Phone size={13}/> Ranchi delivery</span></div>
  </header>
 </>;
};
