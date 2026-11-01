import { ago, bnplName, colourName, conditionLabel, exactTime, money, regionLabel, storeName, warrantyLabel } from "@/lib/format";
import { t, type CC, type Lang } from "@/lib/i18n";
import type { Offer } from "@/lib/queries";

/**
 * One row per store (idealo / Geizhals style). A store that lists the same item in five colours shows its best
 * price once, with the other options folded underneath, so the table compares stores, not listings.
 */
export function Offers({ offers, cc, lang, currency }: { offers: Offer[]; cc: CC; lang: Lang; currency: string }) {
  const d = t(lang);
  const live = (o: Offer) => o.price !== null && o.in_stock !== false;
  const byStore = new Map<string, Offer[]>();
  for (const o of offers) byStore.set(o.store, [...(byStore.get(o.store) ?? []), o]);
  const groups = [...byStore.entries()].map(([store, os]) => {
    const sorted = [...os].sort((a, b) => Number(live(b)) - Number(live(a)) || Number(a.price ?? Infinity) - Number(b.price ?? Infinity));
    return { store, best: sorted[0], rest: sorted.slice(1), anyLive: sorted.some(live) };
  });
  const inStock = groups.filter((g) => g.anyLive).sort((a, b) => Number(a.best.price) - Number(b.best.price));
  const out = groups.filter((g) => !g.anyLive);
  const min = inStock.length ? Number(inStock[0].best.price) : null;
  const next = inStock.find((g) => Number(g.best.price) > (min ?? 0));
  const go = (o: Offer) => `/go/${o.id}?cc=${cc}&lang=${lang}`;
  const badgeCls = { ok: "bg-sunk text-ink-2 border-line", note: "bg-warn-wash text-warn border-warn/30" };

  const meta = (o: Offer) => {
    const region = regionLabel(o.region, lang);
    const cond = conditionLabel(o.condition, lang);
    const seller = o.seller && o.seller !== o.store && !o.seller.toLowerCase().includes(o.store.toLowerCase().split(" ")[0]) ? o.seller : null;
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted mt-1">
        <time dateTime={o.last_seen} title={exactTime(o.last_seen)}>{d.checked} {ago(o.last_seen, lang)}</time>
        {region && <span className={`px-1.5 py-px rounded border text-[11px] font-medium ${badgeCls[region.tone]}`}>{region.text}</span>}
        {cond && <span className="px-1.5 py-px rounded border text-[11px] font-medium bg-warn-wash text-warn border-warn/30">{cond}</span>}
        {seller && <span>{d.sellerNote}: {seller}</span>}
      </span>
    );
  };

  const ar = lang === "ar";
  const checkedOn = (p: Offer["policies"]) => p?.checked
    ? (ar ? `تم التحقق من سياسات المتجر في ${p.checked}` : `Store policy checked ${p.checked}`) : undefined;
  /** Trust chips: warranty from this listing; payment, delivery and returns from the store's checked policy. */
  const chips = (o: Offer) => {
    const out: { text: string; tone: "deal" | "plain"; title?: string }[] = [];
    const w = warrantyLabel(o.warranty_months, o.warranty_by, lang);
    if (w) out.push({ text: w, tone: "deal", title: ar ? "كما يذكره المتجر لهذا المنتج" : "As the store states for this product" });
    const pol = o.policies;
    const price = Number(o.price);
    for (const b of pol?.bnpl ?? []) {
      const n = b.payments || null; // only the number of payments the store itself states
      out.push({
        text: n && price ? `${bnplName(b.provider, lang)} · ${n} × ${money(price / n, o.currency || currency, lang)}` : bnplName(b.provider, lang),
        tone: "plain", title: checkedOn(pol),
      });
    }
    if (pol?.cod) out.push({ text: ar ? "الدفع عند الاستلام" : "Cash on delivery", tone: "plain", title: pol.cod_notes || checkedOn(pol) });
    if (pol?.free_delivery_over != null && price >= pol.free_delivery_over) out.push({ text: ar ? "توصيل مجاني" : "Free delivery", tone: "plain", title: checkedOn(pol) });
    if (pol?.same_day) out.push({ text: ar ? "خيار توصيل سريع" : "Express delivery option", tone: "plain", title: pol.delivery_days || checkedOn(pol) });
    if (pol?.click_collect) out.push({ text: ar ? "استلام من الفرع" : "Pick up in store", tone: "plain", title: checkedOn(pol) });
    if (!out.length) return null;
    return (
      <span className="flex flex-wrap gap-1.5 mt-2">
        {out.map((c) => (
          <span key={c.text} title={c.title}
            className={`text-[11px] px-2 py-0.5 rounded-full border ${c.tone === "deal" ? "bg-deal-wash text-deal-ink border-deal/25 font-semibold" : "bg-surface text-ink-2 border-line"}`}>
            {c.text}
          </span>
        ))}
      </span>
    );
  };

  return (
    <div>
      <p className="px-4 sm:px-5 py-2.5 text-[12px] text-muted border-b border-line bg-sunk">{d.rankingNote}</p>
      <ul className="divide-y divide-line">
        {inStock.map((g, i) => {
          const isMin = i === 0;
          const options = g.rest.filter(live);
          return (
            <li key={g.store} className={isMin ? "bg-[color-mix(in_srgb,var(--tag)_13%,transparent)]" : ""}>
              <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-3.5">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[15px]">{storeName(g.store, lang)}</span>
                    {isMin && <span className="text-[11px] font-semibold text-tag-ink bg-tag rounded px-1.5 py-0.5">{d.cheapest}</span>}
                    {g.best.in_stock === true && <span className="text-[12px] text-deal-ink">● {d.inStock}</span>}
                    {g.best.in_stock === null && <span className="text-[12px] text-muted">{d.unknownStock}</span>}
                  </p>
                  <p className="text-[12px] text-ink-2 clamp-2 mt-0.5">{g.best.title}</p>
                  {meta(g.best)}
                  {chips(g.best)}
                </div>
                <div className="text-end">
                  <p className="font-display font-bold text-[18px] num whitespace-nowrap leading-tight">{money(g.best.price, g.best.currency || currency, lang)}</p>
                  {isMin && next && min !== null && (
                    <p className="text-[11px] text-deal-ink font-medium whitespace-nowrap">
                      <span className="num">{money(Number(next.best.price) - min, currency, lang)}</span> {d.vsNext}
                    </p>
                  )}
                </div>
                <a href={go(g.best)} rel="sponsored nofollow noopener" target="_blank"
                  className={`col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1 h-10 px-4 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-opacity hover:opacity-90 ${isMin ? "bg-ink text-surface" : "border border-line-strong hover:bg-sunk"}`}>
                  {d.goTo(storeName(g.store, lang))} <span aria-hidden className="flip-rtl">↗</span>
                </a>
              </div>
              {options.length > 0 && (
                <details className="group border-t border-dashed border-line">
                  <summary className="px-4 sm:px-5 py-2 text-[12px] text-ink-2 cursor-pointer select-none list-none flex items-center gap-1.5">
                    <span aria-hidden className="transition-transform group-open:rotate-90 flip-rtl">›</span>
                    {d.options(options.length + 1)} · {storeName(g.store, lang)}
                  </summary>
                  <ul className="px-4 sm:px-5 pb-3 space-y-1.5">
                    {options.map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate text-ink-2">{o.colour ? colourName(o.colour, lang) : o.title}</span>
                        <span className="flex items-center gap-3 shrink-0">
                          <span className="num font-semibold">{money(o.price, o.currency || currency, lang)}</span>
                          <a href={go(o)} rel="sponsored nofollow noopener" target="_blank" className="underline underline-offset-4 text-[12px]">{d.visitStore}</a>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>
      {out.length > 0 && (
        <details className="border-t border-line">
          <summary className="px-4 sm:px-5 py-2.5 text-[13px] text-muted cursor-pointer select-none">
            {d.outOfStock} · <span className="num">{out.length}</span> {d.stores}
          </summary>
          <ul className="divide-y divide-line">
            {out.map((g) => (
              <li key={g.store} className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3 text-[13px]">
                <span className="min-w-0"><b className="font-semibold">{storeName(g.store, lang)}</b> <span className="text-muted">{g.best.title}</span></span>
                <span className="flex items-center gap-3 shrink-0">
                  {g.best.price !== null && <s className="text-muted num">{money(g.best.price, g.best.currency || currency, lang)}</s>}
                  <a href={go(g.best)} rel="sponsored nofollow noopener" target="_blank" className="underline underline-offset-4">{d.visitStore}</a>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
