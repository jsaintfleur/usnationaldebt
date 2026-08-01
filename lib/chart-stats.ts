export type ChartObservation = { date: string; value: number; realValue?: number };

export type ChartWindowStats = {
  startDate: string;
  endDate: string;
  observations: number;
  days: number;
  startValue: number;
  endValue: number;
  change: number;
  percentChange: number | null;
  cagr: number | null;
  averagePerDay: number | null;
  realChange: number | null;
};

export function computeChartStats(points: ChartObservation[]): ChartWindowStats | null {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points.at(-1)!;
  const startMs = Date.parse(first.date);
  const endMs = Date.parse(last.date);
  const days = Number.isFinite(startMs) && Number.isFinite(endMs)
    ? Math.max(0, (endMs - startMs) / 86_400_000)
    : Math.max(0, points.length - 1);
  const years = days / 365.2425;
  const change = last.value - first.value;
  return {
    startDate: first.date,
    endDate: last.date,
    observations: points.length,
    days,
    startValue: first.value,
    endValue: last.value,
    change,
    percentChange: first.value === 0 ? null : (change / first.value) * 100,
    cagr: first.value > 0 && last.value >= 0 && years > 0
      ? (Math.pow(last.value / first.value, 1 / years) - 1) * 100
      : null,
    averagePerDay: days > 0 ? change / days : null,
    realChange: first.realValue != null && last.realValue != null
      ? last.realValue - first.realValue
      : null,
  };
}

export function observationsInTrailingYears(points: ChartObservation[], years: number | null) {
  if (years == null || points.length === 0) return points;
  const latest = Date.parse(points.at(-1)!.date);
  if (!Number.isFinite(latest)) return points;
  const cutoff = new Date(latest);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - years);
  return points.filter((point) => Date.parse(point.date) >= cutoff.getTime());
}

export type ChartResolution = "auto" | "annual" | "quarterly" | "daily";

export function availableResolutions(points: ChartObservation[]): ChartResolution[] {
  if (points.length < 2 || points.some((point) => !Number.isFinite(Date.parse(point.date)))) return ["auto"];
  const gaps = points.slice(1).map((point, index) => (Date.parse(point.date) - Date.parse(points[index].date)) / 86_400_000).filter((gap) => gap > 0);
  const minimumGap = Math.min(...gaps);
  return ["auto", "annual", ...(minimumGap <= 100 ? ["quarterly" as const] : []), ...(minimumGap <= 7 ? ["daily" as const] : [])];
}

export function resampleObservations(points: ChartObservation[], resolution: ChartResolution) {
  if (resolution === "auto" || resolution === "daily") return points;
  const selected = new Map<string, ChartObservation>();
  for (const point of points) {
    const date = new Date(point.date);
    if (!Number.isFinite(date.getTime())) return points;
    const key = resolution === "annual"
      ? String(date.getUTCFullYear())
      : `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
    selected.set(key, point);
  }
  return [...selected.values()];
}
