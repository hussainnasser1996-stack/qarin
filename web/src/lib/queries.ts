import { unstable_cache } from "next/cache";
import { query, sql } from "./db";
import { arToEn, searchNorm } from "./format";
import type { CC } from "./i18n";

export const TAG = "prices";

/** Latin tokens win; leftover Arabic words (e.g. "سعر") are dropped when any product-name token exists. */
function searchTokens(norm: string): string[] {
  const all = norm.split(" ").filter(Boolean);
  const latin = all.filter((x) => !/[\u0600-\u06ff]/.test(x));
  return (latin.length ? latin : all).slice(0, 6).map((x) => `%${x}%`);
}
const cached = <A extends unknown[], R>(fn: (...a: A) => Promise<R>, key: string, revalidate = 3600) =>
  unstable_cache(fn, [key], { tags: [TAG], revalidate });

export type ListItem = {
  id: number; slug: string; name: string; image: string | null; brand: string | null; category: string | null;
  min_price: string | null; max_price: string | null; n_offers: number; currency: string; last_seen: string;
  cheapest_store?: string | null;
  spread?: { s: string; p: number }[] | null;
};

// One row per (product, store): a store selling 4 colours at one price counts once.
const OFFER_AGG = `
  WITH ps AS (
    SELECT o.product_id, s.name AS store,
           min(o.price) FILTER (WHERE o.in_stock IS NOT FALSE) AS price,
           max(o.last_seen) AS last_seen
    FROM offers o JOIN stores s ON s.id = o.store_id
    WHERE s.country = $1 AND o.price IS NOT NULL AND o.product_id IS NOT NULL
    GROUP BY 1, 2),
  agg AS (
    SELECT product_id,
           min(price) AS min_price, max(price) AS max_price, count(price) AS n_offers,
           max(last_seen) AS last_seen,
           (array_agg(store ORDER BY price) FILTER (WHERE price IS NOT NULL))[1] AS cheapest_store,
           json_agg(json_build_object('s', store, 'p', price) ORDER BY price) FILTER (WHERE price IS NOT NULL) AS spread
    FROM ps GROUP BY 1)`;

const LIST_COLS = `p.id, p.slug, p.name, p.image, p.brand, p.category, agg.min_price, agg.max_price,
  agg.n_offers::int AS n_offers, agg.last_seen, agg.cheapest_store, agg.spread, c.currency`;

// ---------------------------------------------------------------- home
export const getHome = cached(async (cc: CC) => {
  const [gaps, drops, cats, stores, totals] = await Promise.all([
    query(
      `${OFFER_AGG}
       SELECT ${LIST_COLS}, (agg.max_price - agg.min_price) AS saving
       FROM products p JOIN agg ON agg.product_id = p.id JOIN countries c ON c.code = $1
       WHERE agg.n_offers >= 2 AND p.category NOT IN ('accessories') AND p.family IS NOT NULL
         AND agg.max_price > 0 AND (agg.max_price - agg.min_price) / agg.max_price BETWEEN 0.03 AND 0.6
       ORDER BY (agg.max_price - agg.min_price) / agg.max_price DESC LIMIT 12`,
      [cc],
    ),
    getDrops(cc, 12),
    query(
      `SELECT p.category, count(DISTINCT p.id)::int AS n FROM products p
       JOIN offers o ON o.product_id = p.id JOIN stores s ON s.id = o.store_id
       WHERE s.country = $1 AND o.price IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`,
      [cc],
    ),
    getStores(cc),
    query(
      `SELECT count(DISTINCT o.product_id)::int AS products, count(*)::int AS offers, max(o.last_seen) AS last_seen
       FROM offers o JOIN stores s ON s.id = o.store_id WHERE s.country = $1 AND o.price IS NOT NULL`,
      [cc],
    ),
  ]);
  return { gaps: gaps as (ListItem & { saving: string })[], drops, cats: cats as { category: string; n: number }[], stores, totals: totals[0] };
}, "home");

