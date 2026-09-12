import React from 'react';
import { Minus, Plus, Clock3, Star, Snowflake } from 'lucide-react';
import type { Product } from '../types';

const PRODUCT_IMAGES:Record<string,string>={
 p1:'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=800&q=85',
 p2:'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=85',
 p3:'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=800&q=85',
 p4:'https://images.unsplash.com/photo-1534948216015-843149f72be3?auto=format&fit=crop&w=800&q=85',
 p5:'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=85',
 p6:'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=800&q=85',
 p7:'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=85',
 p8:'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=85'
};

type Props={product:Product; quantity:number; onAdd:()=>void; onRemove:()=>void};
export const ProductCard: React.FC<Props> = ({product,quantity,onAdd,onRemove}) => {
  const discount=Math.round((1-product.price/product.mrp)*100);
  return <article className="product-card">
    <div className="product-image-wrap">
      <img src={PRODUCT_IMAGES[product.id]} alt={product.name}/>
      <span className="discount-pill">{discount}% OFF</span>
      {product.featured&&<span className="bestseller"><Star size={12} fill="currentColor"/> Bestseller</span>}
    </div>
    <div className="product-info">
      <p className="product-category">{product.category}</p>
      <h3>{product.name}</h3>
      <p className="product-description">{product.description}</p>
      <div className="product-meta"><span>{product.weight}</span><i>•</i><span>Serves {product.servings}</span></div>
      <div className="fresh-note"><Snowflake size={13}/> Chilled & freshly packed</div>
      <div className="product-buy-row">
        <div className="price"><strong>₹{product.price}</strong><del>₹{product.mrp}</del></div>
        {quantity===0 ? <button className="add-button" onClick={onAdd} disabled={product.stock===0}>{product.stock===0?'Sold out':'ADD'}</button> : <div className="quantity-control"><button onClick={onRemove}><Minus size={15}/></button><span>{quantity}</span><button onClick={onAdd}><Plus size={15}/></button></div>}
      </div>
      <p className="slot-note"><Clock3 size={13}/> Available in today’s delivery slots</p>
    </div>
  </article>
};
