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

const UPPER = new Set(["hp", "lg", "jbl", "tcl", "msi", "dji", "aoc", "benq", "jvc", "nzxt"]);
const SPECIAL: Record<string, string> = { gopro: "GoPro", oneplus: "OnePlus", "tp-link": "TP-Link", "d-link": "D-Link", hyperx: "HyperX", steelseries: "SteelSeries", sandisk: "SanDisk", playstation: "PlayStation", iphone: "iPhone", asus: "ASUS", "black+decker": "Black+Decker" };
export function brandName(b: string | null | undefined): string {
  if (!b) return "";
  const k = b.toLowerCase();
  if (SPECIAL[k]) return SPECIAL[k];
  if (UPPER.has(k)) return k.toUpperCase();
  return /^[a-z]/.test(b) ? b.replace(/\b\w/g, (c) => c.toUpperCase()) : b;
}

/** Arabic shopping terms -> the English words product titles use. Applied after searchNorm. */
const AR_TERMS: [RegExp, string][] = [
  [/ايفون|آيفون|اي فون/g, "iphone"], [/ايباد|اي باد/g, "ipad"], [/ماك ?بوك/g, "macbook"], [/ايربودز|اير بودز|ايربود/g, "airpods"],
  [/ساعه ابل|ابل واتش/g, "apple watch"], [/ابل|آبل/g, "apple"], [/سامسونج|سامسونغ/g, "samsung"], [/جالكسي|جلاكسي|جالاكسي|غالكسي/g, "galaxy"],
  [/بلايستيشن|بلاي ستيشن|بلي ستيشن|بليستيشن/g, "playstation"], [/اكس ?بوكس/g, "xbox"], [/نينتندو|ننتندو/g, "nintendo"], [/سويتش/g, "switch"],
  [/هواوي/g, "huawei"], [/شاومي|شيومي/g, "xiaomi"], [/هونر|هونور/g, "honor"], [/سوني/g, "sony"], [/ال ?جي/g, "lg"], [/لينوفو/g, "lenovo"],
  [/ديل/g, "dell"], [/اتش ?بي/g, "hp"], [/اسوس/g, "asus"], [/ايسر/g, "acer"], [/دايسون|دايسن/g, "dyson"], [/بوز/g, "bose"], [/جي ?بي ?ال/g, "jbl"],
  [/جوجل|قوقل/g, "google"], [/بكسل|بيكسل/g, "pixel"], [/برو ?ماكس/g, "pro max"], [/برو/g, "pro"], [/الترا|ألترا/g, "ultra"], [/ماكس/g, "max"],
  [/بلس/g, "plus"], [/ميني/g, "mini"], [/اير/g, "air"], [/لابتوب|لاب توب|كمبيوتر محمول/g, "laptop"], [/تلفزيون|تلفاز|شاشه تلفزيون/g, "tv"],
  [/شاشه|مونيتر/g, "monitor"], [/سماعه|سماعات/g, "headphones"], [/مكبر صوت|سبيكر/g, "speaker"], [/كاميرا/g, "camera"], [/طابعه/g, "printer"],
  [/جوال|هاتف|موبايل/g, "phone"], [/جيجا|قيقا/g, "gb"], [/تيرا/g, "tb"], [/يد تحكم|ذراع تحكم|جوي ستيك/g, "controller"], [/مكنسه/g, "vacuum"],
];
export function arToEn(norm: string): string {
  if (!/[\u0600-\u06ff]/.test(norm)) return norm;
  // Whole-word only (JS \b does not work for Arabic): "ديل" must not match inside "موديل".
  let out = ` ${norm} `;
  for (const [re, en] of AR_TERMS) out = out.replace(new RegExp(`(?<=\\s)(?:${re.source})(?=\\s)`, "g"), ` ${en} `);
  return out.replace(/\s+/g, " ").trim();
}
