"""Postgres access for the crawler (psycopg 3)."""
from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parents[2]


def dsn() -> str:
    url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    if not url:
        env = ROOT / "web" / ".env.local"
        if env.exists():
            for line in env.read_text().splitlines():
                if line.startswith(("DATABASE_URL=", "POSTGRES_URL=")):
                    url = line.split("=", 1)[1].strip().strip('"')
                    break
    if not url:
        raise SystemExit("DATABASE_URL not set")
    return url


@contextmanager
def connect():
    with psycopg.connect(dsn(), autocommit=False, prepare_threshold=None) as conn:
        yield conn


def migrate(conn) -> None:
    for f in sorted((ROOT / "db").glob("*.sql")):
        conn.execute(f.read_text())
    conn.commit()


def seed(conn) -> None:
    from .stores import COUNTRIES, STORES
    usd = {"BHD": 2.6596, "AED": 0.2723, "SAR": 0.2667, "KWD": 3.26, "QAR": 0.2747, "OMR": 2.6008}
    for code, c in COUNTRIES.items():
        conn.execute(
            """INSERT INTO countries (code, currency, vat, name_en, name_ar, decimals, rate_to_usd)
               VALUES (%s,%s,%s,%s,%s,%s,%s)
               ON CONFLICT (code) DO UPDATE SET currency=EXCLUDED.currency, vat=EXCLUDED.vat, name_en=EXCLUDED.name_en,
                 name_ar=EXCLUDED.name_ar, decimals=EXCLUDED.decimals, rate_to_usd=EXCLUDED.rate_to_usd""",
            (code, c["currency"], c["vat"], c["en"], c["ar"], c["decimals"], usd[c["currency"]]),
        )
    for s in STORES:
        conn.execute(
            """INSERT INTO stores (id, country, name, domain, home, adapter, active, notes)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
               ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, domain=EXCLUDED.domain, home=EXCLUDED.home,
                 adapter=EXCLUDED.adapter, active=EXCLUDED.active, notes=EXCLUDED.notes""",
            (s.id, s.country, s.name, s.domain, s.home, s.adapter, s.active, s.notes),
        )
    conn.commit()
