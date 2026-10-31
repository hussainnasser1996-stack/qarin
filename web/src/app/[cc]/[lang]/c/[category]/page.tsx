import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing, listParams, type SP } from "@/components/Listing";
import { CATEGORIES, categoryName, COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";
import { alternates } from "@/lib/seo";

type Params = Promise<{ cc: CC; lang: Lang; category: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { cc, lang, category } = await params;
  const name = categoryName(category, lang);
  return {
    title: t(lang).categoryTitle(name, COUNTRIES[cc][lang]),
    alternates: alternates(cc, lang, `c/${category}`),
  };
}

export default async function Category({ params, searchParams }: { params: Params; searchParams: SP }) {
  const { cc, lang, category } = await params;
  if (!CATEGORIES.some((c) => c.slug === category)) notFound();
  const sp = await searchParams;
  const d = t(lang);
  return (
    <div className="space-y-4">
      <h1 className="font-display text-[24px] sm:text-[28px] font-bold">{d.categoryTitle(categoryName(category, lang), COUNTRIES[cc][lang])}</h1>
      <Listing cc={cc} lang={lang} base={`/${cc}/${lang}/c/${category}`} p={{ ...listParams(sp), category }} />
    </div>
  );
}
