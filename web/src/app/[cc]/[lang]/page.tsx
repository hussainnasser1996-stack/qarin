import Link from "next/link";
import type { Metadata } from "next";
import { SearchBox } from "@/components/SearchBox";
import { ProductCards, ProductList, Thumb } from "@/components/ProductList";
import { PriceTag, SpreadBar } from "@/components/Spread";
import { ago, convert, money, productPath, storeName } from "@/lib/format";
import { categoryName, COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";
import { getGccHero, getHome, getPopular, type ListItem } from "@/lib/queries";
import { alternates } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ cc: CC; lang: Lang }> }): Promise<Metadata> {
  const { cc, lang } = await params;
  return { alternates: alternates(cc, lang, "") };
}

/** Hero thesis: today's real, biggest same-product gap in this country, drawn as a spread. */
function GapTicket({ p, cc, lang }: { p: ListItem; cc: CC; lang: Lang }) {
  const d = t(lang);
  const spread = (p.spread || []).map((x) => ({ s: x.s, p: Number(x.p) }));
  const saving = Number(p.max_price) - Number(p.min_price);
  return (
    <Link href={productPath(cc, lang, p.slug, p.id)} className="panel block p-5 sm:p-6 shadow-[0_1px_0_var(--line),0_12px_32px_-18px_rgba(12,31,36,.35)] hover:border-line-strong transition-colors">
      <p className="text-[12px] font-medium text-muted">{d.todayIn} {COUNTRIES[cc][lang]}</p>
      <div className="flex items-center gap-4 mt-3">
        <Thumb src={p.image} size={72} alt={p.name} />
        <div className="min-w-0">
          <p className="font-display font-semibold text-[18px] leading-snug clamp-2">{p.name}</p>
          <p className="text-[13px] text-ink-2 mt-1">{d.sameItem} <span className="num">{p.n_offers}</span> {d.stores}</p>
        </div>
      </div>
      <SpreadBar spread={spread} currency={p.currency} lang={lang} size="lg" animate labels />
      <div className="flex items-end justify-between gap-3">
        <PriceTag amount={p.min_price!} currency={p.currency} lang={lang} size="md" caption={d.cheapest} />
        <p className="text-end">
          <span className="block font-display font-bold text-[24px] text-deal-ink num leading-none">{money(saving, p.currency, lang)}</span>
          <span className="block text-[12px] text-muted mt-1">{d.apart}</span>
        </p>
      </div>
    </Link>
  );
}

function GccTicket({ h, cc, lang }: { h: NonNullable<Awaited<ReturnType<typeof getGccHero>>>; cc: CC; lang: Lang }) {
  const d = t(lang);
  const cur = COUNTRIES[cc].currency;
  const spread = h.prices.map((x) => ({ s: COUNTRIES[x.country][lang], p: Math.round(convert(x.price, x.currency, cur) * 1000) / 1000 }))
    .sort((a, b) => a.p - b.p);
  return (
    <Link href={productPath(cc, lang, h.slug, h.id)} className="panel block p-5 sm:p-6 shadow-[0_1px_0_var(--line),0_12px_32px_-18px_rgba(12,31,36,.35)] hover:border-line-strong transition-colors">
      <p className="text-[12px] font-medium text-muted">{d.acrossGcc}</p>
      <div className="flex items-center gap-4 mt-3">
        <Thumb src={h.image} size={72} alt={h.name} />
        <div className="min-w-0">
          <p className="font-display font-semibold text-[18px] leading-snug clamp-2">{h.name}</p>
          <p className="text-[13px] text-ink-2 mt-1">{d.acrossGccSub} {cur}</p>
        </div>
      </div>
      <SpreadBar spread={spread} currency={cur} lang={lang} size="lg" animate labels />
      <div className="flex items-end justify-between gap-3">
        <PriceTag amount={spread[0].p} currency={cur} lang={lang} size="md" caption={spread[0].s} />
        <p className="text-end">
          <span className="block font-display font-bold text-[24px] text-deal-ink num leading-none">{money(spread[spread.length - 1].p - spread[0].p, cur, lang)}</span>
          <span className="block text-[12px] text-muted mt-1">{d.apart}</span>
        </p>
      </div>
    </Link>
  );
}

