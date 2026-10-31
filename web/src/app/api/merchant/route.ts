import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (b.website2) return NextResponse.json({ ok: true }); // honeypot
  const name = String(b.store_name || "").trim().slice(0, 120);
  const contact = String(b.contact || "").trim().slice(0, 200);
  if (!name || !contact) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await sql`INSERT INTO merchant_leads (store_name, website, country, contact, message)
            VALUES (${name}, ${String(b.website || "").slice(0, 200) || null}, ${String(b.country || "").slice(0, 2) || null}, ${contact}, ${String(b.message || "").slice(0, 1000) || null})`;
  return NextResponse.json({ ok: true });
}
