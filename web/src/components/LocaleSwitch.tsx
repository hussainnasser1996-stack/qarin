"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CCS, COUNTRIES, t, type CC, type Lang } from "@/lib/i18n";

/** Language switch keeps the same page; country switch keeps the same page too (prices change). */
export function LocaleSwitch({ cc, lang }: { cc: CC; lang: Lang }) {
  const path = usePathname() || `/${cc}/${lang}`;
  const rest = path.split("/").slice(3).join("/");
  const other: Lang = lang === "ar" ? "en" : "ar";
  const [open, setOpen] = useState(false);
  const d = t(lang);
  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox"
          className="px-2 py-1.5 rounded-md hover:bg-paper flex items-center gap-1.5" aria-label={d.changeCountry}>
          <span aria-hidden>{COUNTRIES[cc].flag}</span>
          <span className="hidden sm:inline">{COUNTRIES[cc][lang]}</span>
          <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {open && (
          <ul role="listbox" className="absolute end-0 mt-1 panel shadow-lg py-1 min-w-44 z-50">
            {CCS.map((c) => (
              <li key={c} role="option" aria-selected={c === cc}>
                <Link href={`/${c}/${lang}${rest ? `/${rest}` : ""}`} onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 hover:bg-paper ${c === cc ? "font-semibold" : ""}`}>
                  <span aria-hidden>{COUNTRIES[c].flag}</span>{COUNTRIES[c][lang]}
                  <span className="ms-auto text-muted text-[12px]">{COUNTRIES[c].currency}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Link href={`/${cc}/${other}${rest ? `/${rest}` : ""}`} hrefLang={other} lang={other}
        className="px-2 py-1.5 rounded-md hover:bg-paper font-medium">{d.language}</Link>
    </div>
  );
}
