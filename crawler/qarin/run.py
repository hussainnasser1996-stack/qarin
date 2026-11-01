"""Qarin crawler CLI.

  python -m qarin.run migrate                       # schema + countries + stores
  python -m qarin.run discover --store jarir-bh     # sitemap -> store_urls
  python -m qarin.run crawl --store jarir-bh --minutes 50
  python -m qarin.run match                         # offers -> products
  python -m qarin.run alerts                        # email price alerts (Resend)
  python -m qarin.run revalidate                    # refresh the website cache
  python -m qarin.run stats
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from collections import Counter, defaultdict

from . import adapters, db, http, sitemaps
from .normalize import STATIONERY_RE, display_name, identity, search_norm, slugify
from .stores import BY_ID, STORES


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


# ---------------------------------------------------------------- discover
def cmd_discover(store_id: str, max_maps: int):
    st = BY_ID[store_id]
    # Walk sitemaps first (can take minutes) and only then open a DB connection: Neon drops idle ones.
    urls = sitemaps.discover(st, max_maps=max_maps, log=log)
    with db.connect() as conn:
        run_id = conn.execute("INSERT INTO scrape_runs (store_id, phase) VALUES (%s,'discover') RETURNING id", (st.id,)).fetchone()[0]
        with conn.cursor() as cur:
            cur.executemany(
                """INSERT INTO store_urls (store_id, url, lastmod) VALUES (%s,%s,%s)
                   ON CONFLICT (store_id, url) DO UPDATE SET lastmod = EXCLUDED.lastmod""",
                [(st.id, u, lm) for u, lm in urls.items()],
            )
        conn.execute("UPDATE scrape_runs SET finished_at=now(), pages_ok=%s WHERE id=%s", (len(urls), run_id))
        conn.commit()
    log(f"[{st.id}] discovered {len(urls)} candidate product URLs")


# ---------------------------------------------------------------- crawl
def _due(conn, store_id: str, limit: int):
    return conn.execute(
        """SELECT url FROM store_urls
           WHERE store_id=%s AND (
             kind IS NULL
             OR (kind='product' AND (last_fetched IS NULL OR last_fetched < now() - interval '20 hours'))
             OR (kind IN ('error','blocked') AND last_fetched < now() - interval '2 days')
             OR (kind IN ('not_product','not_electronics') AND last_fetched < now() - interval '45 days'))
           ORDER BY priority DESC, (kind='product') DESC, last_fetched NULLS FIRST
           LIMIT %s""",
        (store_id, limit),
    ).fetchall()


def _upsert_offer(conn, store_id: str, url: str, p: dict, ident: dict) -> bool:
    """Insert/update an offer; append price_history when price or stock changed. Returns changed?"""
    row = conn.execute("SELECT id, price, in_stock FROM offers WHERE store_id=%s AND url=%s", (store_id, url)).fetchone()
    vals = dict(
        title=p["title"][:500], brand=ident["brand"], category=ident["category"], is_accessory=ident["is_accessory"],
        price=(p.get("price") if (p.get("price") or 0) > 0 else None), currency=p.get("currency"), in_stock=p.get("in_stock"), gtin=p.get("gtin"),
        mpn=p.get("mpn"), sku=p.get("sku"), image=(p.get("image") or "")[:1000] or None, colour=ident["colour"],
        storage=ident["storage"], condition=ident["condition"], region=ident["region"], seller=p.get("seller"),
        match_key=ident["key"], match_method=ident["match_method"],
    )
    if row is None:
        cols = ", ".join(vals)
        ph = ", ".join(["%s"] * len(vals))
        got = conn.execute(
            f"INSERT INTO offers (store_id, url, {cols}) VALUES (%s,%s,{ph}) ON CONFLICT (store_id, url) DO NOTHING RETURNING id",
            (store_id, url, *vals.values()),
        ).fetchone()
        if got is None:  # another writer inserted it first; treat as an update next run
            return False
        oid = got[0]
        conn.execute("INSERT INTO price_history (offer_id, price, in_stock) VALUES (%s,%s,%s)", (oid, vals["price"], vals["in_stock"]))
        return True
    oid, old_price, old_stock = row
    changed = (old_price is None) != (vals["price"] is None) or (
        old_price is not None and vals["price"] is not None and abs(float(old_price) - float(vals["price"])) > 0.0005
    ) or old_stock != vals["in_stock"]
    sets = ", ".join(f"{k}=%s" for k in vals)
    conn.execute(
        f"UPDATE offers SET {sets}, last_seen=now(){', last_changed=now()' if changed else ''} WHERE id=%s",
        (*vals.values(), oid),
    )
    if changed:
        conn.execute("INSERT INTO price_history (offer_id, price, in_stock) VALUES (%s,%s,%s) ON CONFLICT DO NOTHING",
                     (oid, vals["price"], vals["in_stock"]))
    return changed


def cmd_crawl(store_id: str, minutes: float, max_pages: int):
    """Fetch due URLs for one store. Survives database disconnects (Neon can drop idle/long connections):
    each page's writes are committed together and retried once on a fresh connection."""
    import psycopg

    st = BY_ID[store_id]
    deadline = time.time() + minutes * 60
    stats = Counter()
    consecutive_blocks = 0
    conn = psycopg.connect(db.dsn(), prepare_threshold=None, keepalives=1, keepalives_idle=30)

    def write(fn):
        nonlocal conn
        for attempt in (1, 2):
            try:
                out = fn(conn)
                conn.commit()
                return out
            except (psycopg.errors.UniqueViolation, psycopg.errors.DataError, psycopg.errors.IntegrityError) as e:
                conn.rollback()
                log(f"[{st.id}] skipped a row ({type(e).__name__})")
                return None
            except psycopg.OperationalError as e:
                log(f"[{st.id}] db reconnect ({str(e).splitlines()[0][:80]})")
                try:
                    conn.close()
                except Exception:
                    pass
                time.sleep(3 * attempt)
                conn = psycopg.connect(db.dsn(), prepare_threshold=None, keepalives=1, keepalives_idle=30)
        return None

    run_id = write(lambda c: c.execute("INSERT INTO scrape_runs (store_id, phase) VALUES (%s,'crawl') RETURNING id", (st.id,)).fetchone()[0])
    urls = write(lambda c: [r[0] for r in _due(c, st.id, max_pages)]) or []
    log(f"[{st.id}] {len(urls)} URLs due; budget {minutes} min")
    for i, url in enumerate(urls):
        if time.time() > deadline:
            break
        r = http.get(url, min_delay=st.min_delay)
        kind, status, offer = None, (r.status_code if r is not None else None), None
        if r is None:
            kind = "error"
        elif http.is_block(r):
            kind = "blocked"
            consecutive_blocks += 1
        elif r.status_code != 200:
            kind = "error" if r.status_code >= 500 else "not_product"
        else:
            consecutive_blocks = 0
            p = adapters.parse(r.text, url)
            if p is None:
                kind = "not_product"
            else:
                ident = identity(p["title"], p.get("brand"), p.get("crumbs"), url, p.get("gtin"), p.get("mpn"))
                if ident["category"] is None:
                    kind = "not_electronics"
                else:
                    kind = "product"
                    offer = (p, ident)

        def save(c, kind=kind, status=status, offer=offer, url=url):
            changed = _upsert_offer(c, st.id, url, *offer) if offer else False
            c.execute("UPDATE store_urls SET last_fetched=now(), status=%s, kind=%s WHERE store_id=%s AND url=%s",
                      (status, kind, st.id, url))
            return changed

        changed = write(save)
        stats[kind] += 1
        if offer:
            stats["offers"] += 1
            stats["changes"] += 1 if changed else 0
        if i % 25 == 0:
            log(f"[{st.id}] {i}/{len(urls)} {dict(stats)}")
        if consecutive_blocks >= 5:
            log(f"[{st.id}] 5 blocks in a row; stopping politely")
            break
    write(lambda c: c.execute(
        """UPDATE scrape_runs SET finished_at=now(), pages_ok=%s, pages_blocked=%s, pages_error=%s,
           offers_seen=%s, price_changes=%s, note=%s WHERE id=%s""",
        (stats["product"] + stats["not_product"] + stats["not_electronics"], stats["blocked"], stats["error"],
         stats["offers"], stats["changes"], json.dumps(dict(stats)), run_id)))
    conn.close()
    log(f"[{st.id}] done {dict(stats)}")


