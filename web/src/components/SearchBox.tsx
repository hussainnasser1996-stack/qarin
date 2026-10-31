"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { money } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

type Hit = { id: number; slug: string; name: string; image: string | null; min_price: string; currency: string; n_offers: number };

export function SearchBox({ cc, lang, placeholder, initial = "", big = false }: { cc: string; lang: Lang; placeholder: string; initial?: string; big?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [hits, setHits] = useState<Hit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (q.trim().length < 2) { setHits([]); return; }
      try {
        const r = await fetch(`/api/search?cc=${cc}&q=${encodeURIComponent(q)}`);
        if (r.ok) { setHits(await r.json()); setOpen(true); setActive(-1); }
      } catch { /* offline: plain submit still works */ }
    }, 160);
  }, [q, cc]);

  const go = (h?: Hit) => {
    setOpen(false);
    if (h) router.push(`/${cc}/${lang}/p/${h.slug}-${h.id}`);
    else if (q.trim()) router.push(`/${cc}/${lang}/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form role="search" className="relative" onSubmit={(e) => { e.preventDefault(); go(active >= 0 ? hits[active] : undefined); }}>
      <label className="sr-only" htmlFor={`${listId}-in`}>{placeholder}</label>
      <input
        id={`${listId}-in`}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        className={`w-full bg-paper border border-line rounded-[10px] ps-10 pe-3 outline-none focus:border-ink-2 focus:bg-surface placeholder:text-muted ${big ? "h-14 text-[17px]" : "h-11 text-[15px]"}`}
      />
      <svg aria-hidden className="absolute top-1/2 -translate-y-1/2 start-3 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      {open && hits.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-40 mt-1 w-full panel shadow-lg overflow-hidden">
          {hits.map((h, i) => (
            <li key={h.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); go(h); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-start ${i === active ? "bg-paper" : "hover:bg-paper"}`}>
                <span className="w-9 h-9 shrink-0 rounded bg-white border border-line overflow-hidden flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {h.image ? <img src={h.image} alt="" className="max-w-full max-h-full object-contain" loading="lazy" /> : null}
                </span>
                <span className="flex-1 min-w-0 truncate text-[14px]">{h.name}</span>
                <span className="text-[13px] text-deal-ink font-semibold num">{money(h.min_price, h.currency, lang)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
