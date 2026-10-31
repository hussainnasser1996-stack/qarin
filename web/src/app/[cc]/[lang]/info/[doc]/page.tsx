import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOCS } from "@/lib/docs";
import type { CC, Lang } from "@/lib/i18n";
import { alternates } from "@/lib/seo";

type Params = Promise<{ cc: CC; lang: Lang; doc: string }>;

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { cc, lang, doc } = await params;
  const d = DOCS[doc]?.[lang];
  return d ? { title: d.title, alternates: alternates(cc, lang, `info/${doc}`) } : {};
}

export default async function Info({ params }: { params: Params }) {
  const { lang, doc } = await params;
  const d = DOCS[doc]?.[lang];
  if (!d) notFound();
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="text-[28px] font-bold">{d.title}</h1>
      {d.body.map((p, i) => <p key={i} className="text-ink-2 text-[16px]">{p}</p>)}
    </article>
  );
}
