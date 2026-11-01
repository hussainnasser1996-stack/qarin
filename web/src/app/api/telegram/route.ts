import { NextResponse, type NextRequest } from "next/server";
import { sql } from "@/lib/db";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

async function reply(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  }).catch(() => {});
}

/**
 * Telegram bot webhook. Telegram sends our secret in X-Telegram-Bot-Api-Secret-Token (set with setWebhook).
 * "/start <code>" confirms a pending alert for this chat; "/stop" turns off every alert for this chat.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!process.env.TELEGRAM_BOT_TOKEN || !secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const u = await req.json().catch(() => ({}));
  const msg = u.message;
  if (!msg?.chat?.id || typeof msg.text !== "string") return NextResponse.json({ ok: true });
  const chat = String(msg.chat.id);
  const text = msg.text.trim();
  const arUser = (msg.from?.language_code || "").startsWith("ar");

  const start = text.match(/^\/start\s+([a-f0-9]{32})$/);
  if (start) {
    const rows = await sql`SELECT a.id, a.lang, a.country, p.name, p.slug, p.id AS pid FROM alerts a JOIN products p ON p.id = a.product_id
                           WHERE a.token = ${start[1]} AND a.channel = 'telegram'`;
    const a = rows[0];
    if (!a) {
      await reply(chat, arUser ? "انتهت صلاحية هذا الرابط. أنشئ التنبيه مرة أخرى من صفحة المنتج." : "This link has expired. Create the alert again from the product page.");
      return NextResponse.json({ ok: true });
    }
    // Same chat already watching this product: keep the newest settings on the existing row.
    const dup = await sql`SELECT id FROM alerts WHERE channel = 'telegram' AND address = ${chat} AND product_id = ${a.pid} AND country = ${a.country} AND id <> ${a.id}`;
    if (dup[0]) {
      await sql`UPDATE alerts d SET target_price = n.target_price, base_price = n.base_price, lang = n.lang, unsubscribed_at = NULL,
                  last_sent_price = NULL, verified_at = now() FROM alerts n WHERE d.id = ${dup[0].id} AND n.id = ${a.id}`;
      await sql`DELETE FROM alerts WHERE id = ${a.id}`;
    } else {
      await sql`UPDATE alerts SET address = ${chat}, verified_at = now() WHERE id = ${a.id}`;
    }
    const url = `${SITE}/${a.country}/${a.lang}/p/${a.slug}-${a.pid}`;
    await reply(chat, a.lang === "ar"
      ? `تم ✅ سنرسل لك هنا عندما ينزل سعر ${a.name}.\n${url}\nلإيقاف كل التنبيهات أرسل /stop`
      : `Done ✅ We'll message you here when ${a.name} gets cheaper.\n${url}\nSend /stop to turn off all alerts.`);
    return NextResponse.json({ ok: true });
  }
  if (/^\/stop\b/.test(text)) {
    const n = await sql`UPDATE alerts SET unsubscribed_at = now() WHERE channel = 'telegram' AND address = ${chat} AND unsubscribed_at IS NULL RETURNING id`;
    await reply(chat, arUser ? `تم إيقاف ${n.length} تنبيه.` : `Stopped ${n.length} alert(s).`);
    return NextResponse.json({ ok: true });
  }
  await reply(chat, arUser
    ? `أهلاً! أنشئ تنبيه سعر من أي صفحة منتج في قارن واختر تيليجرام.\n${SITE}`
    : `Hi! Create a price alert from any product page on Qarin and choose Telegram.\n${SITE}`);
  return NextResponse.json({ ok: true });
}
