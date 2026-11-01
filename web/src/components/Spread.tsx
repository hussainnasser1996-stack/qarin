import { money, storeName } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

/** Price spread: every store's price as a dot on one line. Cheapest end carries the shelf-label colour. */
export function SpreadBar({ spread, currency, lang, size = "sm", animate = false, labels = false }: {
  spread: { s: string; p: number }[]; currency: string; lang: Lang; size?: "sm" | "lg"; animate?: boolean; labels?: boolean;
}) {
  if (!spread || spread.length < 2) return null;
  const ps = spread.map((x) => Number(x.p));
  const min = Math.min(...ps), max = Math.max(...ps);
  const range = max - min || 1;
  const big = size === "lg";
  return (
    <div className={big ? (labels ? "pt-10 pb-11" : "py-3") : "py-2"} aria-hidden={!labels}>
      <div className={`relative ${big ? "h-3" : "h-1.5"} rounded-full bg-sunk border border-line`}>
        <div className={`absolute inset-y-0 start-0 end-0 rounded-full spread-fill ${animate ? "draw" : ""}`} />
        {spread.map((x, i) => {
          const pos = ((Number(x.p) - min) / range) * 100;
          const isMin = Number(x.p) === min;
          const isMax = Number(x.p) === max && i === spread.length - 1;
          // Several stores can tie on the lowest price: label the first one "eXtra +1" instead of stacking labels.
          const firstMin = isMin && i === ps.indexOf(min);
          const ties = ps.filter((v) => v === min).length - 1;
          const label = storeName(x.s, lang) + (firstMin && ties > 0 ? ` +${ties}` : "");
          return (
            <span key={`${x.s}-${i}`} title={`${storeName(x.s, lang)}: ${money(x.p, currency, lang)}`}
              className={`dot absolute top-1/2 rounded-full border-2 ${isMin ? "bg-tag border-tag-ink" : "bg-surface border-ink-2"} ${big ? "w-4 h-4" : "w-2.5 h-2.5"} ${animate ? "pop" : ""}`}
              style={{ insetInlineStart: `${pos}%`, animationDelay: animate ? `${0.5 + i * 0.08}s` : undefined }}>
              {big && labels && (firstMin || isMax) && (
                <span className={`absolute whitespace-nowrap text-[12px] leading-tight ${isMin ? "top-5" : "bottom-5"} ${pos > 50 ? "end-0" : "start-0"}`}>
                  <span className="block font-semibold text-ink">{label}</span>
                  <span className="block num text-ink-2">{money(x.p, currency, lang)}</span>
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** The shelf label: lowest price, big and yellow. */
export function PriceTag({ amount, currency, lang, size = "md", caption }: {
  amount: number | string; currency: string; lang: Lang; size?: "sm" | "md" | "lg"; caption?: string;
}) {
  const cls = size === "lg" ? "text-[34px] sm:text-[40px] py-2.5 pe-5" : size === "md" ? "text-[19px] py-1 pe-3" : "text-[15px] py-0.5 pe-2.5";
  return (
    <span className={`tag inline-flex flex-col leading-none font-display font-bold ${cls}`}>
      {caption && <span className="text-[11px] font-medium opacity-80 mb-1 font-sans">{caption}</span>}
      <span className="num">{money(amount, currency, lang)}</span>
    </span>
  );
}
