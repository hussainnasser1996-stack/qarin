import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

/** Meta webhook verification handshake. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && process.env.WHATSAPP_VERIFY_TOKEN && p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(p.get("hub.challenge") || "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

async function reply(to: string, text: string) {
  await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text, preview_url: false } }),
  }).catch(() => {});
}

/**
 * Incoming WhatsApp messages (signed with the app secret). "QARIN <code>" confirms a pending alert for this number
 * — the visitor messaging us is the opt-in. "STOP" turns off every alert for the number.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const sig = req.headers.get("x-hub-signature-256") || "";
  if (!appSecret || !process.env.WHATSAPP_TOKEN) return NextResponse.json({ ok: false }, { status: 401 });
  const expected = "sha256=" + createHmac("sha256", appSecret).update(raw).digest("hex");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = JSON.parse(raw || "{}");
  for (const entry of body.entry ?? []) for (const change of entry.changes ?? []) for (const m of change.value?.messages ?? []) {
    const from = String(m.from || "");
    const text = String(m.text?.body || m.button?.text || "").trim();
    if (!from || !text) continue;
    const code = text.match(/\b([a-f0-9]{32})\b/i);
    if (code) {
      const rows = await sql`SELECT a.id, a.lang, a.country, p.name, p.slug, p.id AS pid FROM alerts a JOIN products p ON p.id = a.product_id
                             WHERE a.token = ${code[1].toLowerCase()} AND a.channel = 'whatsapp'`;
      const a = rows[0];
      if (!a) { await reply(from, "This code has expired. / انتهت صلاحية الرمز."); continue; }
      await sql`DELETE FROM alerts WHERE channel = 'whatsapp' AND address = ${from} AND product_id = ${a.pid} AND country = ${a.country} AND id <> ${a.id}`;
      await sql`UPDATE alerts SET address = ${from}, verified_at = now() WHERE id = ${a.id}`;
      await reply(from, a.lang === "ar"
        ? `تم ✅ سنرسل لك هنا عندما ينزل سعر ${a.name}.\n${SITE}/${a.country}/ar/p/${a.slug}-${a.pid}\nأرسل STOP لإيقاف التنبيهات.`
        : `Done ✅ We'll message you here when ${a.name} gets cheaper.\n${SITE}/${a.country}/en/p/${a.slug}-${a.pid}\nReply STOP to turn off alerts.`);
    } else if (/^(stop|إيقاف|ايقاف|الغاء|إلغاء)$/i.test(text)) {
      const n = await sql`UPDATE alerts SET unsubscribed_at = now() WHERE channel = 'whatsapp' AND address = ${from} AND unsubscribed_at IS NULL RETURNING id`;
      await reply(from, `Stopped ${n.length} alert(s). / تم إيقاف ${n.length} تنبيه.`);
    }
  }
  return NextResponse.json({ ok: true });
}
