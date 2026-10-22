import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createPaymentHandlers, signatureMatches, validateItems, priceItems } from '../lib/payment-core.js';
import { paymentEndpoint, paymentConfiguration } from '../lib/payment-server.js';
import configEndpoint from '../api/payment-config.js';
const user = { id: 'test-admin' }, secret = 'synthetic-unit-test-secret';
const product = { id: '11111111-1111-4111-8111-111111111111', active: true, stock: 5, price: '179.00' };
const items = [{ id: product.id, pack: 0, quantity: 2 }];
function fixture(options = {}) {
  const order = { id: 'order_UnitTest', amount: 35800, currency: 'INR', status: 'created', notes: { jwm_user_id: user.id, jwm_scope: 'admin_test_checkout' }, ...options.order };
  const payment = { id: 'pay_UnitTest', order_id: order.id, amount: order.amount, currency: 'INR', captured: true, status: 'captured', amount_refunded: 0, ...options.payment };
  const calls = [];
  const razorpay = { orders: { create: async input => { calls.push(input); return { ...order, ...input }; }, fetch: async () => order }, payments: { fetch: async () => payment } };
  const services = { products: async () => [product], razorpay, keyId: 'rzp_test_Synthetic', secret };
  const signature = createHmac('sha256', secret).update(`${order.id}|${payment.id}`).digest('hex');
  return { handlers: createPaymentHandlers(services), services, calls, order, payment, body: { razorpay_order_id: order.id, razorpay_payment_id: payment.id, razorpay_signature: signature } };
}
test('creates a server-priced Razorpay order in paise', async () => {
  const f = fixture(), result = await f.handlers.create({ items }, user);
  assert.equal(result.amount, 35800); assert.equal(result.mode, 'test'); assert.equal(f.calls[0].currency, 'INR');
  assert.match(f.calls[0].receipt, /^jwm_[a-f0-9]{32}$/); assert.equal(f.calls[0].notes.jwm_user_id, user.id);
});
test('rejects client amount and unsupported currency', async () => {
  const f = fixture();
  await assert.rejects(f.handlers.create({ items, amount: 100 }, user), e => e.status === 400);
  await assert.rejects(f.handlers.create({ items, currency: 'USD' }, user), e => e.status === 400);
  assert.equal(f.calls.length, 0);
});
test('rejects malformed items, fractional quantities, duplicate aggregate limits and stock', () => {
  for (const input of [[], null, [{ id: 'bad', pack: 0, quantity: 1 }], [{ ...items[0], quantity: 1.5 }], [{ ...items[0], pack: 1 }], [{ ...items[0], quantity: 6 }, { ...items[0], quantity: 6 }]]) assert.throws(() => validateItems(input));
  assert.throws(() => priceItems(validateItems([{ ...items[0], quantity: 6 }]), [product]), e => e.status === 409);
  assert.throws(() => priceItems(validateItems(items), [{ ...product, active: false }]), e => e.status === 409);
});
test('enforces 100-paise minimum and integer paise', () => {
  assert.throws(() => priceItems(validateItems([{ ...items[0], quantity: 1 }]), [{ ...product, price: '0.99' }]), e => e.status === 400);
  assert.equal(priceItems(validateItems([{ ...items[0], quantity: 1 }]), [{ ...product, price: '1.00' }]), 100);
});
test('reuses an existing unpaid order; blocks paid and changed-price orders', async () => {
  const f = fixture(); await f.handlers.create({ items, existing_order_id: f.order.id }, user); assert.equal(f.calls.length, 0);
  await assert.rejects(fixture({ order: { status: 'paid' } }).handlers.create({ items, existing_order_id: f.order.id }, user), e => e.status === 409);
  await assert.rejects(fixture({ order: { amount: 500 } }).handlers.create({ items, existing_order_id: f.order.id }, user), e => e.status === 409);
});
test('valid HMAC plus matching captured payment succeeds without creating a store order', async () => {
  const f = fixture(), result = await f.handlers.verify(f.body, user);
  assert.equal(result.success, true); assert.equal(result.store_order_created, false);
  assert.deepEqual(await f.handlers.verify(f.body, user), result); // repeat verification is read-only
});
test('signature mismatch, malformed signature and missing fields fail', async () => {
  const f = fixture();
  for (const signature of ['0'.repeat(64), 'short', 'g'.repeat(64)]) await assert.rejects(f.handlers.verify({ ...f.body, razorpay_signature: signature }, user), e => e.status === 400);
  await assert.rejects(f.handlers.verify({}, user), e => e.status === 400);
  assert.equal(signatureMatches('order_a', 'pay_a', undefined, secret), false);
});
test('another user cannot verify or reuse an order', async () => {
  const f = fixture();
  await assert.rejects(f.handlers.verify(f.body, { id: 'other-user' }), e => e.status === 403);
  await assert.rejects(f.handlers.create({ items, existing_order_id: f.order.id }, { id: 'other-user' }), e => e.status === 403);
});
test('wrong amount, currency, order association, refunds and failed payments never succeed', async () => {
  for (const payment of [{ amount: 1 }, { currency: 'USD' }, { order_id: 'order_Other' }, { amount_refunded: 1 }, { status: 'failed', captured: false }]) {
    const f = fixture({ payment }); await assert.rejects(f.handlers.verify(f.body, user), e => e.status === 400);
  }
});
test('authorized but not captured returns pending, never success', async () => {
  const f = fixture({ payment: { status: 'authorized', captured: false } });
  const result = await f.handlers.verify(f.body, user); assert.equal(result.success, false); assert.equal(result.status, 'pending');
});
function response() { return { headers: {}, setHeader(k,v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
const configuration = () => ({ enabled: true, keyId: 'rzp_test_Synthetic', secret });
const request = body => ({ method: 'POST', headers: { 'content-type': 'application/json', host: 'jabwemeat.com', origin: 'https://jabwemeat.com' }, body });
test('HTTP errors: method, origin, malformed body and disabled configuration', async () => {
  const handler = paymentEndpoint('create', { configuration });
  for (const [req, expected] of [[{ ...request({}), method: 'GET' },405], [{ ...request({}), headers: { ...request({}).headers, origin: 'https://attacker.invalid' } },403], [request('{bad'),400], [request([]),400], [{ ...request({}), headers: { host: 'jabwemeat.com' } },415]]) {
    const res=response(); await handler(req,res); assert.equal(res.code,expected);
  }
  const res=response(); await paymentEndpoint('create', { configuration: () => ({ enabled:false }) })(request({}),res); assert.equal(res.code,503);
});
test('missing session returns 401 without calling Razorpay', async () => {
  const res=response(); await paymentEndpoint('create', { configuration })(request({items}),res); assert.equal(res.code,401);
});
test('Razorpay auth failure is 401; SDK errors are sanitized', async () => {
  for (const error of [{ statusCode:401, error:{description:'sensitive'} }, { statusCode:500, error:{description:secret} }]) {
    const f=fixture(),res=response();f.services.razorpay.orders.create=async()=>{throw error;};
    await paymentEndpoint('create', { configuration, authorize:async()=>({user}), products:f.services.products, razorpay:f.services.razorpay })(request({items}),res);
    assert.equal(res.code,error.statusCode===401?401:500);assert(!JSON.stringify(res.body).includes(secret));assert(!JSON.stringify(res.body).includes('sensitive'));
  }
});
test('live keys are always blocked and readiness returns no credentials', () => {
  assert.equal(paymentConfiguration({ RAZORPAY_KEY_ID:'rzp_live_example', RAZORPAY_KEY_SECRET:secret, RAZORPAY_TEST_ENABLED:'true' }).enabled,false);
  assert.equal(paymentConfiguration({ RAZORPAY_KEY_ID:'rzp_test_example', RAZORPAY_KEY_SECRET:secret, RAZORPAY_TEST_ENABLED:'true' }).enabled,true);
  const res=response();configEndpoint({method:'GET'},res);assert.equal(res.code,200);assert(!('secret' in res.body));assert(!('key_id' in res.body));assert.equal(res.body.store_orders_enabled,false);
});
