import { COUNTRIES, USD_RATE, type CC, type Lang } from "./i18n";

const DEC: Record<string, number> = { BHD: 3, KWD: 3, OMR: 3, AED: 2, SAR: 2, QAR: 2 };
const SYMBOL_AR: Record<string, string> = { BHD: "د.ب", KWD: "د.ك", OMR: "ر.ع", AED: "د.إ", SAR: "ر.س", QAR: "ر.ق" };

/** Western digits in both languages (common on Gulf retail sites); currency code/abbr by language. */
export function money(amount: number | string | null | undefined, currency: string, lang: Lang = "en"): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  const d = DEC[currency] ?? 2;
  const s = n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  return lang === "ar" ? `${s} ${SYMBOL_AR[currency] ?? currency}` : `${currency} ${s}`;
}

export function convert(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  return (amount * (USD_RATE[from] ?? 1)) / (USD_RATE[to] ?? 1);
}

export const currencyOf = (cc: CC) => COUNTRIES[cc].currency;

export function ago(date: string | Date | null | undefined, lang: Lang): string {
  if (!date) return "—";
  const ms = Date.now() - new Date(date).getTime();
  const m = Math.max(1, Math.round(ms / 60000));
  const rtf = new Intl.RelativeTimeFormat(lang === "ar" ? "ar" : "en", { numeric: "auto" });
  if (m < 60) return rtf.format(-m, "minute");
  const h = Math.round(m / 60);
  if (h < 48) return rtf.format(-h, "hour");
  return rtf.format(-Math.round(h / 24), "day");
}

export function exactTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export const pct = (x: number) => `${Math.round(x)}%`;

export function productPath(cc: string, lang: string, slug: string, id: number | string) {
  return `/${cc}/${lang}/p/${slug}-${id}`;
}

export function parseProductId(param: string): number | null {
  const m = param.match(/-(\d+)$/) || param.match(/^(\d+)$/);
  return m ? Number(m[1]) : null;
}

/** Same normalisation as the crawler (qarin/normalize.py: search_norm). */
export function searchNorm(s: string): string {
  return (s || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\p{L}\p{N}\s+.]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
