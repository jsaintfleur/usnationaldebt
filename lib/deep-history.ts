import fs from "node:fs";
import path from "node:path";
import type { DebtPoint } from "./types";
import { history } from "./data";
import { readFredCsv } from "./fred";

/**
 * Multi-resolution debt history with explicit data-quality tiers:
 *
 *  - annual    1790–present  Treasury "Historical Debt Outstanding" (fiscal-year end).
 *                            Early records (pre-1843) predate standardized fiscal years
 *                            and modern accounting; they are official Treasury figures
 *                            but coarser and less comparable — flagged "historical".
 *  - quarterly 1966–present  GFDEBTN (re-dated to true quarter ends in lib/data.ts).
 *  - daily     1993–present  Debt to the Penny.
 *
 * Rather than truncating history, every point carries its tier so the UI can
 * show confidence indicators and pick the finest resolution a zoom window supports.
 */

export type QualityTier = "annual-historical" | "annual-official" | "quarterly" | "daily";

export type TieredPoint = DebtPoint & { tier: QualityTier };

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

function parseTreasuryCsv(file: string): DebtPoint[] {
  return read(file)
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [date, value] = line.split(",");
      return { date, debt: Number(value) };
    })
    .filter((x) => Number.isFinite(x.debt) && x.debt >= 0);
}

/** Annual fiscal-year-end debt, 1790–present (dollars, dated by Treasury record date). */
export function annualHistory(): TieredPoint[] {
  return parseTreasuryCsv("data/debt-annual.csv").map((p) => ({
    ...p,
    tier: p.date < "1843-01-01" ? ("annual-historical" as const) : ("annual-official" as const),
  }));
}

/** Daily total public debt, 1993-04-01–present. */
export function dailyHistory(): TieredPoint[] {
  return parseTreasuryCsv("data/debt-daily.csv").map((p) => ({ ...p, tier: "daily" as const }));
}

/** Quarterly series from lib/data.ts, tier-tagged. */
export function quarterlyHistory(): TieredPoint[] {
  return history().map((p) => ({ ...p, tier: "quarterly" as const }));
}

/**
 * The default full-timeline series: annual points before quarterly coverage
 * begins (1966), quarterly afterwards. This is what long-range charts render.
 */
export function combinedHistory(): TieredPoint[] {
  const quarterly = quarterlyHistory();
  const firstQuarterly = quarterly[0].date;
  return [...annualHistory().filter((p) => p.date < firstQuarterly), ...quarterly];
}

/**
 * Pick the finest defensible resolution for a zoom window. Span thresholds:
 * over 25 years → combined annual/quarterly; over 3 years (or predating daily
 * coverage) → quarterly with annual backfill; otherwise daily.
 */
export function resolveDebtSeries(startISO: string, endISO: string): { points: TieredPoint[]; resolution: string } {
  const spanYears = (Date.parse(endISO) - Date.parse(startISO)) / (365.2425 * 86400000);
  const daily = dailyHistory();
  const inWindow = (p: DebtPoint) => p.date >= startISO && p.date <= endISO;
  if (spanYears <= 3 && startISO >= daily[0].date) {
    return { points: daily.filter(inWindow), resolution: "daily" };
  }
  if (spanYears <= 25) {
    const points = combinedHistory().filter(inWindow);
    return { points, resolution: points.some((p) => p.tier.startsWith("annual")) ? "annual+quarterly" : "quarterly" };
  }
  return { points: combinedHistory().filter(inWindow), resolution: "annual+quarterly" };
}

/** NBER recession months (USREC) compressed into date ranges for chart shading. */
export function recessions(): Array<{ start: string; end: string }> {
  const rows = readFredCsv("data/recessions.csv");
  const out: Array<{ start: string; end: string }> = [];
  let start: string | null = null;
  for (const r of rows) {
    if (r.value === 1 && start === null) start = r.date;
    if (r.value === 0 && start !== null) {
      out.push({ start, end: r.date });
      start = null;
    }
  }
  if (start !== null) out.push({ start, end: rows[rows.length - 1].date });
  return out;
}

/** Annual nominal GDP (GDPA, 1929+), dollars. */
export function annualGdp(): Array<{ date: string; value: number }> {
  return readFredCsv("data/gdp-annual.csv").map((r) => ({ date: r.date, value: r.value * 1e9 }));
}

/** Annual federal surplus/deficit (FYFSD, 1901+), dollars (negative = deficit). */
export function annualDeficit(): Array<{ date: string; value: number }> {
  return readFredCsv("data/fiscal-deficit.csv").map((r) => ({ date: r.date, value: r.value * 1e6 }));
}

/** 10-year Treasury constant-maturity yield (GS10, 1953+), percent. */
export function treasury10y(): Array<{ date: string; value: number }> {
  return readFredCsv("data/treasury-10y.csv");
}

/** Year-over-year CPI inflation (percent), from the historical NSA CPI (1914+). */
export function inflationYoY(): Array<{ date: string; value: number }> {
  const cpi = readFredCsv("data/cpi-historical.csv");
  const byDate = new Map(cpi.map((r) => [r.date, r.value]));
  return cpi.flatMap((r) => {
    const prior = byDate.get(`${Number(r.date.slice(0, 4)) - 1}${r.date.slice(4)}`);
    return prior ? [{ date: r.date, value: (r.value / prior - 1) * 100 }] : [];
  });
}

/** Debt-to-GDP by fiscal year where both series exist (1929+), percent. */
export function debtToGdpAnnual(): Array<{ date: string; value: number }> {
  const gdpByYear = new Map(annualGdp().map((r) => [r.date.slice(0, 4), r.value]));
  return annualHistory().flatMap((p) => {
    const gdp = gdpByYear.get(p.date.slice(0, 4));
    return gdp ? [{ date: p.date, value: (p.debt / gdp) * 100 }] : [];
  });
}
