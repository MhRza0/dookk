# DOOK BOUTIQUE

## DOOK application

The original brief is implemented as a Persian RTL menswear storefront with a separate administrative surface. UI lives in `app/store.tsx` and `app/admin.tsx`; shared domain types/defaults in `lib/catalog.ts`; D1 schema in `db/schema.ts`; prepared SQL queries and identity checks in `lib/server.ts`; API routes in `app/api/[...path]/route.ts`; payment adapter boundary in `lib/payments.ts`.

### Routes
Home `/`; shop `/shop`; category `/category/<name>`; product `/product/<id>`; search `/search?q=...`; cart `/cart`; checkout `/checkout`; payment `/payment/<order-id>`; result `/order-success/<order-id>`; tracking `/tracking`; administration `/admin`, `/admin/products`, `/admin/inventory`, `/admin/orders`, `/admin/customers`, `/admin/settings`.

### Persistence and inventory
D1 stores products, categories, variants, carts, orders, snapshots of order items, payment attempts, inventory adjustments, admin identity, settings, and a coupon extension table. Product and variant deletes are soft archival where order history must be preserved. R2 stores uploaded JPEG/PNG/WebP files. Carts use an opaque HttpOnly SameSite cookie; order detail and mock payment routes enforce that cart owner. Public tracking requires an unpredictable order ID plus mobile number and returns no address. All amounts are integer TOMAN; structured data converts to IRR.

Order creation uses a D1 transaction with prepared conditional stock decrements, a nonnegative stock constraint, and a current price/active-product check. The whole order rolls back on insufficient stock, including under concurrent attempts. Cancellation restores inventory once through guarded refund statements in the same atomic batch as its status change. Pending mock reservations expire after 30 minutes and are released on subsequent API activity. A client idempotency UUID prevents duplicate checkout submissions. Admin inventory changes use a stock comparison to reject stale edits.

### Administrator
Production uses platform-provided ChatGPT identity. Every administrative API checks its explicit admin role. The one-time setup form requires a signed-in user plus the secret `ADMIN_SETUP_KEY`, configured as a hosted secret. Only one admin binding can be established. Never ship a shared hard-coded admin password, test user, or trust a client role. The platform must continue to strip/replace its authentication headers at the public boundary. Local integration tests inject identity fixtures only into disposable local D1 data and remove them afterward.

### Before real sales
This is a functional pre-launch implementation. Online and Snapp Pay adapters are MOCK ONLY and never collect money or card details. Real merchant credentials, signed server callbacks, amount/provider verification, refunds and operational reconciliation must be implemented and tested against the chosen providers before enabling real transactions. Shipping prices, size chart, materials, returns policy, contact details, stock, prices and all product photography are illustrative defaults awaiting the boutique owner's confirmation. An original logo was not attached; current brand text is replaceable without altering an original logo. Native Sites publication is private for owner review; a public storefront requires an explicit audience change and a merchant go-live review.

### Validation
`python tests/api_smoke.py` against the locally running built Worker checks persistent cart behavior, out-of-stock rejection, validation, two simultaneous attempts for the last unit, rollback, cancellation recovery, mock payment idempotency, tracking privacy, admin rejection and cross-origin rejection. `tests/admin_smoke.py` checks admin editing, archive/reactivate, stale stock conflicts, shipping settings, order status/cancellation, and R2 image upload/read. Test only disposable local databases. These scripts create test orders and are not production maintenance commands. Browser QA covers desktop and mobile storefront, variant selection, cart, checkout, simulated success, and filters. `tsc --noEmit` checks application types.

### Remaining QA limit
The optional WebMCP search tool was implemented but runtime validation was unavailable after the supervised browser preview stopped. Main storefront browser tests completed before that interruption; admin management was validated through authenticated local integration tests. No production payment integration or live merchant operations were tested.
