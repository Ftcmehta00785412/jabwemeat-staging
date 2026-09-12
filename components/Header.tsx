import React from 'react';
import { MapPin, Search, ShoppingCart, Store, LayoutDashboard, UserRound, Menu, Phone } from 'lucide-react';
import type { AppView } from '../types';

type Props = { view: AppView; setView:(v:AppView)=>void; pincode:string; setPincode:(v:string)=>void; search:string; setSearch:(v:string)=>void; cartCount:number; onCart:()=>void };
const links=['Home','Shop All','Chicken','Mutton','Fish & Seafood','Ready to Cook','Combos'];

export const Header: React.FC<Props> = ({view,setView,pincode,setPincode,search,setSearch,cartCount,onCart}) => (
  <>
    <div className="offer-bar">₹100 off your first order · First 3 deliveries free · Cash on delivery</div>
    <header className="site-header">
      <div className="header-main">
        <button className="mobile-menu" aria-label="Open menu"><Menu size={23}/></button>
        <button className="brand" onClick={()=>setView('store')}>
          <span className="brand-mark"><span>J</span><i/></span>
          <span className="brand-copy"><b>JAB<span>WE</span>MEAT<sup>™</sup></b><small>FRESHNESS YOU CAN TRUST</small></span>
        </button>
        <label className="desktop-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search fresh chicken, mutton, fish…"/></label>
        <div className="delivery-location"><MapPin size={18}/><div><small>Deliver to Ranchi</small><b>{pincode || 'Enter PIN'}</b></div><input aria-label="Delivery PIN" maxLength={6} value={pincode} onChange={e=>setPincode(e.target.value.replace(/\D/g,''))}/></div>
        <nav className="header-actions">
          <button className="nav-action"><UserRound/><span>Account</span></button>
          <button className={`nav-action admin-link ${view==='admin'?'active':''}`} onClick={()=>setView('admin')}><LayoutDashboard/><span>Admin</span></button>
          {view==='store'&&<button className="cart-button" onClick={onCart}><ShoppingCart/><span>Cart</span>{cartCount>0&&<b>{cartCount}</b>}</button>}
        </nav>
      </div>
      <div className="category-nav"><nav>{links.map((link,i)=><button key={link} onClick={()=>{setView('store'); if(i>1) document.getElementById('shop')?.scrollIntoView()}} className={i===0?'active':''}>{link}</button>)}</nav><span><Phone size={13}/> Ranchi delivery</span></div>
    </header>
  </>
);
