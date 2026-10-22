# Razorpay payment setup — not activated

The branded `/checkout/` page is a non-transactional preview. Razorpay is not connected. No SDK is loaded, no card information or delivery address is collected, and no order or payment is created. Displayed methods are planned, not a claim of account activation. The UI cannot be enabled by adding a public key alone.

## Next implementation gate

1. Owner confirms access to a Razorpay account and generates **test-mode** API credentials. Add credentials only to server-side Vercel environment variables, never chat, GitHub, browser code or `VITE_*` values. Use `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; establish a separate `RAZORPAY_WEBHOOK_SECRET` when creating a webhook. Restrict credentials to the intended deployment environments. Do not add live keys yet.
2. Implement authenticated server-side checkout: reprice catalogue IDs against the database; validate active products, aggregate stock, serviceable PINs, delivery capacity, approved fees and tax; reserve stock and save pending orders atomically with idempotency and retry safeguards.
3. Create a Razorpay order server-side using the saved final payable amount in integer paise. Store the Razorpay order ID against the internal pending order before checkout can open. Never trust browser-supplied totals.
4. Load Razorpay hosted Checkout only after explicit payment intent. Verify response HMAC using the stored server order ID and server secret. Fetch payment status server-side; validate captured status, order ID, currency and amount before marking the order paid. Browser success callbacks alone never establish payment.
5. Verify webhooks against the raw request body with the webhook secret; deduplicate events; handle out-of-order events, failed/dismissed/pending payments, stock-release timeouts, refunds, reconciliation and retry recovery. Never fulfil unpaid or merely authorized payments.
6. Test success, failure, cancellation, duplicates, amount tampering and webhook retries in test mode. Review data permissions, shipping/refund/privacy/terms policies and business activation before separately approving live payments.

Preview bag handoff stores product IDs, pack indices and quantities in tab-local session storage, not customer details or payment data. Clear the preview handoff on return to the menu. Database catalogue reads still control the displayed subtotal, but are not a server-authorized payment quote.
