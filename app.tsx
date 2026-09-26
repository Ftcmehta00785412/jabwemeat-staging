import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Header } from './components/Header';
import { Storefront } from './components/Storefront';
import { CartDrawer } from './components/CartDrawer';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { AccountPanel } from './components/AccountPanel';
import type { User } from '@supabase/supabase-js';
import { PRODUCTS, SERVICEABLE_PINS, SLOTS } from './data';
import { supabase } from './supabase';
import type { AppView, CartItem, Product, Language } from './types';
import { t, localizedCategory } from './i18n';
import './styles.css';

type Slot = { id: string; label: string };

const sessionKey = () => {
  const k = 'jwm-session-key';
  let v = localStorage.getItem(k);
  if (!v) {
    v = `jwm-${crypto.randomUUID()}-${Date.now()}`;
    localStorage.setItem(k, v);
  }
  return v;
};

const iconFor = (c: string) =>
  ({
    Chicken: '🍗',
    Mutton: '🍖',
    'Fish & Seafood': '🐟',
    Eggs: '🥚',
    'Ready to Cook': '🔥',
    Combos: '🛍️'
  } as Record<string, string>)[c] || '🥩';

const adapt = (p: any): Product => {
  const category = p.categories?.name || p.category || 'Chicken';
  const f = PRODUCTS.find(x => x.sku === p.sku || x.id === p.id);
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    category,
    description: p.description || f?.description || '',
    weight: p.weight || f?.weight || '',
    servings: p.servings || f?.servings || '',
    price: Number(p.price),
    mrp: Number(p.mrp),
    stock: Number(p.stock || 0),
    icon: iconFor(category),
    imageUrl: p.image_url || undefined,
    featured: !!p.featured,
    active: p.active !== false,
    attributes: Array.isArray(p.attributes)
      ? p.attributes
      : f?.attributes || [],
    cutTypes: Array.isArray(p.cut_types)
      ? p.cut_types
      : Array.isArray(p.cutTypes)
        ? p.cutTypes
        : f?.cutTypes || [],
    recommendation: f?.recommendation
  };
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('store');
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [categories, setCategories] = useState<string[]>([
    'All',
    'Chicken',
    'Mutton',
    'Fish & Seafood',
    'Eggs',
    'Ready to Cook',
    'Combos'
  ]);
  const [slots, setSlots] = useState<Slot[]>(SLOTS.map(label => ({ id: '', label })));
  const [pins, setPins] = useState(SERVICEABLE_PINS);
  const [language, setLanguage] = useState<Language>('en');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pincode, setPincode] = useState('834002');
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<any>();

  const key = useMemo(sessionKey, []);
  const count = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);
  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.quantity, 0),
    [cart]
  );

  useEffect(() => {
    try {
      const x = JSON.parse(localStorage.getItem('jwm-cart') || '[]');
      if (Array.isArray(x)) setCart(x);
    } catch {}
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null));
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user || null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('jwm-cart', JSON.stringify(cart));
    if (!loading && cart.length) {
      supabase.rpc('save_cart', {
        p_session_key: key,
        p_customer_name: null,
        p_email: null,
        p_mobile: null,
        p_pincode: pincode,
        p_items: cart.map(i => ({ product_id: i.id, quantity: i.quantity }))
      });
    }
  }, [cart, pincode, key, loading]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [p, c, s, settings] = await Promise.all([
        supabase
          .from('products')
          .select('*,categories(name)')
          .eq('active', true)
          .order('created_at'),
        supabase.from('categories').select('name').eq('active', true).order('sort_order'),
        supabase
          .from('delivery_slots')
          .select('id,label')
          .eq('active', true)
          .order('sort_order'),
        supabase.from('store_settings').select('key,value')
      ]);
      if (!alive) return;

      if (!p.error && p.data?.length) {
        const live = p.data.map(adapt);
        setProducts(live);
        setCart(old =>
          old.flatMap(i => {
            const n = live.find(x => x.id === i.id || x.sku === i.sku);
            if (!n) return [];
            return [
              {
                ...n,
                quantity: Math.max(1, Math.min(i.quantity, Math.max(0, n.stock)))
              }
            ];
          })
        );
      }

      if (!c.error && c.data?.length) {
        setCategories(['All', ...c.data.map((x: any) => x.name)]);
      }
      if (!s.error && s.data?.length) {
        setSlots(s.data as Slot[]);
      }
      if (!settings.error) {
        const pin = (settings.data || []).find((x: any) => x.key === 'serviceable_pins');
        if (Array.isArray(pin?.value) && pin.value.length) {
          const nextPins = pin.value.map(String);
          setPins(nextPins);
          setPincode(v => (nextPins.includes(v) ? v : String(nextPins[0])));
        }
      }
      setLoading(false);
    };

    load();
    const ch = supabase
      .channel('store-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, load)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_slots' },
        load
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);

  const add = (p: Product) =>
    setCart(x => {
      const existing = x.find(i => i.id === p.id);
      if (existing) {
        return x.map(i =>
          i.id === p.id
            ? { ...i, ...p, quantity: Math.min(i.quantity + 1, Math.max(1, p.stock)) }
            : i
        );
      }
      return [...x, { ...p, quantity: 1 }];
    });

  const remove = (id: string) =>
    setCart(x =>
      x.flatMap(i => {
        if (i.id !== id) return [i];
        if (i.quantity > 1) return [{ ...i, quantity: i.quantity - 1 }];
        return [];
      })
    );

  const removeAll = (id: string) => setCart(x => x.filter(i => i.id !== id));

  const goCategory = (c: string) => {
    setCategory(c);
    setView('store');
    requestAnimationFrame(() =>
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })
    );
  };

  return (
    <div className="app-shell">
      <Header
        language={language}
        setLanguage={setLanguage}
        view={view}
        setView={setView}
        onCategory={setCategory}
        pincode={pincode}
        setPincode={setPincode}
        search={search}
        setSearch={setSearch}
        cartCount={count}
        onCart={() => setCartOpen(true)}
        onAccount={() => setAccountOpen(true)}
        accountEmail={user?.email}
      />
      {privacyOpen && <PrivacyPolicy onClose={() => setPrivacyOpen(false)} />}
      <AccountPanel
        open={accountOpen}
        user={user}
        onClose={() => setAccountOpen(false)}
        onSignedOut={() => setAccountOpen(false)}
        language={language}
      />
      {success && (
        <div className="order-success">
          <b>
            {t(language, 'orderConfirmed')} · {success.order_number || 'JWM'}
          </b>
          <span>{t(language, 'codPlaced', { n: success.total || 0 })}</span>
          <button type="button" onClick={() => setSuccess(null)}>
            ×
          </button>
        </div>
      )}
      <Storefront
        language={language}
        products={products}
        cart={cart}
        categories={categories}
        category={category}
        setCategory={setCategory}
        search={search}
        setSearch={setSearch}
        pincode={pincode}
        setPincode={setPincode}
        serviceable={pins.includes(pincode)}
        slots={slots}
        onAdd={add}
        onRemove={remove}
        onCart={() => setCartOpen(true)}
        subtotal={subtotal}
      />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        pincode={pincode}
        setPincode={setPincode}
        onRemoveAll={removeAll}
        slots={slots}
        serviceablePins={pins}
        sessionKey={key}
        onSuccess={r => {
          setCart([]);
          setCartOpen(false);
          setSuccess(r);
        }}
        language={language}
      />
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="brand inverted">
              <span className="brand-mark">
                <span>J</span>
              </span>
              <span className="brand-copy">
                <b>
                  JabWeMeat<sup>™</sup>
                </b>
                <small>{t(language, 'footerTagline')}</small>
              </span>
            </div>
            <p>{t(language, 'footerBody')}</p>
            <p className="footer-contact-line">
              <a href="mailto:hello@jabwemeat.com">hello@jabwemeat.com</a>
            </p>
          </div>
          <div className="footer-shop">
            <h4>{t(language, 'shop')}</h4>
            <div className="footer-shop-links">
              {['Chicken', 'Mutton', 'Fish & Seafood', 'Ready to Cook'].map(c => (
                <button
                  type="button"
                  className="footer-link-btn"
                  key={c}
                  onClick={() => goCategory(c)}
                >
                  {t(language, 'shopNow')} · {localizedCategory(c, language)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h4>{t(language, 'help')}</h4>
            <a href="mailto:hello@jabwemeat.com">{t(language, 'contact')}</a>
            <button
              type="button"
              className="footer-privacy-link footer-link-btn"
              onClick={() => setPrivacyOpen(true)}
            >
              {t(language, 'privacy')}
            </button>
            <p className="footer-help-note">{t(language, 'ranchiOnly')}</p>
          </div>
          <div>
            <h4>Service area</h4>
            <p>PINs {pins.join(', ')}</p>
            <p>Cash on delivery only</p>
            <p>Slot-based delivery · Ranchi</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{t(language, 'rights')}</span>
          <span>
            {loading
              ? t(language, 'loading')
              : 'Fresh delivery · COD · Ranchi'}
          </span>
        </div>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(<App />);
