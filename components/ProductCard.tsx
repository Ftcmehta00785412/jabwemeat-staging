import React from 'react';
import { Minus, Plus, Star, Snowflake } from 'lucide-react';
import type { Product, Language } from '../types';
import {
  localizedAttribute,
  localizedCategory,
  localizedProduct,
  localizedWeight,
  t
} from '../i18n';

/** Crisp product photos — matched by id, sku, OR name (Supabase uses UUIDs). */
const byId: Record<string, string> = {
  p1: 'https://static.wixstatic.com/media/8bcb0b_b2ae4acc71f3497d97336e5df97d5ec0~mv2.jpg/v1/fill/w_900,h_675,al_c,q_90,usm_0.66_1.00_0.01/8bcb0b_b2ae4acc71f3497d97336e5df97d5ec0~mv2.jpg',
  p2: 'https://images.weserv.nl/?url=www.starquik.com/cdn/shop/files/Starfresh_Chicken_Breast_Boneless_1_Kg_Front_e2047377-7376-4980-8e4b-b6bcc56b5d4c.jpg&w=900&h=675&fit=contain&cbg=white&output=webp&q=90',
  p3: 'https://images.weserv.nl/?url=litter.catbox.moe/7s746z.webp&w=900&h=675&fit=cover&output=webp&q=85',
  p4: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&h=675&q=85',
  p5: 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&h=675&q=85',
  p6: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQ1m5uC3SQNra7ZQF6YzEZplNwVC41oknw593aKAIjUQuJsL2J3iBiq0ir&s=10',
  p7: 'https://images.weserv.nl/?url=illustrake.zappfresh.com/6a904eccc05e26f328ed9738&w=900&h=675&fit=cover&output=webp&q=90',
  p8: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&h=675&q=85'
};

const bySku: Record<string, string> = {
  'JWM-CHK-001': byId.p1,
  'JWM-CHK-002': byId.p2,
  'JWM-MUT-001': byId.p3,
  'JWM-FSH-001': byId.p4,
  'JWM-SEA-001': byId.p5,
  'JWM-EGG-001': byId.p6,
  'JWM-RTC-001': byId.p7,
  'JWM-CMB-001': byId.p8
};

function resolveImage(product: Product): string {
  if (product.imageUrl) return product.imageUrl;
  if (product.id && byId[product.id]) return byId[product.id];
  if (product.sku && bySku[product.sku]) return bySku[product.sku];
  const n = (product.name || '').toLowerCase();
  // Most specific first — mutton before any "curry cut"
  if (n.includes('mutton')) return byId.p3;
  if (n.includes('breast')) return byId.p2;
  if (n.includes('tikka')) return byId.p7;
  if (n.includes('prawn')) return byId.p5;
  if (n.includes('egg')) return byId.p6;
  if (n.includes('rohu')) return byId.p4;
  if (n.includes('combo')) return byId.p8;
  if (n.includes('chicken') && n.includes('curry')) return byId.p1;
  if (n.includes('curry cut') && !n.includes('mutton')) return byId.p1;
  return byId.p1;
}

type Props = {
  language: Language;
  product: Product;
  quantity: number;
  onAdd: (p: Product) => void;
  onRemove: () => void;
};

export const ProductCard: React.FC<Props> = ({
  language,
  product,
  quantity,
  onAdd,
  onRemove
}) => {
  const current = product;
  const d =
    current.mrp > 0 && current.price < current.mrp
      ? Math.round((1 - current.price / current.mrp) * 100)
      : 0;
  const localized = localizedProduct(product, language);
  const stockKnown = Number.isFinite(current.stock);
  const availability = !stockKnown
    ? t(language, 'availabilityUnavailable')
    : current.stock === 0
      ? t(language, 'outOfStock')
      : current.stock < 6
        ? t(language, 'onlyLeft', { n: current.stock })
        : t(language, 'inStock');

  const imgSrc = resolveImage(product);
  const isBreast = /breast/i.test(product.name || '');

  return (
    <article className="product-card">
      <div className="product-image-wrap" style={isBreast ? { background: '#fff' } : undefined}>
        <img
          src={imgSrc}
          alt={localized.name}
          loading="lazy"
          width={900}
          height={675}
          decoding="async"
          style={{
            objectFit: isBreast ? 'contain' : 'cover',
            width: '100%',
            height: '100%',
            background: isBreast ? '#fff' : undefined
          }}
        />
        {d > 0 && (
          <span className="discount-pill">
            {t(language, 'save')} {d}%
          </span>
        )}
        {product.featured && (
          <span className="bestseller">
            <Star fill="currentColor" /> {t(language, 'bestseller')}
          </span>
        )}
        <span
          className={`availability-badge ${stockKnown && current.stock < 6 ? 'low' : ''}`}
        >
          {availability}
        </span>
      </div>
      <div className="product-info">
        <p className="product-category">
          {localizedCategory(product.category, language)}
        </p>
        <h3>{localized.name}</h3>
        <p className="product-description">{localized.description}</p>
        <div className="product-attributes">
          {[...(product.attributes || []), ...(product.cutTypes || [])]
            .slice(0, 4)
            .map(a => (
              <span key={a}>{localizedAttribute(a, language)}</span>
            ))}
        </div>
        <div className="product-meta">
          <span>{localizedWeight(current.weight, language)}</span>
          <i>•</i>
          <span>
            {t(language, 'serves')} {product.servings}
          </span>
        </div>
        <div className="fresh-note">
          <Snowflake /> {t(language, 'packed')}
        </div>
        <div className="product-buy-row">
          <div className="price">
            <strong>₹{current.price}</strong>
            {current.mrp > current.price && <del>₹{current.mrp}</del>}
          </div>
          {quantity === 0 ? (
            <button
              className="add-button"
              onClick={() => onAdd(current)}
              disabled={!stockKnown || current.stock === 0}
            >
              {!stockKnown
                ? t(language, 'unavailable')
                : current.stock === 0
                  ? t(language, 'soldOut')
                  : t(language, 'add')}
            </button>
          ) : (
            <div className="quantity-control">
              <button type="button" onClick={onRemove} aria-label="Decrease">
                <Minus />
              </button>
              <span>{quantity}</span>
              <button
                type="button"
                onClick={() => onAdd(current)}
                disabled={!stockKnown || current.stock === 0}
                aria-label="Increase"
              >
                <Plus />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
