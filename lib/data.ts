import fs from "node:fs";
import path from "node:path";
import type { Administration, AdminSummary, DebtPoint } from "./types";
import { toReal, BASE_YEAR } from "./inflation";
import { MODELS } from "./models";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

/**
 * FRED dates end-of-period quarterly series by the FIRST day of the quarter:
 * the row dated 2026-01-01 is the balance on 2026-03-31. All downstream logic
 * (administration boundaries, CPI matching, walk-forward origins) needs the
 * true as-of date, so every observation is re-dated to its quarter end here.
 */
function quarterEnd(fredDate: string): string {
  const y = Number(fredDate.slice(0, 4));
  const endMonth = Number(fredDate.slice(5, 7)) + 2;
  const lastDay = new Date(Date.UTC(y, endMonth, 0)).getUTCDate();
  return `${y}-${String(endMonth).padStart(2, "0")}-${lastDay}`;
}

/** Quarterly total public debt (GFDEBTN), in dollars, dated by true quarter-end. */
export function history(): DebtPoint[] {
  return read("data/historical-debt.csv")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [date, value] = line.split(",");
      return { date: quarterEnd(date), debt: Number(value) * 1e6 };
    })
    .filter((x) => Number.isFinite(x.debt));
}

/** Latest daily Treasury snapshot (Debt to the Penny), verbatim from the committed response. */
export function latest() {
  const raw = JSON.parse(read("data/debt-latest.json"));
  const x = raw.data[0];
  return {
    date: x.record_date as string,
    total: Number(x.tot_pub_debt_out_amt),
    publicDebt: Number(x.debt_held_public_amt),
    intragov: Number(x.intragov_hold_amt),
    source: "U.S. Treasury Fiscal Data — Debt to the Penny",
  };
}

/**
 * Administrations covered by the comparable series. GFDEBTN begins 1966-Q1, so
 * Lyndon B. Johnson's 1963 start predates coverage and his term is excluded
 * rather than silently backfilled with a 1966 value (see METHODOLOGY.md).
 */
export const administrations: Administration[] = [
  { president: "Richard Nixon", party: "Republican", start: "1969-01-20", end: "1974-08-09" },
  { president: "Gerald Ford", party: "Republican", start: "1974-08-09", end: "1977-01-20" },
  { president: "Jimmy Carter", party: "Democratic", start: "1977-01-20", end: "1981-01-20" },
  { president: "Ronald Reagan", party: "Republican", start: "1981-01-20", end: "1989-01-20" },
  { president: "George H. W. Bush", party: "Republican", start: "1989-01-20", end: "1993-01-20" },
  { president: "Bill Clinton", party: "Democratic", start: "1993-01-20", end: "2001-01-20" },
  { president: "George W. Bush", party: "Republican", start: "2001-01-20", end: "2009-01-20" },
  { president: "Barack Obama", party: "Democratic", start: "2009-01-20", end: "2017-01-20" },
  { president: "Donald Trump (I)", party: "Republican", start: "2017-01-20", end: "2021-01-20" },
  { president: "Joe Biden", party: "Democratic", start: "2021-01-20", end: "2025-01-20" },
  { president: "Donald Trump (II)", party: "Republican", start: "2025-01-20", end: new Date().toISOString().slice(0, 10), partial: true },
];

type ExactTransition = { boundary: string; recordDate: string; total: number };

function exactTransitions(): Map<string, ExactTransition> {
  try {
    const raw = JSON.parse(read("data/transitions.json"));
    return new Map((raw.transitions as ExactTransition[]).map((t) => [t.boundary, t]));
  } catch {
    return new Map();
  }
}

/** Latest observation on or before `date`, or null when coverage starts later. */
export function nearestPrior(points: DebtPoint[], date: string): DebtPoint | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].date <= date) return points[i];
  }
  return null;
}

type Boundary = { asOf: string; debt: number; method: "treasury-daily" | "quarter-end-proxy" | "latest-quarter" };

function boundaryObservation(points: DebtPoint[], date: string, exact: Map<string, ExactTransition>): Boundary | null {
  const daily = exact.get(date);
  if (daily) return { asOf: daily.recordDate, debt: daily.total, method: "treasury-daily" };
  const proxy = nearestPrior(points, date);
  return proxy ? { asOf: proxy.date, debt: proxy.debt, method: "quarter-end-proxy" } : null;
}

/**
 * Administration-period metrics. Boundary values use exact Treasury daily
 * balances where daily coverage exists (2001 onward) and the quarter-end
 * observation immediately preceding the transition otherwise. Elapsed time for
 * rate metrics runs between the two as-of dates actually used, so partial terms
 * are not diluted by publication lag. Real values are in BASE_YEAR dollars.
 */
