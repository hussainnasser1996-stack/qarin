import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { TAG } from "@/lib/queries";

/** Called by the crawler after each run. Bearer REVALIDATE_SECRET. */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  revalidateTag(TAG, "max");
  revalidatePath("/[cc]/[lang]", "layout");
  return NextResponse.json({ ok: true, at: new Date().toISOString() });
}
