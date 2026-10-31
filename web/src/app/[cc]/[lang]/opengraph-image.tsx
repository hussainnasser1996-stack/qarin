import { ImageResponse } from "next/og";
import { COUNTRIES, type CC } from "@/lib/i18n";

export const alt = "Qarin — compare electronics prices across the Gulf";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ cc: CC }> }) {
  const { cc } = await params;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", background: "#0c1f24", padding: 80, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", background: "#ffd23d", color: "#1d1700", borderRadius: "8px 18px 18px 8px", padding: "6px 22px 6px 30px", fontSize: 40, fontWeight: 800 }}>Qarin</div>
          <div style={{ fontSize: 32, color: "#b4c3c5" }}>{COUNTRIES[cc]?.en ?? "Gulf"}</div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, color: "#e7eeee", lineHeight: 1.05, marginTop: 36 }}>Same product. Different store. Different price.</div>
        <div style={{ display: "flex", marginTop: 48, height: 16, width: 900, borderRadius: 8, background: "linear-gradient(to right, #ffd23d, #314650)" }} />
        <div style={{ fontSize: 30, color: "#8a9a9d", marginTop: 28 }}>Daily electronics prices · Bahrain · UAE · Saudi Arabia · Kuwait · Qatar · Oman</div>
      </div>
    ),
    size,
  );
}
