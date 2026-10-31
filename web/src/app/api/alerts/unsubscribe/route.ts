import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

async function unsub(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get("token") || "").slice(0, 64);
  const rows = token ? await sql`UPDATE alerts SET unsubscribed_at = now() WHERE token = ${token} RETURNING country, lang` : [];
  return rows[0];
}

export async function GET(req: NextRequest) {
  const r = await unsub(req);
  return NextResponse.redirect(new URL(r ? `/${r.country}/${r.lang}/alerts?s=unsubscribed` : "/", req.url), 302);
}

/** RFC 8058 one-click unsubscribe from mail clients. */
export async function POST(req: NextRequest) {
  await unsub(req);
  return new NextResponse(null, { status: 204 });
}
