"use client";

import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";

export function AlertForm({ productId, cc, lang, currency }: { productId: number; cc: string; lang: Lang; currency: string }) {
  const d = t(lang);
  const [state, setState] = useState<"idle" | "busy" | "sent" | "queued" | "error">("idle");
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setState("busy");
        const r = await fetch("/api/alerts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, cc, lang, email: f.get("email"), target: f.get("target") || null, website: f.get("website") }),
        }).catch(() => null);
        if (!r || !r.ok) return setState("error");
        const j = await r.json();
        setState(j.status === "sent" ? "sent" : "queued");
      }}
    >
      <p className="font-semibold">{d.priceAlert}</p>
      <p className="text-muted text-[13px]">{d.priceAlertSub}</p>
      {state === "sent" || state === "queued" ? (
        <p role="status" className="text-deal-ink bg-deal-wash rounded-md p-2 text-[14px]">{state === "sent" ? d.alertSent : d.alertQueued}</p>
      ) : (
        <>
          <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <label className="block text-[13px]">{d.email}
            <input name="email" type="email" required className="mt-1 w-full h-10 px-3 rounded-md border border-line bg-surface" />
          </label>
          <label className="block text-[13px]">{d.targetPrice} <span className="text-muted">({currency})</span>
            <input name="target" type="number" step="0.001" min="0" inputMode="decimal" className="mt-1 w-full h-10 px-3 rounded-md border border-line bg-surface ltr" />
          </label>
          <button disabled={state === "busy"} className="w-full h-10 rounded-md bg-ink text-surface font-medium disabled:opacity-60">{d.createAlert}</button>
          {state === "error" && <p className="text-warn text-[13px]">!</p>}
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
