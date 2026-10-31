-- Qarin schema v1. Idempotent: safe to run more than once.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS countries (
  code        text PRIMARY KEY,               -- bh, ae, sa, kw, qa, om
  currency    text NOT NULL,
  vat         numeric NOT NULL,
  name_en     text NOT NULL,
  name_ar     text NOT NULL,
  decimals    int  NOT NULL DEFAULT 2,
  rate_to_usd numeric                           -- 1 unit of currency in USD (pegged currencies)
);

CREATE TABLE IF NOT EXISTS stores (
  id            text PRIMARY KEY,               -- e.g. sharafdg-bh
  country       text NOT NULL REFERENCES countries(code),
  name          text NOT NULL,
  domain        text NOT NULL,
  home          text,
  adapter       text NOT NULL,
  affiliate_tpl text,                           -- e.g. https://aff.example/?url={url}
  active        boolean NOT NULL DEFAULT true,
  notes         text
);

-- URLs discovered from sitemaps; drives the crawl queue.
CREATE TABLE IF NOT EXISTS store_urls (
  store_id     text NOT NULL REFERENCES stores(id),
  url          text NOT NULL,
  lastmod      text,
  first_seen   timestamptz NOT NULL DEFAULT now(),
  last_fetched timestamptz,
  status       int,
  kind         text,                            -- product | not_product | not_electronics | blocked | error
  priority     int NOT NULL DEFAULT 0,          -- higher = fetched sooner (matched/clicked products)
  PRIMARY KEY (store_id, url)
);
CREATE INDEX IF NOT EXISTS store_urls_due ON store_urls (store_id, kind, last_fetched NULLS FIRST);

CREATE TABLE IF NOT EXISTS products (
  id          bigserial PRIMARY KEY,
  key         text UNIQUE NOT NULL,             -- identity key, e.g. "apple iphone 17 pro 256gb"
  slug        text NOT NULL,
  name        text NOT NULL,
  brand       text,
  family      text,
  category    text,
  storage     text,
  image       text,
  gtins       text[] NOT NULL DEFAULT '{}',
  mpns        text[] NOT NULL DEFAULT '{}',
  search_norm text NOT NULL DEFAULT '',
  offer_count int NOT NULL DEFAULT 0,
  country_count int NOT NULL DEFAULT 0,
  popularity  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_search_trgm ON products USING gin (search_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_category ON products (category);
CREATE INDEX IF NOT EXISTS products_slug ON products (slug);

CREATE TABLE IF NOT EXISTS offers (
  id           bigserial PRIMARY KEY,
  store_id     text NOT NULL REFERENCES stores(id),
  url          text NOT NULL,
  product_id   bigint REFERENCES products(id) ON DELETE SET NULL,
  title        text NOT NULL,
  brand        text,
  category     text,
  is_accessory boolean NOT NULL DEFAULT false,
  price        numeric,
  currency     text,
  in_stock     boolean,
  gtin         text,
  mpn          text,
  sku          text,
  image        text,
  colour       text,
  storage      text,
  condition    text NOT NULL DEFAULT 'new',
  region       text,
  seller       text,
  match_key    text,
  match_method text,
  first_seen   timestamptz NOT NULL DEFAULT now(),
  last_seen    timestamptz NOT NULL DEFAULT now(),
  last_changed timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, url)
);
CREATE INDEX IF NOT EXISTS offers_product ON offers (product_id);
CREATE INDEX IF NOT EXISTS offers_key ON offers (match_key);
CREATE INDEX IF NOT EXISTS offers_gtin ON offers (gtin) WHERE gtin IS NOT NULL;

-- Written only when price or stock changes.
CREATE TABLE IF NOT EXISTS price_history (
  offer_id    bigint NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL DEFAULT now(),
  price       numeric,
  in_stock    boolean,
  PRIMARY KEY (offer_id, observed_at)
);

CREATE TABLE IF NOT EXISTS clicks (
  id        bigserial PRIMARY KEY,
  offer_id  bigint REFERENCES offers(id) ON DELETE SET NULL,
  store_id  text,
  ts        timestamptz NOT NULL DEFAULT now(),
  country   text,
  lang      text,
  referrer  text,
  ua_hash   text
);
CREATE INDEX IF NOT EXISTS clicks_ts ON clicks (ts);

CREATE TABLE IF NOT EXISTS alerts (
  id           bigserial PRIMARY KEY,
  email        text NOT NULL,
  product_id   bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  country      text NOT NULL,
  lang         text NOT NULL DEFAULT 'en',
  target_price numeric,
  token        text NOT NULL UNIQUE,
  verified_at  timestamptz,
  last_sent_at timestamptz,
  last_sent_price numeric,
  unsubscribed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, product_id, country)
);

CREATE TABLE IF NOT EXISTS merchant_leads (
  id         bigserial PRIMARY KEY,
  store_name text NOT NULL,
  website    text,
  country    text,
  contact    text NOT NULL,
  message    text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS problem_reports (
  id         bigserial PRIMARY KEY,
  product_id bigint REFERENCES products(id) ON DELETE CASCADE,
  offer_id   bigint REFERENCES offers(id) ON DELETE CASCADE,
  kind       text NOT NULL,                     -- wrong_product | wrong_price | out_of_stock | other
  note       text,
  resolved   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id            bigserial PRIMARY KEY,
  store_id      text NOT NULL REFERENCES stores(id),
  phase         text NOT NULL,                  -- discover | crawl
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  pages_ok      int NOT NULL DEFAULT 0,
  pages_blocked int NOT NULL DEFAULT 0,
  pages_error   int NOT NULL DEFAULT 0,
  offers_seen   int NOT NULL DEFAULT 0,
  price_changes int NOT NULL DEFAULT 0,
  note          text
);
