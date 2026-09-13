import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react';
import { Header } from './components/Header';
import { Storefront } from './components/Storefront';
import { CartDrawer } from './components/CartDrawer';
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
  const add=(product:Product)=>setCart(prev=>{const existing=prev.find(i=>i.id===product.id);return existing?prev.map(i=>i.id===product.id?{...i,quantity:Math.min(i.quantity+1,product.stock)}:i):[...prev,{...product,quantity:1}]});
  const remove=(id:string)=>setCart(prev=>prev.flatMap(i=>i.id!==id?[i]:i.quantity>1?[{...i,quantity:i.quantity-1}]:[]));
  const removeAll=(id:string)=>setCart(prev=>prev.filter(i=>i.id!==id));
  const count=useMemo(()=>cart.reduce((s,i)=>s+i.quantity,0),[cart]);

  return <div className="app-shell">
    <Header view={view} setView={setView} onCategory={setCategory} pincode={pincode} setPincode={setPincode} search={search} setSearch={setSearch} cartCount={count} onCart={()=>setCartOpen(true)}/>
    <Storefront products={products} cart={cart} category={category} setCategory={setCategory} search={search} setSearch={setSearch} pincode={pincode} serviceable={SERVICEABLE_PINS.includes(pincode)} onAdd={add} onRemove={remove}/>
    <CartDrawer open={cartOpen} onClose={()=>setCartOpen(false)} cart={cart} pincode={pincode} setPincode={setPincode} onRemoveAll={removeAll}/>
    <footer className="site-footer"><div className="footer-inner"><div className="footer-brand"><div className="brand inverted"><span className="brand-mark"><span>J</span></span><span className="brand-copy"><b>JabWeMeat<sup>™</sup></b><small>FRESH · CLEAN · TRUSTED</small></span></div><p>Fresh, hygienic cuts delivered across select Ranchi neighbourhoods in your chosen time slot.</p><div className="socials"><button><Instagram/></button><button><Facebook/></button></div></div><div><h4>Shop</h4><a>Chicken</a><a>Mutton</a><a>Fish & Seafood</a><a>Ready to Cook</a></div><div><h4>Help</h4><a>About us</a><a>FAQs</a><a>Contact</a><a>Privacy policy</a></div><div><h4>Ranchi service</h4><p><MapPin/> PINs 834002, 834003, 834004</p><p><Phone/> Customer care coming soon</p><p><Mail/> hello@jabwemeat.com</p></div></div><div className="footer-bottom"><span>© 2026 JabWeMeat™. All rights reserved.</span><span>Prototype storefront · COD only</span></div></footer>
  </div>;
};

createRoot(document.getElementById('root')!).render(<App/>);
