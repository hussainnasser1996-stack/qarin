"""Polite HTTP client: honest User-Agent, robots.txt + crawl-delay respected, no block evasion.

If a site answers 401/403/429 or a challenge page, we record it and move on. We never retry
with a different identity, never use keys embedded in a site, never solve CAPTCHAs.
"""
from __future__ import annotations

import gzip
import time
import urllib.robotparser as rp
from urllib.parse import urlparse

import httpx

UA = "QarinBot/1.0 (+https://qarin.vercel.app/en/bot; price comparison; contact hussainnasser.bahrain@gmail.com)"
ROBOTS_UA = "QarinBot"
BLOCK_STATUSES = {401, 403, 407, 429, 451, 503}

_client = httpx.Client(
    headers={"User-Agent": UA, "Accept-Language": "en", "Accept": "text/html,application/xhtml+xml,application/xml"},
    timeout=httpx.Timeout(30, connect=15),
    follow_redirects=True,
)
_robots: dict[str, rp.RobotFileParser] = {}
_robots_text: dict[str, str] = {}
_last_hit: dict[str, float] = {}


def origin(url: str) -> str:
    u = urlparse(url)
    return f"{u.scheme}://{u.netloc}"


def robots(url: str) -> rp.RobotFileParser:
    o = origin(url)
    if o not in _robots:
        p = rp.RobotFileParser()
        text = ""
        try:
            r = _client.get(o + "/robots.txt")
            if r.status_code == 200:
                text = r.text
            elif r.status_code in BLOCK_STATUSES:
                text = "User-agent: *\nDisallow: /\n"  # treat a blocked robots.txt as "keep out"
        except Exception:
            text = ""
        p.parse(text.splitlines())
        _robots[o] = p
        _robots_text[o] = text
    return _robots[o]


def robots_sitemaps(url: str) -> list[str]:
    robots(url)
    out = []
    for line in _robots_text.get(origin(url), "").splitlines():
        if line.lower().startswith("sitemap:"):
            out.append(line.split(":", 1)[1].strip())
    return out


def allowed(url: str) -> bool:
    return robots(url).can_fetch(ROBOTS_UA, url)


def get(url: str, min_delay: float = 1.5) -> httpx.Response | None:
    """GET if robots allows. Waits max(crawl-delay, min_delay) between hits to the same host.
    Returns None when robots disallows or the network fails."""
    if not allowed(url):
        return None
    host = urlparse(url).netloc
    cd = robots(url).crawl_delay(ROBOTS_UA)
    delay = max(float(cd or 0), min_delay)
    wait = _last_hit.get(host, 0) + delay - time.time()
    if wait > 0:
        time.sleep(wait)
    _last_hit[host] = time.time()
    try:
        return _client.get(url)
    except Exception:
        return None


def text_of(resp: httpx.Response) -> str:
    if resp.url.path.endswith(".gz") or resp.content[:2] == b"\x1f\x8b":
        try:
            return gzip.decompress(resp.content).decode("utf-8", "replace")
        except Exception:
            pass
    return resp.text


def is_block(resp: httpx.Response | None) -> bool:
    if resp is None:
        return False
    if resp.status_code in BLOCK_STATUSES:
        return True
    head = resp.text[:3000].lower() if resp.status_code == 200 else ""
    return any(s in head for s in ("cf-chl", "challenge-platform", "attention required", "captcha-delivery"))