export function summarize(points = history()): AdminSummary[] {
  const exact = exactTransitions();
  const last = points[points.length - 1];
  return administrations.flatMap((a) => {
    const s = boundaryObservation(points, a.start, exact);
    const e = a.partial
      ? ({ asOf: last.date, debt: last.debt, method: "latest-quarter" } as Boundary)
      : boundaryObservation(points, a.end, exact);
    if (!s || !e) return [];
    const days = Math.max(1, (Date.parse(e.asOf) - Date.parse(s.asOf)) / 86400000);
    const years = days / 365.2425;
    const increase = e.debt - s.debt;
    const startDebtReal = toReal(s.debt, s.asOf);
    const endDebtReal = toReal(e.debt, e.asOf);
    const increaseReal = endDebtReal - startDebtReal;
    return [{
      ...a,
      startDebt: s.debt,
      endDebt: e.debt,
      increase,
      percent: (increase / s.debt) * 100,
      cagr: (Math.pow(e.debt / s.debt, 1 / years) - 1) * 100,
      daily: increase / days,
      startDebtReal,
      endDebtReal,
      increaseReal,
      percentReal: (increaseReal / startDebtReal) * 100,
      cagrReal: (Math.pow(endDebtReal / startDebtReal, 1 / years) - 1) * 100,
      dailyReal: increaseReal / days,
      startAsOf: s.asOf,
      endAsOf: e.asOf,
      startMethod: s.method,
      endMethod: e.method,
      baseYear: BASE_YEAR,
    }];
  });
}

export type EvaluationArtifact = {
  version: string;
  generatedAt: string;
  dataThrough: string;
  horizonsQuarters: number[];
  origins: number;
  models: Array<{
    id: string;
    name: string;
    role: string;
    metrics: Record<string, { n: number; mae: number; rmse: number; mape: number; smape: number; mase: number; bias: number }>;
  }>;
  production: {
    id: string;
    selectedBy: string;
    growthErrorQuantiles: { q10: number; q90: number; horizonQuarters: number };
    intervalCoverage: { horizonQuarters: number; nominal: number; observed: number };
  };
};

/** The committed walk-forward evaluation artifact that governs production forecasts. */
export function evaluation(): EvaluationArtifact {
  try {
    return JSON.parse(read("data/model-evaluation.json"));
  } catch {
    throw new Error("Missing data/model-evaluation.json — run `npm run models:evaluate` first.");
  }
}

export type ForecastPoint = { year: number; value: number; low: number; high: number; kind: "observed" | "model" };

/**
 * Production forecast: the model selected by the committed walk-forward
 * evaluation, refitted on the full quarterly series, with low/high paths built
 * from the empirical 10th/90th percentile annualized-growth errors observed
 * out-of-sample at the five-year horizon. These are empirical walk-forward
 * ranges — not arbitrary bands and not formal Bayesian prediction intervals.
 */
export function forecast(points = history(), years = 20): ForecastPoint[] {
  const artifact = evaluation();
  const model = MODELS.find((m) => m.id === artifact.production.id);
  if (!model) throw new Error(`Production model ${artifact.production.id} not found in MODELS.`);
  const values = points.map((p) => p.debt);
  const predict = model.fit(values);
  const last = points[points.length - 1];
  const lastYear = Number(last.date.slice(0, 4));
  const { q10, q90 } = artifact.production.growthErrorQuantiles;

  return Array.from({ length: years + 1 }, (_, i) => {
    if (i === 0) return { year: lastYear, value: last.debt, low: last.debt, high: last.debt, kind: "observed" as const };
    const mid = predict(4 * i);
    const g = Math.pow(mid / last.debt, 1 / i) - 1;
    const low = last.debt * Math.pow(1 + g + q10, i);
    const high = last.debt * Math.pow(1 + g + q90, i);
    return {
      year: lastYear + i,
      value: mid,
      low: Math.min(low, mid),
      high: Math.max(high, mid),
      kind: "model" as const,
    };
  });
}

/** Metadata stamped onto every forecast response and rendered in the UI. */
export function forecastMeta() {
  const artifact = evaluation();
  const model = MODELS.find((m) => m.id === artifact.production.id);
  return {
    modelId: artifact.production.id,
    modelName: model?.name ?? artifact.production.id,
    modelVersion: artifact.version,
    selectedBy: artifact.production.selectedBy,
    dataThrough: artifact.dataThrough,
    evaluatedAt: artifact.generatedAt,
    interval: "empirical 10th–90th percentile walk-forward growth errors (5-year horizon)",
    intervalCoverage: artifact.production.intervalCoverage,
    official: false,
    target: "nominal total public debt outstanding",
  };
}
