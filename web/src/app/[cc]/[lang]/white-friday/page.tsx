import Link from "next/link";
import type { Metadata } from "next";
import { Empty, ProductList, Thumb } from "@/components/ProductList";
import { PriceTag } from "@/components/Spread";
import { money, productPath, storeName } from "@/lib/format";
import { COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";
import { getDrops, getHome } from "@/lib/queries";
import { alternates } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ cc: CC; lang: Lang }> }): Promise<Metadata> {
  const { cc, lang } = await params;
  const d = t(lang);
  return { title: `${d.wfTitle} · ${COUNTRIES[cc][lang]}`, description: d.wfSub, alternates: alternates(cc, lang, "white-friday") };
}

/** White Friday / Yellow Friday hub: real drops from our own daily history, with fake-discount warnings. */
export default async function WhiteFriday({ params }: { params: Promise<{ cc: CC; lang: Lang }> }) {
  const { cc, lang } = await params;
  const d = t(lang);
  const [home, drops] = await Promise.all([getHome(cc).catch(() => null), getDrops(cc, 40).catch(() => [])]);
  const real = drops.filter((p) => !p.raised_before);
  const fake = drops.filter((p) => p.raised_before);
  return (
    <div className="space-y-10">
      <section className="panel p-6 sm:p-8 grid gap-6 lg:grid-cols-[1.3fr_1fr] items-center">
        <div>
          <p className="text-[13px] font-medium text-ink-2"><span aria-hidden>{COUNTRIES[cc].flag}</span> {COUNTRIES[cc][lang]}</p>
          <h1 className="font-display text-[30px] sm:text-[42px] font-bold leading-[1.1] mt-2">{d.wfTitle}</h1>
          <p className="text-ink-2 mt-3 text-[16px] max-w-xl">{d.wfSub}</p>
        </div>
        <div className="rounded-xl bg-sunk border border-line p-5">
          <p className="font-semibold mb-2">{d.wfHow}</p>
          <ul className="space-y-2 text-[14px]">
            <li className="flex gap-2"><span aria-hidden className="mt-1.5 w-2.5 h-2.5 rounded-full bg-deal shrink-0" />{d.wfRule1}</li>
            <li className="flex gap-2"><span aria-hidden className="mt-1.5 w-2.5 h-2.5 rounded-full bg-warn shrink-0" />{d.wfRule2}</li>
            <li className="flex gap-2"><span aria-hidden className="mt-1.5 w-2.5 h-2.5 rounded-full bg-line-strong shrink-0" />{d.wfRule3}</li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="real">
        <h2 id="real" className="font-display text-[22px] font-bold">{d.priceDrops}</h2>
        <p className="text-muted text-[14px] mt-1 mb-4">{d.priceDropsSub}</p>
        {real.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {real.map((p) => {
              const pct = ((Number(p.old_price) - Number(p.new_price)) / Number(p.old_price)) * 100;
              return (
                <li key={p.id}>
                  <Link href={productPath(cc, lang, p.slug, p.id)} className="panel flex gap-3 p-3 h-full hover:border-line-strong transition-colors">
                    <Thumb src={p.image} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium clamp-2 text-[14px] leading-snug">{p.name}</span>
                      <span className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <PriceTag amount={p.new_price} currency={p.currency} lang={lang} size="sm" />
                        <s className="text-muted text-[12px] num">{money(p.old_price, p.currency, lang)}</s>
                        <span className="text-deal-ink text-[12px] font-semibold num">−{Math.round(pct)}%</span>
                      </span>
                      <span className="block text-muted text-[12px] mt-1">{storeName(p.store, lang)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : <Empty title={d.noResults} sub={lang === "ar" ? "تظهر الانخفاضات هنا فور رصدها في متابعتنا اليومية." : "Drops show up here as soon as our daily checks see them."} />}
      </section>

      {fake.length > 0 && (
        <section aria-labelledby="fake">
          <h2 id="fake" className="font-display text-[22px] font-bold text-warn">{d.raisedBefore}</h2>
          <ul className="panel divide-y divide-line mt-4">
            {fake.map((p) => (
              <li key={p.id}>
                <Link href={productPath(cc, lang, p.slug, p.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-sunk">
                  <Thumb src={p.image} />
                  <span className="flex-1 min-w-0"><span className="block font-medium clamp-2">{p.name}</span>
                    <span className="block text-muted text-[13px]">{storeName(p.store, lang)}</span></span>
                  <span className="num font-semibold">{money(p.new_price, p.currency, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {home?.gaps.length ? (
        <section aria-labelledby="gaps">
          <h2 id="gaps" className="font-display text-[22px] font-bold mb-4">{d.bySpread}</h2>
          <ProductList items={home.gaps} cc={cc} lang={lang} showGap />
        </section>
      ) : null}
    </div>
  );
}
