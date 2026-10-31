import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get("token") || "").slice(0, 64);
  const rows = token ? await sql`UPDATE alerts SET verified_at = COALESCE(verified_at, now()) WHERE token = ${token} RETURNING country, lang` : [];
  const r = rows[0];
  return NextResponse.redirect(new URL(r ? `/${r.country}/${r.lang}/alerts?s=confirmed` : "/", req.url), 302);
}
