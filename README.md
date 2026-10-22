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

The connected staging database was reported inactive during setup. Restore it before testing authentication, orders or real-time inventory. Existing migrations are preserved and are not automatically applied by the frontend build. Do not re-run migrations without checking the database history.

While live data is unavailable, a prominent preview notice labels the sample catalogue, and checkout is disabled. Admin sign-in remains access-controlled. Loading the login page does not mean authentication or database operations have been verified. Frontend styling is compiled at build time, rather than downloaded from a runtime CSS/JavaScript CDN.

## Design reference

The requested Pinterest video could not be inspected. This update preserves the supplied repository's design; it does not claim to match that video. Supply screenshots or the video, or approve browser inspection, for a separate design pass.

## Next launch steps

Restore and audit staging; test product edits, login and COD order lifecycle; verify inventory and slot limits; approve actual imagery, business details and policies; then configure the final domain and production environment. Add online payments only after server-side payment verification is ready.
