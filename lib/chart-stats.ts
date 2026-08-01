import type { ChartPoint } from "./timeline-data";

/**
 * Summary statistics for the currently selected time window of a chart —
 * the numbers an analyst wants the moment they brush a range: endpoints,
 * absolute and percent change, CAGR, per-day rate, and the real (base-year
 * dollar) change when both endpoints have real values.
 *
 * Pure and client-safe; tested in tests/chart-stats.test.ts.
 */
export type WindowStats = {
  startDate: string;
  endDate: string;
  startValue: number;
  endValue: number;
  change: number;
  percent: number | null; // null when the window starts at zero debt
  cagrPct: number | null; // null for sub-90-day windows or zero start
  perDay: number;
  years: number;
  observations: number;
  realChange: number | null; // null when either endpoint predates CPI coverage
  realPercent: number | null;
};

export function windowStats(points: ChartPoint[], t0: number, t1: number): WindowStats | null {
  const inWindow = points.filter((p) => {
    const t = Date.parse(p.d);
    return t >= t0 && t <= t1 && p.v !== null && Number.isFinite(p.v);
  });
  if (inWindow.length < 2) return null;
  const first = inWindow[0];
  const last = inWindow[inWindow.length - 1];
  const days = (Date.parse(last.d) - Date.parse(first.d)) / 86400000;
  if (days <= 0) return null;
  const years = days / 365.2425;
  const startValue = first.v as number;
  const endValue = last.v as number;
  const change = endValue - startValue;
  const hasReal = first.r != null && last.r != null;
  return {
    startDate: first.d,
    endDate: last.d,
    startValue,
    endValue,
    change,
    percent: startValue > 0 ? (change / startValue) * 100 : null,
    cagrPct: startValue > 0 && days >= 90 ? (Math.pow(endValue / startValue, 1 / years) - 1) * 100 : null,
    perDay: change / days,
    years,
    observations: inWindow.length,
    realChange: hasReal ? (last.r as number) - (first.r as number) : null,
    realPercent: hasReal && (first.r as number) > 0 ? (((last.r as number) - (first.r as number)) / (first.r as number)) * 100 : null,
  };
}

/** Range presets for the chart toolbar, in years (null = full history). */
export const RANGE_PRESETS: Array<{ label: string; years: number | null }> = [
  { label: "1Y", years: 1 },
  { label: "5Y", years: 5 },
  { label: "10Y", years: 10 },
  { label: "25Y", years: 25 },
  { label: "50Y", years: 50 },
  { label: "100Y", years: 100 },
  { label: "All", years: null },
];
