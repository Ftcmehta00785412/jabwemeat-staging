# JabWeMeat Google sign-in setup

Code supports customer registration and approved-team admin sign-in through Supabase OAuth. It does not grant administrator privileges to new users. Existing database access policies and the server's `is_admin` checks remain required and unchanged. Customer orders and real payments remain disabled.

## Required account configuration

1. In Google Cloud / Google Auth Platform, choose a project and configure branding and audience. Use actual business contact information and published privacy/terms URLs. Choose External for public customers. If the consent application remains in Testing, explicitly add intended test users; it is not ready for general customer access.
2. Create an OAuth client of type Web application. Authorized JavaScript origin: `https://jabwemeat.com`. Authorized redirect URI (exact): `https://hiawziqkajvxketwsdqp.supabase.co/auth/v1/callback`.
3. In Supabase project `hiawziqkajvxketwsdqp`, Authentication → Sign In / Providers → Google, enable Google and enter the client ID and client secret from that same Google client. Save. Keep the secret in Supabase only, never in browser code or GitHub.
4. Authentication → URL Configuration: Site URL `https://jabwemeat.com`. Add exact Redirect URLs `https://jabwemeat.com/` and `https://jabwemeat.com/?account=1` and `https://jabwemeat.com/admin-dashboard/`. Allow new user signups for customer registration. Do not disable email verification or admin access policies.
5. Test customer access with a new Google account, returning to `jabwemeat.com`. Confirm that the account cannot access admin or administrator-only payment testing.
6. Test the existing administrator with the Google account whose email matches the approved active team record. Email login remains available for accounts without Google. Confirm actual dashboard access, not only successful Google authentication.
7. Test cancellation, disabled-provider feedback, mobile layout, reload persistence and sign-out. Existing same-email accounts should be checked for expected identity linking; do not automatically promote users or manually merge identities without verifying ownership.

Google OAuth does not normally have a per-sign-in messaging fee. Hosting/database quotas and optional paid Google Cloud services are separate. WhatsApp/SMS are not used. Email backup remains subject to the email provider's rate limits and current template: the UI accepts an email link or a code rather than promising code-only delivery.

Google provider activation and a complete real-account sign-in test must be confirmed separately from a successful build or deployment.
