import React from 'react';
import { Minus, Plus, Star, Snowflake, ShoppingBasket } from 'lucide-react';
import type { Product, Language } from '../types';
import {
  localizedAttribute,
  localizedCategory,
  localizedProduct,
  localizedRecommendation,
  localizedWeight,
  t
} from '../i18n';

/** Crisp product photography (Unsplash, 900×675, product-relevant). */
const images: Record<string, string> = {
  p1: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&h=675&q=85',
  p2: 'https://images.unsplash.com/photo-1633096013004-e2cb4023b560?auto=format&fit=crop&w=900&h=675&q=85',
  p3: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=900&h=675&q=85',
  p4: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&h=675&q=85',
  p5: 'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=900&h=675&q=85',
  p6: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=900&h=675&q=85',
  p7: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&h=675&q=85',
  p8: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&h=675&q=85'
};
const categoryImages: Record<string, string> = {
  Chicken: images.p1,
  Mutton: images.p3,
  'Fish & Seafood': images.p4,
  Eggs: images.p6,
  'Ready to Cook': images.p7,
  Combos: images.p8
};

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

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <img
          src={
            images[product.id] ||
            categoryImages[product.category] ||
            images.p1
          }
          alt={localized.name}
          loading="lazy"
          width={900}
          height={675}
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
        {product.recommendation && (
          <div className="combo-suggestion">
            <ShoppingBasket />{' '}
            {localizedRecommendation(product.recommendation, language)}
          </div>
        )}
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
