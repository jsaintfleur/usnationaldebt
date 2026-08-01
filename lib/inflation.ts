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

let historicalCache: Array<{ date: string; value: number }> | null = null;

/**
 * Historical NSA CPI-U (CPIAUCNS, 1913+). Used only for dates before the
 * seasonally adjusted series begins (1947); the two series share the same
 * 1982–84 = 100 reference base, and base-year averages are insensitive to
 * seasonal adjustment, so mixing them across that boundary is sound.
 */
function historicalCpi() {
  historicalCache ??= readFredCsv("data/cpi-historical.csv");
  return historicalCache;
}

/** Earliest month with any CPI observation; real values are undefined before this. */
export const CPI_COVERAGE_START = "1913-01-01";

/** CPI-U index level for the month containing `date` (falls back to the latest prior month). */
export function cpiAt(date: string): number {
  const { series } = load();
  const monthKey = `${date.slice(0, 7)}-01`;
  if (monthKey < series[0].date) {
    const row = atOrBefore(historicalCpi(), monthKey);
    if (!row) throw new Error(`No CPI observation on or before ${date} (CPI begins ${CPI_COVERAGE_START})`);
    return row.value;
  }
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

/**
 * Like toReal, but returns null before CPI coverage (1913) instead of
 * fabricating a pre-CPI price level. UIs must render this as "not available",
 * never as zero.
 */
export function toRealMaybe(nominal: number, date: string): number | null {
  if (date < CPI_COVERAGE_START) return null;
  return toReal(nominal, date);
}

/** Last month with a published CPI observation (governs how current real values can be). */
export function cpiThrough(): string {
  const { series } = load();
  return series[series.length - 1].date;
}