# ---------------------------------------------------------------- rekey
def cmd_rekey():
    """Re-run identity() on every stored offer so matcher improvements apply without re-crawling."""
    with db.connect() as conn:
        rows = conn.execute("SELECT id, title, brand, category, url, gtin, mpn FROM offers").fetchall()
        out, drop = [], []
        for oid, title, brand, cat, url, gtin, mpn in rows:
            i = identity(title, brand, None, url, gtin, mpn)
            if i["category"] is None and STATIONERY_RE.search(search_norm(title)):
                drop.append(oid)  # paper notebooks etc. stored before the stationery rule existed
                continue
            category = i["category"] or cat
            is_acc = i["is_accessory"] or (cat == "accessories" and i["category"] is None)
            out.append((oid, i["key"], i["match_method"], category, is_acc, i["storage"], i["colour"], i["condition"], i["region"]))
        conn.execute("""CREATE TEMP TABLE tmp_k (id bigint, key text, method text, category text, is_acc boolean,
                        storage text, colour text, condition text, region text) ON COMMIT DROP""")
        with conn.cursor().copy("COPY tmp_k FROM STDIN") as cp:
            for r in out:
                cp.write_row(r)
        n = conn.execute("""UPDATE offers o SET match_key=t.key, match_method=t.method, category=t.category, is_accessory=t.is_acc,
                              storage=t.storage, colour=t.colour, condition=t.condition, region=t.region
                            FROM tmp_k t WHERE o.id=t.id""").rowcount
        if drop:
            conn.execute("""UPDATE store_urls su SET kind='not_electronics' FROM offers o
                            WHERE o.id = ANY(%s) AND su.store_id=o.store_id AND su.url=o.url""", (drop,))
            conn.execute("DELETE FROM price_history WHERE offer_id = ANY(%s)", (drop,))
            conn.execute("DELETE FROM clicks WHERE offer_id = ANY(%s)", (drop,))
            conn.execute("DELETE FROM offers WHERE id = ANY(%s)", (drop,))
        conn.commit()
        log(f"rekey: updated {n} offers, removed {len(drop)} non-electronics")


