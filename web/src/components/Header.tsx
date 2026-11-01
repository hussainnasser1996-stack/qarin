import Link from "next/link";
import { SearchBox } from "./SearchBox";
import { LocaleSwitch } from "./LocaleSwitch";
import { ListLink } from "./Watch";
import { t, type CC, type Lang } from "@/lib/i18n";

export function Logo({ lang }: { lang: Lang }) {
  return (
    <span className="inline-flex items-center gap-2 font-display font-bold text-[21px]">
      <span aria-hidden className="tag inline-flex items-center h-7 pe-2 text-[13px] font-bold">ق</span>
      <span>{lang === "ar" ? "قارن" : "Qarin"}</span>
      <span className="text-muted font-medium text-[13px] font-sans">{lang === "ar" ? "Qarin" : "قارن"}</span>
    </span>
  );
}

export function Header({ cc, lang }: { cc: CC; lang: Lang }) {
  const d = t(lang);
  return (
    <header className="bg-surface/95 backdrop-blur border-b border-line sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3 sm:gap-6">
        <Link href={`/${cc}/${lang}`} aria-label={d.home} className="shrink-0 no-underline">
          <Logo lang={lang} />
        </Link>
        <div className="flex-1 min-w-0 hidden md:block">
          <SearchBox cc={cc} lang={lang} placeholder={d.searchPlaceholder} />
        </div>
        <nav className="flex items-center gap-1 sm:gap-3 ms-auto md:ms-0 text-[14px]">
          <Link href={`/${cc}/${lang}/deals`} className="px-2 py-1.5 rounded-md hover:bg-paper font-medium">{d.deals}</Link>
          <Link href={`/${cc}/${lang}/stores`} className="px-2 py-1.5 rounded-md hover:bg-paper hidden lg:inline">{d.allStores}</Link>
          <ListLink cc={cc} lang={lang} />
          <LocaleSwitch cc={cc} lang={lang} />
        </nav>
      </div>
      <div className="md:hidden px-4 pb-3">
        <SearchBox cc={cc} lang={lang} placeholder={d.searchPlaceholder} />
      </div>
    </header>
  );
}
