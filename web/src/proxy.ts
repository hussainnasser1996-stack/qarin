import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, validSession } from "@/lib/auth";

const CCS = ["bh", "ae", "sa", "kw", "qa", "om"];
const GEO: Record<string, string> = { BH: "bh", AE: "ae", SA: "sa", KW: "kw", QA: "qa", OM: "om" };

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Root: pick the visitor's GCC country (Vercel geo header) and language.
  if (pathname === "/") {
    const geo = GEO[(req.headers.get("x-vercel-ip-country") || "").toUpperCase()];
    const pref = req.cookies.get("qarin_cc")?.value;
    const cc = pref && CCS.includes(pref) ? pref : geo || "bh";
    const al = (req.headers.get("accept-language") || "").toLowerCase();
    const lang = al.startsWith("en") ? "en" : al.includes("ar") || !al ? "ar" : "en";
    return NextResponse.redirect(new URL(`/${cc}/${lang}`, req.url), 307);
  }

  // Admin gate (also re-checked inside every admin page and API route).
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!(await validSession(req.cookies.get(ADMIN_COOKIE)?.value))) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  }
  if (pathname.startsWith("/api/admin/") && pathname !== "/api/admin/login") {
    if (!(await validSession(req.cookies.get(ADMIN_COOKIE)?.value))) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // Remember the chosen country for the next visit to "/".
  const m = pathname.match(/^\/(bh|ae|sa|kw|qa|om)\/(ar|en)(\/|$)/);
  if (m) {
    const res = NextResponse.next();
    if (req.cookies.get("qarin_cc")?.value !== m[1]) res.cookies.set("qarin_cc", m[1], { path: "/", maxAge: 31536000, sameSite: "lax" });
    return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/api/admin/:path*", "/(bh|ae|sa|kw|qa|om)/:path*"],
};
