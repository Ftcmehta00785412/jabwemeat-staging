import React from 'react';
import { MapPin, Search, ShoppingCart, Store, LayoutDashboard } from 'lucide-react';
import type { AppView } from '../types';

type Props = { view: AppView; setView:(v:AppView)=>void; pincode:string; setPincode:(v:string)=>void; search:string; setSearch:(v:string)=>void; cartCount:number; onCart:()=>void };

export const Header: React.FC<Props> = ({view,setView,pincode,setPincode,search,setSearch,cartCount,onCart}) => (
  <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 backdrop-blur">
    <div className="navbar mx-auto max-w-7xl gap-2 px-4">
      <button className="flex items-center gap-2" onClick={()=>setView('store')}>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-xl font-black text-primary-content">J</span>
        <span className="text-lg font-black tracking-tight">JabWeMeat<sup className="text-xs text-primary">™</sup></span>
      </button>
      <label className="input input-bordered ml-2 hidden min-w-40 items-center gap-2 md:flex">
        <MapPin size={16} className="opacity-60"/><input className="grow" maxLength={6} value={pincode} onChange={e=>setPincode(e.target.value.replace(/\D/g,''))} placeholder="Ranchi PIN" />
      </label>
      {view==='store' && <label className="input input-bordered ml-auto hidden max-w-md flex-1 items-center gap-2 sm:flex"><Search size={16} className="opacity-60"/><input className="grow" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search chicken, fish, eggs…"/></label>}
      <div className="ml-auto flex gap-2 sm:ml-0">
        <button className={`btn btn-sm ${view==='store'?'btn-primary':'btn-ghost'}`} onClick={()=>setView('store')}><Store size={16}/><span className="hidden lg:inline">Store</span></button>
        <button className={`btn btn-sm ${view==='admin'?'btn-secondary':'btn-ghost'}`} onClick={()=>setView('admin')}><LayoutDashboard size={16}/><span className="hidden lg:inline">Admin</span></button>
        {view==='store' && <button className="btn btn-sm btn-ghost relative" onClick={onCart}><ShoppingCart size={18}/><span className="badge badge-primary badge-sm">{cartCount}</span></button>}
      </div>
    </div>
  </header>
);
