"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";

type Ch = "email" | "telegram" | "whatsapp" | "push";
type Channels = { email: boolean; telegram: string | null; whatsapp: string | null; push: string | null };

function b64ToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Price alert on the channel the shopper actually reads. Channels without credentials are not offered. */
export function AlertForm({ productId, cc, lang, currency, channels, inStock }: {
  productId: number; cc: string; lang: Lang; currency: string; channels: Channels; inStock: boolean;
}) {
  const d = t(lang);
  const ar = lang === "ar";
  const avail = ([
    ["push", channels.push ? (ar ? "إشعار" : "Notification") : null],
    ["telegram", channels.telegram ? "Telegram" : null],
    ["whatsapp", channels.whatsapp ? "WhatsApp" : null],
    ["email", ar ? "البريد" : "Email"],
  ] as [Ch, string | null][]).filter((x) => x[1]) as [Ch, string][];
  const [ch, setCh] = useState<Ch>(avail[0][0]);
  const [state, setState] = useState<"idle" | "busy" | "sent" | "queued" | "active" | "link" | "denied" | "error">("idle");
  const [link, setLink] = useState("");

  async function submit(f: FormData) {
    setState("busy");
    let sub: PushSubscriptionJSON | undefined;
    if (ch === "push") {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState("denied");
        const perm = await Notification.requestPermission();
        if (perm !== "granted") return setState("denied");
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        const s = (await reg.pushManager.getSubscription()) ||
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(channels.push!) }));
        sub = s.toJSON();
      } catch { return setState("denied"); }
    }
    const r = await fetch("/api/alerts", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ channel: ch, productId, cc, lang, email: f.get("email"), target: f.get("target") || null, website: f.get("website"), sub }),
    }).catch(() => null);
    if (!r || !r.ok) return setState("error");
    const j = await r.json();
    if (j.status === "link") { setLink(j.url); window.open(j.url, "_blank", "noopener"); return setState("link"); }
    setState(j.status === "sent" ? "sent" : j.status === "active" ? "active" : "queued");
  }

  const done: Record<string, string> = {
    sent: d.alertSent, queued: d.alertQueued,
    active: ar ? "تم ✅ سيصلك إشعار على هذا الجهاز عندما ينزل السعر." : "Done ✅ This device will get a notification when the price drops.",
  };
  return (
    <form className="space-y-2.5" onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }}>
      <p className="font-semibold">{d.priceAlert}</p>
      <p className="text-muted text-[13px]">
        {inStock ? (ar ? "نخبرك عندما ينزل السعر." : "We'll tell you when the price drops.") : (ar ? "غير متوفر الآن — نخبرك فور عودته." : "Out of stock now — we'll tell you when it's back.")}
      </p>
      {state in done ? (
        <p role="status" className="text-deal-ink bg-deal-wash rounded-md p-2 text-[14px]">{done[state]}</p>
      ) : state === "link" ? (
        <div role="status" className="rounded-md bg-sunk border border-line p-3 text-[13px] space-y-2">
          <p>{ch === "telegram"
            ? (ar ? "افتح تيليجرام واضغط «ابدأ» لتفعيل التنبيه." : "Open Telegram and tap Start to switch the alert on.")
            : (ar ? "أرسل الرسالة الجاهزة في واتساب لتفعيل التنبيه." : "Send the ready-made WhatsApp message to switch the alert on.")}</p>
          <a href={link} target="_blank" rel="noopener" className="inline-flex h-9 px-3 items-center rounded-md bg-ink text-surface font-medium">
            {ch === "telegram" ? (ar ? "فتح تيليجرام" : "Open Telegram") : (ar ? "فتح واتساب" : "Open WhatsApp")}
          </a>
        </div>
      ) : (
        <>
          {avail.length > 1 && (
            <div role="tablist" aria-label={ar ? "طريقة التنبيه" : "Alert channel"} className="grid gap-1 p-1 rounded-lg bg-sunk border border-line"
              style={{ gridTemplateColumns: `repeat(${avail.length}, minmax(0, 1fr))` }}>
              {avail.map(([k, label]) => (
                <button key={k} type="button" role="tab" aria-selected={ch === k} onClick={() => setCh(k)}
                  className={`h-8 rounded-md text-[12px] font-medium ${ch === k ? "bg-surface shadow-sm border border-line" : "text-ink-2"}`}>{label}</button>
              ))}
            </div>
          )}
          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          {ch === "email" && (
            <label className="block text-[13px]">{d.email}
              <input name="email" type="email" required className="mt-1 w-full h-10 px-3 rounded-md border border-line bg-surface" />
            </label>
          )}
          {inStock && (
            <label className="block text-[13px]">{d.targetPrice} <span className="text-muted">({currency})</span>
              <input name="target" type="number" step="0.001" min="0" inputMode="decimal" className="mt-1 w-full h-10 px-3 rounded-md border border-line bg-surface ltr" />
            </label>
          )}
          <button disabled={state === "busy"} className="w-full h-10 rounded-md bg-ink text-surface font-medium disabled:opacity-60">{d.createAlert}</button>
          {state === "denied" && <p className="text-warn text-[13px]">{ar ? "لم يُسمح بالإشعارات في هذا المتصفح. جرّب طريقة أخرى." : "Notifications aren't allowed in this browser. Try another channel."}</p>}
          {state === "error" && <p className="text-warn text-[13px]">{ar ? "تعذّر الحفظ. حاول مرة أخرى." : "Couldn't save. Please try again."}</p>}
        </>
      )}
    </form>
  );
}

