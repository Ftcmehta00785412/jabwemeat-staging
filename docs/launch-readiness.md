# JabWeMeat — launch implementation tracker

Updated 22 October 2026. The existing website is being improved in place. A deployed interface is not evidence of production commerce readiness.

## Release boundaries

- Keep public ordering closed and Razorpay restricted to test mode until end-to-end testing and business approval.
- Retain a clear pre-launch notice. Do not remove staging qualifications from unapproved catalogue data.
- Do not fabricate product photography, sourcing claims, licences, reviews, ratings, delivery promises or order confirmations.
- Do not enable analytics or marketing collection without the chosen account, accurate privacy notice and applicable consent controls.
- No DNS, email routing or payment credentials are changed by this storefront refresh.

## Implementation sequence

| Workstream | Next acceptance check | Required evidence/input |
| --- | --- | --- |
| Homepage, navigation, categories | Exact approved headline; usable category links, search, sorting, pincode form, cart and mobile controls | Interface and browser checks |
| Catalogue | Every retail SKU has approved title, pack, price, stock and product disclosures | Owner-approved catalogue and accurate product photos |
| Delivery | Pincode-specific fees, minimum order, lead time and capacity-controlled slots | Approved service area, charge/tax rules, hours and slot capacities |
| Account access | Real customer Google login and controlled admin access on custom domain | Google OAuth client/provider setup; rate-limit resolution |
| Orders and stock | Server-authoritative totals, atomic stock reservation, idempotent order creation, protected customer/admin reads | Database security and authenticated lifecycle tests |
| Payments — deferred | Fresh Razorpay test succeeds; invalid signatures, failure, cancellation, retries and unavailable stock handled safely | Resolve observed Razorpay 401; actual end-to-end test evidence |
| Fulfilment | Accurate tracking, notifications, cancellations and refunds | Operational workflow and communication provider |
| Legal and trust | Published facts match actual operating business; policies cover actual practices | Legal name, business address, registration/GST where applicable, FSSAI details, contact/grievance channel, approved policy rules |
| SEO and measurement | Accurate metadata; schema matches approved visible products; no fake aggregate ratings; analytics tested | Approved catalogue, public launch approval, analytics property and privacy/consent decisions |
| Launch | A real supported customer journey passes on desktop/mobile; owner authorises real orders | Final checklist, production payment approval and fulfilment readiness |

## Required product information

For each SKU: actual name/category, description, pack/net weight, cut type, bone-in/boneless where applicable, chilled/frozen status, selling price and applicable tax treatment, available stock, approved photograph, sourcing/handling details, storage and shelf-life instructions. Ready-to-cook products additionally need ingredients, allergens/cross-contact information and cooking instructions. Do not infer these from an image or category.

Existing repository images are generated illustrations or inherited stock photographs, not verified inventory photography. Neutral photo-pending artwork is safer until actual images are supplied. Do not describe replacements as real product photos until verified.

## Required delivery information

Approved serviceable pincodes; delivery charges and free-delivery thresholds; minimum order; delivery estimates/cut-offs; operating days; slot capacity and holidays; failed-delivery process. Configured staging pincodes and slot labels are not proof of operational serviceability or reservable capacity.

## Support and email dependencies

The desired support address is support@jabwemeat.com, forwarding to vinay@manthanworld.com. An ImprovMX alias was configured by the owner, but DNS verification and actual delivery have not been confirmed. Do not present it as operational until tested. Forwarding alone does not make the address eligible for Google's OAuth support-email dropdown.

## Deliberately withheld

- No fabricated bestseller label, customer review or star rating.
- No live-payment activation, delivery order creation or stock mutation as part of the visual refresh.
- No promise of chilled/frozen status, product certification, sourcing or delivery time without supplied facts.
- No final legal policy claimed complete from placeholder copy.
- No launch-notification signup that silently discards submissions; collecting contacts needs a working protected storage/notification path and privacy notice.

## First owner input after interface review

Supply the current real product catalogue and photographs. Start with one approved Chicken SKU so the product-information format can be checked before completing all products.
