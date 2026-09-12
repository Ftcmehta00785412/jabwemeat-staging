import React, { useMemo, useState } from 'react';
import { X, Trash2, Tag, Truck, ShieldCheck } from 'lucide-react';
import { SERVICEABLE_PINS, SLOTS } from '../data';
import type { CartItem } from '../types';

type Props={open:boolean; onClose:()=>void; cart:CartItem[]; pincode:string; setPincode:(v:string)=>void; onRemoveAll:(id:string)=>void};
export const CartDrawer: React.FC<Props> = ({open,onClose,cart,pincode,setPincode,onRemoveAll}) => {
 const [slot,setSlot]=useState(SLOTS[0]); const [orderCount,setOrderCount]=useState(0);
 const subtotal=useMemo(()=>cart.reduce((s,i)=>s+i.price*i.quantity,0),[cart]);
 const firstOrderDiscount=orderCount===0?Math.min(100,subtotal):0; const delivery=orderCount<3?0:25; const total=Math.max(0,subtotal-firstOrderDiscount+delivery);
 const serviceable=SERVICEABLE_PINS.includes(pincode); const valid=subtotal>=99&&serviceable&&cart.length>0;
 if(!open)return null;
 return <div className="fixed inset-0 z-50 flex justify-end bg-neutral/40" onClick={onClose}><aside className="flex h-full w-full max-w-md flex-col bg-base-100 shadow-2xl" onClick={e=>e.stopPropagation()}>
  <div className="flex items-center justify-between border-b border-base-300 p-4"><div><h2 className="text-xl font-black">Your cart</h2><p className="text-xs text-base-content/60">Minimum order ₹99</p></div><button className="btn btn-circle btn-ghost btn-sm" onClick={onClose}><X/></button></div>
  <div className="flex-1 space-y-4 overflow-y-auto p-4">
   {!cart.length?<div className="grid place-items-center gap-2 py-20 text-center"><span className="text-5xl">🛒</span><h3 className="font-bold">Your cart is waiting</h3><p className="text-sm text-base-content/60">Add fresh cuts to continue.</p></div>:cart.map(i=><div className="flex gap-3 rounded-xl bg-base-200 p-3" key={i.id}><span className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-2xl">{i.icon}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{i.name}</p><p className="text-xs text-base-content/60">{i.weight} × {i.quantity}</p><p className="font-bold">₹{i.price*i.quantity}</p></div><button className="btn btn-ghost btn-sm" onClick={()=>onRemoveAll(i.id)}><Trash2 size={16}/></button></div>)}
   {!!cart.length&&<><div className="card border border-primary/20 bg-primary/10"><div className="card-body gap-2 p-4"><div className="flex items-center gap-2 font-bold"><Tag size={18} className="text-primary"/>First-order launch offer</div><p className="text-sm">₹100 is applied automatically after mobile OTP and email-link verification.</p><select className="select select-bordered select-sm" value={orderCount} onChange={e=>setOrderCount(Number(e.target.value))}><option value={0}>Preview: 1st order</option><option value={1}>Preview: 2nd order</option><option value={2}>Preview: 3rd order</option><option value={3}>Preview: 4th+ order</option></select></div></div>
   <div className="space-y-2"><label className="text-sm font-semibold">Delivery PIN code</label><input className={`input input-bordered w-full ${pincode.length===6&&!serviceable?'input-error':''}`} value={pincode} maxLength={6} onChange={e=>setPincode(e.target.value.replace(/\D/g,''))} placeholder="834002"/>{pincode.length===6&&!serviceable&&<p className="text-xs text-error">Currently available only in 834002, 834003 and 834004.</p>}</div>
   <div className="space-y-2"><label className="text-sm font-semibold">Delivery slot</label><select className="select select-bordered w-full" value={slot} onChange={e=>setSlot(e.target.value)}>{SLOTS.map(s=><option key={s}>{s}</option>)}</select></div></>}
  </div>
  {!!cart.length&&<div className="space-y-3 border-t border-base-300 p-4"><div className="space-y-1 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div>{firstOrderDiscount>0&&<div className="flex justify-between text-success"><span>First-order discount</span><span>−₹{firstOrderDiscount}</span></div>}<div className="flex justify-between"><span>Delivery</span><span>{delivery===0?'FREE':`₹${delivery}`}</span></div><div className="flex justify-between border-t border-base-300 pt-2 text-lg font-black"><span>Total</span><span>₹{total}</span></div></div>{subtotal<99&&<p className="text-xs text-warning">Add ₹{99-subtotal} more to reach the minimum cart value.</p>}<button className="btn btn-primary w-full" disabled={!valid}><Truck size={18}/>Continue with Cash on Delivery</button><p className="flex justify-center gap-1 text-xs text-base-content/60"><ShieldCheck size={14}/>OTP and email verification required</p></div>}
 </aside></div>;
};
