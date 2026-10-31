import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";

const KINDS = new Set(["wrong_product", "wrong_price", "out_of_stock", "other"]);

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const productId = Number(b.productId);
  const kind = KINDS.has(b.kind) ? b.kind : "other";
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await sql`INSERT INTO problem_reports (product_id, kind, note) VALUES (${productId}, ${kind}, ${String(b.note || "").slice(0, 500) || null})`;
  return NextResponse.json({ ok: true });
}
