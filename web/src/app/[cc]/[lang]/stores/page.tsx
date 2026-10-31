import Link from "next/link";
import type { Metadata } from "next";
import { ago } from "@/lib/format";
import { CCS, COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";
import { getStores } from "@/lib/queries";
import { alternates } from "@/lib/seo";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ cc: CC; lang: Lang }> }): Promise<Metadata> {
  const { cc, lang } = await params;
  return { title: t(lang).storesCovered, alternates: alternates(cc, lang, "stores") };
}

export default async function Stores({ params }: { params: Promise<{ cc: CC; lang: Lang }> }) {
  const { cc, lang } = await params;
  const d = t(lang);
  const all = await getStores().catch(() => []);
  return (
    <div className="space-y-6">
      <h1 className="font-display text-[26px] font-bold">{d.storesCovered}</h1>
      <p className="text-muted max-w-2xl">{d.coverageNote}</p>
      {CCS.map((c) => {
        const list = all.filter((s) => s.country === c);
        if (!list.length) return null;
        return (
          <section key={c} className={c === cc ? "order-first" : ""}>
            <h2 className="font-display text-[18px] font-bold mb-2"><span aria-hidden>{COUNTRIES[c].flag}</span> {COUNTRIES[c][lang]}</h2>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((s) => (
                <li key={s.id}>
                  <Link href={`/${c}/${lang}/stores/${s.id}`} className="panel block p-3 hover:border-line-strong">
                    <span className="block font-semibold">{s.name}</span>
                    <span className="block text-muted text-[13px]"><span className="num">{s.offers.toLocaleString("en-US")}</span> {d.offersTracked}</span>
                    <span className="block text-muted text-[12px]">{d.updated} {ago(s.last_seen, lang)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
