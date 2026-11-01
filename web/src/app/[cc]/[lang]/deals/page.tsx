import Link from "next/link";
import type { Metadata } from "next";
import { Empty, ProductList, Thumb } from "@/components/ProductList";
import { money, productPath, storeName } from "@/lib/format";
import { COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";
import { getDrops, getHome } from "@/lib/queries";
import { alternates } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ cc: CC; lang: Lang }> }): Promise<Metadata> {
  const { cc, lang } = await params;
  return { title: `${t(lang).dealsTitle} · ${COUNTRIES[cc][lang]}`, alternates: alternates(cc, lang, "deals") };
}

export default async function Deals({ params }: { params: Promise<{ cc: CC; lang: Lang }> }) {
  const { cc, lang } = await params;
  const d = t(lang);
  const [home, drops] = await Promise.all([getHome(cc).catch(() => null), getDrops(cc, 30).catch(() => [])]);
  return (
    <div className="space-y-8">
      <h1 className="font-display text-[26px] sm:text-[30px] font-bold">{d.dealsTitle} · {COUNTRIES[cc][lang]}</h1>
      <section>
        <h2 className="font-display text-[20px] font-bold">{d.priceDrops}</h2>
        <p className="text-muted text-[14px] mb-3">{d.priceDropsSub}</p>
        {drops.length ? (
          <ul className="panel divide-y divide-line">
            {drops.map((p) => {
              const pctDrop = ((Number(p.old_price) - Number(p.new_price)) / Number(p.old_price)) * 100;
              return (
                <li key={p.id}>
                  <Link href={productPath(cc, lang, p.slug, p.id)} className="flex items-center gap-3 px-4 py-3 hover:bg-paper">
                    <Thumb src={p.image} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-medium clamp-2">{p.name}</span>
                      <span className="block text-muted text-[13px]">{storeName(p.store, lang)}</span>
                      {p.raised_before && <span className="block text-warn text-[12px]">{d.raisedBefore}</span>}
                    </span>
                    <span className="text-end">
                      <span className="block font-semibold num">{money(p.new_price, p.currency, lang)}</span>
                      <span className="block text-[12px] text-muted">{d.wasPrice} <s className="num">{money(p.old_price, p.currency, lang)}</s></span>
                      <span className="text-[12px] font-semibold text-deal-ink num">−{Math.round(pctDrop)}%</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : <Empty title={d.noResults} sub={lang === "ar" ? "تظهر الانخفاضات بعد أول أيام من التتبع." : "Drops appear after the first days of tracking."} />}
      </section>
      <section>
        <h2 className="font-display text-[20px] font-bold">{d.biggestGaps}</h2>
        <p className="text-muted text-[14px] mb-3">{d.biggestGapsSub}</p>
        {home?.gaps.length ? <ProductList items={home.gaps} cc={cc} lang={lang} showGap /> : <Empty title={d.noResults} />}
      </section>
    </div>
  );
}
