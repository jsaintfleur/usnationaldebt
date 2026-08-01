import { readFredCsv, atOrBefore } from "./fred";

/**
 * Inflation adjustment using BLS CPI-U (CPIAUCSL, monthly, seasonally adjusted),
 * distributed through FRED. CPI-U is the primary deflator because it is the most
 * widely recognized household purchasing-power index; METHODOLOGY.md documents
 * how results would differ under the GDP price index or PCE deflator.
 *
 * Real values are expressed in BASE_YEAR prices:
 *   real = nominal × (base-year average CPI ÷ CPI at the observation month)
 *
 * BASE_YEAR is the latest calendar year with a complete 12-month CPI record.
 * Changing it is an intentional, code-reviewed act — never a silent side effect.
 */
export const BASE_YEAR = 2025;

let cache: { series: Array<{ date: string; value: number }>; baseIndex: number } | null = null;

function load() {
  if (cache) return cache;
  const series = readFredCsv("data/cpi.csv");
  const baseMonths = series.filter((row) => row.date.startsWith(`${BASE_YEAR}-`));
  // October 2025 CPI was never published (2025 federal shutdown), so the base
  // year may legitimately have 11 observations; require at least 10 and average
  // the published months. Anything sparser indicates corrupted data.
  if (baseMonths.length < 10) {
    throw new Error(
      `CPI base year ${BASE_YEAR} has only ${baseMonths.length} monthly observations; expected >= 10. ` +
        `Refresh data or adjust BASE_YEAR intentionally.`,
    );
  }
  const baseIndex = baseMonths.reduce((sum, row) => sum + row.value, 0) / baseMonths.length;
  cache = { series, baseIndex };
  return cache;
}

/** CPI-U index level for the month containing `date` (falls back to the latest prior month). */
export function cpiAt(date: string): number {
  const { series } = load();
  const monthKey = `${date.slice(0, 7)}-01`;
  const row = atOrBefore(series, monthKey);
  if (!row) throw new Error(`No CPI observation on or before ${date}`);
  return row.value;
}

/** Average CPI-U for the base year (the denominator anchor for all real values). */
export function baseCpi(): number {
  return load().baseIndex;
}

/** Convert a nominal dollar amount observed at `date` into BASE_YEAR dollars. */
export function toReal(nominal: number, date: string): number {
  return nominal * (baseCpi() / cpiAt(date));
}

/** Last month with a published CPI observation (governs how current real values can be). */
export function cpiThrough(): string {
  const { series } = load();
  return series[series.length - 1].date;
}
