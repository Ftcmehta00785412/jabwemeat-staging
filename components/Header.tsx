import React from 'react';
import { MapPin, Search, ShoppingCart, UserRound, Menu, Phone } from 'lucide-react';
import type { AppView, Language } from '../types';
import { t } from '../i18n';

type Props = {
  language: Language;
  setLanguage: (v: Language) => void;
  view: AppView;
  setView: (v: AppView) => void;
  onCategory: (v: string) => void;
  pincode: string;
  setPincode: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  cartCount: number;
  onCart: () => void;
  onAccount: () => void;
  accountEmail?: string | null;
};

const links = [
  ['Home', 'All'],
  ['Shop All', 'All'],
  ['Chicken', 'Chicken'],
  ['Mutton', 'Mutton'],
  ['Fish & Seafood', 'Fish & Seafood'],
  ['Eggs', 'Eggs'],
  ['Ready to Cook', 'Ready to Cook'],
  ['Combos', 'Combos']
];

export const Header: React.FC<Props> = ({
  language,
  setLanguage,
  view,
  setView,
  onCategory,
  pincode,
  setPincode,
  search,
  setSearch,
  cartCount,
  onCart,
  onAccount,
  accountEmail
}) => {
  const explore = (category: string, home = false) => {
    setView('store');
    onCategory(category);
    requestAnimationFrame(() =>
      document.getElementById(home ? 'top' : 'shop')?.scrollIntoView({ behavior: 'smooth' })
    );
  };

  return (
    <>
      <div className="offer-bar">{t(language, 'offer')}</div>
      <header className="site-header">
        <div className="header-main">
          <button className="mobile-menu" aria-label="Open menu">
            <Menu size={23} />
          </button>
          <button className="brand" onClick={() => explore('All', true)}>
            <span className="brand-mark">
              <span>J</span>
              <i />
            </span>
            <span className="brand-copy">
              <b>
                JAB<span>WE</span>MEAT<sup>™</sup>
              </b>
              <small>{t(language, 'brandTagline')}</small>
            </span>
          </button>
          <label className="desktop-search">
            <Search size={18} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t(language, 'search')}
            />
          </label>
          <div className="delivery-location">
            <MapPin size={18} />
            <div>
              <small>{t(language, 'deliverTo')}</small>
              <b>{pincode || t(language, 'enterPin')}</b>
            </div>
            <input
              aria-label="Delivery PIN"
              maxLength={6}
              value={pincode}
              onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <div className="language-toggle" aria-label={t(language, 'language')}>
            <button
              className={language === 'en' ? 'selected' : ''}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
            <button
              className={language === 'hi' ? 'selected' : ''}
              onClick={() => setLanguage('hi')}
            >
              हिं
            </button>
            <button
              className={language === 'bn' ? 'selected' : ''}
              onClick={() => setLanguage('bn')}
            >
              বাং
            </button>
          </div>
          <nav className="header-actions">
            <button className="nav-action" onClick={onAccount} aria-label={t(language, 'account')}>
              <UserRound />
              <span>{t(language, 'account')}</span>
            </button>
            <button className="cart-button" onClick={onCart}>
              <ShoppingCart />
              <span>{t(language, 'cart')}</span>
              {cartCount > 0 && <b>{cartCount}</b>}
            </button>
          </nav>
        </div>
        <div className="category-nav">
          <nav>
            {links.map(([label, cat], i) => (
              <button
                key={label}
                onClick={() => explore(cat, i === 0)}
                className={i === 0 ? 'active' : ''}
              >
                {label === 'Home'
                  ? t(language, 'home')
                  : label === 'Shop All'
                    ? t(language, 'shopAll')
                    : label}
              </button>
            ))}
          </nav>
          <span>
            <Phone size={13} /> {t(language, 'ranchiDelivery')}
          </span>
        </div>
      </header>
    </>
  );
};
