import { after, NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { sha256 } from "@/lib/auth";

export const dynamic = "force-dynamic";
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|headless/i;

/** Outbound click: 302 to the store (affiliate template if set), log the click after responding. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ offerId: string }> }) {
  const { offerId } = await params;
  const id = Number(offerId);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
  const rows = await sql`SELECT o.url, o.store_id, s.affiliate_tpl FROM offers o JOIN stores s ON s.id = o.store_id WHERE o.id = ${id}`;
  if (!rows[0]) return NextResponse.redirect(new URL("/", req.url), 302);
  const { url, store_id, affiliate_tpl } = rows[0];
  const dest = affiliate_tpl ? String(affiliate_tpl).replace("{url}", encodeURIComponent(url)) : url;
  const ua = req.headers.get("user-agent") || "";
  if (!BOT.test(ua)) {
    const cc = req.nextUrl.searchParams.get("cc")?.slice(0, 2) || null;
    const lang = req.nextUrl.searchParams.get("lang")?.slice(0, 2) || null;
    const ref = (req.headers.get("referer") || "").slice(0, 300) || null;
    after(async () => {
      try {
        await sql`INSERT INTO clicks (offer_id, store_id, country, lang, referrer, ua_hash) VALUES (${id}, ${store_id}, ${cc}, ${lang}, ${ref}, ${await sha256(ua)})`;
      } catch { /* never block a shopper on logging */ }
    });
  }
  const res = NextResponse.redirect(dest, 302);
  res.headers.set("Referrer-Policy", "no-referrer-when-downgrade");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
