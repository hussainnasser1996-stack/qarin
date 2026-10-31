"""Turn a product page into one offer record. Pure functions, tested against saved pages.

Order: schema.org JSON-LD → schema.org microdata → OpenGraph meta. Every store we crawl
publishes at least one of these on purpose (for Google Shopping), so we read what they publish
for machines instead of scraping visual layout.
"""
from __future__ import annotations

import html as htmllib
import json
import re

from selectolax.lexbor import LexborHTMLParser

SUFFIX_RE = re.compile(r"\s*[-|–]\s*(Jarir Bookstore.*|eXtra.*|Sharaf DG.*|Jumbo.*|Xcite.*)$", re.I)
PRICE_IN_TITLE_RE = re.compile(r"\s*price in [A-Za-z ]+,?\s*Buy .*$", re.I)


def _num(v) -> float | None:
    if v is None or v == "":
        return None
    try:
        return float(str(v).replace(",", "").strip())
    except ValueError:
        m = re.search(r"\d[\d,]*\.?\d*", str(v))
        return float(m.group(0).replace(",", "")) if m else None


def _avail(v) -> bool | None:
    if not v:
        return None
    s = str(v).lower()
    if any(k in s for k in ("outofstock", "out of stock", "soldout", "discontinued", "preorder_unavailable")):
        return False
    if any(k in s for k in ("instock", "in stock", "limitedavailability", "onlineonly", "preorder", "backorder")):
        return True
    return None


def clean_title(t: str | None) -> str | None:
    if not t:
        return t
    t = htmllib.unescape(t).replace(" ", " ")
    t = SUFFIX_RE.sub("", t)
    t = PRICE_IN_TITLE_RE.sub("", t)
    return re.sub(r"\s+", " ", t).strip(" -–|")


def _jsonld_blocks(html: str):
    for block in re.findall(r"<script[^>]*application/ld\+json[^>]*>(.*?)</script>", html, re.S | re.I):
        try:
            yield json.loads(block.strip())
        except Exception:
            try:  # some stores leave raw newlines/control chars inside strings
                yield json.loads(re.sub(r"[\x00-\x1f]", " ", block.strip()))
            except Exception:
                continue
    # Next.js App Router sites (e.g. OurShopee Qatar) put their JSON-LD inside the streamed page payload
    # (self.__next_f.push) instead of a <script> tag. Decode the payload and pull out schema.org objects.
    if "self.__next_f.push" in html and '"@type\\":\\"Product' in html:
        payload = ""
        for chunk in re.findall(r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)', html):
            try:
                payload += json.loads(chunk)
            except Exception:
                continue
        dec = json.JSONDecoder()
        for m in re.finditer(r'\{"@context":"https?://schema\.org/?",', payload):
            try:
                yield dec.raw_decode(payload, m.start())[0]
            except Exception:
                continue


def _walk(d):
    stack = [d]
    while stack:
        x = stack.pop()
        if isinstance(x, list):
            stack.extend(x)
        elif isinstance(x, dict):
            yield x
            for k in ("@graph", "mainEntity", "itemListElement"):
                if k in x and isinstance(x[k], (list, dict)):
                    stack.append(x[k])


def _types(x: dict) -> set[str]:
    t = x.get("@type")
    return set(t) if isinstance(t, list) else {t}


def from_jsonld(html: str) -> tuple[dict | None, list[str]]:
    product, crumbs = None, []
    for block in _jsonld_blocks(html):
        for x in _walk(block):
            ts = _types(x)
            if "BreadcrumbList" in ts and not crumbs:
                items = x.get("itemListElement") or []
                names = []
                for it in items if isinstance(items, list) else []:
                    nm = it.get("name") or (it.get("item") or {}).get("name") if isinstance(it, dict) else None
                    if nm:
                        names.append(htmllib.unescape(str(nm)))
                crumbs = names
            if ("Product" in ts or "ProductGroup" in ts) and product is None:
                offers = x.get("offers")
                if isinstance(offers, dict) and offers.get("@type") == "AggregateOffer" and "offers" in offers:
                    offers = offers["offers"]
                if isinstance(offers, list):
                    offers = offers[0] if offers else None
                offers = offers if isinstance(offers, dict) else {}
                brand = x.get("brand")
                if isinstance(brand, dict):
                    brand = brand.get("name")
                elif isinstance(brand, list):
                    brand = (brand[0] or {}).get("name") if brand and isinstance(brand[0], dict) else None
                img = x.get("image")
                if isinstance(img, list):
                    img = img[0] if img else None
                if isinstance(img, dict):
                    img = img.get("url") or img.get("contentUrl")
                product = {
                    "title": x.get("name"),
                    "price": _num(offers.get("price") or offers.get("lowPrice")),
                    "currency": offers.get("priceCurrency"),
                    "in_stock": _avail(offers.get("availability")),
                    "gtin": x.get("gtin13") or x.get("gtin") or x.get("gtin12") or x.get("gtin14") or x.get("gtin8")
                            or offers.get("gtin13") or offers.get("gtin"),
                    "mpn": x.get("mpn") or offers.get("mpn"),
                    "sku": x.get("sku") or offers.get("sku"),
                    "brand": brand,
                    "image": img,
                    "condition": str(offers.get("itemCondition") or x.get("itemCondition") or "").rsplit("/", 1)[-1] or None,
                    "seller": ((offers.get("seller") or {}).get("name") if isinstance(offers.get("seller"), dict) else None),
                }
    return product, crumbs


