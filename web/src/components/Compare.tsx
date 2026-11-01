"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { t, type CC, type Lang } from "@/lib/i18n";

/** Compare list (max 4) kept on this device, per country. */
export type Cmp = { id: number; name: string; image: string | null };
const KEY = "qarin_compare";
const EVT = "qarin-compare";
export const MAX_COMPARE = 4;

function readAll(): Record<string, Cmp[]> {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function writeAll(v: Record<string, Cmp[]>) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* private mode */ }
  window.dispatchEvent(new Event(EVT));
}
const subscribe = (cb: () => void) => {
  window.addEventListener(EVT, cb); window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVT, cb); window.removeEventListener("storage", cb); };
};
const snap = () => { try { return localStorage.getItem(KEY) || "{}"; } catch { return "{}"; } };
export function useCompare(cc: CC): Cmp[] {
  const raw = useSyncExternalStore(subscribe, snap, () => "{}");
  try { return (JSON.parse(raw)[cc] ?? []) as Cmp[]; } catch { return []; }
}
function setList(cc: CC, list: Cmp[]) { const all = readAll(); all[cc] = list.slice(0, MAX_COMPARE); writeAll(all); }

export function CompareToggle({ item, cc, lang, compact = false }: { item: Cmp; cc: CC; lang: Lang; compact?: boolean }) {
  const list = useCompare(cc);
  const ar = lang === "ar";
  const on = list.some((x) => x.id === item.id);
  const full = !on && list.length >= MAX_COMPARE;
  const label = on ? (ar ? "في المقارنة" : "Comparing") : (ar ? "قارن" : "Compare");
  return (
    <button type="button" aria-pressed={on} disabled={full}
      title={full ? (ar ? "يمكن مقارنة ٤ منتجات كحد أقصى" : "You can compare up to 4 products") : undefined}
      onClick={() => setList(cc, on ? list.filter((x) => x.id !== item.id) : [...list, item])}
      className={compact
        ? `inline-flex flex-col items-center justify-center gap-1 w-full h-full text-[11px] ${on ? "text-ink font-semibold" : "text-muted hover:text-ink"} disabled:opacity-40`
        : `inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[13px] font-medium transition-colors ${on ? "border-ink bg-ink text-surface" : "border-line-strong hover:bg-sunk"} disabled:opacity-40`}>
      <span aria-hidden className={`inline-flex items-center justify-center w-4 h-4 rounded border text-[11px] leading-none ${on ? (compact ? "bg-ink text-surface border-ink" : "bg-surface text-ink border-surface") : "border-current"}`}>{on ? "✓" : ""}</span>
      {label}
    </button>
  );
}

/** Bottom tray: appears once something is picked; links to the comparison. */
export function CompareTray({ cc, lang }: { cc: CC; lang: Lang }) {
  const list = useCompare(cc);
  const d = t(lang);
  const ar = lang === "ar";
  if (!list.length) return null;
  return (
    <div className="fixed bottom-20 lg:bottom-6 inset-x-3 sm:inset-x-auto sm:end-6 z-40 sm:w-[440px] panel shadow-[0_18px_40px_-16px_rgba(12,31,36,.45)] p-3 flex items-center gap-3">
      <ul className="flex -space-x-2 rtl:space-x-reverse shrink-0">
        {list.map((x) => (
          <li key={x.id} className="w-10 h-10 rounded-lg bg-white border border-line overflow-hidden flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {x.image && <img src={x.image} alt="" className="max-w-[85%] max-h-[85%] object-contain" />}
          </li>
        ))}
      </ul>
      <p className="text-[13px] flex-1 min-w-0">
        <b className="num">{list.length}</b> / {MAX_COMPARE} {ar ? "للمقارنة" : "to compare"}
        <button type="button" onClick={() => setList(cc, [])} className="block text-[12px] text-muted underline underline-offset-4">{d.clearAll}</button>
      </p>
      {list.length >= 2 ? (
        <Link href={`/${cc}/${lang}/compare?ids=${list.map((x) => x.id).join(",")}`} className="h-10 px-4 rounded-lg bg-ink text-surface font-semibold inline-flex items-center shrink-0">
          {ar ? "قارن الآن" : "Compare now"}
        </Link>
      ) : (
        <span className="text-[12px] text-muted shrink-0">{ar ? "أضف منتجاً آخر" : "Add one more"}</span>
      )}
    </div>
  );
}
