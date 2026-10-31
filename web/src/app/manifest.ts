import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Qarin قارن — Gulf price comparison",
    short_name: "Qarin",
    description: "Compare electronics prices across stores in Bahrain, UAE, Saudi Arabia, Kuwait, Qatar and Oman.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef1f0",
    theme_color: "#0c1f24",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
