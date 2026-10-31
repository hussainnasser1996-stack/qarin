import type { MetadataRoute } from "next";
import { CCS } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/go/", "/api/", "/admin", "/*/search"] }],
    sitemap: CCS.map((cc) => `${SITE}/sitemap/${cc}.xml`),
  };
}
