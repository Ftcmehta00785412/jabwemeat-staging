import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../supabase';

// Fixed same-origin destinations: never accept arbitrary return URLs.
export async function signInWithGoogle(area: 'customer' | 'admin') {
  const settingsResponse = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(10000), cache: 'no-store'
  });
  if (!settingsResponse.ok) throw new Error('Could not check Google sign-in availability. Please try again.');
  const settings = await settingsResponse.json();
  if (settings.external?.google !== true) throw new Error('Google sign-in is awaiting activation. Please use email sign-in for now.');
  const redirectTo = new URL(area === 'admin' ? '/admin-dashboard/' : '/?account=1', window.location.origin).href;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, queryParams: { prompt: 'select_account' } }
  });
  if (error) throw new Error(/provider|not enabled|unsupported/i.test(error.message)
    ? 'Google sign-in is awaiting activation. Please use email sign-in for now.'
    : 'Google sign-in could not start. Please try again or use email.');
}

export function googleReturnError() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  if (!query.has('error') && !query.has('error_description') && !hash.has('error') && !hash.has('error_description')) return '';
  // Never display raw provider messages or leave error details in the address bar.
  query.delete('error'); query.delete('error_description'); query.delete('error_code');
  window.history.replaceState(null, '', window.location.pathname + (query.size ? `?${query}` : ''));
  return 'Sign-in was cancelled or could not be completed. Please try again.';
}
