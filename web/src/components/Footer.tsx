import Link from "next/link";
import { Logo } from "./Header";
import { CCS, COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";

export function Footer({ cc, lang }: { cc: CC; lang: Lang }) {
  const d = t(lang);
  const base = `/${cc}/${lang}`;
  const links: [string, string][] = [
    [`${base}/info/about`, d.about],
    [`${base}/info/how-we-make-money`, d.howWeMakeMoney],
    [`${base}/list-your-store`, d.listYourStore],
    [`${base}/info/privacy`, d.privacy],
    [`${base}/info/terms`, d.terms],
    [`${base}/info/bot`, d.bot],
  ];
  return (
    <footer className="border-t border-line bg-surface mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid gap-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="space-y-2">
          <Logo lang={lang} />
          <p className="text-muted text-[13px] max-w-sm">{d.disclaimer}</p>
          <p className="text-muted text-[13px] max-w-sm">{d.coverageNote}</p>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px] content-start">
          {links.map(([href, label]) => (
            <li key={href}><Link href={href} className="hover:underline">{label}</Link></li>
          ))}
        </ul>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[14px] content-start">
          {CCS.map((c) => (
            <li key={c}>
              <Link href={`/${c}/${lang}`} className={`hover:underline ${c === cc ? "font-semibold" : ""}`}>
                <span aria-hidden>{COUNTRIES[c].flag}</span> {COUNTRIES[c][lang]}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-center text-muted text-[12px] pb-6">© {new Date().getFullYear()} Qarin · قارن</p>
    </footer>
  );
}
