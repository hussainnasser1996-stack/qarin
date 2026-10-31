import type { Metadata } from "next";
import { Listing, listParams, one, type SP } from "@/components/Listing";
import { t, type CC, type Lang } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function Search({ params, searchParams }: { params: Promise<{ cc: CC; lang: Lang }>; searchParams: SP }) {
  const { cc, lang } = await params;
  const sp = await searchParams;
  const q = (one(sp.q) || "").slice(0, 100);
  const d = t(lang);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-[24px] font-bold">{q ? <>“<span className="ltr">{q}</span>”</> : d.search}</h1>
      <Listing cc={cc} lang={lang} base={`/${cc}/${lang}/search`} p={{ ...listParams(sp), q }} />
    </div>
  );
}
