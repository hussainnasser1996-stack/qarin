import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { isCC } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (b.website) return NextResponse.json({ status: "queued" }); // honeypot
  const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
  const cc = String(b.cc || "");
  const lang = b.lang === "ar" ? "ar" : "en";
  const productId = Number(b.productId);
  const target = b.target === null || b.target === "" || b.target === undefined ? null : Number(b.target);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !isCC(cc) || !Number.isFinite(productId) || (target !== null && !(target >= 0))) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const token = crypto.randomUUID().replace(/-/g, "");
  const rows = await sql`
    INSERT INTO alerts (email, product_id, country, lang, target_price, token)
    VALUES (${email}, ${productId}, ${cc}, ${lang}, ${target}, ${token})
    ON CONFLICT (email, product_id, country) DO UPDATE SET target_price = EXCLUDED.target_price, lang = EXCLUDED.lang, unsubscribed_at = NULL
    RETURNING token, verified_at`;
  const tok = rows[0].token as string;
  if (rows[0].verified_at) return NextResponse.json({ status: "sent" });
  const p = (await sql`SELECT name FROM products WHERE id = ${productId}`)[0];
  const verify = `${SITE}/api/alerts/verify?token=${tok}`;
  const ar = lang === "ar";
  const ok = await sendMail(
    email,
    ar ? `أكّد تنبيه السعر: ${p?.name ?? ""}` : `Confirm your price alert: ${p?.name ?? ""}`,
    `<p>${ar ? "اضغط لتأكيد تنبيه السعر" : "Click to confirm your price alert for"} <b>${p?.name ?? ""}</b>:</p><p><a href="${verify}">${ar ? "تأكيد التنبيه" : "Confirm alert"}</a></p><p style="color:#888;font-size:12px">${ar ? "إذا لم تطلب هذا، تجاهل الرسالة." : "If you didn't ask for this, ignore this email."}</p>`,
  ).catch(() => false);
  return NextResponse.json({ status: ok ? "sent" : "queued" });
}