export function ReportForm({ productId, lang }: { productId: number; lang: Lang }) {
  const d = t(lang);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  if (done) return <p role="status" className="text-[13px] text-muted">{d.thanks}</p>;
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-[13px] text-muted underline">{d.report}</button>
      {open && (
        <form className="mt-2 space-y-2" onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          await fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ productId, kind: f.get("kind"), note: f.get("note") }) }).catch(() => null);
          setDone(true);
        }}>
          <select name="kind" className="w-full h-9 px-2 rounded-md border border-line bg-surface text-[13px]">
            <option value="wrong_product">{d.reportWrongProduct}</option>
            <option value="wrong_price">{d.reportWrongPrice}</option>
            <option value="other">{d.reportOther}</option>
          </select>
          <textarea name="note" rows={2} maxLength={500} className="w-full px-2 py-1 rounded-md border border-line bg-surface text-[13px]" />
          <button className="h-9 px-3 rounded-md border border-line text-[13px]">{d.send}</button>
        </form>
      )}
    </div>
  );
}

export function MerchantForm({ lang }: { lang: Lang }) {
  const d = t(lang);
  const [done, setDone] = useState(false);
  if (done) return <p role="status" className="text-deal-ink bg-deal-wash rounded-md p-3">{d.thanks}</p>;
  const field = "mt-1 w-full h-10 px-3 rounded-md border border-line bg-surface";
  return (
    <form className="space-y-3 max-w-lg" onSubmit={async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.currentTarget));
      const r = await fetch("/api/merchant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) }).catch(() => null);
      if (r?.ok) setDone(true);
    }}>
      <input name="website2" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <label className="block text-[14px]">{d.storeName}<input name="store_name" required maxLength={120} className={field} /></label>
      <label className="block text-[14px]">{d.website}<input name="website" maxLength={200} className={`${field} ltr`} /></label>
      <label className="block text-[14px]">{d.country}
        <select name="country" className={field}>
          {["bh", "ae", "sa", "kw", "qa", "om"].map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>
      </label>
      <label className="block text-[14px]">{d.contactField}<input name="contact" required maxLength={200} className={`${field} ltr`} /></label>
      <label className="block text-[14px]">{d.message}<textarea name="message" rows={3} maxLength={1000} className="mt-1 w-full px-3 py-2 rounded-md border border-line bg-surface" /></label>
      <button className="h-11 px-5 rounded-md bg-ink text-surface font-medium">{d.send}</button>
    </form>
  );
}
