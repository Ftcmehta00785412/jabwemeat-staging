import React, { useEffect, useMemo, useState } from 'react';
import { X, Trash2, Tag, Truck, ShieldCheck } from 'lucide-react';
import { SERVICEABLE_PINS, SLOTS } from '../data';
import { supabase } from '../supabase';
import type { CartItem, Language } from '../types';
import { t } from '../i18n';

type DeliverySlot = { id?: string; label: string };
type Props = {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  pincode: string;
  setPincode: (v: string) => void;
  onRemoveAll: (id: string) => void;
  slots?: DeliverySlot[];
  serviceablePins?: string[];
  sessionKey: string;
  onSuccess: (result: any) => void;
  language?: Language;
};
type Form = {
  name: string;
  email: string;
  mobile: string;
  address: string;
  landmark: string;
  pincode: string;
  date: string;
  slot: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const CartDrawer: React.FC<Props> = ({
  open,
  onClose,
  cart,
  pincode,
  setPincode,
  onRemoveAll,
  slots = [],
  serviceablePins = SERVICEABLE_PINS,
  sessionKey,
  onSuccess,
  language = 'en'
}) => {
  const availableSlots: DeliverySlot[] = slots.length
    ? slots
    : SLOTS.map(label => ({ label }));
  const liveSlotsReady = availableSlots.some(s => s.id && isUuid(String(s.id)));

  const [form, setForm] = useState<Form>({
    name: '',
    email: '',
    mobile: '',
    address: '',
    landmark: '',
    pincode,
    date: today(),
    slot: availableSlots[0]?.id || availableSlots[0]?.label || ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(f => ({
      ...f,
      pincode,
      slot: availableSlots.some(s => (s.id || s.label) === f.slot)
        ? f.slot
        : availableSlots[0]?.id || availableSlots[0]?.label || ''
    }));
  }, [open, pincode, slots]);

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.quantity, 0),
    [cart]
  );
  const serviceable = serviceablePins.includes(form.pincode);
  const valid = subtotal >= 99 && serviceable && cart.length > 0;
  const set = (key: keyof Form, value: string) =>
    setForm(f => ({ ...f, [key]: value }));
  const selectedSlot = availableSlots.find(s => (s.id || s.label) === form.slot);
  const pinsList = serviceablePins.join(', ');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (cart.some(item => !isUuid(item.id))) {
      setError(t(language, 'olderItem'));
      return;
    }
    if (!/^[6-9]\d{9}$/.test(form.mobile.replace(/\D/g, ''))) {
      setError(t(language, 'validMobile'));
      return;
    }
    if (!valid) {
      setError(
        subtotal < 99 ? t(language, 'minValue') : t(language, 'serviceableError')
      );
      return;
    }
    if (!selectedSlot?.id || !isUuid(String(selectedSlot.id))) {
      setError(t(language, 'noSlots'));
      return;
    }

    setBusy(true);
    const { data, error: rpcError } = await supabase.rpc('place_cod_order', {
      p_session_key: sessionKey,
      p_customer_name: form.name.trim(),
      p_email: form.email.trim(),
      p_mobile: form.mobile,
      p_address: {
        line1: form.address.trim(),
        landmark: form.landmark.trim(),
        city: 'Ranchi',
        state: 'Jharkhand'
      },
      p_pincode: form.pincode,
      p_delivery_date: form.date,
      p_slot_id: selectedSlot.id,
      p_items: cart.map(i => ({ product_id: i.id, quantity: i.quantity })),
      p_notes: null
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message || 'Could not place the order. Please try again.');
      return;
    }
    onSuccess(data);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-neutral/40"
      onClick={onClose}
    >
      <aside
        className="cart-drawer flex h-full w-full max-w-md flex-col bg-base-100 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="cart-drawer-head flex items-center justify-between border-b border-base-300 p-4">
          <div>
            <h2 className="text-xl font-black">{t(language, 'cartTitle')}</h2>
            <p className="text-xs text-base-content/60">{t(language, 'minOrder')}</p>
          </div>
          <button type="button" className="btn btn-circle btn-ghost btn-sm" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="cart-drawer-body flex-1 space-y-4 overflow-y-auto p-4">
          {!cart.length ? (
            <div className="grid place-items-center gap-2 py-20 text-center">
              <span className="text-5xl">🛒</span>
              <h3 className="font-bold">{t(language, 'cartWaiting')}</h3>
              <p className="text-sm text-base-content/60">{t(language, 'addCuts')}</p>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map(i => (
                  <div className="cart-line flex gap-3 rounded-xl bg-base-200 p-3" key={i.id}>
                    <span className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-2xl">
                      {i.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{i.name}</p>
                      <p className="text-xs text-base-content/60">
                        {i.weight} × {i.quantity}
                      </p>
                      <p className="font-bold">₹{i.price * i.quantity}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => onRemoveAll(i.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="card border border-primary/20 bg-primary/10">
                <div className="card-body gap-2 p-4">
                  <div className="flex items-center gap-2 font-bold">
                    <Tag size={18} className="text-primary" />
                    {t(language, 'launchEstimate')}
                  </div>
                  <p className="text-sm">{t(language, 'launchBody')}</p>
                </div>
              </div>

              <form id="checkout-form" className="checkout-form" onSubmit={submit}>
                <h3>{t(language, 'deliveryDetails')}</h3>
                <label>
                  {t(language, 'fullName')}
                  <input
                    required
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder={t(language, 'yourName')}
                  />
                </label>
                <div className="checkout-two">
                  <label>
                    {t(language, 'email')}
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      placeholder="you@example.com"
                    />
                  </label>
                  <label>
                    {t(language, 'mobile')}
                    <input
                      required
                      inputMode="numeric"
                      maxLength={10}
                      value={form.mobile}
                      onChange={e =>
                        set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      placeholder={t(language, 'tenDigit')}
                    />
                  </label>
                </div>
                <label>
                  {t(language, 'address')}
                  <input
                    required
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder={t(language, 'addressPlaceholder')}
                  />
                </label>
                <label>
                  {t(language, 'landmark')} <span>({t(language, 'optional')})</span>
                  <input
                    value={form.landmark}
                    onChange={e => set('landmark', e.target.value)}
                    placeholder={t(language, 'near')}
                  />
                </label>
                <div className="checkout-two">
                  <label>
                    {t(language, 'pinCode')}
                    <input
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={form.pincode}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                        set('pincode', v);
                        setPincode(v);
                      }}
                      placeholder="834002"
                    />
                  </label>
                  <label>
                    {t(language, 'date')}
                    <input
                      required
                      type="date"
                      min={today()}
                      value={form.date}
                      onChange={e => set('date', e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  {t(language, 'slot')}
                  <select
                    required
                    value={form.slot}
                    onChange={e => set('slot', e.target.value)}
                    disabled={!liveSlotsReady}
                  >
                    {!liveSlotsReady && (
                      <option value="">{t(language, 'unavailableSlots')}</option>
                    )}
                    {availableSlots.map(s => (
                      <option key={s.id || s.label} value={s.id || s.label}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                {form.pincode.length === 6 && !serviceable && (
                  <p className="checkout-error">
                    Currently available only in {pinsList}.
                  </p>
                )}
                {!liveSlotsReady && cart.length > 0 && (
                  <p className="checkout-error">{t(language, 'noSlots')}</p>
                )}
                {error && <p className="checkout-error">{error}</p>}
              </form>
            </>
          )}
        </div>

        {!!cart.length && (
          <div className="cart-drawer-foot space-y-3 border-t border-base-300 p-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{t(language, 'subtotal')}</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-success">
                <span>{t(language, 'firstEstimate')}</span>
                <span>−₹{Math.min(100, subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span>{t(language, 'freeDelivery')}</span>
              </div>
              <div className="flex justify-between border-t border-base-300 pt-2 text-lg font-black">
                <span>{t(language, 'estimatedTotal')}</span>
                <span>₹{Math.max(0, subtotal - Math.min(100, subtotal))}</span>
              </div>
            </div>
            <button
              type="submit"
              form="checkout-form"
              className="btn btn-primary w-full"
              disabled={!valid || busy || !liveSlotsReady}
            >
              {busy ? (
                t(language, 'placing')
              ) : (
                <>
                  <Truck size={18} />
                  {t(language, 'placeOrder')}
                </>
              )}
            </button>
            <p className="flex justify-center gap-1 text-xs text-base-content/60">
              <ShieldCheck size={14} />
              {t(language, 'secure')}
            </p>
          </div>
        )}
      </aside>
    </div>
  );
};