def from_microdata(tree: LexborHTMLParser) -> tuple[dict | None, list[str]]:
    def prop(name: str):
        for n in tree.css(f'[itemprop="{name}"]'):
            v = n.attributes.get("content") or n.attributes.get("href") or n.attributes.get("value") or n.text(strip=True)
            if v:
                return v
        return None

    price = prop("price") or prop("lowPrice")
    title = None
    h1 = tree.css_first('h1[itemprop="name"]') or tree.css_first("h1")
    if h1:
        title = h1.text(strip=True)
    brand = None
    b = tree.css_first('[itemprop="brand"]')
    if b:
        inner = b.css_first('[itemprop="name"]')
        brand = (inner.attributes.get("content") if inner else None) or b.attributes.get("content") or b.text(strip=True)
    if not (price or prop("sku") or prop("gtin") or prop("mpn")):
        return None, []
    crumbs = [n.text(strip=True) for n in tree.css('[itemtype*="BreadcrumbList"] [itemprop="name"]') if n.text(strip=True)]
    return {
        "title": title,
        "price": _num(price),
        "currency": (prop("priceCurrency") or "").strip() or None,
        "in_stock": _avail(prop("availability")),
        "gtin": prop("gtin13") or prop("gtin") or prop("gtin12") or prop("gtin14"),
        "mpn": prop("mpn"),
        "sku": prop("sku"),
        "brand": brand,
        "image": None,
        "condition": None,
        "seller": None,
    }, crumbs


def _meta(tree: LexborHTMLParser, key: str) -> str | None:
    n = tree.css_first(f'meta[property="{key}"]') or tree.css_first(f'meta[name="{key}"]')
    return n.attributes.get("content") if n else None


def parse(html: str, url: str = "") -> dict | None:
    """Return an offer dict, or None if the page is not a product page."""
    product, crumbs = from_jsonld(html)
    tree = LexborHTMLParser(html)
    if product is None or product.get("price") is None:
        md, md_crumbs = from_microdata(tree)
        if md and (product is None or md.get("price") is not None):
            product = {**(product or {}), **{k: v for k, v in md.items() if v not in (None, "")}}
        crumbs = crumbs or md_crumbs
    if product is None:
        return None
    # Fallbacks from OpenGraph / page signals
    product["image"] = product.get("image") or _meta(tree, "og:image")
    if product.get("price") is None:
        product["price"] = _num(_meta(tree, "product:price:amount"))
        product["currency"] = product.get("currency") or _meta(tree, "product:price:currency")
    low = html.lower()
    if product.get("in_stock") is None:
        if product.get("price") is None and ("out of stock" in low or "sold out" in low or "غير متوفر" in html):
            product["in_stock"] = False
        elif product.get("price") is not None:
            product["in_stock"] = True
    # Sharaf DG exposes its category tree in its analytics payload
    if not crumbs or len(crumbs) < 2:
        m = re.search(r'"item_category_l1":"([^"]+)","item_category_l2":"([^"]+)"', html)
        if m:
            crumbs = [m.group(1), m.group(2)]
    if not product.get("seller"):
        m = re.search(r'"seller_name":"([^"]+)"', html)
        if m:
            product["seller"] = m.group(1)
    product["title"] = clean_title(product.get("title") or _meta(tree, "og:title"))
    product["crumbs"] = [c for c in crumbs if c and c.lower() not in ("home", "online shopping", "الرئيسية")]
    product["url"] = url
    for k in ("gtin", "mpn", "sku", "brand", "currency"):
        if isinstance(product.get(k), str):
            product[k] = product[k].strip() or None
    if product.get("gtin") and not re.fullmatch(r"\d{8,14}", product["gtin"]):
        product["gtin"] = None
    if not product.get("title"):
        return None
    return product
