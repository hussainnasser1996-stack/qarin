import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, validSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

function Table({ title, rows }: { title: string; rows: Record<string, unknown>[] }) {
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <section className="panel overflow-x-auto">
      <h2 className="font-bold px-4 pt-3 pb-2">{title} <span className="text-muted font-normal text-[13px]">({rows.length})</span></h2>
      {rows.length === 0 ? <p className="px-4 pb-4 text-muted text-[14px]">Nothing yet.</p> : (
        <table className="w-full text-[13px]">
          <thead className="bg-paper text-muted"><tr>{cols.map((c) => <th key={c} className="text-start px-3 py-1.5 font-medium">{c}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={i}>{cols.map((c) => <td key={c} className="px-3 py-1.5 align-top max-w-[360px] break-words">{r[c] instanceof Date ? (r[c] as Date).toISOString().slice(0, 16) : String(r[c] ?? "")}</td>)}</tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default async function Admin() {
  // Re-check here: never rely on the proxy alone.
  if (!(await validSession((await cookies()).get(ADMIN_COOKIE)?.value))) redirect("/admin/login");
  const [clicksByStore, clicksByDay, coverage, runs, reports, leads, alerts, review] = await Promise.all([
    sql`SELECT store_id, count(*)::int AS clicks_30d, count(*) FILTER (WHERE ts > now() - interval '1 day')::int AS clicks_24h
        FROM clicks WHERE ts > now() - interval '30 days' GROUP BY 1 ORDER BY 2 DESC`,
    sql`SELECT to_char(date_trunc('day', ts), 'YYYY-MM-DD') AS day, country, count(*)::int AS clicks
        FROM clicks WHERE ts > now() - interval '14 days' GROUP BY 1, 2 ORDER BY 1 DESC, 3 DESC`,
    sql`SELECT s.id AS store, count(o.id)::int AS offers, count(o.id) FILTER (WHERE o.price IS NOT NULL)::int AS priced,
               count(o.id) FILTER (WHERE p.offer_count > 1)::int AS matched,
               (SELECT count(*)::int FROM store_urls su WHERE su.store_id = s.id) AS urls,
               (SELECT count(*)::int FROM store_urls su WHERE su.store_id = s.id AND su.kind IS NULL) AS unfetched,
               (SELECT count(*)::int FROM store_urls su WHERE su.store_id = s.id AND su.kind = 'blocked') AS blocked,
               max(o.last_seen) AS last_seen
        FROM stores s LEFT JOIN offers o ON o.store_id = s.id LEFT JOIN products p ON p.id = o.product_id
        GROUP BY s.id ORDER BY s.id`,
    sql`SELECT store_id, phase, started_at, finished_at, pages_ok, pages_blocked, pages_error, offers_seen, price_changes
        FROM scrape_runs ORDER BY id DESC LIMIT 40`,
    sql`SELECT r.id, r.kind, r.note, p.name, r.created_at FROM problem_reports r LEFT JOIN products p ON p.id = r.product_id
        WHERE NOT r.resolved ORDER BY r.id DESC LIMIT 50`,
    sql`SELECT store_name, website, country, contact, message, created_at FROM merchant_leads ORDER BY id DESC LIMIT 50`,
    sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE verified_at IS NOT NULL)::int AS verified,
               count(*) FILTER (WHERE unsubscribed_at IS NOT NULL)::int AS unsubscribed FROM alerts`,
    sql`SELECT p.id, p.name, p.offer_count, p.country_count, array_to_string(array_agg(DISTINCT o.store_id), ', ') AS stores,
               max(o.price) / NULLIF(min(o.price), 0) AS max_over_min
        FROM products p JOIN offers o ON o.product_id = p.id JOIN stores s ON s.id = o.store_id
        WHERE p.offer_count > 1 AND o.price IS NOT NULL
        GROUP BY p.id HAVING max(o.price) / NULLIF(min(o.price), 0) > 1.6 ORDER BY 6 DESC LIMIT 40`,
  ]);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-bold">Qarin admin</h1>
        <form method="post" action="/api/admin/logout"><button className="h-9 px-3 rounded-md border border-line">Sign out</button></form>
      </div>
      <p className="text-[14px] text-muted">Alerts: {alerts[0].total} total · {alerts[0].verified} verified · {alerts[0].unsubscribed} unsubscribed</p>
      <Table title="Clicks by store (30 days) — the number we sell to stores" rows={clicksByStore} />
      <Table title="Clicks by day & country (14 days)" rows={clicksByDay} />
      <Table title="Coverage by store" rows={coverage} />
      <Table title="Match review queue — groups with >60% price spread (likely mismatches)" rows={review} />
      <Table title="Problem reports" rows={reports} />
      <Table title="Store sign-ups (merchant leads)" rows={leads} />
      <Table title="Recent crawl runs" rows={runs} />
    </div>
  );
}