# ---------------------------------------------------------------- match
def cmd_match():
    """Group offers into products by identity key; GTIN links offers lacking a key to a keyed sibling."""
    with db.connect() as conn:
        rows = conn.execute(
            """SELECT o.id, o.store_id, s.country, o.title, o.brand, o.category, o.match_key, o.match_method, o.gtin, o.mpn,
                      o.image, o.storage, o.sku, o.is_accessory, o.price
               FROM offers o JOIN stores s ON s.id=o.store_id"""
        ).fetchall()
        gtin_key: dict[str, str] = {}
        for r in rows:
            if r[6] and r[8]:
                gtin_key.setdefault(r[8], r[6])
        groups: dict[str, list] = defaultdict(list)
        for r in rows:
            key = r[6]
            method = r[7]
            if not key and r[8] and r[8] in gtin_key:
                key, method = gtin_key[r[8]], "gtin"
            if not key and r[8]:
                key, method = f"gtin {r[8]}", "gtin"
            if not key and r[12]:
                # Same chain + same SKU is the same item in every country (Jarir, eXtra, Sharaf DG, Lulu, OurShopee
                # share one catalogue across the Gulf), which links it for the cross-GCC comparison.
                key, method = f"sku {r[1].rsplit('-', 1)[0]} {r[12]}", "sku"
            if not key:
                key, method = f"single {r[1]} {hashlib.md5(r[3].encode()).hexdigest()[:10]}", "single"
            groups[key].append((r, method))
        log(f"match: {len(rows)} offers -> {len(groups)} products")
        # Bulk write: COPY computed products + offer->key map into temp tables, then merge in SQL.
        prod_rows, map_rows = [], []
        for key, items in groups.items():
            offers = [r for r, _ in items]
            cats = Counter(r[5] for r in offers if r[5])
            brands = Counter(r[4] for r in offers if r[4])
            titles = sorted({r[3] for r in offers}, key=len)
            is_family = any(m == "family" for _, m in items)
            name = display_name(key, titles[0]) if is_family else titles[0]
            image = next((r[10] for r in offers if r[10]), None)
            countries = {r[2] for r in offers}
            norm = search_norm(" ".join([name] + titles[:3] + list(brands)))[:2000]
            prod_rows.append((key, slugify(name), name[:300], brands.most_common(1)[0][0] if brands else None,
                              key if is_family else None, cats.most_common(1)[0][0] if cats else None,
                              next((r[11] for r in offers if r[11]), None), image,
                              "{" + ",".join(sorted({r[8] for r in offers if r[8]})) + "}",
                              "{" + ",".join('"' + m.replace('"', "") + '"' for m in sorted({r[9] for r in offers if r[9]})) + "}",
                              norm, len(offers), len(countries)))
            map_rows.extend((r[0], key) for r in offers)
        conn.execute("""CREATE TEMP TABLE tmp_p (key text, slug text, name text, brand text, family text, category text,
                        storage text, image text, gtins text[], mpns text[], search_norm text, offer_count int, country_count int)
                        ON COMMIT DROP""")
        conn.execute("CREATE TEMP TABLE tmp_o (offer_id bigint, key text) ON COMMIT DROP")
        with conn.cursor().copy("COPY tmp_p FROM STDIN") as cp:
            for row in prod_rows:
                cp.write_row(row)
        with conn.cursor().copy("COPY tmp_o FROM STDIN") as cp:
            for row in map_rows:
                cp.write_row(row)
        conn.execute("""INSERT INTO products (key, slug, name, brand, family, category, storage, image, gtins, mpns, search_norm,
                          offer_count, country_count)
                        SELECT key, slug, name, brand, family, category, storage, image, gtins, mpns, search_norm, offer_count, country_count FROM tmp_p
                        ON CONFLICT (key) DO UPDATE SET slug=EXCLUDED.slug, name=EXCLUDED.name, brand=EXCLUDED.brand,
                          family=EXCLUDED.family, category=EXCLUDED.category, storage=EXCLUDED.storage,
                          image=COALESCE(EXCLUDED.image, products.image), gtins=EXCLUDED.gtins, mpns=EXCLUDED.mpns,
                          search_norm=EXCLUDED.search_norm, offer_count=EXCLUDED.offer_count,
                          country_count=EXCLUDED.country_count, updated_at=now()""")
        conn.execute("""UPDATE offers o SET product_id = p.id FROM tmp_o t JOIN products p ON p.key = t.key
                        WHERE o.id = t.offer_id AND o.product_id IS DISTINCT FROM p.id""")
        # products that lost all offers
        conn.execute("DELETE FROM products p WHERE NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id=p.id) AND NOT EXISTS (SELECT 1 FROM alerts a WHERE a.product_id=p.id)")
        # popularity: clicks in last 30 days
        conn.execute("""UPDATE products p SET popularity = COALESCE(c.n,0) FROM (
              SELECT o.product_id, count(*) n FROM clicks c JOIN offers o ON o.id=c.offer_id
              WHERE c.ts > now() - interval '30 days' GROUP BY 1) c WHERE c.product_id = p.id""")
        # crawl priority: offers that belong to multi-store products refresh first
        conn.execute("""UPDATE store_urls su SET priority = LEAST(p.offer_count, 50) + p.popularity
              FROM offers o JOIN products p ON p.id=o.product_id WHERE o.store_id=su.store_id AND o.url=su.url""")
        conn.commit()
        multi = conn.execute("SELECT count(*) FROM products WHERE offer_count > 1").fetchone()[0]
        log(f"match: products with 2+ offers: {multi}")


