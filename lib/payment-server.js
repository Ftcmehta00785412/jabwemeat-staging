import Razorpay from 'razorpay';
import { createClient } from '@supabase/supabase-js';
import { PaymentError, createPaymentHandlers } from './payment-core.js';

export function paymentConfiguration(env = process.env) {
  const keyId = env.RAZORPAY_KEY_ID || '', secret = env.RAZORPAY_KEY_SECRET || '';
  return { keyId, secret, enabled: env.RAZORPAY_TEST_ENABLED === 'true' && /^rzp_test_[A-Za-z0-9]+$/.test(keyId) && secret.length > 0 };
}
function supabaseClient(token) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://hiawziqkajvxketwsdqp.supabase.co';
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_UsUmxiKAWj6-D7MgOF9AUw_Kf7xbh-F';
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { headers: { Authorization: `Bearer ${token}` }, fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(12000) }) } });
}
async function authorize(req) {
  const authorization = req.headers.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ') || authorization.length > 10000) throw new PaymentError(401, 'Sign in to the admin dashboard before testing payments.');
  const token = authorization.slice(7), db = supabaseClient(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data?.user) throw new PaymentError(401, 'Your sign-in session has expired. Sign in again.');
  const role = await db.rpc('is_admin');
  if (role.error || role.data !== true) throw new PaymentError(403, 'Payment testing is restricted to an administrator.');
  return { user: data.user, db };
}
function readBody(req) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.toLowerCase().startsWith('application/json')) throw new PaymentError(415, 'Send application/json.');
  let body = req.body;
  if (Buffer.isBuffer(body)) body = body.toString('utf8');
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > 16384) throw new PaymentError(413, 'Request is too large.');
    try { body = JSON.parse(body); } catch { throw new PaymentError(400, 'Invalid JSON request.'); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new PaymentError(400, 'A JSON object is required.');
  if (Buffer.byteLength(JSON.stringify(body)) > 16384) throw new PaymentError(413, 'Request is too large.');
  return body;
}
export function paymentEndpoint(action, overrides = {}) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed.' }); }
    try {
      // Reject browser calls from a different origin; no wildcard CORS is allowed.
      if (req.headers.origin) {
        const expected = `https://${req.headers.host}`;
        const origin = req.headers.origin;
        if (origin !== expected && !(process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(origin))) throw new PaymentError(403, 'Cross-origin payment requests are not allowed.');
      }
      const configuration = (overrides.configuration || paymentConfiguration)();
      if (!configuration.enabled) throw new PaymentError(503, 'Test payments are not configured. No money has been collected.');
      const body = readBody(req);
      const { user, db } = await (overrides.authorize || authorize)(req);
      const razorpay = overrides.razorpay || new Razorpay({ key_id: configuration.keyId, key_secret: configuration.secret });
      const products = overrides.products || (async ids => {
        const { data, error } = await db.from('products').select('id,price,stock,active').in('id', ids);
        if (error) throw new PaymentError(500, 'Could not validate the catalogue. Please try again.');
        return data || [];
      });
      const result = await createPaymentHandlers({ razorpay, products, keyId: configuration.keyId, secret: configuration.secret })[action](body, user);
      return res.status(result.status === 'pending' ? 202 : 200).json(result);
    } catch (error) {
      if (error instanceof PaymentError) return res.status(error.status).json({ error: error.message });
      if (Number(error?.statusCode) === 401 || Number(error?.statusCode) === 403) return res.status(401).json({ error: 'Razorpay authentication failed. Check the server test credentials.' });
      // Do not echo SDK errors: they may include credentials or request metadata.
      return res.status(500).json({ error: 'The payment provider could not complete the request. Check Razorpay before retrying to avoid duplicate attempts.' });
    }
  };
}
