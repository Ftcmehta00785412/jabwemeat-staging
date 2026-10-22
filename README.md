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

Both are local addresses, not public websites. The original JabWeMeat theme is now the storefront: edit `index.html` for page layout, `storefront/theme.css` for styling, and `storefront/store.js` for interactions. `storefront/catalogue.js` connects the existing staging database and subscribes to catalogue updates. `app.tsx` keeps the existing customer-account sign-in component connected. Admin source remains in `admin-dashboard/`. Local source edits update the browser automatically. Database edits require a running Supabase project and valid admin access. Never edit generated bundles.

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

The storefront reads live staging product names, prices, configured pack sizes, stock, categories, delivery windows and PIN-code settings. If data cannot be loaded, it shows an unavailable notice instead of substituting sample prices. Admin sign-in remains access-controlled. Loading the login page does not mean authentication or database operations have been verified. The original storefront theme has local fonts and images with no runtime CSS/JavaScript CDN.

### Browse-only staging safety hold

Restoring the database does not open customer ordering. The original-theme bag is held in memory in its tab and resets on reload. Its checkout is explicitly a non-transactional preview: it requests no delivery address, phone number or payment information. It never calls `place_cod_order` or `save_cart`; `STAGING_COMMERCE_ENABLED` also remains false for the retained legacy components. Migration `014_staging_browse_only.sql` (staging only) revokes guest and signed-in execution of those functions; hiding a button alone is not a security boundary. Trigger-only helpers no longer have unnecessary visitor execution grants. Existing order, payment, stock and customer records are preserved, and COD/payment settings are unchanged.

Before re-enabling commerce, add and test duplicate-submission protection, server-side slot-capacity/cutoff enforcement, input and cart-ownership validation, and guest-checkout abuse controls. Review the remaining authenticated-function warnings and [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Admin operations have server-side role checks; their existence is not an end-to-end security certification. Do not simply flip the frontend constant or restore database grants to bypass this review.

## Design reference

On 22 October 2026, the user explicitly selected the original JabWeMeat preview rather than the imported code's theme. The deployed storefront therefore restores the cream paper background, dark-green type, terracotta accents, serif wordmark, split hero, circular category art, product grid, story sections and shopping-bag interactions from that original design. Only catalogue-related copy and data are adapted to the existing Supabase staging project. The original food art is generated illustration and is labelled as such, not presented as verified inventory photography. Only database-configured packs are offered; extra sample pack sizes are not invented. Admin access checks and operations are retained, with a matching sign-in palette and an explicit explanation that no password is needed.

The separate Pinterest video has not been inspected, and this update does not claim to reproduce it. Existing English/Hindi/Bengali translation source is retained for future integration; the restored original-theme interface is currently English.

## Next launch steps

Complete an authenticated admin sign-in and controlled COD order lifecycle test; test real-time product edits; review security-advisor warnings and guest-checkout abuse protections; verify inventory and slot limits; reconcile the database catalogue with intended products; approve actual imagery, business details and policies; then configure the final domain and production environment. Restoring the database does not certify the store for public ordering. Add online payments only after server-side payment verification is ready.
