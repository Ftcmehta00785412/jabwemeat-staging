import { paymentConfiguration } from '../lib/payment-server.js';
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Method not allowed.' }); }
  // No secret or credential value is ever returned by the readiness endpoint.
  return res.status(200).json({ enabled: paymentConfiguration().enabled, mode: 'test', admin_only: true, store_orders_enabled: false });
}
