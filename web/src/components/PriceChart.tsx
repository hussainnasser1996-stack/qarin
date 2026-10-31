"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "@/lib/format";
import type { Lang } from "@/lib/i18n";
import type { Point } from "@/lib/history";

const RANGES = [
  { k: "1M", days: 30 },
  { k: "3M", days: 90 },
  { k: "1Y", days: 365 },
  { k: "All", days: 100000 },
];
// Neutral, distinguishable store lines; the lowest-price line uses the one accent.
const STORE_COLORS = ["#5b6b8c", "#a0703c", "#7a5ea8", "#3f8aa8", "#a85e7a", "#6f8a3f", "#8a6f3f", "#3f6f8a"];

export function PriceChart({ points, stores, currency, lang, labels }: {
  points: Point[]; stores: string[]; currency: string; lang: Lang; labels: { lowest: string; all: string };
}) {
  const [range, setRange] = useState("3M");
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const days = RANGES.find((r) => r.k === range)!.days;
  const data = useMemo(() => points.slice(-days), [points, days]);
  if (!points.length) return null;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div role="group" className="inline-flex rounded-lg border border-line overflow-hidden">
          {RANGES.map((r) => (
            <button key={r.k} type="button" onClick={() => setRange(r.k)} aria-pressed={range === r.k}
              className={`px-3 h-8 text-[13px] ${range === r.k ? "bg-ink text-surface" : "hover:bg-paper"}`}>
              {r.k === "All" ? labels.all : r.k}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 text-[12px]">
          <span className="inline-flex items-center gap-1.5 px-2 h-7 rounded-full bg-deal-wash text-deal-ink font-medium">
            <span className="w-2.5 h-0.5 bg-deal rounded" />{labels.lowest}
          </span>
          {stores.map((s, i) => (
            <button key={s} type="button" aria-pressed={!!shown[s]} onClick={() => setShown((x) => ({ ...x, [s]: !x[s] }))}
              className={`inline-flex items-center gap-1.5 px-2 h-7 rounded-full border ${shown[s] ? "border-line-strong bg-surface" : "border-line text-muted"}`}>
              <span className="w-2.5 h-0.5 rounded" style={{ background: STORE_COLORS[i % STORE_COLORS.length] }} />{s}
            </button>
          ))}
        </div>
      </div>
      <div className="h-64 ltr" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="d" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} minTickGap={40}
              tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} axisLine={false} width={64} domain={["auto", "auto"]}
              tickFormatter={(v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 })} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
              formatter={(v, name) => [money(v as number, currency, lang), name === "min" ? labels.lowest : String(name)]}
            />
            {stores.map((s, i) => shown[s] && (
              <Line key={s} type="stepAfter" dataKey={s} stroke={STORE_COLORS[i % STORE_COLORS.length]} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
            ))}
            <Line type="stepAfter" dataKey="min" stroke="var(--deal)" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
