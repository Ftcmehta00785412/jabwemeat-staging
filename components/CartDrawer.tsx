import React, { useEffect, useMemo, useState } from 'react';
import { X, Trash2, Tag, Truck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SERVICEABLE_PINS, SLOTS } from '../data';
import { supabase } from '../supabase';
import type { CartItem } from '../types';

type DeliverySlot={id?:string; label:string};
type Props={open:boolean; onClose:()=>void; cart:CartItem[]; pincode:string; setPincode:(v:string)=>void; onRemoveAll:(id:string)=>void; slots?:DeliverySlot[]; serviceablePins?:string[]; sessionKey:string; onSuccess:(result:any)=>void};
type Form={name:string;email:string;mobile:string;address:string;landmark:string;pincode:string;date:string;slot:string};
const today=()=>new Date().toISOString().slice(0,10);
export const CartDrawer: React.FC<Props> = ({open,onClose,cart,pincode,setPincode,onRemoveAll,slots=[],serviceablePins=SERVICEABLE_PINS,sessionKey,onSuccess}) => {
 const availableSlots:DeliverySlot[]=slots.length?slots:SLOTS.map(label=>({label}));
 const [form,setForm]=useState<Form>({name:'',email:'',mobile:'',address:'',landmark:'',pincode,date:today(),slot:availableSlots[0]?.id||availableSlots[0]?.label||''});
 const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 useEffect(()=>{if(!open)return;setForm(f=>({...f,pincode,slot:availableSlots.some(s=>(s.id||s.label)===f.slot)?f.slot:(availableSlots[0]?.id||availableSlots[0]?.label||'')}));},[open,pincode,slots]);
 const subtotal=useMemo(()=>cart.reduce((s,i)=>s+i.price*i.quantity,0),[cart]);
 const serviceable=serviceablePins.includes(form.pincode); const valid=subtotal>=99&&serviceable&&cart.length>0;
 const set=(key:keyof Form,value:string)=>setForm(f=>({...f,[key]:value}));
 const selectedSlot=availableSlots.find(s=>(s.id||s.label)===form.slot);
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setError('');
  if(!/^[6-9]\d{9}$/.test(form.mobile.replace(/\D/g,''))){setError('Enter a valid 10-digit mobile number.');return;}
  if(!valid){setError(subtotal<99?'Minimum cart value is ₹99.':'Enter a serviceable PIN code.');return;}
  if(!selectedSlot?.id){setError('Live delivery slots are not available right now. Please try again shortly.');return;}
  setBusy(true);
  const {data,error:rpcError}=await supabase.rpc('place_cod_order',{p_session_key:sessionKey,p_customer_name:form.name.trim(),p_email:form.email.trim(),p_mobile:form.mobile,p_address:{line1:form.address.trim(),landmark:form.landmark.trim(),city:'Ranchi',state:'Jharkhand'},p_pincode:form.pincode,p_delivery_date:form.date,p_slot_id:selectedSlot.id,p_items:cart.map(i=>({product_id:i.id,quantity:i.quantity})),p_notes:null});
  setBusy(false); if(rpcError){setError(rpcError.message||'Could not place the order. Please try again.');return;} onSuccess(data);
 };
 if(!open)return null;
 return <div className="fixed inset-0 z-50 flex justify-end bg-neutral/40" onClick={onClose}><aside className="cart-drawer flex h-full w-full max-w-md flex-col bg-base-100 shadow-2xl" onClick={e=>e.stopPropagation()}>
  <div className="cart-drawer-head flex items-center justify-between border-b border-base-300 p-4"><div><h2 className="text-xl font-black">Your cart</h2><p className="text-xs text-base-content/60">COD · Minimum order ₹99</p></div><button className="btn btn-circle btn-ghost btn-sm" onClick={onClose}><X/></button></div>
  <div className="cart-drawer-body flex-1 space-y-4 overflow-y-auto p-4">
   {!cart.length?<div className="grid place-items-center gap-2 py-20 text-center"><span className="text-5xl">🛒</span><h3 className="font-bold">Your cart is waiting</h3><p className="text-sm text-base-content/60">Add fresh cuts to continue.</p></div>:<>
    <div className="cart-items">{cart.map(i=><div className="cart-line flex gap-3 rounded-xl bg-base-200 p-3" key={i.id}><span className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-2xl">{i.icon}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{i.name}</p><p className="text-xs text-base-content/60">{i.weight} × {i.quantity}</p><p className="font-bold">₹{i.price*i.quantity}</p></div><button className="btn btn-ghost btn-sm" onClick={()=>onRemoveAll(i.id)}><Trash2 size={16}/></button></div>)}</div>
    <div className="card border border-primary/20 bg-primary/10"><div className="card-body gap-2 p-4"><div className="flex items-center gap-2 font-bold"><Tag size={18} className="text-primary"/>First-order launch estimate</div><p className="text-sm">₹100 off your first eligible order. Delivery is free for your first 3 orders.</p></div></div>
    <form id="checkout-form" className="checkout-form" onSubmit={submit}><h3>Delivery details</h3>
      <label>Full name<input required value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Your name"/></label>
      <div className="checkout-two"><label>Email<input required type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="you@example.com"/></label><label>Mobile<input required inputMode="numeric" maxLength={10} value={form.mobile} onChange={e=>set('mobile',e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="10-digit number"/></label></div>
      <label>Address<input required value={form.address} onChange={e=>set('address',e.target.value)} placeholder="House no., street, area"/></label>
      <label>Landmark <span>(optional)</span><input value={form.landmark} onChange={e=>set('landmark',e.target.value)} placeholder="Near…"/></label>
      <div className="checkout-two"><label>PIN code<input required inputMode="numeric" maxLength={6} value={form.pincode} onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,6);set('pincode',v);setPincode(v)}} placeholder="834002"/></label><label>Delivery date<input required type="date" min={today()} value={form.date} onChange={e=>set('date',e.target.value)}/></label></div>
      <label>Delivery slot<select required value={form.slot} onChange={e=>set('slot',e.target.value)}>{availableSlots.map(s=><option key={s.id||s.label} value={s.id||s.label}>{s.label}</option>)}</select></label>
      {form.pincode.length===6&&!serviceable&&<p className="checkout-error">Currently available only in 834002, 834003 and 834004.</p>}
      {error&&<p className="checkout-error">{error}</p>}
    </form>
   </>}
  </div>
  {!!cart.length&&<div className="cart-drawer-foot space-y-3 border-t border-base-300 p-4"><div className="space-y-1 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div><div className="flex justify-between text-success"><span>First-order estimate</span><span>−₹{Math.min(100,subtotal)}</span></div><div className="flex justify-between"><span>Delivery</span><span>FREE for first 3 orders</span></div><div className="flex justify-between border-t border-base-300 pt-2 text-lg font-black"><span>Estimated total</span><span>₹{Math.max(0,subtotal-Math.min(100,subtotal))}</span></div></div><button form="checkout-form" className="btn btn-primary w-full" disabled={!valid||busy}>{busy?'Placing order…':<><Truck size={18}/>Place COD order</>}</button><p className="flex justify-center gap-1 text-xs text-base-content/60"><ShieldCheck size={14}/>Secure verification and cash on delivery</p></div>}
 </aside></div>;
};
