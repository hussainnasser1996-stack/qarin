import type { Metadata } from "next";
import Link from "next/link";
import { t, type CC, type Lang } from "@/lib/i18n";
import { one, type SP } from "@/components/Listing";

export const metadata: Metadata = { robots: { index: false } };

export default async function AlertStatus({ params, searchParams }: { params: Promise<{ cc: CC; lang: Lang }>; searchParams: SP }) {
  const { cc, lang } = await params;
  const s = one((await searchParams).s);
  const d = t(lang);
  const msg = s === "confirmed" ? d.alertConfirmed : s === "unsubscribed" ? d.alertUnsubscribed : d.thanks;
  return (
    <div className="max-w-lg panel p-6 space-y-3">
      <p className="text-[18px] font-semibold">{msg}</p>
      <Link href={`/${cc}/${lang}`} className="underline">{d.home}</Link>
    </div>
  );
}
