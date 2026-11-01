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
  [/جوال|هاتف|موبايل/g, "phone"], [/كيبورد|لوحه مفاتيح/g, "keyboard"], [/ماوس/g, "mouse"], [/راوتر/g, "router"],
  [/باور ?بانك|شاحن متنقل/g, "power bank"], [/ساعه ذكيه/g, "smart watch"], [/شاحن/g, "charger"], [/قلم ابل/g, "apple pencil"],
  [/بروجكتر|جهاز عرض/g, "projector"], [/درون/g, "drone"], [/هارد ?ديسك|هارد/g, "hard drive"], [/فلاش/g, "flash"], [/جيجا|قيقا/g, "gb"], [/تيرا/g, "tb"], [/يد تحكم|ذراع تحكم|جوي ستيك/g, "controller"], [/مكنسه/g, "vacuum"],
];
export function arToEn(norm: string): string {
  if (!/[\u0600-\u06ff]/.test(norm)) return norm;
  // Whole-word only (JS \b does not work for Arabic): "ديل" must not match inside "موديل".
  let out = ` ${norm} `;
  for (const [re, en] of AR_TERMS) out = out.replace(new RegExp(`(?<=\\s)(?:${re.source})(?=\\s)`, "g"), ` ${en} `);
  return out.replace(/\s+/g, " ").trim();
}

/** Store names as Gulf shoppers write them in Arabic. */
const STORE_AR: Record<string, string> = {
  "Al Saif Gallery": "السيف غاليري", Almanea: "المنيع", "Ansar Gallery": "أنصار غاليري", Ashrafs: "أشرفز",
  "Best Al-Yousifi": "بست اليوسفي", Eureka: "يوريكا", Jarir: "جرير", Jumbo: "جمبو", JumboSouq: "جمبو سوق",
  "Lets Tango": "ليتس تانغو", Lulu: "لولو", OurShopee: "أور شوبي", SACO: "ساكو", "Sharaf DG": "شرف دي جي",
  Xcite: "إكسايت", eXtra: "إكسترا", iStyle: "آي ستايل",
};
export const storeName = (name: string | null | undefined, lang: Lang) => (name ? (lang === "ar" ? STORE_AR[name] ?? name : name) : "");

/** Version labels found in listing titles, in the shopper's language. */
const REGION: Record<string, { en: string; ar: string; tone: "ok" | "note" }> = {
  "middle east version": { en: "Middle East version", ar: "نسخة الشرق الأوسط", tone: "ok" },
  "gcc version": { en: "GCC version", ar: "نسخة الخليج", tone: "ok" },
  "ksa version": { en: "Saudi version", ar: "النسخة السعودية", tone: "ok" },
  "uae version": { en: "UAE version", ar: "النسخة الإماراتية", tone: "ok" },
  "tdra version": { en: "UAE (TDRA) version", ar: "نسخة الإمارات (TDRA)", tone: "ok" },
  "international version": { en: "International version", ar: "نسخة دولية", tone: "note" },
  "global version": { en: "Global version", ar: "نسخة عالمية", tone: "note" },
  "us version": { en: "US version", ar: "نسخة أمريكية", tone: "note" },
  "china version": { en: "China version", ar: "نسخة صينية", tone: "note" },
  "japan version": { en: "Japan version", ar: "نسخة يابانية", tone: "note" },
  "hk version": { en: "Hong Kong version", ar: "نسخة هونغ كونغ", tone: "note" },
  "indian version": { en: "India version", ar: "نسخة هندية", tone: "note" },
};
export const regionLabel = (r: string | null | undefined, lang: Lang) => (r && REGION[r] ? { text: REGION[r][lang], tone: REGION[r].tone } : null);

const CONDITION: Record<string, { en: string; ar: string }> = {
  renewed: { en: "Renewed", ar: "مجدّد" }, refurbished: { en: "Refurbished", ar: "مجدّد" }, used: { en: "Used", ar: "مستعمل" },
  demo: { en: "Display unit", ar: "جهاز عرض" }, "open box": { en: "Open box", ar: "علبة مفتوحة" }, rental: { en: "Rental", ar: "تأجير" },
};
export const conditionLabel = (c: string | null | undefined, lang: Lang) => (c && c !== "new" ? CONDITION[c]?.[lang] ?? c : null);

