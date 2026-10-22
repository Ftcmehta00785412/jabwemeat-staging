import { createServer } from 'node:http';
import createOrder from '../api/create-order.js';
import verifyPayment from '../api/verify-payment.js';
import paymentConfig from '../api/payment-config.js';
const handlers = { '/api/create-order': createOrder, '/api/verify-payment': verifyPayment, '/api/payment-config': paymentConfig };
createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
  const handler = handlers[new URL(req.url, 'http://localhost').pathname];
  if (!handler) return res.status(404).json({ error: 'Not found.' });
  try {
    let length = 0; const chunks = [];
    for await (const chunk of req) {
      length += chunk.length;
      if (length > 16384) return res.status(413).json({ error: 'Request is too large.' });
      chunks.push(chunk);
    }
    req.body = Buffer.concat(chunks).toString('utf8');
    await handler(req, res);
  } catch { if (!res.writableEnded) res.status(500).json({ error: 'Could not process the request.' }); }
}).listen(3001, '127.0.0.1', () => console.log('Local payment API: http://127.0.0.1:3001 (test mode only)'));
