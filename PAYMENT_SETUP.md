# Razorpay Standard Checkout — administrator test mode

Implemented for the existing Vite/React site using Vercel Node serverless functions and the Razorpay SDK. No database tables or customer-order records are created. Existing commerce restrictions remain unchanged.

## Hosted setup

Rotate any secret shared in chat. In **Vercel → jabwemeat-staging → Settings → Environment Variables**, add:

- `RAZORPAY_KEY_ID`: test Key ID starting `rzp_test_`.
- `RAZORPAY_KEY_SECRET`: matching test secret; mark Sensitive.
- `RAZORPAY_TEST_ENABLED`: `true`.

Use Production for the custom-domain deployment, then redeploy. Never use `VITE_` for these credentials. Live keys are deliberately rejected. Supabase uses the existing public project configuration; deployments overriding it should configure matching server and browser settings.

## Test

1. Sign in at `/admin-dashboard/` as an administrator.
2. Open the storefront on the same domain and browser, add products, and choose **Review checkout**.
3. Click **Pay … · TEST MODE**. Use Razorpay’s current test-payment instructions, not real payment details.
4. Confirm the test receipt after server signature verification and captured-status checks. Test dismissal and failure too.
5. If verification is interrupted or pending, use **Recheck payment status**; do not pay again. Existing unpaid provider orders are reused on retry.

For local development: `npm ci`, then run `npm run dev:payments` and `npm run dev` in separate terminals. Visit `http://127.0.0.1:3000/`. The ignored `.env` is local-only; it is never committed. Run `npm run test:payments` for mocked server tests.

## Endpoints and limits

- `GET /api/payment-config`: readiness only; no credentials.
- `POST /api/create-order`: authenticated admin; product IDs/quantities; server prices and stock; minimum 100 paise; returns provider order, amount, currency and public Key ID.
- `POST /api/verify-payment`: authenticated owner; timing-safe HMAC check, provider-order association, amount/currency and captured/unrefunded status. Authorized-only payments remain pending.

**Not a production commerce launch:** no stock reservation, delivery booking, customer order, durable app payment ledger or webhook reconciliation. These and distributed abuse controls, approved charges/policies, capture configuration and end-to-end testing are required before enabling real customer payments. Automated tests use mocks, not actual Razorpay transactions.
