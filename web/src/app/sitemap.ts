import type { MetadataRoute } from "next";
import { CATEGORIES, CCS, LANGS, type CC } from "@/lib/i18n";
import { getSitemapProducts } from "@/lib/queries";
import { SITE } from "@/lib/site";

export const revalidate = 21600;

export async function generateSitemaps() {
  return CCS.map((cc) => ({ id: cc }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const cc = (await id) as CC;
  const out: MetadataRoute.Sitemap = [];
  for (const lang of LANGS) {
    out.push({ url: `${SITE}/${cc}/${lang}`, changeFrequency: "daily", priority: 1 });
    out.push({ url: `${SITE}/${cc}/${lang}/deals`, changeFrequency: "daily", priority: 0.8 });
    out.push({ url: `${SITE}/${cc}/${lang}/white-friday`, changeFrequency: "daily", priority: 0.8 });
    for (const c of CATEGORIES) out.push({ url: `${SITE}/${cc}/${lang}/c/${c.slug}`, changeFrequency: "daily", priority: 0.7 });
  }
  const products = await getSitemapProducts(cc).catch(() => []);
  for (const p of products) {
    for (const lang of LANGS) {
      out.push({ url: `${SITE}/${cc}/${lang}/p/${p.slug}-${p.id}`, lastModified: p.updated_at, changeFrequency: "daily", priority: 0.6 });
    }
  }
  return out;
}
