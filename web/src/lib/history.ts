import type { HistoryRow } from "./queries";

export type Point = { d: string; min: number | null; [store: string]: number | null | string };

/** Turn the change-log (one row per price/stock change) into a daily step series per store + daily min. */
export function dailySeries(rows: HistoryRow[], days = 400): { points: Point[]; stores: string[] } {
  if (!rows.length) return { points: [], stores: [] };
  const byOffer = new Map<number, { store: string; changes: { t: number; price: number | null; inStock: boolean | null }[] }>();
  for (const r of rows) {
    const e = byOffer.get(r.offer_id) ?? { store: r.store, changes: [] };
    e.changes.push({ t: new Date(r.observed_at).getTime(), price: r.price === null ? null : Number(r.price), inStock: r.in_stock });
    byOffer.set(r.offer_id, e);
  }
  const start = Math.max(Math.min(...rows.map((r) => new Date(r.observed_at).getTime())), Date.now() - days * 864e5);
  const dayMs = 864e5;
  const first = Math.floor(start / dayMs) * dayMs;
  const last = Math.floor(Date.now() / dayMs) * dayMs;
  const stores = [...new Set([...byOffer.values()].map((e) => e.store))];
  const points: Point[] = [];
  const idx = new Map<number, number>();
  for (let day = first; day <= last; day += dayMs) {
    const endOfDay = day + dayMs - 1;
    const p: Point = { d: new Date(day).toISOString().slice(0, 10), min: null };
    for (const s of stores) p[s] = null;
    for (const [oid, e] of byOffer) {
      let i = idx.get(oid) ?? -1;
      while (i + 1 < e.changes.length && e.changes[i + 1].t <= endOfDay) i++;
      idx.set(oid, i);
      if (i < 0) continue;
      const c = e.changes[i];
      if (c.price === null || c.inStock === false) continue;
      const cur = p[e.store] as number | null;
      p[e.store] = cur === null ? c.price : Math.min(cur, c.price);
      p.min = p.min === null ? c.price : Math.min(p.min, c.price);
    }
    points.push(p);
  }
  return { points, stores };
}

export type Stats = { low: number; high: number; typical: number; lowest30: number | null; lowestEver: number; days: number };

export function stats(points: Point[]): Stats | null {
  const mins = points.map((p) => p.min).filter((x): x is number => x !== null);
  if (!mins.length) return null;
  const last90 = points.slice(-90).map((p) => p.min).filter((x): x is number => x !== null);
  const sorted = [...last90].sort((a, b) => a - b);
  const q = (f: number) => sorted[Math.min(sorted.length - 1, Math.floor(f * (sorted.length - 1)))];
  const last30 = points.slice(-30).map((p) => p.min).filter((x): x is number => x !== null);
  return {
    low: q(0.1), high: q(0.9), typical: q(0.5),
    lowest30: last30.length ? Math.min(...last30) : null,
    lowestEver: Math.min(...mins),
    days: points.length,
  };
}

export type Verdict = "great" | "good" | "wait" | "new";
export function verdict(current: number | null, s: Stats | null): Verdict {
  if (current === null || !s || s.days < 14) return "new";
  if (current <= s.low + 1e-9 || current <= s.lowestEver * 1.01) return "great";
  if (current <= s.typical * 1.01) return "good";
  return "wait";
}
