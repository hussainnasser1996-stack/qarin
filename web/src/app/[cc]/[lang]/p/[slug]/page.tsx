import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ProductCards, Thumb } from "@/components/ProductList";
import { PriceChart } from "@/components/PriceChart";
import { AlertForm, ReportForm } from "@/components/Forms";
import { PriceTag, SpreadBar } from "@/components/Spread";
import { Offers } from "@/components/Offers";
import { Insight } from "@/components/Insight";
import { ShareButton, WatchButton } from "@/components/Watch";
import { CompareToggle } from "@/components/Compare";
import { ago, bnplName, brandName, convert, money, parseProductId, productPath, regionLabel, storeName, warrantyLabel } from "@/lib/format";
import { dailySeries, stats, verdict } from "@/lib/history";
import { categoryName, CCS, COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";
import { getProduct, getSimilar, productBySlug, topProductIds } from "@/lib/queries";
import { alternates } from "@/lib/seo";
import { SITE } from "@/lib/site";
import { alertChannels } from "@/lib/channels";

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
  const localHistory = history.filter((h) => h.country === cc);
  const series = dailySeries(localHistory);
  const st = stats(series.points);
  const v = verdict(min, st);
  const since = localHistory[0]?.observed_at ?? null;
  const similar = await getSimilar(cc, product.id, product.category, product.brand, min).catch(() => []);
  const versions = [...new Set(local.map((o) => o.region).filter(Boolean))].map((r) => regionLabel(r, lang)?.text).filter(Boolean);

  // Same product in every GCC country, converted to this country's currency.
  const gcc = CCS.map((c) => {
    const os = offers.filter((o) => o.country === c && o.price !== null && o.in_stock !== false);
    if (!os.length) return { c, price: null as number | null, cur: COUNTRIES[c].currency, n: 0, store: "" };
    const best = os.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b));
    return { c, price: Number(best.price), cur: best.currency || COUNTRIES[c].currency, n: new Set(os.map((o) => o.store)).size, store: best.store };
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
          "@type": "AggregateOffer", priceCurrency: currency, lowPrice: min, highPrice: max, offerCount: storeSpread.length,
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
    good: { cls: "bg-sunk text-ink", text: d.verdictGood },
    wait: { cls: "bg-warn-wash text-warn", text: d.verdictWait },
    new: { cls: "bg-sunk text-muted", text: d.verdictNew },
  }[v];

  const sections = [
    local.length > 0 && { id: "prices", label: d.sectionPrices, n: storeSpread.length },
    series.points.length > 0 && { id: "history", label: d.sectionHistory },
    gccWithPrice.length > 1 && { id: "gcc", label: d.sectionGcc, n: gccWithPrice.length },
    { id: "details", label: d.sectionDetails },
    similar.length > 0 && { id: "similar", label: d.sectionSimilar },
  ].filter(Boolean) as { id: string; label: string; n?: number }[];
  const bestOffer = live.find((o) => Number(o.price) === min);
  // Smallest instalment any store offers on this product today (store must state the provider in its policy).
  const payLater = live.flatMap((o) => (o.policies?.bnpl ?? []).map((b) => {
    const n = b.payments || 0; // only when the store states how many payments
    return n ? { each: Number(o.price) / n, n, provider: b.provider, store: o.store } : null;
  })).filter((x): x is { each: number; n: number; provider: string; store: string } => x !== null).sort((a, b) => a.each - b.each)[0];
  const bestWarranty = live.filter((o) => o.warranty_months).sort((a, b) => (b.warranty_months ?? 0) - (a.warranty_months ?? 0))[0];

  return (
    <article className="space-y-6 pb-20 lg:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="breadcrumb" className="text-[13px] text-muted">
        <Link href={`/${cc}/${lang}`} className="hover:underline">{d.home}</Link>
        <span className="mx-1.5 flip-rtl">›</span>
        <Link href={`/${cc}/${lang}/c/${product.category}`} className="hover:underline">{categoryName(product.category, lang)}</Link>
        {product.brand && <>
          <span className="mx-1.5 flip-rtl">›</span>
          <Link href={`/${cc}/${lang}/c/${product.category}?brand=${encodeURIComponent(product.brand)}`} className="hover:underline">{brandName(product.brand)}</Link>
        </>}
      </nav>

      <header className="panel p-5 sm:p-7 grid gap-6 md:grid-cols-[220px_1fr] items-start">
        <div className="mx-auto md:mx-0"><Thumb src={product.image} size={220} alt={product.name} /></div>
        <div className="min-w-0">
          <h1 className="font-display text-[25px] sm:text-[32px] font-bold leading-[1.15]">{product.name}</h1>
          <p className="text-ink-2 text-[14px] mt-2">
            <span aria-hidden>{COUNTRIES[cc].flag}</span> {country} · <span className="num">{storeSpread.length}</span> {d.stores}
            {local[0] && <> · {d.checked} {ago(local.reduce((a, b) => (a.last_seen > b.last_seen ? a : b)).last_seen, lang)}</>}
          </p>
          {min !== null ? (
            <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-3">
              <PriceTag amount={min} currency={currency} lang={lang} size="lg" caption={`${d.lowestPrice} · ${storeName(cheapestStore, lang)}`} />
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
          {(payLater || bestWarranty) && (
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
              {payLater && (
                <span>{lang === "ar" ? "ادفع لاحقاً من" : "Pay later from"} <b className="num text-ink">{payLater.n} × {money(payLater.each, currency, lang)}</b> · {bnplName(payLater.provider, lang)} ({storeName(payLater.store, lang)})</span>
              )}
              {bestWarranty && <span className="text-deal-ink font-medium">{warrantyLabel(bestWarranty.warranty_months, bestWarranty.warranty_by, lang)} ({storeName(bestWarranty.store, lang)})</span>}
            </p>
          )}
          {storeSpread.length > 1 && (
            <div className="max-w-xl mt-1"><SpreadBar spread={storeSpread} currency={currency} lang={lang} size="lg" labels /></div>
          )}
          <div className={`flex flex-wrap items-center gap-2 ${storeSpread.length > 1 ? "" : "mt-4"}`}>
            {min !== null && v !== "new" && <p className={`rounded-lg px-3 py-1.5 text-[13px] font-medium ${verdictBox.cls}`}>{verdictBox.text}</p>}
            <WatchButton lang={lang} item={{ id: product.id, slug: product.slug, name: product.name, image: product.image, cc, price: min, currency }} />
            <CompareToggle cc={cc} lang={lang} item={{ id: product.id, name: product.name, image: product.image }} />
            <ShareButton title={product.name} lang={lang} />
          </div>
          {variants.length > 0 && (
            <div className="mt-5">
              <p className="text-[13px] text-muted mb-1.5">{d.storage}</p>
              <ul className="flex flex-wrap gap-2">
                <li><span className="inline-flex items-center px-3 h-9 rounded-lg bg-ink text-surface text-[13px] font-semibold ltr">{product.storage || product.name}</span></li>
                {variants.map((x: { id: number; slug: string; name: string; storage: string | null }) => (
                  <li key={x.id}>
                    <Link href={productPath(cc, lang, x.slug, x.id)} className="inline-flex items-center px-3 h-9 rounded-lg border border-line-strong hover:bg-sunk text-[13px] ltr">{x.storage || x.name}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </header>

      <nav aria-label={d.sectionPrices} className="lg:sticky lg:top-16 z-20 -mx-4 sm:mx-0 px-4 sm:px-0 bg-paper/90 backdrop-blur py-2">
        <ul className="flex gap-1.5 overflow-x-auto">
          {sections.map((x) => (
            <li key={x.id}>
              <a href={`#${x.id}`} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-surface border border-line hover:border-ink-2 text-[13px] font-medium whitespace-nowrap">
                {x.label}{x.n !== undefined && <span className="num text-muted text-[12px]">{x.n}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        <div className="space-y-6 min-w-0">
          {local.length > 0 && (
            <section id="prices" aria-labelledby="offers-h" className="panel overflow-hidden scroll-mt-32">
              <h2 id="offers-h" className="font-display text-[20px] font-bold px-4 sm:px-5 pt-4 pb-2">{d.sectionPrices} · {country}</h2>
              <Offers offers={local} cc={cc} lang={lang} currency={currency} />
            </section>
          )}

          {series.points.length > 0 && (
            <section id="history" aria-labelledby="hist" className="panel p-4 sm:p-5 scroll-mt-32 space-y-5">
              <h2 id="hist" className="font-display text-[20px] font-bold">{d.sectionHistory}</h2>
              <div className="rounded-xl bg-sunk border border-line p-4">
                <p className="text-[12px] font-semibold text-ink-2 mb-2">{d.insight}</p>
                <Insight points={series.points} current={min} currency={currency} lang={lang} since={since} />
              </div>
              {series.points.length >= 7 && (
                <>
                  {st && (
                    <dl className="grid grid-cols-3 gap-2 text-[13px]">
                      <div className="rounded-lg border border-line p-2.5"><dt className="text-muted text-[12px]">{d.lowestEver}</dt><dd className="font-semibold num">{money(st.lowestEver, currency, lang)}</dd></div>
                      <div className="rounded-lg border border-line p-2.5"><dt className="text-muted text-[12px]">{d.lowest30}</dt><dd className="font-semibold num">{money(st.lowest30, currency, lang)}</dd></div>
                      <div className="rounded-lg border border-line p-2.5"><dt className="text-muted text-[12px]">{d.typical}</dt><dd className="font-semibold num">{money(st.typical, currency, lang)}</dd></div>
                    </dl>
                  )}
                  <PriceChart points={series.points} stores={series.stores} currency={currency} lang={lang}
                    labels={{ lowest: d.lowestPrice, all: d.ranges.All, ranges: d.ranges, store: Object.fromEntries(series.stores.map((s) => [s, storeName(s, lang)])) }} />
                  <p className="text-[12px] text-muted">{d.historyNote}</p>
                </>
              )}
            </section>
          )}

          {gccWithPrice.length > 1 && (
            <section id="gcc" aria-labelledby="gcc-h" className="panel overflow-hidden scroll-mt-32">
              <div className="p-4 sm:p-5 pb-2">
                <h2 id="gcc-h" className="font-display text-[20px] font-bold">{d.acrossGcc}</h2>
                <p className="text-muted text-[13px]">{d.acrossGccSub} {currency}</p>
              </div>
              <ul className="px-4 sm:px-5 pb-5 space-y-2.5">
                {(() => {
                  const conv = gcc.map((g) => (g.price !== null ? convert(g.price, g.cur, currency) : null));
                  const vals = conv.filter((x): x is number => x !== null);
                  const lo = Math.min(...vals), hi = Math.max(...vals);
                  return gcc.map((g, i) => {
                    const val = conv[i];
                    const best = val !== null && val === lo;
                    const w = val === null ? 0 : 35 + ((val - lo) / (hi - lo || 1)) * 65;
                    return (
                      <li key={g.c}>
                        <Link href={productPath(g.c, lang, product.slug, product.id)} className="grid grid-cols-[7.5rem_1fr] sm:grid-cols-[9rem_1fr] items-center gap-3 group">
                          <span className={`text-[14px] ${g.c === cc ? "font-semibold" : ""}`}>
                            <span aria-hidden>{COUNTRIES[g.c].flag}</span> <span className="group-hover:underline underline-offset-4">{COUNTRIES[g.c][lang]}</span>
                          </span>
                          {val === null ? (
                            <span className="text-[13px] text-muted">—</span>
                          ) : (
                            <span className="relative h-9 rounded-lg bg-sunk overflow-hidden">
                              <span className={`absolute inset-y-0 start-0 rounded-lg ${best ? "bg-tag" : "bg-line"}`} style={{ width: `${w}%` }} />
                              <span className="relative z-10 h-full flex items-center justify-between gap-2 px-2.5 text-[13px]">
                                <span className={`font-semibold num ${best ? "text-tag-ink" : ""}`}>{money(val, currency, lang)}</span>
                                <span className="text-ink-2 truncate">{g.cur !== currency ? <span className="num">{money(g.price, g.cur, lang)}</span> : storeName(g.store, lang)}</span>
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

        <aside className="space-y-4 lg:sticky lg:top-32">
          <div className="panel p-4"><AlertForm productId={product.id} cc={cc} lang={lang} currency={currency} channels={alertChannels()} inStock={min !== null} /></div>
          <div id="details" className="panel p-4 text-[13px] scroll-mt-32">
            <p className="font-semibold text-[14px] mb-2">{d.specs}</p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              {product.brand && <><dt className="text-muted">{d.filterBrand}</dt><dd>{brandName(product.brand)}</dd></>}
              <dt className="text-muted">{lang === "ar" ? "القسم" : "Category"}</dt><dd>{categoryName(product.category, lang)}</dd>
              {product.storage && <><dt className="text-muted">{d.storage}</dt><dd className="ltr">{product.storage}</dd></>}
              {versions.length > 0 && <><dt className="text-muted">{d.version}</dt><dd>{versions.join("، ")}</dd></>}
              {product.mpns?.length > 0 && <><dt className="text-muted">MPN</dt><dd className="ltr break-all">{product.mpns.slice(0, 2).join(", ")}</dd></>}
              {product.gtins?.length > 0 && <><dt className="text-muted">EAN</dt><dd className="ltr break-all">{product.gtins.slice(0, 2).join(", ")}</dd></>}
            </dl>
          </div>
          <ReportForm productId={product.id} lang={lang} />
        </aside>
      </div>

      {similar.length > 0 && (
        <section id="similar" aria-labelledby="sim-h" className="scroll-mt-32">
          <h2 id="sim-h" className="font-display text-[22px] font-bold mb-3">{d.similar}</h2>
          <ProductCards items={similar} cc={cc} lang={lang} />
        </section>
      )}

      {min !== null && bestOffer && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-surface/95 backdrop-blur border-t border-line px-4 py-2.5 flex items-center justify-between gap-3">
          <PriceTag amount={min} currency={currency} lang={lang} size="sm" caption={storeName(cheapestStore, lang)} />
          <a href={`/go/${bestOffer.id}?cc=${cc}&lang=${lang}`} rel="sponsored nofollow noopener" target="_blank"
            className="h-11 px-5 rounded-lg bg-ink text-surface font-semibold inline-flex items-center gap-1">
            {d.goTo(storeName(cheapestStore, lang))} <span aria-hidden className="flip-rtl">↗</span>
          </a>
        </div>
      )}
    </article>
  );
}