# ---------------------------------------------------------------- alerts
def cmd_alerts():
    key = os.environ.get("RESEND_API_KEY")
    sender = os.environ.get("ALERT_FROM")
    site = os.environ.get("SITE_URL", "https://qarin-gulf.vercel.app").rstrip("/")
    if not key or not sender:
        log("alerts: RESEND_API_KEY / ALERT_FROM not set; skipping (alerts stay queued)")
        return
    with db.connect() as conn:
        due = conn.execute(
            """SELECT a.id, a.email, a.lang, a.country, a.target_price, a.last_sent_price, a.token, p.name, p.slug, p.id,
                      m.price, c.currency, m.store
               FROM alerts a JOIN products p ON p.id=a.product_id JOIN countries c ON c.code=a.country
               JOIN LATERAL (SELECT o.price, s.name store FROM offers o JOIN stores s ON s.id=o.store_id
                             WHERE o.product_id=p.id AND s.country=a.country AND o.in_stock AND o.price IS NOT NULL
                             ORDER BY o.price LIMIT 1) m ON true
               WHERE a.verified_at IS NOT NULL AND a.unsubscribed_at IS NULL
                 AND (a.target_price IS NULL OR m.price <= a.target_price)
                 AND (a.last_sent_price IS NULL OR m.price < a.last_sent_price)"""
        ).fetchall()
        sent = 0
        for (aid, email, lang, cc, target, last, token, name, slug, pid, price, cur, store) in due:
            url = f"{site}/{cc}/{lang}/p/{slug}-{pid}"
            unsub = f"{site}/api/alerts/unsubscribe?token={token}"
            ar = lang == "ar"
            subject = (f"انخفض سعر {name} إلى {price} {cur}" if ar else f"{name} dropped to {cur} {price}")
            body = (f"<p>{'أرخص سعر الآن' if ar else 'Cheapest price now'}: <b>{cur} {price}</b> — {store}</p>"
                    f"<p><a href=\"{url}\">{'قارن الأسعار' if ar else 'Compare prices'}</a></p>"
                    f"<p style=\"color:#888;font-size:12px\"><a href=\"{unsub}\">{'إلغاء التنبيه' if ar else 'Unsubscribe'}</a></p>")
            r = http._client.post("https://api.resend.com/emails", headers={"Authorization": f"Bearer {key}"},
                                  json={"from": sender, "to": [email], "subject": subject, "html": body,
                                        "headers": {"List-Unsubscribe": f"<{unsub}>"}})
            if r.status_code < 300:
                conn.execute("UPDATE alerts SET last_sent_at=now(), last_sent_price=%s WHERE id=%s", (price, aid))
                sent += 1
            else:
                log("alerts: resend error", r.status_code, r.text[:200])
        conn.commit()
        log(f"alerts: sent {sent} of {len(due)} due")


