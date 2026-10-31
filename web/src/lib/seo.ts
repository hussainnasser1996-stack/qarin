import type { Metadata } from "next";
import { CCS, COUNTRIES, LANGS, type CC, type Lang } from "./i18n";
import { SITE } from "./site";

/** Canonical + hreflang for all 12 country×language versions of the same page. */
export function alternates(cc: CC, lang: Lang, rest: string): Metadata["alternates"] {
  const path = rest ? `/${rest.replace(/^\//, "")}` : "";
  const languages: Record<string, string> = {};
  for (const c of CCS) for (const l of LANGS) languages[`${l}-${COUNTRIES[c].locale}`] = `${SITE}/${c}/${l}${path}`;
  languages["x-default"] = `${SITE}/bh/ar${path}`;
  return { canonical: `${SITE}/${cc}/${lang}${path}`, languages };
}
