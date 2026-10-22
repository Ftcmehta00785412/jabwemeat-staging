import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

export class PaymentError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const orderPattern = /^order_[A-Za-z0-9]{1,64}$/;
const paymentPattern = /^pay_[A-Za-z0-9]{1,64}$/;
export function validateItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw new PaymentError(400, 'Choose between 1 and 50 bag lines.');
  const quantities = new Map();
  for (const line of items) {
    if (!line || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(line.id) || line.pack !== 0 || !Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10) throw new PaymentError(400, 'Invalid product, pack or quantity.');
    const quantity = (quantities.get(line.id) || 0) + line.quantity;
    if (quantity > 10) throw new PaymentError(400, 'A maximum of 10 packs per product is allowed.');
    quantities.set(line.id, quantity);
  }
  return quantities;
}
export function priceItems(quantities, products) {
  let amount = 0;
  for (const [id, quantity] of quantities) {
    const product = products.find(row => row.id === id);
    if (!product || !product.active || !Number.isInteger(product.stock) || product.stock < quantity) throw new PaymentError(409, 'A product is unavailable or its stock has changed. Please review your bag.');
    // Prices are stored as numeric(10,2) rupees. Convert once at the server boundary.
    const unitAmount = Math.round(Number(product.price) * 100);
    if (!Number.isSafeInteger(unitAmount) || unitAmount < 0) throw new PaymentError(500, 'A product price is invalid.');
    amount += unitAmount * quantity;
  }
  if (!Number.isSafeInteger(amount) || amount < 100) throw new PaymentError(400, 'Minimum payment is 100 paise (₹1).');
  if (amount > 10000000) throw new PaymentError(400, 'Test payment exceeds the configured limit.');
  return amount;
}
function ownsOrder(order, user) {
  if (!order || order.notes?.jwm_user_id !== user.id || order.notes?.jwm_scope !== 'admin_test_checkout' || order.currency !== 'INR') throw new PaymentError(403, 'This test payment does not belong to your account.');
}
export function signatureMatches(orderId, paymentId, signature, secret) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
export function createPaymentHandlers(services) {
  return {
    async create(body, user) {
      if (body.currency !== undefined && body.currency !== 'INR') throw new PaymentError(400, 'Only INR is supported.');
      if (body.amount !== undefined) throw new PaymentError(400, 'Send product IDs and quantities, not a client-supplied amount.');
      const quantities = validateItems(body.items);
      const amount = priceItems(quantities, await services.products([...quantities.keys()]));
      let order;
      if (body.existing_order_id) {
        if (!orderPattern.test(body.existing_order_id)) throw new PaymentError(400, 'Invalid previous order ID.');
        order = await services.razorpay.orders.fetch(body.existing_order_id);
        ownsOrder(order, user);
        if (order.amount !== amount || order.currency !== 'INR') throw new PaymentError(409, 'Prices have changed. Clear the previous test and review your bag.');
        if (order.status === 'paid') throw new PaymentError(409, 'This test order is already paid. Do not pay again.');
      } else {
        order = await services.razorpay.orders.create({
          amount, currency: 'INR', receipt: `jwm_${randomUUID().replaceAll('-', '')}`,
          notes: { jwm_user_id: user.id, jwm_scope: 'admin_test_checkout' }
        });
      }
      if (!orderPattern.test(order.id) || order.amount !== amount || order.currency !== 'INR') throw new PaymentError(500, 'Payment provider returned an unexpected order.');
      return { order_id: order.id, amount: order.amount, currency: order.currency, key_id: services.keyId, mode: 'test' };
    },
    async verify(body, user) {
      const { razorpay_order_id: suppliedOrder, razorpay_payment_id: paymentId, razorpay_signature: signature } = body;
      if (typeof suppliedOrder !== 'string' || !orderPattern.test(suppliedOrder) || typeof paymentId !== 'string' || !paymentPattern.test(paymentId) || typeof signature !== 'string' || !signature) throw new PaymentError(400, 'Payment ID, order ID and signature are required.');
      // Fetch the trusted server-created order, then use that order ID for HMAC.
      const order = await services.razorpay.orders.fetch(suppliedOrder);
      ownsOrder(order, user);
      if (order.id !== suppliedOrder || !signatureMatches(order.id, paymentId, signature, services.secret)) throw new PaymentError(400, 'Payment signature does not match. Payment has not been confirmed.');
      const payment = await services.razorpay.payments.fetch(paymentId);
      if (payment.id !== paymentId || payment.order_id !== order.id || payment.amount !== order.amount || payment.currency !== order.currency || !Number.isSafeInteger(order.amount) || order.amount < 100) throw new PaymentError(400, 'Payment details do not match the server order.');
      if (payment.status === 'authorized' || payment.status === 'created') return { success: false, signature_verified: true, status: 'pending', order_id: order.id, payment_id: payment.id, message: 'Payment is not captured yet. Check Razorpay before retrying; do not pay twice.' };
      if (payment.status !== 'captured' || payment.captured !== true || Number(payment.amount_refunded || 0) !== 0) throw new PaymentError(400, 'Payment is not a captured, unrefunded payment.');
      // Test-only: never mark an existing COD/customer order paid or alter stock.
      return { success: true, signature_verified: true, status: 'captured', mode: 'test', order_id: order.id, payment_id: payment.id, amount: order.amount, currency: order.currency, store_order_created: false };
    }
  };
}
