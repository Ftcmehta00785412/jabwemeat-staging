import { createClient } from '@supabase/supabase-js';

// Browser-safe configuration only. Never put service-role or secret keys here.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hiawziqkajvxketwsdqp.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UsUmxiKAWj6-D7MgOF9AUw_Kf7xbh-F';
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
