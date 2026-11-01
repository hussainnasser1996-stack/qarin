import Link from "next/link";
import { money, productPath, storeName } from "@/lib/format";
import { categoryName, t, type CC, type Lang } from "@/lib/i18n";
import type { ListItem } from "@/lib/queries";
import { PriceTag, SpreadBar } from "./Spread";

export function Thumb({ src, size = 64, alt = "" }: { src: string | null; size?: number; alt?: string }) {
  return (
    <span className="shrink-0 rounded-xl bg-white border border-line overflow-hidden flex items-center justify-center" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt={alt} loading="lazy" className="max-w-[86%] max-h-[86%] object-contain" /> : <span className="text-line-strong text-xs">—</span>}
    </span>
  );
}

/** Rows, not cards: a comparison site is scanned like a price list. Each row shows the shelf label + store spread. */
export function ProductList({ items, cc, lang, showGap = false }: { items: ListItem[]; cc: CC; lang: Lang; showGap?: boolean }) {
  const d = t(lang);
  return (
    <ul className="panel divide-y divide-line overflow-hidden">
      {items.map((p) => {
        const min = Number(p.min_price), max = Number(p.max_price);
        const saving = max && min && max > min ? max - min : 0;
        const spread = (p.spread || []).map((x) => ({ s: x.s, p: Number(x.p) }));
        return (
          <li key={p.id}>
            <Link href={productPath(cc, lang, p.slug, p.id)}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 sm:gap-x-5 gap-y-1 px-3 sm:px-5 py-3.5 hover:bg-sunk transition-colors">
              <Thumb src={p.image} />
              <span className="min-w-0">
                <span className="block font-medium clamp-2 leading-snug text-[15px]">{p.name}</span>
                <span className="block text-muted text-[13px] mt-0.5">
                  {categoryName(p.category, lang)}
                  {p.n_offers > 1 ? <> · <span className="num">{p.n_offers}</span> {d.stores}</> : p.cheapest_store ? ` · ${storeName(p.cheapest_store, lang)}` : ""}
                </span>
                {spread.length > 1 && (
                  <span className="hidden sm:block max-w-[340px] mt-1"><SpreadBar spread={spread} currency={p.currency} lang={lang} /></span>
                )}
              </span>
              <span className="flex flex-col items-end gap-1 text-end">
                {p.min_price !== null && <PriceTag amount={p.min_price} currency={p.currency} lang={lang} size="sm" />}
                {p.cheapest_store && p.n_offers > 1 && <span className="text-[12px] text-ink-2">{storeName(p.cheapest_store, lang)}</span>}
                {showGap && saving > 0 && (
                  <span className="text-[12px] font-semibold text-deal-ink">
                    {d.save} <span className="num">{money(saving, p.currency, lang)}</span>
                  </span>
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="panel p-10 text-center">
      <p className="font-display font-semibold text-[18px]">{title}</p>
      {sub && <p className="text-muted mt-1">{sub}</p>}
    </div>
  );
}

/** Compact cards for horizontal strips (popular, similar): image first, then the shelf label. */
export function ProductCards({ items, cc, lang, scroll = false }: { items: ListItem[]; cc: CC; lang: Lang; scroll?: boolean }) {
  const d = t(lang);
  return (
    <ul className={scroll
      ? "flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0 pb-2 [scrollbar-width:thin]"
      : "grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}>
      {items.map((p) => (
        <li key={p.id} className={scroll ? "snap-start shrink-0 w-[168px] sm:w-[188px]" : ""}>
          <Link href={productPath(cc, lang, p.slug, p.id)} className="panel group flex flex-col h-full p-3 hover:border-line-strong transition-colors">
            <span className="aspect-square rounded-lg bg-white flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.image ? <img src={p.image} alt="" loading="lazy" className="max-w-[82%] max-h-[82%] object-contain group-hover:scale-[1.03] transition-transform" /> : null}
            </span>
            <span className="block font-medium text-[13px] leading-snug clamp-2 mt-2.5 min-h-[2.6em]">{p.name}</span>
            <span className="mt-auto pt-2 flex items-center justify-between gap-2">
              {p.min_price !== null && <PriceTag amount={p.min_price} currency={p.currency} lang={lang} size="sm" />}
            </span>
            {p.n_offers > 1 && <span className="block text-[12px] text-muted mt-1">{d.moreStores(p.n_offers)}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
