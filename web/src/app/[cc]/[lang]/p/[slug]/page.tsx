import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Thumb } from "@/components/ProductList";
import { PriceChart } from "@/components/PriceChart";
import { AlertForm, ReportForm } from "@/components/Forms";
import { PriceTag, SpreadBar } from "@/components/Spread";
import { ago, brandName, convert, exactTime, money, parseProductId, productPath } from "@/lib/format";
import { dailySeries, stats, verdict } from "@/lib/history";
import { categoryName, CCS, COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";
import { getProduct, productBySlug, topProductIds } from "@/lib/queries";
import { alternates } from "@/lib/seo";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const top = await topProductIds(60);
    return top.flatMap((p) => [{ slug: `${p.slug}-${p.id}` }]);
  } catch {
    return [];
  }
}

type Params = Promise<{ cc: CC; lang: Lang; slug: string }>;

/**
 * Load the product or send the visitor where it went. Also called from generateMetadata, which search
 * engines get before any streaming starts, so they see a real 308 or 404 status rather than a streamed one.
 */
async function load(cc: CC, lang: Lang, slug: string, id: number | null) {
  const data = id ? await getProduct(id).catch(() => null) : null;
  if (!data) {
    // A retired id (products are re-matched daily): send old links to the live product with the same name.
    const moved = await productBySlug(slug.replace(/-\d+$/, "")).catch(() => null);
    if (moved) permanentRedirect(productPath(cc, lang, moved.slug, moved.id));
    notFound();
  }
  if (slug !== `${data.product.slug}-${data.product.id}`) permanentRedirect(productPath(cc, lang, data.product.slug, data.product.id));
  return data;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { cc, lang, slug } = await params;
  const id = parseProductId(slug);
  const data = await load(cc, lang, slug, id);
  const d = t(lang);
  const local = data.offers.filter((o) => o.country === cc && o.price !== null && o.in_stock !== false);
  const min = local.length ? Math.min(...local.map((o) => Number(o.price))) : null;
  const country = COUNTRIES[cc][lang];
  const nStores = new Set(local.map((o) => o.store)).size;
  const title = d.productTitle(data.product.name, country);
  const desc = min !== null
    ? (lang === "ar"
      ? `أرخص سعر ${money(min, COUNTRIES[cc].currency, lang)} في ${nStores} محلات في ${country}. قارن الأسعار وشاهد سجل السعر.`
      : `Lowest price ${money(min, COUNTRIES[cc].currency, lang)} across ${nStores} ${nStores === 1 ? "store" : "stores"} in ${country}. Compare prices and see the price history.`)
    : d.heroSub;
  return {
    title,
    description: desc,
    alternates: alternates(cc, lang, `p/${data.product.slug}-${data.product.id}`),
    openGraph: { title, description: desc },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { cc, lang, slug } = await params;
  const data = await load(cc, lang, slug, parseProductId(slug));
  const { product, offers, history, variants } = data;

  const d = t(lang);
  const currency = COUNTRIES[cc].currency;
  const country = COUNTRIES[cc][lang];
  const local = offers.filter((o) => o.country === cc);
  const live = local.filter((o) => o.price !== null && o.in_stock !== false);
  const min = live.length ? Math.min(...live.map((o) => Number(o.price))) : null;
  const max = live.length ? Math.max(...live.map((o) => Number(o.price))) : null;
  // One dot per store (a store selling several colours at one price counts once).
  const perStore = new Map<string, number>();
  for (const o of live) perStore.set(o.store, Math.min(perStore.get(o.store) ?? Infinity, Number(o.price)));
  const storeSpread = [...perStore].map(([s, p]) => ({ s, p })).sort((a, b) => a.p - b.p);
  const cheapestStore = storeSpread[0]?.s ?? "";
  const series = dailySeries(history.filter((h) => h.country === cc));
  const st = stats(series.points);
  const v = verdict(min, st);

  // Same product in every GCC country, converted to this country's currency.
  const gcc = CCS.map((c) => {
    const os = offers.filter((o) => o.country === c && o.price !== null && o.in_stock !== false);
    if (!os.length) return { c, price: null as number | null, cur: COUNTRIES[c].currency, n: 0, store: "" };
    const best = os.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b));
    return { c, price: Number(best.price), cur: best.currency || COUNTRIES[c].currency, n: os.length, store: best.store };
  });
  const gccWithPrice = gcc.filter((g) => g.price !== null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.name,
        image: product.image || undefined,
        brand: product.brand ? { "@type": "Brand", name: brandName(product.brand) } : undefined,
        gtin13: product.gtins?.[0] || undefined,
        mpn: product.mpns?.[0] || undefined,
        offers: live.length ? {
          "@type": "AggregateOffer", priceCurrency: currency, lowPrice: min, highPrice: max, offerCount: live.length,
        } : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: d.home, item: `${SITE}/${cc}/${lang}` },
          { "@type": "ListItem", position: 2, name: categoryName(product.category, lang), item: `${SITE}/${cc}/${lang}/c/${product.category}` },
          { "@type": "ListItem", position: 3, name: product.name },
        ],
      },
    ],
  };

  const verdictBox = {
    great: { cls: "bg-deal-wash text-deal-ink", text: d.verdictGreat },
    good: { cls: "bg-paper text-ink", text: d.verdictGood },
    wait: { cls: "bg-warn-wash text-warn", text: d.verdictWait },
    new: { cls: "bg-paper text-muted", text: d.verdictNew },
  }[v];

  return (
    <article className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="breadcrumb" className="text-[13px] text-muted">
        <Link href={`/${cc}/${lang}`} className="hover:underline">{d.home}</Link>
        <span className="mx-1.5 flip-rtl">›</span>
        <Link href={`/${cc}/${lang}/c/${product.category}`} className="hover:underline">{categoryName(product.category, lang)}</Link>
      </nav>

      <header className="panel p-5 sm:p-7 grid gap-6 md:grid-cols-[180px_1fr] items-start">
        <Thumb src={product.image} size={180} alt={product.name} />
        <div className="min-w-0">
          <h1 className="font-display text-[26px] sm:text-[34px] font-bold leading-[1.15]">{product.name}</h1>
          <p className="text-ink-2 text-[14px] mt-2">
            <span aria-hidden>{COUNTRIES[cc].flag}</span> {country} · <span className="num">{storeSpread.length}</span> {d.stores}
            {local[0] && <> · {d.checked} {ago(local.reduce((a, b) => (a.last_seen > b.last_seen ? a : b)).last_seen, lang)}</>}
          </p>
          {min !== null ? (
            <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
              <PriceTag amount={min} currency={currency} lang={lang} size="lg" caption={`${d.lowestPrice} · ${cheapestStore}`} />
              {max !== null && max > min && (
                <p className="pb-1">
                  <span className="block font-display font-bold text-[22px] text-deal-ink num leading-none">{money(max - min, currency, lang)}</span>
                  <span className="block text-[13px] text-ink-2 mt-1">{d.save} {d.vsMost}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-sunk border border-line p-3 text-ink-2">{d.notInCountry}</p>
          )}
          {storeSpread.length > 1 && (
            <div className="max-w-xl mt-1"><SpreadBar spread={storeSpread} currency={currency} lang={lang} size="lg" labels /></div>
          )}
          {min !== null && <p className={`inline-block rounded-lg px-3 py-1.5 text-[14px] font-medium ${verdictBox.cls} ${storeSpread.length > 1 ? "" : "mt-4"}`}>{verdictBox.text}</p>}
          {variants.length > 0 && (
            <div className="mt-4">
              <p className="text-[13px] text-muted mb-1.5">{d.variants}</p>
              <ul className="flex flex-wrap gap-2">
                <li><span className="inline-block px-3 h-8 leading-8 rounded-full bg-ink text-surface text-[13px]">{product.storage || product.name}</span></li>
                {variants.map((x: { id: number; slug: string; name: string; storage: string | null }) => (
                  <li key={x.id}><Link href={productPath(cc, lang, x.slug, x.id)} className="inline-block px-3 h-8 leading-8 rounded-full border border-line hover:border-line-strong text-[13px]">{x.storage || x.name}</Link></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        <div className="space-y-6 min-w-0">
          {local.length > 0 && (
            <section aria-labelledby="offers" className="panel overflow-hidden">
              <h2 id="offers" className="sr-only">{d.price}</h2>
              <table className="w-full text-[14px]">
                <thead className="bg-sunk text-muted text-[12px]">
                  <tr>
                    <th className="text-start font-medium px-3 sm:px-4 py-2">{d.store}</th>
                    <th className="text-start font-medium px-2 py-2 hidden sm:table-cell">{d.stock}</th>
                    <th className="text-end font-medium px-2 py-2">{d.price}</th>
                    <th className="px-3 sm:px-4 py-2"><span className="sr-only">{d.goToStore}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {local.filter((o) => o.in_stock !== false).map((o) => {
                    const isMin = min !== null && o.price !== null && Number(o.price) === min && o.in_stock !== false;
                    return (
                      <tr key={o.id} className={isMin ? "bg-[color-mix(in_srgb,var(--tag)_14%,transparent)]" : ""}>
                        <td className="px-3 sm:px-4 py-3 align-top">
                          <span className="font-semibold">{o.store}</span>
                          {isMin && <span className="ms-2 text-[11px] font-semibold text-tag-ink bg-tag rounded px-1.5 py-0.5">{d.cheapest}</span>}
                          <span className="block text-[12px] text-muted clamp-2 mt-0.5">{o.title}</span>
                          <span className="block text-[11px] text-muted mt-0.5">
                            <time dateTime={o.last_seen} title={exactTime(o.last_seen)}>{d.checked} {ago(o.last_seen, lang)}</time>
                            {o.seller && o.seller !== o.store && !o.seller.toLowerCase().includes(o.store.toLowerCase().split(" ")[0]) ? ` · ${d.sellerNote}: ${o.seller}` : ""}
                            {o.region ? ` · ${o.region}` : ""}
                            {o.condition && o.condition !== "new" ? ` · ${o.condition}` : ""}
                          </span>
                        </td>
                        <td className="px-2 py-3 align-top hidden sm:table-cell text-[13px]">
                          {o.in_stock === false ? <span className="text-muted">{d.outOfStock}</span> : o.in_stock ? <span className="text-deal-ink">{d.inStock}</span> : <span className="text-muted">{d.unknownStock}</span>}
                        </td>
                        <td className="px-2 py-3 align-top text-end">
                          <span className={`font-display font-bold text-[16px] num whitespace-nowrap ${o.in_stock === false ? "text-muted line-through" : ""}`}>{money(o.price, o.currency || currency, lang)}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 align-top text-end">
                          <a href={`/go/${o.id}?cc=${cc}&lang=${lang}`} rel="sponsored nofollow noopener" target="_blank"
                            className={`inline-flex items-center gap-1 h-9 px-3 rounded-lg text-[13px] font-medium whitespace-nowrap transition-opacity hover:opacity-90 ${isMin ? "bg-ink text-surface" : "border border-line-strong hover:bg-sunk"}`}>
                            {d.goToStore} <span aria-hidden className="flip-rtl">↗</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {local.some((o) => o.in_stock === false) && (
                <details className="border-t border-line">
                  <summary className="px-4 py-2.5 text-[13px] text-muted cursor-pointer select-none">
                    {d.outOfStock} · <span className="num">{local.filter((o) => o.in_stock === false).length}</span>
                  </summary>
                  <ul className="divide-y divide-line">
                    {local.filter((o) => o.in_stock === false).map((o) => (
                      <li key={o.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-[13px]">
                        <span className="min-w-0"><b className="font-semibold">{o.store}</b> <span className="text-muted clamp-2">{o.title}</span></span>
                        <span className="flex items-center gap-3 shrink-0">
                          <s className="text-muted num">{money(o.price, o.currency || currency, lang)}</s>
                          <a href={`/go/${o.id}?cc=${cc}&lang=${lang}`} rel="sponsored nofollow noopener" target="_blank" className="underline underline-offset-4">{d.goToStore}</a>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}

          {series.points.length > 1 && (
            <section aria-labelledby="hist" className="panel p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h2 id="hist" className="font-display text-[20px] font-bold">{d.priceHistory}</h2>
                {st && (
                  <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
                    <div><dt className="inline text-muted">{d.lowestEver}: </dt><dd className="inline font-semibold num">{money(st.lowestEver, currency, lang)}</dd></div>
                    {st.lowest30 !== null && <div><dt className="inline text-muted">{d.lowest30}: </dt><dd className="inline font-semibold num">{money(st.lowest30, currency, lang)}</dd></div>}
                    <div><dt className="inline text-muted">{d.typical}: </dt><dd className="inline font-semibold num">{money(st.typical, currency, lang)}</dd></div>
                  </dl>
                )}
              </div>
              <PriceChart points={series.points} stores={series.stores} currency={currency} lang={lang}
                labels={{ lowest: d.lowestPrice, all: lang === "ar" ? "الكل" : "All" }} />
            </section>
          )}

          {gccWithPrice.length > 1 && (
            <section aria-labelledby="gcc" className="panel overflow-hidden">
              <div className="p-4 pb-2">
                <h2 id="gcc" className="font-display text-[20px] font-bold">{d.acrossGcc}</h2>
                <p className="text-muted text-[13px]">{d.acrossGccSub} {currency}</p>
              </div>
              <ul className="px-4 pb-4 space-y-2.5">
                {(() => {
                  const conv = gcc.map((g) => (g.price !== null ? convert(g.price, g.cur, currency) : null));
                  const vals = conv.filter((x): x is number => x !== null);
                  const lo = Math.min(...vals), hi = Math.max(...vals);
                  return gcc.map((g, i) => {
                    const v = conv[i];
                    const best = v !== null && v === lo;
                    const w = v === null ? 0 : 35 + ((v - lo) / (hi - lo || 1)) * 65;
                    return (
                      <li key={g.c}>
                        <Link href={productPath(g.c, lang, product.slug, product.id)} className="grid grid-cols-[7.5rem_1fr] sm:grid-cols-[9rem_1fr] items-center gap-3 group">
                          <span className={`text-[14px] ${g.c === cc ? "font-semibold" : ""}`}>
                            <span aria-hidden>{COUNTRIES[g.c].flag}</span> <span className="group-hover:underline underline-offset-4">{COUNTRIES[g.c][lang]}</span>
                          </span>
                          {v === null ? (
                            <span className="text-[13px] text-muted">—</span>
                          ) : (
                            <span className="relative h-8 rounded-lg bg-sunk overflow-hidden">
                              <span className={`absolute inset-y-0 start-0 rounded-lg ${best ? "bg-tag" : "bg-line"}`} style={{ width: `${w}%` }} />
                              <span className="relative z-10 h-full flex items-center justify-between gap-2 px-2.5 text-[13px]">
                                <span className={`font-semibold num ${best ? "text-tag-ink" : ""}`}>{money(v, currency, lang)}</span>
                                <span className="text-ink-2 truncate">{g.cur !== currency ? <span className="num">{money(g.price, g.cur, lang)}</span> : g.store}</span>
                              </span>
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  });
                })()}
              </ul>
            </section>
          )}
          <p className="text-muted text-[12px]">{d.disclaimer}</p>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="panel p-4"><AlertForm productId={product.id} cc={cc} lang={lang} currency={currency} /></div>
          {(product.gtins?.length > 0 || product.mpns?.length > 0 || product.brand) && (
            <div className="panel p-4 text-[13px] space-y-1">
              <p className="font-semibold text-[14px] mb-1">{d.specs}</p>
              {product.brand && <p><span className="text-muted">{lang === "ar" ? "الماركة" : "Brand"}:</span> {brandName(product.brand)}</p>}
              {product.storage && <p><span className="text-muted">{lang === "ar" ? "السعة" : "Storage"}:</span> <span className="ltr">{product.storage}</span></p>}
              {product.mpns?.length > 0 && <p className="break-all"><span className="text-muted">MPN:</span> <span className="ltr">{product.mpns.slice(0, 4).join(", ")}</span></p>}
              {product.gtins?.length > 0 && <p className="break-all"><span className="text-muted">EAN:</span> <span className="ltr">{product.gtins.slice(0, 3).join(", ")}</span></p>}
            </div>
          )}
          <ReportForm productId={product.id} lang={lang} />
        </aside>
      </div>

      {min !== null && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-line px-4 py-2.5 flex items-center justify-between gap-3">
          <PriceTag amount={min} currency={currency} lang={lang} size="sm" caption={cheapestStore} />
          {live[0] && (
            <a href={`/go/${live.find((o) => Number(o.price) === min)!.id}?cc=${cc}&lang=${lang}`} rel="sponsored nofollow noopener" target="_blank"
              className="h-10 px-4 rounded-lg bg-ink text-surface font-medium inline-flex items-center">{d.goToStore}</a>
          )}
        </div>
      )}
    </article>
  );
}
