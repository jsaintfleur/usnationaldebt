import { readFredCsv, atOrBefore } from "./fred";

/**
 * Macro context series (all committed FRED snapshots):
 *  - GDP:     BEA nominal GDP, quarterly SAAR, billions of dollars
 *  - POPTHM:  Census resident population + armed forces overseas, monthly, thousands
 *  - FYFR:    OMB federal receipts, annual fiscal year, millions of dollars
 *  - FYONET:  OMB federal net outlays, annual fiscal year, millions of dollars
 *
 * FRED dates quarterly flow series (GDP) by the first day of the quarter; a debt
 * observation is matched to GDP by quarter, which is the same convention FRED's
 * own GFDEBTGDP ratio uses. No inflation adjustment is applied when dividing
 * nominal debt by nominal GDP from the same period — the price level cancels.
 */

export function gdpSeries() {
  return readFredCsv("data/gdp.csv").map((row) => ({ date: row.date, value: row.value * 1e9 }));
}

/** Nominal GDP (dollars, annualized) for the quarter containing `date`; null before coverage. */
export function gdpAt(date: string): { date: string; value: number } | null {
  const q = `${date.slice(0, 4)}-${String(Math.floor((Number(date.slice(5, 7)) - 1) / 3) * 3 + 1).padStart(2, "0")}-01`;
  const row = atOrBefore(gdpSeries(), q);
  return row && row.date === q ? row : atOrBefore(gdpSeries(), date);
}

/** Resident population (persons) at the latest month on or before `date`. */
export function populationAt(date: string): { date: string; value: number } {
  const row = atOrBefore(
    readFredCsv("data/population.csv").map((r) => ({ date: r.date, value: r.value * 1e3 })),
    date,
  );
  if (!row) throw new Error(`No population observation on or before ${date}`);
  return row;
}

/** Trailing 10-year compound annual population growth rate (for scenario defaults). */
export function populationTrendGrowth(): number {
  const series = readFredCsv("data/population.csv");
  const last = series[series.length - 1];
  const prior = atOrBefore(series, `${Number(last.date.slice(0, 4)) - 10}${last.date.slice(4)}`);
  if (!prior) return 0.005;
  return Math.pow(last.value / prior.value, 1 / 10) - 1;
}

/** Latest complete-fiscal-year federal receipts and net outlays (dollars). */
export function fiscalBaseline() {
  const receipts = readFredCsv("data/fiscal-receipts.csv");
  const outlays = readFredCsv("data/fiscal-outlays.csv");
  const r = receipts[receipts.length - 1];
  const o = outlays[outlays.length - 1];
  return {
    fiscalYearEnd: r.date,
    receipts: r.value * 1e6,
    outlays: o.value * 1e6,
    source: "OMB via FRED (FYFR, FYONET)",
  };
}
