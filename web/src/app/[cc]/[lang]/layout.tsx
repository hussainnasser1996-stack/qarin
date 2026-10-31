import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { notFound } from "next/navigation";
import "../../globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Consent } from "@/components/Consent";
import { CCS, COUNTRIES, isCC, isLang, LANGS, t, type CC, type Lang } from "@/lib/i18n";
import { SITE } from "@/lib/site";

const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

export function generateStaticParams() {
  return CCS.flatMap((cc) => LANGS.map((lang) => ({ cc, lang })));
}
export const dynamicParams = false;

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f4f6f8" }, { media: "(prefers-color-scheme: dark)", color: "#0d131c" }],
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
    <html lang={`${lang}-${COUNTRIES[cc as CC].locale}`} dir={lang === "ar" ? "rtl" : "ltr"} className={plex.variable}>
      <body className="min-h-dvh flex flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-surface">Skip to content</a>
        <Header cc={cc as CC} lang={lang as Lang} />
        <main id="main" className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
        <Footer cc={cc as CC} lang={lang as Lang} />
        <Consent lang={lang as Lang} />
      </body>
    </html>
  );
}
