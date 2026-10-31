import Link from "next/link";
import { money, productPath } from "@/lib/format";
import { categoryName, t, type CC, type Lang } from "@/lib/i18n";
import type { ListItem } from "@/lib/queries";

export function Thumb({ src, size = 56 }: { src: string | null; size?: number }) {
  return (
    <span className="shrink-0 rounded-lg bg-white border border-line overflow-hidden flex items-center justify-center" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" loading="lazy" className="max-w-[88%] max-h-[88%] object-contain" /> : <span className="text-line-strong text-xs">—</span>}
    </span>
  );
}

/** Rows, not cards: a comparison site is scanned like a price list. */
export function ProductList({ items, cc, lang, showGap = false }: { items: ListItem[]; cc: CC; lang: Lang; showGap?: boolean }) {
  const d = t(lang);
  return (
    <ul className="panel divide-y divide-line">
      {items.map((p) => {
        const min = Number(p.min_price), max = Number(p.max_price);
        const saving = max && min && max > min ? max - min : 0;
        return (
          <li key={p.id}>
            <Link href={productPath(cc, lang, p.slug, p.id)} className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-paper no-underline">
              <Thumb src={p.image} />
              <span className="flex-1 min-w-0">
                <span className="block font-medium clamp-2 leading-snug">{p.name}</span>
                <span className="block text-muted text-[13px] mt-0.5">
                  {categoryName(p.category, lang)}{p.n_offers ? ` · ${p.n_offers} ${d.stores}` : ""}
                  {p.cheapest_store ? ` · ${d.cheapest}: ${p.cheapest_store}` : ""}
                </span>
              </span>
              <span className="text-end shrink-0">
                <span className="block text-[12px] text-muted">{d.from}</span>
                <span className="block font-semibold text-[16px] num">{money(p.min_price, p.currency, lang)}</span>
                {showGap && saving > 0 && (
                  <span className="inline-block mt-0.5 text-[12px] font-semibold text-deal-ink bg-deal-wash rounded px-1.5 py-0.5">
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
      <p className="font-semibold text-[17px]">{title}</p>
      {sub && <p className="text-muted mt-1">{sub}</p>}
    </div>
  );
}
