"""Walk a store's public sitemaps and return product URLs (+ lastmod)."""
from __future__ import annotations

import re
from typing import Iterator

from . import http
from .stores import Store

LOC_RE = re.compile(r"<(?:sitemap|url)>(.*?)</(?:sitemap|url)>", re.S | re.I)
TAG = lambda name: re.compile(rf"<{name}>\s*(.*?)\s*</{name}>", re.S | re.I)
LOC, LASTMOD = TAG("loc"), TAG("lastmod")


def _entries(xml: str) -> Iterator[tuple[str, str | None, bool]]:
    is_index = "<sitemapindex" in xml[:2000].lower()
    blocks = LOC_RE.findall(xml)
    if not blocks:  # some sitemaps put bare <loc> lines
        for loc in LOC.findall(xml):
            yield loc.replace("&amp;", "&"), None, loc.endswith(".xml") or loc.endswith(".xml.gz")
        return
    for b in blocks:
        m = LOC.search(b)
        if not m:
            continue
        lm = LASTMOD.search(b)
        loc = m.group(1).replace("&amp;", "&").strip()
        yield loc, (lm.group(1) if lm else None), is_index


def discover(store: Store, max_maps: int = 600, log=print) -> dict[str, str | None]:
    roots = store.sitemaps or http.robots_sitemaps(store.home)
    todo, seen, out = list(roots), set(), {}
    child_re = re.compile(store.child_filter, re.I) if store.child_filter else None
    prod_re = re.compile(store.product_re)
    inc_re = re.compile(store.url_include, re.I) if store.url_include else None
    while todo and len(seen) < max_maps:
        sm = todo.pop(0)
        if sm in seen:
            continue
        seen.add(sm)
        r = http.get(sm, min_delay=1.0)
        if r is None or r.status_code != 200 or http.is_block(r):
            log(f"  [{store.id}] skip {sm} ({'robots/net' if r is None else r.status_code})")
            continue
        xml = http.text_of(r)
        n_child = n_prod = 0
        for loc, lastmod, is_child in _entries(xml):
            looks_map = is_child or re.search(r"\.xml(\.gz)?$", loc) or "/sitemap" in loc.lower()
            if looks_map and not prod_re.search(loc.split("?")[0]) or (is_child and looks_map):
                if child_re is None or child_re.search(loc) or sm in roots and not _has_matching_child(xml, child_re):
                    todo.append(loc)
                    n_child += 1
                continue
            if prod_re.search(loc) and (inc_re is None or inc_re.search(loc.lower())):
                out[loc] = lastmod
                n_prod += 1
        log(f"  [{store.id}] {sm.rsplit('/', 1)[-1][:60]}: +{n_prod} products, +{n_child} maps (total {len(out)})")
    return out


def _has_matching_child(xml: str, child_re: re.Pattern) -> bool:
    return any(child_re.search(loc) for loc in LOC.findall(xml))
