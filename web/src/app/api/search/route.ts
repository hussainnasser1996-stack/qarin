import { NextResponse, type NextRequest } from "next/server";
import { suggest } from "@/lib/queries";
import { isCC } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cc = req.nextUrl.searchParams.get("cc") || "bh";
  const q = (req.nextUrl.searchParams.get("q") || "").slice(0, 80);
  if (!isCC(cc) || q.trim().length < 2) return NextResponse.json([]);
  try {
    const hits = await suggest(cc, q.trim().toLowerCase());
    return NextResponse.json(hits, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json([]);
  }
}
