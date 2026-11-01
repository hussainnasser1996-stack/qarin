import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Readex_Pro } from "next/font/google";
import { notFound } from "next/navigation";
import "../../globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Consent } from "@/components/Consent";
import { CCS, COUNTRIES, isCC, isLang, LANGS, t, type CC, type Lang } from "@/lib/i18n";
import { SITE } from "@/lib/site";

const body = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
const display = Readex_Pro({
  subsets: ["arabic", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export function generateStaticParams() {
  return CCS.flatMap((cc) => LANGS.map((lang) => ({ cc, lang })));
}
// Unknown country/language codes are rejected by notFound() below. dynamicParams=false here would also
// apply to child routes and 404 every product that was not pre-built.
export const dynamicParams = true;

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#121d20" }],
};

export async function generateMetadata({ params }: { params: Promise<{ cc: string; lang: string }> }): Promise<Metadata> {
  const { cc, lang } = await params;
  if (!isCC(cc) || !isLang(lang)) return {};
  const d = t(lang);
  const country = COUNTRIES[cc][lang];
  return {
    metadataBase: new URL(SITE),
    title: { default: `Qarin قارن — ${d.tagline} · ${country}`, template: `%s · Qarin قارن` },
    description: d.heroSub,
    applicationName: "Qarin",
    openGraph: { siteName: "Qarin قارن", locale: `${lang}_${COUNTRIES[cc].locale}`, type: "website" },
    icons: { icon: "/icon.svg" },
  };
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ cc: string; lang: string }> }) {
  const { cc, lang } = await params;
  if (!isCC(cc) || !isLang(lang)) notFound();
  return (
    <html lang={`${lang}-${COUNTRIES[cc as CC].locale}`} dir={lang === "ar" ? "rtl" : "ltr"} className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-surface">{t(lang).skip}</a>
        <Header cc={cc as CC} lang={lang as Lang} />
        <main id="main" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
        <Footer cc={cc as CC} lang={lang as Lang} />
        <Consent lang={lang as Lang} />
      </body>
    </html>
  );
}
