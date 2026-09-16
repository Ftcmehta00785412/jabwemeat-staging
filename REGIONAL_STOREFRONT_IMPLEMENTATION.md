# Regional storefront phase

Implemented a small presentation-only regional storefront layer.

## Changes
- Added EN / हिन्दी / বাংলা toggle in the header (session-local React state).
- Added localized category labels and localized names/descriptions for representative chicken, bone-in mutton, and Bengali fish products; unknown live catalogue records safely fall back to their existing English fields.
- Added regional homepage rail for Bengali Fish Specials, bone-in mutton, Ranchi/Patna/Kolkata delivery messaging, and festival-ready seasonal content without dates or availability claims.
- Added prominent Cash on Delivery and local-kitchen trust copy; checkout/payment and delivery logic were not changed.
- No FSSAI number, facility certification, product stock, festival date, or unverified city serviceability was invented.

## Files changed
- `app.tsx`
- `types.ts`
- `components/Header.tsx`
- `components/Storefront.tsx`
- `components/ProductCard.tsx`
- `styles.css`
- `REGIONAL_STOREFRONT_IMPLEMENTATION.md`

## Validation
- TypeScript build could not run because repository dependencies are not installed; `npx tsc --noEmit` resolved to an unrelated placeholder package and failed before compilation.
- No PR or deployment was created.
