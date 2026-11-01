import { NextResponse, type NextRequest } from "next/server";
import { isCC } from "@/lib/i18n";
import { pricesFor } from "@/lib/queries";

/** Current lowest prices for a visitor's saved list. */
export async function GET(req: NextRequest) {
  const cc = req.nextUrl.searchParams.get("cc") || "";
  const ids = (req.nextUrl.searchParams.get("ids") || "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0);
  if (!isCC(cc) || !ids.length) return NextResponse.json([]);
  const rows = await pricesFor(cc, ids).catch(() => []);
  return NextResponse.json(rows, { headers: { "cache-control": "public, s-maxage=600, stale-while-revalidate=3600" } });
}
