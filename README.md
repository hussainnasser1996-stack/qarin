# Qarin (قارن): electronics price comparison for the GCC

Live site: **https://qarin.vercel.app**. It compares the same electronics product across stores in Bahrain, UAE, Saudi Arabia, Kuwait, Qatar and Oman, with daily price history, a deal verdict, cross-GCC comparison and email price alerts.

## How it works
```
GitHub Actions (daily 01:00 Gulf) → crawler/ (Python) → Neon Postgres ← web/ (Next.js 16 on Vercel)
```
1. **discover**: reads each store's public sitemap and stores candidate product URLs (`store_urls`).
2. **crawl**: fetches product pages politely and reads the schema.org data stores publish for Google (JSON-LD or microdata). The crawler:
   - obeys robots.txt and Crawl-delay
   - uses an honest user agent
   - never gets around a block
3. **match**: groups offers into products by an identity key (brand + model family + storage), then by GTIN. Accessories and bundles never merge with devices. See `crawler/qarin/normalize.py`; its tests are in `crawler/tests/`.
4. **alerts**: emails verified alerts through Resend when the price reaches the target.
5. **revalidate**: tells the website to refresh its cached pages.

## Run locally
```bash
python3 -m venv .venv && .venv/bin/pip install -r crawler/requirements.txt
cd crawler
../.venv/bin/python -m qarin.run migrate        # schema + stores (DATABASE_URL from web/.env.local)
../.venv/bin/python -m qarin.run discover --store jarir-bh
../.venv/bin/python -m qarin.run crawl --store jarir-bh --minutes 10
../.venv/bin/python -m qarin.run match
../.venv/bin/python -m pytest -q
cd ../web && npm install && npm run dev            # http://localhost:3000/bh/ar
```
`./crawl_local.sh 60` crawls every store from this Mac, one process per host, 60 minutes each.

## Deploy
- **Vercel project:** `qarin`, linked from `web/` (see `web/.vercel/project.json`). Deploy with `cd web && vercel deploy --prod --yes`.
- **Vercel env vars:**
  - `DATABASE_URL` (Neon integration)
  - `REVALIDATE_SECRET`
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`
  - `NEXT_PUBLIC_SITE_URL`
  - Optional, for alerts: `RESEND_API_KEY` and `ALERT_FROM`
- **GitHub secrets:**
  - `DATABASE_URL`
  - `REVALIDATE_SECRET`
  - Optional: `RESEND_API_KEY` and `ALERT_FROM`
- **Admin:** `/admin`. The password is in `~/tools/keys/qarin-admin-password.txt`.

## Adding a store
Add a `Store(...)` entry in `crawler/qarin/stores.py` with its sitemap, product URL pattern and adapter. Save one product page to `crawler/tests/fixtures/<id>.html` and add it to `test_adapters.py`. Run `migrate` to register it, then add it to the matrix in `.github/workflows/crawl.yml`, keeping one job per host.

## Not covered yet (needs a partnership or feed)
- Amazon.ae/.sa: Associates API
- Noon: affiliate program
- Carrefour
- Lulu: no price in its page data
- Virgin: blocks crawlers
- Emax
- Blink
- Tamkeen
- Eureka: sitemap not found yet
