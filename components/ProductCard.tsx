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

const byId: Record<string, string> = {
  p1: '/assets/chicken-curry.webp',
  p2: '/assets/chicken-breast.webp',
  p3: '/assets/product-placeholder.svg',
  p4: '/assets/product-placeholder.svg',
  p5: '/assets/prawns.webp',
  p6: '/assets/eggs.webp',
  p7: '/assets/tikka.webp',
  p8: '/assets/product-placeholder.svg',
  p10: '/assets/product-placeholder.svg'
};

const bySku: Record<string, string> = {
  'JWM-CHK-001': byId.p1,
  'JWM-CHK-002': byId.p2,
  'JWM-MUT-001': byId.p3,
  'JWM-FSH-001': byId.p4,
  'JWM-SEA-001': byId.p5,
  'JWM-EGG-001': byId.p6,
  'JWM-RTC-001': byId.p7,
  'JWM-RTE-001': byId.p10,
  'JWM-CMB-001': byId.p8
};

function resolveImage(product: Product): string {
  if (product.imageUrl) return product.imageUrl;
  if (product.id && byId[product.id]) return byId[product.id];
  if (product.sku && bySku[product.sku]) return bySku[product.sku];
  const n = (product.name || '').toLowerCase();
  if (n.includes('biryani')) return byId.p10;
  if (n.includes('mutton')) return byId.p3;
  if (n.includes('breast')) return byId.p2;
  if (n.includes('tikka')) return byId.p7;
  if (n.includes('prawn')) return byId.p5;
  if (n.includes('egg')) return byId.p6;
  if (n.includes('rohu')) return byId.p4;
  if (n.includes('combo')) return byId.p8;
  if (n.includes('chicken') && n.includes('curry')) return byId.p1;
  if (n.includes('curry cut') && !n.includes('mutton')) return byId.p1;
  return '/assets/product-placeholder.svg';
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
  const showWeight = !!(current.weight && String(current.weight).trim());
  const showServings = !!(product.servings && String(product.servings).trim());
  const showMeta = showWeight || showServings;

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
          onError={e => { const image = e.currentTarget; if (!image.src.endsWith('/assets/product-placeholder.svg')) image.src = '/assets/product-placeholder.svg'; }}
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
        {(product.attributes?.length || product.cutTypes?.length) ? (
          <div className="product-attributes">
            {[...(product.attributes || []), ...(product.cutTypes || [])]
              .slice(0, 4)
              .map(a => (
                <span key={a}>{localizedAttribute(a, language)}</span>
              ))}
          </div>
        ) : null}
        {showMeta && (
          <div className="product-meta">
            {showWeight && <span>{localizedWeight(current.weight, language)}</span>}
            {showWeight && showServings && <i>•</i>}
            {showServings && (
              <span>
                {t(language, 'serves')} {product.servings}
              </span>
            )}
          </div>
        )}
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