// ---------------------------------------------------------------- drops
export type Drop = ListItem & { new_price: string; old_price: string; store: string; observed_at: string; raised_before: boolean };
export const getDrops = cached(async (cc: CC, limit: number): Promise<Drop[]> => {
  return (await query(
    `WITH recent AS (
       SELECT ph.offer_id, ph.price, ph.observed_at,
              lag(ph.price) OVER w AS prev,
              max(ph.price) OVER (PARTITION BY ph.offer_id ORDER BY ph.observed_at ROWS BETWEEN 5 PRECEDING AND 1 PRECEDING) AS recent_max,
              lag(ph.price, 2) OVER w AS prev2
       FROM price_history ph
       WHERE ph.offer_id IN (SELECT o.id FROM offers o JOIN stores s ON s.id=o.store_id
                             WHERE s.country=$1 AND o.last_changed > now() - interval '7 days')
       WINDOW w AS (PARTITION BY ph.offer_id ORDER BY ph.observed_at))
     SELECT DISTINCT ON (p.id) p.id, p.slug, p.name, p.image, p.brand, p.category, r.price AS new_price, r.prev AS old_price,
            s.name AS store, r.observed_at, c.currency, (r.prev2 IS NOT NULL AND r.prev2 < r.prev * 0.93) AS raised_before,
            r.price AS min_price, NULL AS max_price, 1 AS n_offers, o.last_seen
     FROM recent r JOIN offers o ON o.id = r.offer_id JOIN products p ON p.id = o.product_id
     JOIN stores s ON s.id = o.store_id JOIN countries c ON c.code = s.country
     WHERE r.observed_at > now() - interval '7 days' AND r.prev IS NOT NULL AND r.price IS NOT NULL
       AND r.price < r.prev * 0.98 AND r.price > r.prev * 0.4 AND o.price = r.price AND o.in_stock IS NOT FALSE
       AND p.category <> 'accessories'
     ORDER BY p.id, (r.prev - r.price) / r.prev DESC
     LIMIT $2`,
    [cc, limit * 3],
  )).sort((a, b) => (b.old_price - b.new_price) / b.old_price - (a.old_price - a.new_price) / a.old_price).slice(0, limit) as Drop[];
}, "drops");

// ---------------------------------------------------------------- search / category
export type ListParams = {
  q?: string; category?: string; brand?: string; inStock?: boolean; sort?: string; page?: number; store?: string;
};
export const PAGE_SIZE = 24;

