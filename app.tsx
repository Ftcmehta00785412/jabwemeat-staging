import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { User } from '@supabase/supabase-js';
import { AccountPanel } from './components/AccountPanel';
import { supabase } from './supabase';
import './storefront/theme.css';
import './storefront/account.css';
import './auth/google.css';
import './storefront/store.js';

// The original, approved HTML theme owns the storefront; the existing account
// component retains the same Supabase sign-in flow. Admin remains a separate app.
function AccountBridge() {
  const [open,setOpen]=useState(()=>new URLSearchParams(window.location.search).get('account')==='1'||new URLSearchParams(window.location.hash.slice(1)).has('error'));
  const [user,setUser]=useState<User|null>(null);
  useEffect(()=>{
    const show=()=>setOpen(true);
    window.addEventListener('jwm:account',show);
    supabase.auth.getSession().then(({data})=>setUser(data.session?.user||null));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>setUser(session?.user||null));
    return ()=>{window.removeEventListener('jwm:account',show);subscription.unsubscribe();};
  },[]);
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement as HTMLElement|null;
    document.body.classList.add('modal-open');
    const timer=window.setTimeout(()=>document.querySelector<HTMLInputElement>('.account-panel input')?.focus(),0);
    const keys=(event:KeyboardEvent)=>{
      if(event.key==='Escape')setOpen(false);
      if(event.key!=='Tab')return;
      const focusable=Array.from(document.querySelectorAll<HTMLElement>('.account-panel button:not(:disabled), .account-panel input:not(:disabled)'));
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    document.addEventListener('keydown',keys);
    return ()=>{window.clearTimeout(timer);document.removeEventListener('keydown',keys);document.body.classList.remove('modal-open');previous?.focus({preventScroll:true});};
  },[open]);
  return <AccountPanel open={open} user={user} onClose={()=>setOpen(false)} onSignedOut={()=>setOpen(false)} />;
}
createRoot(document.getElementById('account-root')!).render(<AccountBridge/>);
