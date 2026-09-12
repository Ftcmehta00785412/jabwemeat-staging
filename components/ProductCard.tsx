import React from 'react';
import { Minus, Plus, Clock3, Users } from 'lucide-react';
import type { Product } from '../types';

type Props={product:Product; quantity:number; onAdd:()=>void; onRemove:()=>void};
export const ProductCard: React.FC<Props> = ({product,quantity,onAdd,onRemove}) => {
  const discount=Math.round((1-product.price/product.mrp)*100);
  return <article className="card overflow-hidden border border-base-300 bg-base-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
    <div className="grid h-40 place-items-center bg-primary/10 text-6xl" aria-label={`${product.name} placeholder image`}>{product.icon}</div>
    <div className="card-body gap-3 p-4">
      <div className="flex items-start justify-between gap-2"><h3 className="font-bold leading-tight">{product.name}</h3><span className="badge badge-success badge-sm whitespace-nowrap">{discount}% off</span></div>
      <p className="line-clamp-2 text-sm text-base-content/60">{product.description}</p>
      <div className="flex flex-wrap gap-2 text-xs text-base-content/60"><span className="badge badge-ghost">{product.weight}</span><span className="inline-flex items-center gap-1"><Users size={13}/>{product.servings} servings</span></div>
      <div className="flex items-end justify-between gap-3">
        <div><span className="text-lg font-black">₹{product.price}</span> <span className="text-xs text-base-content/50 line-through">₹{product.mrp}</span><div className="flex items-center gap-1 text-xs text-success"><Clock3 size={12}/>Choose a delivery slot</div></div>
        {quantity===0 ? <button className="btn btn-primary btn-sm" onClick={onAdd} disabled={product.stock===0}>Add</button> : <div className="join"><button className="btn btn-sm join-item" onClick={onRemove}><Minus size={14}/></button><span className="btn btn-sm join-item pointer-events-none">{quantity}</span><button className="btn btn-primary btn-sm join-item" onClick={onAdd}><Plus size={14}/></button></div>}
      </div>
    </div>
  </article>
};
