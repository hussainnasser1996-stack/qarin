import Link from "next/link";
import { SearchBox } from "./SearchBox";
import { LocaleSwitch } from "./LocaleSwitch";
import { t, type CC, type Lang } from "@/lib/i18n";

export function Logo({ lang }: { lang: Lang }) {
  return (
    <span className="inline-flex items-baseline gap-2 font-bold tracking-tight text-[20px]">
      <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" className="self-center">
        <rect x="2" y="9" width="5" height="13" rx="1.5" fill="var(--ink)" />
        <rect x="9.5" y="4" width="5" height="18" rx="1.5" fill="var(--line-strong)" />
        <rect x="17" y="13" width="5" height="9" rx="1.5" fill="var(--deal)" />
      </svg>
      <span>{lang === "ar" ? "قارن" : "Qarin"}</span>
      <span className="text-muted font-medium text-[14px]">{lang === "ar" ? "Qarin" : "قارن"}</span>
    </span>
  );
}

export function Header({ cc, lang }: { cc: CC; lang: Lang }) {
  const d = t(lang);
  return (
    <header className="bg-surface border-b border-line sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-6">
        <Link href={`/${cc}/${lang}`} aria-label={d.home} className="shrink-0 no-underline">
          <Logo lang={lang} />
        </Link>
        <div className="flex-1 min-w-0 hidden md:block">
          <SearchBox cc={cc} lang={lang} placeholder={d.searchPlaceholder} />
        </div>
        <nav className="flex items-center gap-1 sm:gap-3 ms-auto md:ms-0 text-[14px]">
          <Link href={`/${cc}/${lang}/deals`} className="px-2 py-1.5 rounded-md hover:bg-paper font-medium">{d.deals}</Link>
          <Link href={`/${cc}/${lang}/stores`} className="px-2 py-1.5 rounded-md hover:bg-paper hidden sm:inline">{d.allStores}</Link>
          <LocaleSwitch cc={cc} lang={lang} />
        </nav>
      </div>
      <div className="md:hidden px-4 pb-3">
        <SearchBox cc={cc} lang={lang} placeholder={d.searchPlaceholder} />
      </div>
    </header>
  );
}
