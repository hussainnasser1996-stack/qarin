import { ImageResponse } from "next/og";
import { getProduct } from "@/lib/queries";
import { parseProductId } from "@/lib/format";
import { COUNTRIES, type CC } from "@/lib/i18n";

export const alt = "Qarin price comparison";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const DEC: Record<string, number> = { BHD: 3, KWD: 3, OMR: 3 };
const fmt = (n: number, c: string) => `${c} ${n.toLocaleString("en-US", { minimumFractionDigits: DEC[c] ?? 2, maximumFractionDigits: DEC[c] ?? 2 })}`;

/** Share card: product + the yellow shelf label with the lowest price in this country. */
export default async function Image({ params }: { params: Promise<{ cc: CC; slug: string }> }) {
  const { cc, slug } = await params;
  const id = parseProductId(slug);
  const data = id ? await getProduct(id).catch(() => null) : null;
  const cur = COUNTRIES[cc]?.currency ?? "BHD";
  const live = (data?.offers ?? []).filter((o) => o.country === cc && o.price !== null && o.in_stock !== false);
  const prices = live.map((o) => Number(o.price));
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const stores = new Set(live.map((o) => o.store)).size;
  // The renderer only handles PNG/JPEG: fetch the image ourselves and embed it only if it is one of those.
  let img: string | null = null;
  if (data?.product.image) {
    try {
      const r = await fetch(data.product.image, { signal: AbortSignal.timeout(4000) });
      const type = r.headers.get("content-type") || "";
      if (r.ok && /image\/(png|jpe?g)/.test(type)) img = `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
    } catch { /* no image is fine */ }
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#eef1f0", padding: 56, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flex: 1, background: "#fff", borderRadius: 28, border: "2px solid #dde3e2", padding: 48, gap: 48 }}>
          <div style={{ width: 340, height: 340, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 20, border: "2px solid #dde3e2", background: "#fff" }}>
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} width={300} height={300} style={{ objectFit: "contain" }} alt="" />
            ) : (
              <div style={{ display: "flex", background: "#ffd23d", color: "#1d1700", borderRadius: "8px 18px 18px 8px", padding: "8px 26px 8px 34px", fontSize: 44, fontWeight: 800 }}>Qarin</div>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 26, color: "#3a4f55" }}>{`Qarin · ${COUNTRIES[cc]?.en ?? ""}`}</div>
              <div style={{ fontSize: 52, fontWeight: 700, color: "#0c1f24", lineHeight: 1.1, marginTop: 12 }}>{data?.product.name ?? "Qarin"}</div>
            </div>
            {min !== null ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", alignSelf: "flex-start", background: "#ffd23d", color: "#1d1700", borderRadius: "10px 22px 22px 10px", padding: "14px 30px 14px 44px", fontSize: 64, fontWeight: 800, boxShadow: "inset 0 -4px 0 #e8b900" }}>
                  {fmt(min, cur)}
                </div>
                <div style={{ fontSize: 28, color: "#05603f", fontWeight: 600 }}>
                  {max !== null && max > min ? `Save ${fmt(max - min, cur)} across ${stores} stores` : stores === 1 ? `Lowest price at ${live[0].store}` : `Lowest price across ${stores} stores`}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 30, color: "#3a4f55" }}>Compare electronics prices across the Gulf</div>
            )}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
