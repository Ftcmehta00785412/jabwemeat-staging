import React from 'react';
import { MapPin, Search, ShoppingBag, Store, LayoutDashboard, UserRound, ChevronDown, Menu } from 'lucide-react';
import type { AppView } from '../types';

type Props = { view: AppView; setView:(v:AppView)=>void; pincode:string; setPincode:(v:string)=>void; search:string; setSearch:(v:string)=>void; cartCount:number; onCart:()=>void };

export const Header: React.FC<Props> = ({view,setView,pincode,setPincode,search,setSearch,cartCount,onCart}) => (
  <>
    <div className="offer-bar">Freshness delivered in Ranchi · ₹100 off your first order · COD available</div>
    <header className="site-header">
      <div className="header-inner">
        <button className="mobile-menu" aria-label="Open menu"><Menu size={23}/></button>
        <button className="brand" onClick={()=>setView('store')} aria-label="JabWeMeat home">
          <span className="brand-mark"><span>J</span></span>
          <span className="brand-copy"><b>JabWeMeat<sup>™</sup></b><small>FRESH · CLEAN · TRUSTED</small></span>
        </button>
        <div className="delivery-location">
          <span className="location-icon"><MapPin size={18}/></span>
          <label><small>Delivering to</small><span>Ranchi, {pincode || 'enter PIN'} <ChevronDown size={14}/></span></label>
          <input aria-label="Delivery PIN" maxLength={6} value={pincode} onChange={e=>setPincode(e.target.value.replace(/\D/g,''))}/>
        </div>
        {view==='store' && <label className="desktop-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search for chicken, fish, mutton…"/></label>}
        <nav className="header-actions">
          <button className={`nav-action ${view==='store'?'active':''}`} onClick={()=>setView('store')}><Store size={20}/><span>Shop</span></button>
          <button className={`nav-action admin-link ${view==='admin'?'active':''}`} onClick={()=>setView('admin')}><LayoutDashboard size={20}/><span>Admin</span></button>
          <button className="nav-action"><UserRound size={20}/><span>Profile</span></button>
          {view==='store' && <button className="cart-button" onClick={onCart}><ShoppingBag size={21}/><span>Cart</span>{cartCount>0&&<b>{cartCount}</b>}</button>}
        </nav>
      </div>
    </header>
  </>
);
