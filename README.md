# JabWeMeat staging

Storefront and authenticated admin dashboard, built together from source.

## Run locally

Install Node.js 22.12 or newer. From the repository folder:

```sh
git clone https://github.com/Ftcmehta00785412/jabwemeat-staging.git
cd jabwemeat-staging
npm ci
npm run dev
```

Keep the terminal open, then visit:

- Storefront: **http://localhost:3000/**
- Admin: **http://localhost:3000/admin-dashboard/**

Both are local addresses, not public websites. Save edits in `app.tsx`, `components/`, `styles.css` or `admin-dashboard/`; the browser updates automatically. Database edits are different: they require a running Supabase project and valid admin access. Never edit generated bundles.

For an existing checkout, commit or stash your local edits before `git pull --ff-only`. Skip the clone step if the folder is already on your computer. Local edits do not automatically publish to Vercel; commit and push them to GitHub when ready.

## Build and deploy

```sh
npm run typecheck
npm run test:branding
npm run build
npm run preview
```

Vercel builds the `dist` folder from this repository. Production-shaped local preview runs on port 4173, with the same storefront and admin paths.

## Database and security

Both applications share the existing JabWeMeat staging Supabase connection. `.env.example` documents optional browser-safe overrides. Never commit service-role keys, secret keys or passwords. Admin login and access checks remain in place; merely knowing the admin URL grants no access.

The existing staging database was restored on 22 October 2026 and reported `ACTIVE_HEALTHY`. Anonymous storefront reads of products, categories, delivery slots and settings were verified after applying `013_restore_public_catalogue_access.sql` (remote migration name: `restore_public_catalogue_access`). This splits anonymous active-catalogue reads from authenticated access policies without granting anonymous access to the admin helper or changing business records. Existing migrations are preserved and are not automatically applied by the frontend build. Do not re-run migrations without checking the database history.

While live data is unavailable, a prominent preview notice labels the sample catalogue, and checkout is disabled. Admin sign-in remains access-controlled. Loading the login page does not mean authentication or database operations have been verified. Frontend styling is compiled at build time, rather than downloaded from a runtime CSS/JavaScript CDN.

### Browse-only staging safety hold

Restoring the database does not open customer ordering. `STAGING_COMMERCE_ENABLED` remains false: catalogue reads and local cart testing work, but browser cart synchronisation and checkout are paused. Migration `014_staging_browse_only.sql` (staging only) also revokes guest and signed-in execution of `place_cod_order` and `save_cart`; hiding a button alone is not a security boundary. Trigger-only helpers no longer have unnecessary visitor execution grants. Existing order, payment, stock and customer records are preserved, and COD/payment settings are unchanged.

Before re-enabling commerce, add and test duplicate-submission protection, server-side slot-capacity/cutoff enforcement, input and cart-ownership validation, and guest-checkout abuse controls. Review the remaining authenticated-function warnings and [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Admin operations have server-side role checks; their existence is not an end-to-end security certification. Do not simply flip the frontend constant or restore database grants to bypass this review.

## Design reference

The requested Pinterest video could not be inspected. This update preserves the supplied repository's design; it does not claim to match that video. Supply screenshots or the video, or approve browser inspection, for a separate design pass.

## Next launch steps

Complete an authenticated admin sign-in and controlled COD order lifecycle test; test real-time product edits; review security-advisor warnings and guest-checkout abuse protections; verify inventory and slot limits; reconcile the database catalogue with intended products; approve actual imagery, business details and policies; then configure the final domain and production environment. Restoring the database does not certify the store for public ordering. Add online payments only after server-side payment verification is ready.