export const listProducts = cached(async (cc: CC, p: ListParams) => {
  const params: unknown[] = [cc];
  const where: string[] = [];
  let order = "agg.n_offers DESC, p.popularity DESC, agg.min_price ASC";
  if (p.q) {
    const norm = arToEn(searchNorm(p.q));
    const toks = searchTokens(norm);
    if (toks.length) {
      params.push(toks);
      where.push(`p.search_norm ILIKE ALL($${params.length}::text[])`);
      params.push(norm);
      order = `similarity(p.search_norm, $${params.length}) DESC, (p.family IS NOT NULL) DESC, agg.n_offers DESC`;
    }
  }
  if (p.category) { params.push(p.category); where.push(`p.category = $${params.length}`); }
  if (p.brand) { params.push(p.brand); where.push(`p.brand = $${params.length}`); }
  if (p.inStock) where.push(`agg.n_offers > 0`);
  if (p.store) {
    params.push(p.store);
    where.push(`EXISTS (SELECT 1 FROM offers o2 WHERE o2.product_id = p.id AND o2.store_id = $${params.length})`);
  }
  if (!p.q && !p.category && !p.store) where.push(`p.category <> 'accessories'`);
  switch (p.sort) {
    case "price_asc": order = "agg.min_price ASC NULLS LAST"; break;
    case "price_desc": order = "agg.min_price DESC NULLS LAST"; break;
    case "offers": order = "agg.n_offers DESC, agg.min_price ASC"; break;
    case "gap": order = "(agg.max_price - agg.min_price) DESC NULLS LAST"; break;
  }
  const page = Math.max(1, p.page || 1);
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = await query(
    `${OFFER_AGG}
     SELECT ${LIST_COLS}, count(*) OVER()::int AS total
     FROM products p JOIN agg ON agg.product_id = p.id JOIN countries c ON c.code = $1
     ${w} ORDER BY ${order} LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    params,
  );
  const brands = await query(
    `SELECT p.brand, count(DISTINCT p.id)::int AS n FROM products p JOIN offers o ON o.product_id = p.id
     JOIN stores s ON s.id = o.store_id
     WHERE s.country = $1 AND p.brand IS NOT NULL ${p.category ? "AND p.category = $2" : ""}
     GROUP BY 1 ORDER BY 2 DESC LIMIT 30`,
    p.category ? [cc, p.category] : [cc],
  );
  return { items: rows as (ListItem & { total: number })[], total: rows[0]?.total ?? 0, brands: brands as { brand: string; n: number }[] };
}, "list", 1800);

export const suggest = cached(async (cc: CC, q: string) => {
  const norm = arToEn(searchNorm(q));
  const toks = searchTokens(norm);
  if (!toks.length) return [];
  return (await query(
    `${OFFER_AGG}
     SELECT p.id, p.slug, p.name, p.image, agg.min_price, c.currency, agg.n_offers::int AS n_offers
     FROM products p JOIN agg ON agg.product_id = p.id JOIN countries c ON c.code = $1
     WHERE p.search_norm ILIKE ALL($2::text[])
     ORDER BY (p.family IS NOT NULL) DESC, similarity(p.search_norm, $3) DESC, agg.n_offers DESC LIMIT 8`,
    [cc, toks, norm],
  )) as { id: number; slug: string; name: string; image: string | null; min_price: string; currency: string; n_offers: number }[];
}, "suggest", 1800);

// ---------------------------------------------------------------- product
export type Offer = {
  id: number; store_id: string; store: string; country: string; url: string; title: string; price: string | null;
  currency: string; in_stock: boolean | null; condition: string; region: string | null; colour: string | null;
  seller: string | null; last_seen: string; last_changed: string;
};
export type HistoryRow = { offer_id: number; store: string; observed_at: string; price: string | null; in_stock: boolean | null };

export const getProduct = cached(async (id: number) => {
  const rows = await sql`SELECT id, key, slug, name, brand, family, category, storage, image, gtins, mpns, offer_count, country_count, updated_at FROM products WHERE id = ${id}`;
  if (!rows[0]) return null;
  const product = rows[0];
  const [offers, history, variants] = await Promise.all([
    sql`SELECT o.id, o.store_id, s.name AS store, s.country, o.url, o.title, o.price, o.currency, o.in_stock, o.condition,
               o.region, o.colour, o.seller, o.last_seen, o.last_changed
        FROM offers o JOIN stores s ON s.id = o.store_id WHERE o.product_id = ${id}
        ORDER BY (o.in_stock IS NOT FALSE AND o.price IS NOT NULL) DESC, o.price ASC NULLS LAST`,
    sql`SELECT ph.offer_id, s.name AS store, s.country, ph.observed_at, ph.price, ph.in_stock
        FROM price_history ph JOIN offers o ON o.id = ph.offer_id JOIN stores s ON s.id = o.store_id
        WHERE o.product_id = ${id} AND ph.observed_at > now() - interval '400 days' ORDER BY ph.observed_at`,
    product.family
      ? sql`SELECT p.id, p.slug, p.name, p.storage FROM products p
            WHERE p.id <> ${id} AND p.key ~ ${"^" + String(product.key).replace(/ (\d+(gb|tb))( .*)?$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\d+(gb|tb)$"}
            ORDER BY p.offer_count DESC LIMIT 8`
      : Promise.resolve([]),
  ]);
  return { product, offers: offers as (Offer & { country: string })[], history: history as (HistoryRow & { country: string })[], variants };
}, "product");

export const topProductIds = cached(async (limit = 200) => {
  return (await sql`SELECT id, slug FROM products WHERE family IS NOT NULL ORDER BY offer_count DESC, popularity DESC LIMIT ${limit}`) as { id: number; slug: string }[];
}, "top");

// ---------------------------------------------------------------- stores
export type StoreRow = { id: string; name: string; country: string; home: string | null; domain: string; offers: number; products: number; last_seen: string | null };
export const getStores = cached(async (cc?: CC): Promise<StoreRow[]> => {
  return (await query(
    `SELECT s.id, s.name, s.country, s.home, s.domain,
            count(o.id) FILTER (WHERE o.price IS NOT NULL)::int AS offers,
            count(DISTINCT o.product_id)::int AS products, max(o.last_seen) AS last_seen
     FROM stores s LEFT JOIN offers o ON o.store_id = s.id
     WHERE s.active ${cc ? "AND s.country = $1" : ""}
     GROUP BY s.id ORDER BY offers DESC`,
    cc ? [cc] : [],
  )) as StoreRow[];
}, "stores");

export const getSitemapProducts = cached(async (cc: CC) => {
  return (await query(
    `SELECT DISTINCT p.id, p.slug, p.updated_at FROM products p JOIN offers o ON o.product_id = p.id
     JOIN stores s ON s.id = o.store_id WHERE s.country = $1 AND o.price IS NOT NULL LIMIT 45000`,
    [cc],
  )) as { id: number; slug: string; updated_at: string }[];
}, "sitemap", 21600);

/** Fallback hero: the product sold in the most GCC countries, with each country's lowest in-stock price. */
export const getGccHero = cached(async () => {
  const rows = await query(
    `WITH best AS (
       SELECT p.id FROM products p WHERE p.family IS NOT NULL AND p.category <> 'accessories' AND p.image IS NOT NULL
       ORDER BY p.country_count DESC, p.offer_count DESC LIMIT 1)
     SELECT p.id, p.slug, p.name, p.image, s.country, c.currency, min(o.price) AS price
     FROM best b JOIN products p ON p.id = b.id JOIN offers o ON o.product_id = p.id
     JOIN stores s ON s.id = o.store_id JOIN countries c ON c.code = s.country
     WHERE o.price IS NOT NULL AND o.in_stock IS NOT FALSE
     GROUP BY p.id, p.slug, p.name, p.image, s.country, c.currency`,
  );
  if (rows.length < 2) return null;
  return { id: rows[0].id as number, slug: rows[0].slug as string, name: rows[0].name as string, image: rows[0].image as string | null,
           prices: rows.map((r) => ({ country: r.country as CC, currency: r.currency as string, price: Number(r.price) })) };
}, "gcc-hero");
