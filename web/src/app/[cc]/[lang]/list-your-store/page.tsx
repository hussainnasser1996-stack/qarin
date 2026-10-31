import type { Metadata } from "next";
import { MerchantForm } from "@/components/Forms";
import { t, type CC, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ cc: CC; lang: Lang }> }): Promise<Metadata> {
  const { cc, lang } = await params;
  return { title: t(lang).merchantTitle, alternates: alternates(cc, lang, "list-your-store") };
}

export default async function ListYourStore({ params }: { params: Promise<{ cc: CC; lang: Lang }> }) {
  const { lang } = await params;
  const d = t(lang);
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="font-display text-[28px] font-bold">{d.merchantTitle}</h1>
      <p className="text-ink-2 text-[16px]">{d.merchantSub}</p>
      <MerchantForm lang={lang} />
    </div>
  );
}