export default async function Home({ params }: { params: Promise<{ cc: CC; lang: Lang }> }) {
  const { cc, lang } = await params;
  const d = t(lang);
  const [data, popular] = await Promise.all([getHome(cc).catch(() => null), getPopular(cc, 12).catch(() => [])]);
  const country = COUNTRIES[cc][lang];
  const hero = data?.gaps.find((g) => (g.spread?.length ?? 0) >= 2 && g.image) ?? data?.gaps[0];
  const gccHero = hero ? null : await getGccHero().catch(() => null);
  return (
    <div className="space-y-12">
      {new Date().getMonth() === 10 && (
        <Link href={`/${cc}/${lang}/white-friday`} className="-mb-4 flex items-center justify-between gap-3 rounded-xl bg-ink text-surface px-4 py-3 text-[14px] hover:opacity-95">
          <span><span aria-hidden className="tag inline-flex h-6 items-center pe-2 me-2 text-[12px] font-bold align-middle">%</span>{t(lang).wfTitle}</span>
          <span aria-hidden className="flip-rtl">→</span>
        </Link>
      )}
      <section className="grid gap-8 lg:grid-cols-[1.15fr_1fr] items-center pt-2 sm:pt-6">
        <div>
          <p className="text-[13px] font-medium text-ink-2 mb-3"><span aria-hidden>{COUNTRIES[cc].flag}</span> {d.tagline} · {country}</p>
          <h1 className="font-display text-[34px] sm:text-[48px] font-bold leading-[1.08]">{d.heroTitle}</h1>
          <p className="text-ink-2 mt-4 text-[16px] sm:text-[17px] max-w-xl">{d.heroSub}</p>
          <div className="mt-6 max-w-xl"><SearchBox cc={cc} lang={lang} placeholder={d.searchPlaceholder} big /></div>
          {data?.totals && (
            <p className="text-muted text-[13px] mt-3">
              <span className="num">{Number(data.totals.products).toLocaleString("en-US")}</span> {d.productsTracked} ·{" "}
              <span className="num">{data.stores.length}</span> {d.stores} · {d.lastUpdate}{" "}
              <time dateTime={data.totals.last_seen}>{ago(data.totals.last_seen, lang)}</time>
            </p>
          )}
        </div>
        {hero ? <GapTicket p={hero} cc={cc} lang={lang} /> : gccHero ? <GccTicket h={gccHero} cc={cc} lang={lang} /> : null}
      </section>

      {data && data.cats.length > 0 && (
        <nav aria-label={d.categories}>
          <h2 className="sr-only">{d.categories}</h2>
          <ul className="grid gap-2.5 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
            {data.cats.filter((c) => c.category && !["accessories", "other-electronics"].includes(c.category)).slice(0, 12).map((c) => (
              <li key={c.category}>
                <Link href={`/${cc}/${lang}/c/${c.category}`} className="panel group flex flex-col items-center text-center gap-2 p-3 h-full hover:border-ink-2 transition-colors">
                  <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {c.image && <img src={c.image} alt="" loading="lazy" className="max-w-[85%] max-h-[85%] object-contain group-hover:scale-105 transition-transform" />}
                  </span>
                  <span className="text-[13px] font-medium leading-tight">{categoryName(c.category, lang)}</span>
                  <span className="text-muted text-[11px] num -mt-1">{c.n.toLocaleString("en-US")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {popular.length > 2 && (
        <section aria-labelledby="popular">
          <h2 id="popular" className="font-display text-[22px] sm:text-[26px] font-bold">{d.popularIn(country)}</h2>
          <p className="text-muted text-[14px] mt-1 mb-4">{d.popularSub}</p>
          <ProductCards items={popular} cc={cc} lang={lang} scroll />
        </section>
      )}

      {data && data.gaps.length > 1 && (
        <section aria-labelledby="gaps">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 id="gaps" className="font-display text-[22px] sm:text-[26px] font-bold">{d.biggestGaps}</h2>
              <p className="text-muted text-[14px] mt-1">{d.biggestGapsSub}</p>
            </div>
            <Link href={`/${cc}/${lang}/deals`} className="text-[14px] font-medium underline underline-offset-4 shrink-0">{d.seeAll}</Link>
          </div>
          <ProductList items={data.gaps.filter((g) => g.id !== hero?.id).slice(0, 8)} cc={cc} lang={lang} showGap />
        </section>
      )}

      {data && data.drops.length > 0 && (
        <section aria-labelledby="drops">
          <h2 id="drops" className="font-display text-[22px] sm:text-[26px] font-bold">{d.priceDrops}</h2>
          <p className="text-muted text-[14px] mt-1 mb-4">{d.priceDropsSub}</p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.drops.slice(0, 6).map((p) => {
              const drop = ((Number(p.old_price) - Number(p.new_price)) / Number(p.old_price)) * 100;
              return (
                <li key={p.id}>
                  <Link href={productPath(cc, lang, p.slug, p.id)} className="panel flex gap-3 p-3 hover:border-line-strong h-full transition-colors">
                    <Thumb src={p.image} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium clamp-2 text-[14px] leading-snug">{p.name}</span>
                      <span className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <PriceTag amount={p.new_price} currency={p.currency} lang={lang} size="sm" />
                        <s className="text-muted text-[12px] num">{money(p.old_price, p.currency, lang)}</s>
                        <span className="text-deal-ink text-[12px] font-semibold num">−{Math.round(drop)}%</span>
                      </span>
                      <span className="block text-muted text-[12px] mt-1">{storeName(p.store, lang)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {data && data.stores.length > 0 && (
        <section aria-labelledby="stores" className="panel p-5 sm:p-6">
          <h2 id="stores" className="font-display text-[20px] font-bold mb-4">{d.storesCovered} · {country}</h2>
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {data.stores.map((s) => (
              <li key={s.id}>
                <Link href={`/${cc}/${lang}/stores/${s.id}`} className="group block">
                  <span className="block font-semibold group-hover:underline underline-offset-4">{storeName(s.name, lang)}</span>
                  <span className="block text-muted text-[13px]">
                    <span className="num">{s.offers.toLocaleString("en-US")}</span> {d.offersTracked} · {ago(s.last_seen, lang)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-muted text-[13px] mt-4 pt-4 border-t border-line">{d.coverageNote}</p>
        </section>
      )}
    </div>
  );
}
