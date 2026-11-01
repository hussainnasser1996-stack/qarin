import { NextResponse, type NextRequest } from "next/server";
import { query, sql } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { isCC } from "@/lib/i18n";
import { SITE } from "@/lib/site";
import { alertChannels, BASE_PRICE_SQL } from "@/lib/channels";

/**
 * Create a price alert on one channel.
 * - email: double opt-in by email link.
 * - telegram / whatsapp: the visitor confirms by sending the bot our one-time code (that message IS the opt-in).
 * - push: the browser's own permission prompt is the opt-in; the subscription arrives with the request.
 */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  if (b.website) return NextResponse.json({ status: "queued" }); // honeypot
  const channel = ["email", "telegram", "whatsapp", "push"].includes(b.channel) ? String(b.channel) : "email";
  const cc = String(b.cc || "");
  const lang = b.lang === "ar" ? "ar" : "en";
  const productId = Number(b.productId);
  const target = b.target === null || b.target === "" || b.target === undefined ? null : Number(b.target);
  if (!isCC(cc) || !Number.isFinite(productId) || (target !== null && !(target >= 0))) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const ch = alertChannels();
  if ((channel === "telegram" && !ch.telegram) || (channel === "whatsapp" && !ch.whatsapp) || (channel === "push" && !ch.push)) {
    return NextResponse.json({ error: "channel off" }, { status: 400 });
  }
  const base = (await query(BASE_PRICE_SQL, [productId, cc]))[0]?.p ?? null;
  const token = crypto.randomUUID().replace(/-/g, "");

  if (channel === "email") {
    const email = String(b.email || "").trim().toLowerCase().slice(0, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "invalid" }, { status: 400 });
    const rows = await sql`
      INSERT INTO alerts (channel, address, email, product_id, country, lang, target_price, token, base_price)
      VALUES ('email', ${email}, ${email}, ${productId}, ${cc}, ${lang}, ${target}, ${token}, ${base})
      ON CONFLICT (channel, address, product_id, country) WHERE address IS NOT NULL
      DO UPDATE SET target_price = EXCLUDED.target_price, lang = EXCLUDED.lang, unsubscribed_at = NULL,
                    base_price = EXCLUDED.base_price, last_sent_price = NULL
      RETURNING token, verified_at`;
    if (rows[0].verified_at) return NextResponse.json({ status: "sent" });
    const p = (await sql`SELECT name FROM products WHERE id = ${productId}`)[0];
    const verify = `${SITE}/api/alerts/verify?token=${rows[0].token}`;
    const ar = lang === "ar";
    const ok = await sendMail(
      email,
      ar ? `أكّد تنبيه السعر: ${p?.name ?? ""}` : `Confirm your price alert: ${p?.name ?? ""}`,
      `<p>${ar ? "اضغط لتأكيد تنبيه السعر" : "Click to confirm your price alert for"} <b>${p?.name ?? ""}</b>:</p><p><a href="${verify}">${ar ? "تأكيد التنبيه" : "Confirm alert"}</a></p><p style="color:#888;font-size:12px">${ar ? "إذا لم تطلب هذا، تجاهل الرسالة." : "If you didn't ask for this, ignore this email."}</p>`,
    ).catch(() => false);
    return NextResponse.json({ status: ok ? "sent" : "queued" });
  }

  if (channel === "push") {
    const sub = b.sub as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
    if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    await sql`
      INSERT INTO alerts (channel, address, push_sub, product_id, country, lang, target_price, token, base_price, verified_at)
      VALUES ('push', ${sub.endpoint.slice(0, 1000)}, ${JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys })}, ${productId}, ${cc}, ${lang}, ${target}, ${token}, ${base}, now())
      ON CONFLICT (channel, address, product_id, country) WHERE address IS NOT NULL
      DO UPDATE SET target_price = EXCLUDED.target_price, push_sub = EXCLUDED.push_sub, unsubscribed_at = NULL,
                    base_price = EXCLUDED.base_price, last_sent_price = NULL`;
    return NextResponse.json({ status: "active" });
  }

  // telegram / whatsapp: pending until the visitor sends us the code from their own account
  await sql`
    INSERT INTO alerts (channel, product_id, country, lang, target_price, token, base_price)
    VALUES (${channel}, ${productId}, ${cc}, ${lang}, ${target}, ${token}, ${base})`;
  const url = channel === "telegram"
    ? `https://t.me/${ch.telegram}?start=${token}`
    : `https://wa.me/${ch.whatsapp}?text=${encodeURIComponent(`QARIN ${token}`)}`;
  return NextResponse.json({ status: "link", url });
}