/** Colour words in titles → Arabic, for the per-store option list. */
const COLOUR_AR: Record<string, string> = {
  black: "أسود", white: "أبيض", silver: "فضي", gold: "ذهبي", grey: "رمادي", gray: "رمادي", blue: "أزرق", red: "أحمر", green: "أخضر",
  pink: "وردي", purple: "بنفسجي", yellow: "أصفر", orange: "برتقالي", titanium: "تيتانيوم", natural: "طبيعي", navy: "كحلي",
  midnight: "ميدنايت", starlight: "ستارلايت", graphite: "جرافيت", lavender: "لافندر", mint: "نعناعي", cream: "كريمي", beige: "بيج",
  brown: "بني", teal: "تركوازي", "sky blue": "أزرق سماوي", "space black": "أسود فلكي", "space gray": "رمادي فلكي", "rose gold": "ذهبي وردي",
};
export const colourName = (c: string | null | undefined, lang: Lang) =>
  c ? (lang === "ar" ? COLOUR_AR[c] ?? c : c.replace(/\b\w/g, (x) => x.toUpperCase())) : "";

const BNPL_NAME: Record<string, { en: string; ar: string }> = {
  tabby: { en: "Tabby", ar: "تابي" }, tamara: { en: "Tamara", ar: "تمارا" }, spotii: { en: "Spotii", ar: "سبوتي" },
  postpay: { en: "Postpay", ar: "بوست باي" }, cashew: { en: "Cashew", ar: "كاشيو" }, other: { en: "Pay later", ar: "الدفع لاحقاً" },
};
export const bnplName = (p: string, lang: Lang) => (BNPL_NAME[p.toLowerCase()] ?? { en: p, ar: p })[lang];

/** "1 year warranty · manufacturer" from what the store published for this listing. */
export function warrantyLabel(months: number | null | undefined, by: string | null | undefined, lang: Lang): string | null {
  if (!months || months <= 0) return null;
  const ar = lang === "ar";
  const len = months % 12 === 0
    ? (ar ? ({ 1: "سنة", 2: "سنتان" } as Record<number, string>)[months / 12] ?? `${months / 12} سنوات` : `${months / 12} year${months === 12 ? "" : "s"}`)
    : (ar ? `${months} شهراً` : `${months} months`);
  const who = !by ? null
    : by === "manufacturer" ? (ar ? "من الشركة المصنّعة" : "manufacturer")
    : by === "agent" ? (ar ? "ضمان الوكيل" : "official agent")
    : by === "store" ? (ar ? "من المتجر" : "by the store")
    : by === "seller" ? (ar ? "من البائع" : "by the seller")
    : (ar ? `من ${by}` : `by ${by}`);
  if (ar && by === "agent") return `ضمان الوكيل · ${len}`;
  return ar ? `ضمان ${len}${who ? ` · ${who}` : ""}` : `${len} warranty${who ? ` · ${who}` : ""}`;
}

/** Provider label; "other" entries carry the real name at the start of their notes ("Flooss (Bahrain): …"). */
export function bnplLabel(b: { provider: string; notes?: string | null }, lang: Lang): string {
  if (b.provider !== "other" || !b.notes) return bnplName(b.provider, lang);
  const n = b.notes.split(/[(:,;.]| also | finance| offered/)[0].trim();
  return n && n.length <= 28 ? n : bnplName("other", lang);
}

/** Whether a price sits inside the limits the store published for this plan (e.g. "BD 20 to 500"). Unknown = fits. */
export function bnplFits(price: number, notes?: string | null): boolean {
  if (!notes || !price) return true;
  const m = notes.replace(/,/g, "").match(/(?:BD|BHD|SAR|AED|KWD|KD|QAR|OMR|QR)\s?(\d+(?:\.\d+)?)\s*(?:to|-|–)\s*(?:BD|BHD|SAR|AED|KWD|KD|QAR|OMR|QR)?\s?(\d+(?:\.\d+)?)/i);
  if (!m) return true;
  return price >= Number(m[1]) && price <= Number(m[2]);
}

/** Cash on delivery applies to this item: store offers it, price under its stated cap, category not excluded. */
export function codFits(pol: { cod?: boolean | null; cod_max?: number | null; cod_exclude?: string[] | null } | null | undefined,
                        price: number, category: string | null | undefined): boolean {
  if (!pol?.cod) return false;
  if (pol.cod_max != null && price > pol.cod_max) return false;
  if (category && pol.cod_exclude?.includes(category)) return false;
  return true;
}
