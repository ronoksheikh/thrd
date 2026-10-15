# THREAD HOUSE — সোয়েটশার্ট স্টোর

A one-product sweatshirt store (fully in Bangla) that runs entirely on **Cloudflare**: Workers + static assets + **D1** (SQLite).

- **Storefront** (`/`): photos → choose a combo (৩টি ৳১৭০০ / ২টি ৳১৩০০ free delivery, ১টি ৳৭০০ + delivery) → colour and size for each piece → name, phone, address → order. There is no cart and no extra step.
- **Admin** (`/admin/`): sign in with a password. You can see today's orders, sales and pieces, filter by status, search by phone, name or order number, call or WhatsApp the customer, change status, add notes, delete orders and export to CSV for courier upload. New orders show up automatically every 60 seconds.
- **Meta Pixel + Conversions API**: PageView, ViewContent, AddToCart, InitiateCheckout and Purchase are sent from both the browser and the server with shared `event_id`s, so Meta removes the duplicates. Purchase sends a hashed phone number and name, plus `fbp`/`fbc` cookies, the IP and the user agent, for strong match quality.
- **Fast**: the homepage HTML and critical CSS are prerendered at build time, so the page paints before any JS runs. The Anek Bangla font is self-hosted and preloaded (only weights 400 and 700). The pixel loads only after the page is idle. The admin bundle is never loaded on the store.
- **Price safety**: the server recalculates every price from `src/shared/product.ts`, so the browser never decides the price.

## Edit products / prices

Everything is in **`src/shared/product.ts`**: colours, sizes, combo prices, the delivery charge (`DELIVERY_CHARGE`, now ৳100 for single pieces) and photos.

Product photos go in `public/products/`. Each colour has `<id>.webp` (800×960) and `<id>-thumb.webp` (160×192); the gallery is built from `COLORS` automatically. A photo with a `color` set is shown automatically when the customer picks that colour. `public/og.jpg` is the Facebook link-preview image.

## First-time deploy

```bash
npm install
npx wrangler login
npx wrangler d1 create thread-house          # copy the database_id into wrangler.jsonc
npx wrangler secret put ADMIN_PASSWORD       # admin panel password
npx wrangler secret put META_CAPI_TOKEN      # Events Manager → Settings → Conversions API → Generate token
# set META_PIXEL_ID in wrangler.jsonc "vars"
npm run deploy                               # builds, runs D1 migrations, deploys
```

Then add your domain under Workers → thread-house → Settings → Domains & Routes.

To test CAPI, set `META_TEST_EVENT_CODE` (`npx wrangler secret put META_TEST_EVENT_CODE`) to the code from Events Manager → Test events. Delete it afterwards. If a Purchase event fails, the admin panel shows the CAPI error under that order.

## Local development

```bash
echo "ADMIN_PASSWORD=test1234" > .dev.vars
npm run db:migrate:local
npm run preview            # production build served by wrangler at http://localhost:8787
# or, for hot reload: `npm run dev:api` (after a build) + `npm run dev` in another terminal
```

## Structure

```
src/shared/      product config, validation, statuses (used by browser AND worker)
src/store/       storefront (prerendered + hydrated)
src/admin/       admin panel
worker/          Cloudflare Worker: /api/orders, /api/track (CAPI), /api/admin/*
migrations/      D1 schema
scripts/         prerender + placeholder image generator
```
