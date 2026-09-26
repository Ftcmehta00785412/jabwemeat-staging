import React, { useState } from 'react';
import { ArrowLeft, Mail, UserRound, X } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { Language } from '../types';
import { t } from '../i18n';

type Props = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSignedOut: () => void;
  language?: Language;
};

export const AccountPanel: React.FC<Props> = ({
  open,
  user,
  onClose,
  onSignedOut,
  language = 'en'
}) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  if (!open) return null;

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^\S+@\S+\.\S+$/.test(normalized)) {
      setError(t(language, 'validEmail'));
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: false }
    });
    setBusy(false);
    if (sendError) {
      setError(sendError.message);
      return;
    }
    setEmail(normalized);
    setStep('otp');
    setNotice(t(language, 'codeSent'));
  };

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.trim();
    if (!/^\d{6}$/.test(token)) {
      setError(t(language, 'code'));
      return;
    }
    setBusy(true);
    setError('');
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.message);
      return;
    }
    setNotice(t(language, 'signedIn'));
    setOtp('');
  };

  const signOut = async () => {
    setBusy(true);
    setError('');
    const { error: signOutError } = await supabase.auth.signOut();
    setBusy(false);
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    onSignedOut();
  };

  return (
    <div
      className="account-backdrop"
      role="presentation"
      onMouseDown={e => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <section
        className="account-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
      >
        <button className="account-close" onClick={onClose} aria-label="Close account">
          <X />
        </button>
        <div className="account-icon">
          <UserRound />
        </div>
        <span className="account-eyebrow">{t(language, 'yourAccount')}</span>
        <h2 id="account-title">{user ? t(language, 'welcomeBack') : t(language, 'signIn')}</h2>
        {user ? (
          <>
            <p className="account-email">
              <Mail /> {user.email}
            </p>
            <p className="account-copy">{t(language, 'accountReady')}</p>
            <button className="account-submit" onClick={signOut} disabled={busy}>
              {busy ? t(language, 'signOut') + '…' : t(language, 'signOut')}
            </button>
          </>
        ) : step === 'email' ? (
          <form onSubmit={requestOtp}>
            <p className="account-copy">{t(language, 'accountCopy')}</p>
            <label>
              {t(language, 'emailAddress')}
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={busy}
              />
            </label>
            {error && (
              <p className="account-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="account-notice" role="status">
                {notice}
              </p>
            )}
            <button className="account-submit" disabled={busy}>
              {busy ? t(language, 'sending') : t(language, 'sendCode')}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <p className="account-copy">
              {t(language, 'codePrompt')} <b>{email}</b>.
            </p>
            <label>
              {t(language, 'code')}
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                disabled={busy}
              />
            </label>
            {error && (
              <p className="account-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="account-notice" role="status">
                {notice}
              </p>
            )}
            <button className="account-submit" disabled={busy}>
              {busy ? t(language, 'verifying') : t(language, 'verify')}
            </button>
            <button
              type="button"
              className="account-back"
              onClick={() => {
                setStep('email');
                setError('');
                setNotice('');
              }}
              disabled={busy}
            >
              <ArrowLeft /> {t(language, 'differentEmail')}
            </button>
          </form>
        )}
      </section>
    </div>
  );
};