def cmd_revalidate():
    site = os.environ.get("SITE_URL", "https://qarin-gulf.vercel.app").rstrip("/")
    secret = os.environ.get("REVALIDATE_SECRET")
    if not secret:
        log("revalidate: REVALIDATE_SECRET not set; skipping")
        return
    r = http._client.post(f"{site}/api/revalidate", headers={"Authorization": f"Bearer {secret}"})
    log("revalidate:", r.status_code, r.text[:200])


def cmd_stats():
    with db.connect() as conn:
        for row in conn.execute(
            """SELECT s.id, count(o.id) offers, count(o.id) FILTER (WHERE o.price IS NOT NULL) priced,
                      count(DISTINCT o.product_id) FILTER (WHERE p.offer_count>1) matched,
                      (SELECT count(*) FROM store_urls su WHERE su.store_id=s.id) urls,
                      (SELECT count(*) FROM store_urls su WHERE su.store_id=s.id AND su.kind IS NOT NULL) fetched,
                      max(o.last_seen)
               FROM stores s LEFT JOIN offers o ON o.store_id=s.id LEFT JOIN products p ON p.id=o.product_id
               GROUP BY s.id ORDER BY s.id"""
        ).fetchall():
            print("%-14s offers=%-6s priced=%-6s matched_products=%-5s urls=%-6s fetched=%-6s last=%s" % row)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd")
    ap.add_argument("--store", action="append")
    ap.add_argument("--minutes", type=float, default=50)
    ap.add_argument("--max-pages", type=int, default=5000)
    ap.add_argument("--max-maps", type=int, default=600)
    a = ap.parse_args(argv)
    stores = a.store or [s.id for s in STORES if s.active]
    if a.cmd == "migrate":
        with db.connect() as conn:
            db.migrate(conn)
            db.seed(conn)
        log("migrated + seeded")
    elif a.cmd == "needs-discover":
        with db.connect() as conn:
            n = conn.execute("SELECT count(*) FROM store_urls WHERE store_id=%s", (stores[0],)).fetchone()[0]
        sys.exit(0 if n == 0 else 1)
    elif a.cmd == "discover":
        for s in stores:
            cmd_discover(s, a.max_maps)
    elif a.cmd == "crawl":
        for s in stores:
            cmd_crawl(s, a.minutes, a.max_pages)
    elif a.cmd == "match":
        cmd_match()
    elif a.cmd == "rekey":
        cmd_rekey()
        cmd_match()
    elif a.cmd == "alerts":
        cmd_alerts()
    elif a.cmd == "revalidate":
        cmd_revalidate()
    elif a.cmd == "stats":
        cmd_stats()
    else:
        sys.exit(f"unknown command {a.cmd}")


if __name__ == "__main__":
    main()
