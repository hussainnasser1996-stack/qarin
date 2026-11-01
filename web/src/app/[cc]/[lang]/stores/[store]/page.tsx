import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing, listParams, type SP } from "@/components/Listing";
import { StorePolicies } from "@/components/StorePolicies";
import { ago, storeName } from "@/lib/format";
import { COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";
import { getStores } from "@/lib/queries";
import { alternates } from "@/lib/seo";

type Params = Promise<{ cc: CC; lang: Lang; store: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { cc, lang, store } = await params;
  const s = (await getStores().catch(() => [])).find((x) => x.id === store);
  return s ? { title: `${storeName(s.name, lang)} · ${COUNTRIES[s.country as CC][lang]}`, alternates: alternates(cc, lang, `stores/${store}`) } : {};
}

export default async function StorePage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { cc, lang, store } = await params;
  const s = (await getStores().catch(() => [])).find((x) => x.id === store);
  if (!s) notFound();
  const d = t(lang);
  const sp = await searchParams;
  const scc = s.country as CC;
  return (
    <div className="space-y-4">
      <header className="panel p-4 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <h1 className="font-display text-[24px] font-bold">{storeName(s.name, lang)} <span className="text-muted text-[16px] font-medium">· {COUNTRIES[scc][lang]}</span></h1>
          <p className="text-muted text-[14px]">
            <span className="num">{s.offers.toLocaleString("en-US")}</span> {d.offersTracked} · {d.updated} {ago(s.last_seen, lang)}
          </p>
        </div>
        {s.home && <a href={s.home} rel="nofollow noopener" target="_blank" className="h-10 px-4 inline-flex items-center rounded-md border border-line hover:bg-paper">{d.visitStore} <span aria-hidden className="ms-1 flip-rtl">↗</span></a>}
      </header>
      <StorePolicies p={s.policies} lang={lang} />
      <Listing cc={scc} lang={lang} base={`/${cc}/${lang}/stores/${store}`} p={{ ...listParams(sp), store }} />
    </div>
  );
}
