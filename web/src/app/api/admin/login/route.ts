import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, makeSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const pw = String(form.get("password") || "");
  const expected = process.env.ADMIN_PASSWORD;
  await new Promise((r) => setTimeout(r, 400)); // slow down guessing
  if (!expected || pw.length !== expected.length || pw !== expected) {
    return NextResponse.redirect(new URL("/admin/login?e=1", req.url), 303);
  }
  const token = await makeSession();
  const res = NextResponse.redirect(new URL("/admin", req.url), 303);
  if (token) res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 7 * 86400 });
  return res;
}
