import { money } from "@/lib/format";
import type { Point } from "@/lib/history";
import { t, type Lang } from "@/lib/i18n";

/**
 * Price insight, the way PriceSpy and Google Shopping summarise history: a trend word, the 90-day range with
 * today's price placed on it, and badges that follow strict rules (camelcamelcamel-style) so "deal" means something.
 */
export function Insight({ points, current, currency, lang, since }: {
  points: Point[]; current: number | null; currency: string; lang: Lang; since: string | null;
}) {
  const d = t(lang);
  const mins = points.map((p) => p.min).filter((x): x is number => x !== null);
  const last90 = points.slice(-90).map((p) => p.min).filter((x): x is number => x !== null);
  const days = points.length;
  const fmtDate = (s: string) => new Date(s).toLocaleDateString(lang === "ar" ? "ar-BH-u-nu-latn" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  // Trend: average of the last 7 days vs the 23 days before them.
  const last30 = points.slice(-30).map((p) => p.min).filter((x): x is number => x !== null);
  const recent = last30.slice(-7), before = last30.slice(0, -7);
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
  let trend: "falling" | "rising" | "stable" = "stable";
  if (recent.length && before.length) {
    const ch = (avg(recent) - avg(before)) / avg(before);
    trend = ch < -0.02 ? "falling" : ch > 0.02 ? "rising" : "stable";
  }
  const trendText = { falling: d.trendFalling, rising: d.trendRising, stable: d.trendStable }[trend];
  const trendCls = { falling: "text-deal-ink", rising: "text-warn", stable: "text-ink" }[trend];
  const arrow = { falling: "↘", rising: "↗", stable: "→" }[trend];

  const lo = last90.length ? Math.min(...last90) : null;
  const hi = last90.length ? Math.max(...last90) : null;
  const pos = current !== null && lo !== null && hi !== null && hi > lo ? Math.min(100, Math.max(0, ((current - lo) / (hi - lo)) * 100)) : null;
  const typical = last90.length ? [...last90].sort((a, b) => a - b)[Math.floor(last90.length / 2)] : null;

  const badges: string[] = [];
  if (current !== null && days >= 14 && lo !== null && current <= lo + 1e-9) badges.push(d.badgeLow90);
  if (current !== null && days >= 30 && mins.length && current <= Math.min(...mins) + 1e-9) badges.push(d.badgeLowEver);

  // Under a week of history a trend or range would be noise: say when tracking began and what comes next.
  if (days < 7) {
    return (
      <div>
        {since && <p className="font-semibold">{d.trackedSince(fmtDate(since))}</p>}
        <p className="text-[13px] text-ink-2 mt-1">{d.verdictNew}</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
      <div>
        <p className="text-[12px] text-muted">{d.trendNote}</p>
        <p className={`font-display font-bold text-[22px] leading-tight ${trendCls}`}><span aria-hidden>{arrow}</span> {trendText}</p>
        {since && <p className="text-[12px] text-muted mt-0.5">{d.trackedSince(fmtDate(since))}</p>}
      </div>
      <div className="min-w-0">
        {lo !== null && hi !== null && hi > lo && pos !== null ? (
          <>
            <p className="text-[12px] text-muted mb-1.5">{d.range90}</p>
            <div className="relative h-2.5 rounded-full bg-gradient-to-r from-deal/70 via-line-strong to-warn/70 rtl:bg-gradient-to-l">
              <span className="dot absolute top-1/2 w-4 h-4 rounded-full bg-tag border-2 border-tag-ink" style={{ insetInlineStart: `${pos}%` }} title={d.today} />
            </div>
            <div className="flex justify-between text-[12px] mt-1.5">
              <span className="num text-ink-2">{money(lo, currency, lang)}</span>
              <span className="num text-ink-2">{money(hi, currency, lang)}</span>
            </div>
          </>
        ) : (
          <p className="text-[13px] text-ink-2">{days < 14 ? d.verdictNew : d.trendStable}</p>
        )}
        {(badges.length > 0 || (typical !== null && current !== null && days >= 14 && Math.abs(current - typical) / typical > 0.01)) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {badges.map((b) => <span key={b} className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-deal-wash text-deal-ink">{b}</span>)}
            {typical !== null && current !== null && days >= 14 && Math.abs(current - typical) / typical > 0.01 && (
              <span className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${current < typical ? "bg-deal-wash text-deal-ink" : "bg-warn-wash text-warn"}`}>
                {(current < typical ? d.belowTypical : d.aboveTypical)(money(Math.abs(current - typical), currency, lang))}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
