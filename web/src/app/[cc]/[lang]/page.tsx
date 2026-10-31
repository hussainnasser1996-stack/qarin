import Link from "next/link";
import type { Metadata } from "next";
import { SearchBox } from "@/components/SearchBox";
import { ProductList, Thumb } from "@/components/ProductList";
import { ago, money, productPath } from "@/lib/format";
import { categoryName, COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";
import { getHome } from "@/lib/queries";
import { alternates } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ cc: CC; lang: Lang }> }): Promise<Metadata> {
  const { cc, lang } = await params;
  return { alternates: alternates(cc, lang, "") };
}

export default async function Home({ params }: { params: Promise<{ cc: CC; lang: Lang }> }) {
  const { cc, lang } = await params;
  const d = t(lang);
  const data = await getHome(cc).catch(() => null);
  const country = COUNTRIES[cc][lang];
  return (
    <div className="space-y-10">
      <section className="pt-4 sm:pt-8 pb-2 max-w-3xl">
        <p className="text-muted text-[14px] mb-2"><span aria-hidden>{COUNTRIES[cc].flag}</span> {d.tagline} · {country}</p>
        <h1 className="text-[28px] sm:text-[40px] font-bold leading-tight tracking-tight">{d.heroTitle}</h1>
        <p className="text-ink-2 mt-3 text-[16px] max-w-2xl">{d.heroSub}</p>
        <div className="mt-6"><SearchBox cc={cc} lang={lang} placeholder={d.searchPlaceholder} big /></div>
        {data?.totals && (
          <p className="text-muted text-[13px] mt-3">
            <span className="num">{Number(data.totals.products).toLocaleString("en-US")}</span> {d.productsTracked} ·{" "}
            <span className="num">{Number(data.totals.offers).toLocaleString("en-US")}</span> {d.offersTracked} · {d.lastUpdate}{" "}
            <time dateTime={data.totals.last_seen}>{ago(data.totals.last_seen, lang)}</time>
          </p>
        )}
      </section>

      {data && data.gaps.length > 0 && (
        <section aria-labelledby="gaps">
          <div className="flex items-end justify-between gap-4 mb-3">
            <div>
              <h2 id="gaps" className="text-[20px] font-bold">{d.biggestGaps}</h2>
              <p className="text-muted text-[14px]">{d.biggestGapsSub}</p>
            </div>
            <Link href={`/${cc}/${lang}/deals`} className="text-[14px] font-medium hover:underline shrink-0">{d.seeAll}</Link>
          </div>
          <ProductList items={data.gaps} cc={cc} lang={lang} showGap />
        </section>
      )}

      {data && data.drops.length > 0 && (
        <section aria-labelledby="drops">
          <h2 id="drops" className="text-[20px] font-bold">{d.priceDrops}</h2>
          <p className="text-muted text-[14px] mb-3">{d.priceDropsSub}</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.drops.slice(0, 6).map((p) => {
              const drop = ((Number(p.old_price) - Number(p.new_price)) / Number(p.old_price)) * 100;
              return (
                <li key={p.id}>
                  <Link href={productPath(cc, lang, p.slug, p.id)} className="panel flex gap-3 p-3 hover:border-line-strong no-underline h-full">
                    <Thumb src={p.image} />
                    <span className="min-w-0">
                      <span className="block font-medium clamp-2 text-[14px] leading-snug">{p.name}</span>
                      <span className="block mt-1 text-[13px]">
                        <span className="font-semibold num">{money(p.new_price, p.currency, lang)}</span>{" "}
                        <s className="text-muted num">{money(p.old_price, p.currency, lang)}</s>{" "}
                        <span className="text-deal-ink font-semibold num">−{Math.round(drop)}%</span>
                      </span>
                      <span className="block text-muted text-[12px]">{p.store}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {data && data.cats.length > 0 && (
        <section aria-labelledby="cats">
          <h2 id="cats" className="text-[20px] font-bold mb-3">{d.categories}</h2>
          <ul className="flex flex-wrap gap-2">
            {data.cats.filter((c) => c.category).map((c) => (
              <li key={c.category}>
                <Link href={`/${cc}/${lang}/c/${c.category}`} className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-surface border border-line hover:border-line-strong">
                  {categoryName(c.category, lang)} <span className="text-muted text-[12px] num">{c.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.stores.length > 0 && (
        <section aria-labelledby="stores">
          <h2 id="stores" className="text-[20px] font-bold mb-3">{d.storesCovered}</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.stores.map((s) => (
              <li key={s.id}>
                <Link href={`/${cc}/${lang}/stores/${s.id}`} className="panel block p-3 hover:border-line-strong">
                  <span className="block font-semibold">{s.name}</span>
                  <span className="block text-muted text-[13px]">
                    <span className="num">{s.offers.toLocaleString("en-US")}</span> {d.offersTracked}
                  </span>
                  <span className="block text-muted text-[12px]">{d.updated} {ago(s.last_seen, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-muted text-[13px] mt-3">{d.coverageNote}</p>
        </section>
      )}
    </div>
  );
}
