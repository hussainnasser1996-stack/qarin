"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { money, productPath } from "@/lib/format";
import { t, type CC, type Lang } from "@/lib/i18n";

/** Saved products live on this device only (no account needed), like idealo's and PriceSpy's guest lists. */
export type Saved = { id: number; slug: string; name: string; image: string | null; cc: CC; price: number | null; currency: string; at: string };
const KEY = "qarin_list";
const EVT = "qarin-list";

function read(): Saved[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Saved[]; } catch { return []; }
}
function write(v: Saved[]) {
  try { localStorage.setItem(KEY, JSON.stringify(v.slice(0, 100))); } catch { /* private mode: list just won't persist */ }
  window.dispatchEvent(new Event(EVT));
}
const subscribe = (cb: () => void) => {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener("storage", cb); };
};
const snapshot = () => { try { return localStorage.getItem(KEY) || "[]"; } catch { return "[]"; } };
export function useSaved(): Saved[] {
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]");
  try { return JSON.parse(raw) as Saved[]; } catch { return []; }
}

function Heart({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 20s-7-4.4-9.2-8.6C1.3 8.5 3 5 6.4 5c2 0 3.3 1.1 4 2.3h3.2C14.3 6.1 15.6 5 17.6 5 21 5 22.7 8.5 21.2 11.4 19 15.6 12 20 12 20z" />
    </svg>
  );
}

export function WatchButton({ item, lang }: { item: Omit<Saved, "at">; lang: Lang }) {
  const d = t(lang);
  const list = useSaved();
  const on = list.some((x) => x.id === item.id && x.cc === item.cc);
  return (
    <button type="button" aria-pressed={on}
      onClick={() => write(on ? read().filter((x) => !(x.id === item.id && x.cc === item.cc)) : [{ ...item, at: new Date().toISOString() }, ...read()])}
      className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[13px] font-medium transition-colors ${on ? "border-ink bg-ink text-surface" : "border-line-strong hover:bg-sunk"}`}>
      <Heart on={on} /> {on ? d.saved : d.save2}
    </button>
  );
}

export function ShareButton({ title, lang }: { title: string; lang: Lang }) {
  const d = t(lang);
  const [done, setDone] = useState(false);
  return (
    <button type="button"
      onClick={async () => {
        const url = location.href;
        try {
          if (navigator.share) await navigator.share({ title, url });
          else { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2000); }
        } catch { /* user closed the share sheet */ }
      }}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-line-strong hover:bg-sunk text-[13px] font-medium">
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" />
      </svg>
      <span role="status">{done ? d.copied : d.share}</span>
    </button>
  );
}

/** Header link with a count, so a saved list is discoverable. */
export function ListLink({ cc, lang }: { cc: CC; lang: Lang }) {
  const n = useSaved().filter((x) => x.cc === cc).length;
  return (
    <Link href={`/${cc}/${lang}/list`} className="relative inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-paper" aria-label={t(lang).myList}>
      <Heart on={n > 0} />
      <span className="hidden sm:inline">{t(lang).myList}</span>
      {n > 0 && <span className="num text-[11px] bg-tag text-tag-ink rounded-full px-1.5 leading-[18px]">{n}</span>}
    </Link>
  );
}

type Live = { id: number; slug: string; name: string; image: string | null; min_price: string | null; cheapest_store: string | null; currency: string };

export function SavedList({ cc, lang }: { cc: CC; lang: Lang }) {
  const d = t(lang);
  const list = useSaved().filter((x) => x.cc === cc);
  const [live, setLive] = useState<Record<number, Live>>({});
  const ids = list.map((x) => x.id).join(",");
  useEffect(() => {
    if (!ids) return;
    fetch(`/api/prices?cc=${cc}&ids=${ids}`).then((r) => r.json()).then((rows: Live[]) => {
      setLive(Object.fromEntries(rows.map((r) => [Number(r.id), r])));
    }).catch(() => {});
  }, [cc, ids]);
  if (!list.length) {
    return (
      <div className="panel p-10 text-center">
        <p className="font-display font-semibold text-[18px]">{d.myListEmpty}</p>
        <p className="text-muted mt-1">{d.myListEmptySub}</p>
      </div>
    );
  }
  return (
    <ul className="panel divide-y divide-line">
      {list.map((x) => {
        const l = live[x.id];
        const now = l?.min_price != null ? Number(l.min_price) : null;
        const diff = now !== null && x.price !== null ? now - x.price : null;
        return (
          <li key={`${x.cc}-${x.id}`} className="flex items-center gap-3 px-3 sm:px-5 py-3">
            <Link href={productPath(cc, lang, l?.slug ?? x.slug, x.id)} className="flex items-center gap-3 min-w-0 flex-1 group">
              <span className="w-14 h-14 shrink-0 rounded-xl bg-white border border-line flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {x.image && <img src={x.image} alt="" className="max-w-[86%] max-h-[86%] object-contain" />}
              </span>
              <span className="min-w-0">
                <span className="block font-medium clamp-2 group-hover:underline underline-offset-4">{l?.name ?? x.name}</span>
                <span className="block text-[12px] text-muted mt-0.5">{d.whenSaved}: <span className="num">{money(x.price, x.currency, lang)}</span></span>
              </span>
            </Link>
            <span className="text-end shrink-0">
              <span className="block text-[11px] text-muted">{d.now}</span>
              <span className="block font-display font-bold num">{money(now, x.currency, lang)}</span>
              {diff !== null && Math.abs(diff) > 0.0005 && (
                <span className={`block text-[12px] font-semibold num ${diff < 0 ? "text-deal-ink" : "text-warn"}`}>
                  {diff < 0 ? "▼" : "▲"} {money(Math.abs(diff), x.currency, lang)}
                </span>
              )}
            </span>
            <button type="button" onClick={() => write(read().filter((y) => !(y.id === x.id && y.cc === x.cc)))}
              className="text-[12px] text-muted underline underline-offset-4 shrink-0">{d.remove}</button>
          </li>
        );
      })}
    </ul>
  );
}
