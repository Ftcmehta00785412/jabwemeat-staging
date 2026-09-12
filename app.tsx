import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Header } from './components/Header';
import { Storefront } from './components/Storefront';
import { CartDrawer } from './components/CartDrawer';
import { AdminDashboard } from './components/AdminDashboard';
import { PRODUCTS, SERVICEABLE_PINS } from './data';
import type { AppView, CartItem, Product } from './types';
import './styles.css';

const App: React.FC = () => {
  const [view,setView]=useState<AppView>('store');
  const [products,setProducts]=useState<Product[]>(PRODUCTS);
  const [cart,setCart]=useState<CartItem[]>([]);
  const [cartOpen,setCartOpen]=useState(false);
  const [pincode,setPincode]=useState('834002');
  const [category,setCategory]=useState('All');
  const [search,setSearch]=useState('');

  const add=(product:Product)=>setCart(prev=>{
    const existing=prev.find(i=>i.id===product.id);
    return existing?prev.map(i=>i.id===product.id?{...i,quantity:Math.min(i.quantity+1,product.stock)}:i):[...prev,{...product,quantity:1}];
  });
  const remove=(id:string)=>setCart(prev=>prev.flatMap(i=>i.id!==id?[i]:i.quantity>1?[{...i,quantity:i.quantity-1}]:[]));
  const removeAll=(id:string)=>setCart(prev=>prev.filter(i=>i.id!==id));
  const count=useMemo(()=>cart.reduce((s,i)=>s+i.quantity,0),[cart]);

  return <div className="min-h-screen bg-base-100 text-base-content">
    <Header view={view} setView={setView} pincode={pincode} setPincode={setPincode} search={search} setSearch={setSearch} cartCount={count} onCart={()=>setCartOpen(true)}/>
    {view==='store'?<Storefront products={products} cart={cart} category={category} setCategory={setCategory} search={search} setSearch={setSearch} pincode={pincode} serviceable={SERVICEABLE_PINS.includes(pincode)} onAdd={add} onRemove={remove}/>:<AdminDashboard products={products} setProducts={setProducts}/>} 
    <CartDrawer open={cartOpen} onClose={()=>setCartOpen(false)} cart={cart} pincode={pincode} setPincode={setPincode} onRemoveAll={removeAll}/>
    <footer className="border-t border-base-300 bg-base-100"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-4 py-6 text-sm text-base-content/60 sm:flex-row"><span>© 2026 JabWeMeat™ · Ranchi, Jharkhand</span><span>Service PINs: 834002 · 834003 · 834004</span></div></footer>
  </div>;
};

createRoot(document.getElementById('root')!).render(<App/>);
