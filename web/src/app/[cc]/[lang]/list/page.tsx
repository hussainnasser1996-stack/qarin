import type { Metadata } from "next";
import { SavedList } from "@/components/Watch";
import { t, type CC, type Lang } from "@/lib/i18n";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function MyList({ params }: { params: Promise<{ cc: CC; lang: Lang }> }) {
  const { cc, lang } = await params;
  const d = t(lang);
  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="font-display text-[26px] sm:text-[30px] font-bold">{d.myList}</h1>
        <p className="text-muted text-[14px] mt-1">{d.myListSub}</p>
      </div>
      <SavedList cc={cc} lang={lang} />
    </div>
  );
}
