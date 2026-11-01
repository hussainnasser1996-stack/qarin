/* eslint-disable react/jsx-key -- cell contents are wrapped in keyed <td>s by row() */
import Link from "next/link";
import type { Metadata } from "next";
import { PriceTag } from "@/components/Spread";
import { Empty } from "@/components/ProductList";
import { bnplLabel, brandName, codFits, convert, money, productPath, regionLabel, storeName, warrantyLabel } from "@/lib/format";
import { dailySeries } from "@/lib/history";
import { categoryName, CCS, COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";
import { getProduct } from "@/lib/queries";

type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params, searchParams }: { params: Promise<{ cc: CC; lang: Lang }>; searchParams: SP }): Promise<Metadata> {
  const { lang } = await params;
  const ids = String((await searchParams).ids || "").split(",").map(Number).filter(Boolean).slice(0, 4);
  const names = (await Promise.all(ids.map((id) => getProduct(id).catch(() => null)))).filter(Boolean).map((d) => d!.product.name);
  return { title: names.length ? names.join(lang === "ar" ? " مقابل " : " vs ") : (lang === "ar" ? "مقارنة" : "Compare"), robots: { index: false, follow: true } };
}

/** Side by side, up to 4 products: price here, stores, history, the Gulf, warranty and how you can pay. */
export default async function Compare({ params, searchParams }: { params: Promise<{ cc: CC; lang: Lang }>; searchParams: SP }) {
  const { cc, lang } = await params;
  const d = t(lang);
  const ar = lang === "ar";
  const cur = COUNTRIES[cc].currency;
  const ids = [...new Set(String((await searchParams).ids || "").split(",").map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 4);
  const data = (await Promise.all(ids.map((id) => getProduct(id).catch(() => null)))).filter((x): x is NonNullable<typeof x> => x !== null);
  if (data.length < 2) {
    return <Empty title={ar ? "اختر منتجين على الأقل" : "Pick at least two products"} sub={ar ? "اضغط «قارن» في أي منتج أو قائمة." : "Tap Compare on any product or list."} />;
  }

  const cols = data.map(({ product, offers, history }) => {
    const live = offers.filter((o) => o.country === cc && o.price !== null && o.in_stock !== false);
    const best = live.reduce<(typeof live)[number] | null>((a, b) => (!a || Number(b.price) < Number(a.price) ? b : a), null);
    const stores = new Set(live.map((o) => o.store)).size;
    const series = dailySeries(history.filter((h) => h.country === cc));
    const mins = series.points.slice(-90).map((p) => p.min).filter((x): x is number => x !== null);
    const gcc = CCS.map((c) => {
      const os = offers.filter((o) => o.country === c && o.price !== null && o.in_stock !== false);
      if (!os.length) return null;
      const b = os.reduce((a, x) => (Number(x.price) < Number(a.price) ? x : a));
      return { c, v: convert(Number(b.price), b.currency || COUNTRIES[c].currency, cur) };
    });
    const w = live.filter((o) => o.warranty_months).sort((a, b) => (b.warranty_months ?? 0) - (a.warranty_months ?? 0))[0];
    const bnpl = [...new Set(live.flatMap((o) => (o.policies?.bnpl ?? []).map((b) => bnplLabel(b, lang))))];
    const cod = [...new Set(live.filter((o) => codFits(o.policies, Number(o.price), product.category)).map((o) => o.store))];
    const versions = [...new Set(live.map((o) => regionLabel(o.region, lang)?.text).filter(Boolean))] as string[];
    return {
      product, best, price: best ? Number(best.price) : null, stores, low90: mins.length >= 7 ? Math.min(...mins) : null,
      gcc, gccLow: gcc.filter(Boolean).sort((a, b) => a!.v - b!.v)[0] ?? null, w, bnpl, cod, versions,
    };
  });
  const minOf = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x !== null); return v.length ? Math.min(...v) : null; };
  const bestPrice = minOf(cols.map((c) => c.price));
  const mostStores = Math.max(...cols.map((c) => c.stores));
  const bestGcc = minOf(cols.map((c) => c.gccLow?.v ?? null));
  const longestW = Math.max(0, ...cols.map((c) => c.w?.warranty_months ?? 0));
  const win = "bg-[color-mix(in_srgb,var(--tag)_16%,transparent)]";

  const row = (label: string, cells: React.ReactNode[], wins?: boolean[]) => (
    <tr className="border-t border-line align-top">
      <th scope="row" className="sticky start-0 z-10 bg-surface text-start font-medium text-[13px] text-muted px-3 py-3 w-36 min-w-36">{label}</th>
      {cells.map((c, i) => <td key={i} className={`px-3 py-3 text-[14px] min-w-[180px] ${wins?.[i] ? win : ""}`}>{c}</td>)}
    </tr>
  );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[26px] sm:text-[30px] font-bold">{ar ? "مقارنة المنتجات" : "Compare products"} · {COUNTRIES[cc][lang]}</h1>
      <div className="panel overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky start-0 z-10 bg-surface w-36 min-w-36" />
              {cols.map((c) => (
                <th key={c.product.id} className="px-3 pt-4 pb-3 text-start align-top min-w-[180px]">
                  <Link href={productPath(cc, lang, c.product.slug, c.product.id)} className="group block">
                    <span className="block aspect-square max-w-[140px] rounded-xl bg-white border border-line overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {c.product.image && <img src={c.product.image} alt="" className="max-w-[85%] max-h-[85%] object-contain" />}
                    </span>
                    <span className="block font-display font-semibold text-[15px] leading-snug mt-2 group-hover:underline underline-offset-4">{c.product.name}</span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row(d.lowestPrice, cols.map((c) => c.price !== null ? (
              <span className="space-y-1 block"><PriceTag amount={c.price} currency={cur} lang={lang} size="sm" />
                <span className="block text-[12px] text-muted">{storeName(c.best!.store, lang)}</span></span>
            ) : <span className="text-muted">{d.notInCountry}</span>), cols.map((c) => c.price !== null && c.price === bestPrice))}
            {row(ar ? "عدد المتاجر" : "Stores", cols.map((c) => <span className="num">{c.stores}</span>), cols.map((c) => c.stores === mostStores && c.stores > 0))}
            {row(ar ? "أقل سعر خلال ٩٠ يوماً" : "Lowest in 90 days", cols.map((c) => c.low90 !== null ? <span className="num">{money(c.low90, cur, lang)}</span> : <span className="text-muted text-[13px]">{ar ? "سجل قصير" : "Not enough history"}</span>))}
            {row(ar ? "أرخص دولة خليجية" : "Cheapest in the Gulf", cols.map((c) => c.gccLow ? (
              <span><span aria-hidden>{COUNTRIES[c.gccLow.c].flag}</span> {COUNTRIES[c.gccLow.c][lang]} · <span className="num">{money(c.gccLow.v, cur, lang)}</span></span>
            ) : "—"), cols.map((c) => c.gccLow !== null && c.gccLow.v === bestGcc))}
            {row(d.sectionGcc, cols.map((c) => (
              <ul className="space-y-0.5 text-[12px]">
                {c.gcc.map((g, i) => <li key={CCS[i]} className="flex justify-between gap-2"><span>{COUNTRIES[CCS[i]].flag} {COUNTRIES[CCS[i]][lang]}</span><span className="num">{g ? money(g.v, cur, lang) : "—"}</span></li>)}
              </ul>
            )))}
            {row(ar ? "الضمان" : "Warranty", cols.map((c) => c.w ? <span className="text-deal-ink font-medium">{warrantyLabel(c.w.warranty_months, c.w.warranty_by, lang)}</span> : <span className="text-muted text-[13px]">{ar ? "حسب سياسة المتجر" : "Per store policy"}</span>),
              cols.map((c) => longestW > 0 && (c.w?.warranty_months ?? 0) === longestW))}
            {row(ar ? "الدفع لاحقاً" : "Pay later", cols.map((c) => c.bnpl.length ? c.bnpl.join(lang === "ar" ? "، " : ", ") : "—"))}
            {row(ar ? "الدفع عند الاستلام" : "Cash on delivery", cols.map((c) => c.cod.length ? c.cod.map((s) => storeName(s, lang)).join(lang === "ar" ? "، " : ", ") : "—"))}
            {row(d.version, cols.map((c) => c.versions.length ? c.versions.join(lang === "ar" ? "، " : ", ") : "—"))}
            {row(d.storage, cols.map((c) => <span className="ltr">{c.product.storage || "—"}</span>))}
            {row(d.filterBrand, cols.map((c) => brandName(c.product.brand) || "—"))}
            {row(ar ? "القسم" : "Category", cols.map((c) => categoryName(c.product.category, lang)))}
            <tr className="border-t border-line">
              <th className="sticky start-0 bg-surface" />
              {cols.map((c) => (
                <td key={c.product.id} className="px-3 py-4">
                  {c.best && (
                    <a href={`/go/${c.best.id}?cc=${cc}&lang=${lang}`} rel="sponsored nofollow noopener" target="_blank"
                      className="inline-flex items-center gap-1 h-10 px-4 rounded-lg bg-ink text-surface text-[13px] font-semibold whitespace-nowrap">
                      {d.goTo(storeName(c.best.store, lang))} <span aria-hidden className="flip-rtl">↗</span>
                    </a>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-muted">{ar ? "الخانة المظللة هي الأفضل في كل صف." : "The highlighted cell is the best in each row."} {d.disclaimer}</p>
    </div>
  );
}
