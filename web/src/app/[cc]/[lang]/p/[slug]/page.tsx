import Link from "next/link";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Thumb } from "@/components/ProductList";
import { PriceChart } from "@/components/PriceChart";
import { AlertForm, ReportForm } from "@/components/Forms";
import { ago, convert, exactTime, money, parseProductId, productPath } from "@/lib/format";
import { dailySeries, stats, verdict } from "@/lib/history";
import { categoryName, CCS, COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";
import { getProduct, topProductIds } from "@/lib/queries";
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

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { cc, lang, slug } = await params;
  const id = parseProductId(slug);
  const data = id ? await getProduct(id).catch(() => null) : null;
  if (!data) return {};
  const d = t(lang);
  const local = data.offers.filter((o) => o.country === cc && o.price !== null && o.in_stock !== false);
  const min = local.length ? Math.min(...local.map((o) => Number(o.price))) : null;
  const country = COUNTRIES[cc][lang];
  const title = d.productTitle(data.product.name, country);
  const desc = min !== null
    ? (lang === "ar"
      ? `أرخص سعر ${money(min, COUNTRIES[cc].currency, lang)} في ${local.length} محلات في ${country}. قارن الأسعار وشاهد سجل السعر.`
      : `Lowest price ${money(min, COUNTRIES[cc].currency, lang)} across ${local.length} stores in ${country}. Compare prices and see the price history.`)
    : d.heroSub;
  return {
    title,
    description: desc,
    alternates: alternates(cc, lang, `p/${data.product.slug}-${data.product.id}`),
    openGraph: { title, description: desc, images: data.product.image ? [data.product.image] : undefined },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { cc, lang, slug } = await params;
  const id = parseProductId(slug);
  if (!id) notFound();
  const data = await getProduct(id).catch(() => null);
  if (!data) notFound();
  const { product, offers, history, variants } = data;
  if (slug !== `${product.slug}-${product.id}`) permanentRedirect(productPath(cc, lang, product.slug, product.id));

  const d = t(lang);
  const currency = COUNTRIES[cc].currency;
  const country = COUNTRIES[cc][lang];
  const local = offers.filter((o) => o.country === cc);
  const live = local.filter((o) => o.price !== null && o.in_stock !== false);
  const min = live.length ? Math.min(...live.map((o) => Number(o.price))) : null;
  const max = live.length ? Math.max(...live.map((o) => Number(o.price))) : null;
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
        brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
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

      <header className="grid gap-5 md:grid-cols-[auto_1fr] items-start">
        <Thumb src={product.image} size={140} />
        <div className="min-w-0">
          <h1 className="text-[24px] sm:text-[30px] font-bold leading-tight">{product.name}</h1>
          <p className="text-muted text-[14px] mt-1">{d.productTitle("", country).trim()} · {local.length} {d.stores}</p>
          {min !== null ? (
            <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <p className="text-[13px] text-muted">{d.lowestPrice}</p>
                <p className="text-[32px] font-bold text-deal-ink leading-none num">{money(min, currency, lang)}</p>
              </div>
              {max !== null && max > min && (
                <p className="text-[14px] text-ink-2 pb-1">
                  {d.save} <b className="num">{money(max - min, currency, lang)}</b> {d.vsMost}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 panel p-3 text-ink-2">{d.notInCountry}</p>
          )}
          {min !== null && <p className={`mt-3 inline-block rounded-md px-3 py-1.5 text-[14px] font-medium ${verdictBox.cls}`}>{verdictBox.text}</p>}
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
                <thead className="bg-paper text-muted text-[12px]">
                  <tr>
                    <th className="text-start font-medium px-3 sm:px-4 py-2">{d.store}</th>
                    <th className="text-start font-medium px-2 py-2 hidden sm:table-cell">{d.stock}</th>
                    <th className="text-end font-medium px-2 py-2">{d.price}</th>
                    <th className="px-3 sm:px-4 py-2"><span className="sr-only">{d.goToStore}</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {local.map((o) => {
                    const isMin = min !== null && o.price !== null && Number(o.price) === min && o.in_stock !== false;
                    return (
                      <tr key={o.id} className={isMin ? "bg-deal-wash/60" : ""}>
                        <td className="px-3 sm:px-4 py-3 align-top">
                          <span className="font-semibold">{o.store}</span>
                          {isMin && <span className="ms-2 text-[11px] font-semibold text-deal-ink bg-deal-wash border border-deal/30 rounded px-1.5 py-0.5">{d.cheapest}</span>}
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
                          <span className={`font-bold text-[16px] num ${o.in_stock === false ? "text-muted line-through" : ""}`}>{money(o.price, o.currency || currency, lang)}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 align-top text-end">
                          <a href={`/go/${o.id}?cc=${cc}&lang=${lang}`} rel="sponsored nofollow noopener" target="_blank"
                            className={`inline-flex items-center gap-1 h-9 px-3 rounded-md text-[13px] font-medium whitespace-nowrap ${isMin ? "bg-deal text-white" : "bg-ink text-surface"}`}>
                            {d.goToStore} <span aria-hidden className="flip-rtl">↗</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}

          {series.points.length > 1 && (
            <section aria-labelledby="hist" className="panel p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h2 id="hist" className="text-[18px] font-bold">{d.priceHistory}</h2>
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
                <h2 id="gcc" className="text-[18px] font-bold">{d.acrossGcc}</h2>
                <p className="text-muted text-[13px]">{d.acrossGccSub} {currency}</p>
              </div>
              <table className="w-full text-[14px]">
                <tbody className="divide-y divide-line">
                  {gcc.map((g) => {
                    const conv = g.price !== null ? convert(g.price, g.cur, currency) : null;
                    const best = conv !== null && conv === Math.min(...gccWithPrice.map((x) => convert(x.price!, x.cur, currency)));
                    return (
                      <tr key={g.c} className={g.c === cc ? "bg-paper" : ""}>
                        <td className="px-4 py-2.5">
                          <Link href={productPath(g.c, lang, product.slug, product.id)} className="hover:underline">
                            <span aria-hidden>{COUNTRIES[g.c].flag}</span> {COUNTRIES[g.c][lang]}
                          </Link>
                          {g.store && <span className="block text-[12px] text-muted">{g.store}</span>}
                        </td>
                        <td className="px-2 py-2.5 text-end text-muted num">{g.price !== null ? money(g.price, g.cur, lang) : "—"}</td>
                        <td className={`px-4 py-2.5 text-end font-semibold num ${best ? "text-deal-ink" : ""}`}>{conv !== null ? money(conv, currency, lang) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          )}
          <p className="text-muted text-[12px]">{d.disclaimer}</p>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="panel p-4"><AlertForm productId={product.id} cc={cc} lang={lang} currency={currency} /></div>
          {(product.gtins?.length > 0 || product.mpns?.length > 0 || product.brand) && (
            <div className="panel p-4 text-[13px] space-y-1">
              <p className="font-semibold text-[14px] mb-1">{d.specs}</p>
              {product.brand && <p><span className="text-muted">Brand:</span> {product.brand}</p>}
              {product.storage && <p><span className="text-muted">Storage:</span> <span className="ltr">{product.storage}</span></p>}
              {product.mpns?.length > 0 && <p className="break-all"><span className="text-muted">MPN:</span> <span className="ltr">{product.mpns.slice(0, 4).join(", ")}</span></p>}
              {product.gtins?.length > 0 && <p className="break-all"><span className="text-muted">EAN:</span> <span className="ltr">{product.gtins.slice(0, 3).join(", ")}</span></p>}
            </div>
          )}
          <ReportForm productId={product.id} lang={lang} />
        </aside>
      </div>

      {min !== null && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-20 bg-surface border-t border-line px-4 py-2.5 flex items-center justify-between gap-3">
          <span><span className="block text-[11px] text-muted">{d.lowestPrice}</span><span className="font-bold text-deal-ink num">{money(min, currency, lang)}</span></span>
          {live[0] && (
            <a href={`/go/${live.find((o) => Number(o.price) === min)!.id}?cc=${cc}&lang=${lang}`} rel="sponsored nofollow noopener" target="_blank"
              className="h-10 px-4 rounded-md bg-deal text-white font-medium inline-flex items-center">{d.goToStore}</a>
          )}
        </div>
      )}
    </article>
  );
}
