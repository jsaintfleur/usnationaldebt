import fs from "node:fs";
import path from "node:path";
import type { Administration, AdminSummary, BoundaryMethod, DebtPoint } from "./types";
import { toReal, toRealMaybe, BASE_YEAR } from "./inflation";
import { MODELS } from "./models";
import { presidents } from "./political";

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
 * All administrations since 1789, derived from data/presidents.json. Repeated
 * names (Cleveland, Trump) get term ordinals so table keys and labels stay
 * unambiguous. The sitting president's term is marked partial and ends at the
 * latest observation.
 */
export const administrations: Administration[] = (() => {
  const all = presidents();
  const nameCounts = new Map<string, number>();
  for (const p of all) nameCounts.set(p.name, (nameCounts.get(p.name) ?? 0) + 1);
  const seen = new Map<string, number>();
  const roman = ["I", "II", "III"];
  return all.map((p) => {
    let label = p.name;
    if ((nameCounts.get(p.name) ?? 0) > 1) {
      const idx = seen.get(p.name) ?? 0;
      seen.set(p.name, idx + 1);
      label = `${p.name} (${roman[idx]})`;
    }
    return {
      president: label,
      party: p.party,
      start: p.start,
      end: p.end ?? new Date().toISOString().slice(0, 10),
      partial: p.end === null,
    };
  });
})();

/** Annual fiscal-year-end debt (Treasury Historical Debt Outstanding, 1790+). */
function annualDebt(): DebtPoint[] {
  return read("data/debt-annual.csv")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [date, value] = line.split(",");
      return { date, debt: Number(value) };
    })
    .filter((x) => Number.isFinite(x.debt) && x.debt >= 0);
}

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

type Boundary = { asOf: string; debt: number; method: BoundaryMethod };

/**
 * Boundary resolution, finest available first: exact Treasury daily balance
 * (2001+) → preceding quarter-end (1966+) → preceding annual fiscal-year end
 * (1790+). Washington's 1789 start predates all records, so his term anchors
 * on the first 1790 observation, labeled series-start-proxy.
 */
function boundaryObservation(
  points: DebtPoint[],
  annual: DebtPoint[],
  date: string,
  exact: Map<string, ExactTransition>,
): Boundary | null {
  const daily = exact.get(date);
  if (daily) return { asOf: daily.recordDate, debt: daily.total, method: "treasury-daily" };
  const quarterly = nearestPrior(points, date);
  if (quarterly) return { asOf: quarterly.date, debt: quarterly.debt, method: "quarter-end-proxy" };
  const yearly = nearestPrior(annual, date);
  if (yearly) return { asOf: yearly.date, debt: yearly.debt, method: "annual-proxy" };
  if (annual.length > 0 && date < annual[0].date) {
    return { asOf: annual[0].date, debt: annual[0].debt, method: "series-start-proxy" };
  }
  return null;
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
  const annual = annualDebt();
  const last = points[points.length - 1];
  return administrations.flatMap((a) => {
    const s = boundaryObservation(points, annual, a.start, exact);
    const e = a.partial
      ? ({ asOf: last.date, debt: last.debt, method: "latest-quarter" } as Boundary)
      : boundaryObservation(points, annual, a.end, exact);
    if (!s || !e) return [];
    const days = Math.max(1, (Date.parse(e.asOf) - Date.parse(s.asOf)) / 86400000);
    const years = days / 365.2425;
    const increase = e.debt - s.debt;
    // Real (BASE_YEAR-dollar) values exist only where CPI coverage does (1913+);
    // Jackson-era zero debt also makes real percent growth undefined.
    const startDebtReal = toRealMaybe(s.debt, s.asOf);
    const endDebtReal = toRealMaybe(e.debt, e.asOf);
    const hasReal = startDebtReal !== null && endDebtReal !== null;
    const increaseReal = hasReal ? endDebtReal - startDebtReal : null;
    const canRate = s.debt > 0;
    const canRealRate = hasReal && startDebtReal > 0;
    return [{
      ...a,
      startDebt: s.debt,
      endDebt: e.debt,
      increase,
      percent: canRate ? (increase / s.debt) * 100 : Infinity,
      cagr: canRate ? (Math.pow(e.debt / s.debt, 1 / years) - 1) * 100 : Infinity,
      daily: increase / days,
      startDebtReal,
      endDebtReal,
      increaseReal,
      percentReal: canRealRate ? ((increaseReal as number) / startDebtReal) * 100 : null,
      cagrReal: canRealRate ? (Math.pow(endDebtReal / startDebtReal, 1 / years) - 1) * 100 : null,
      dailyReal: hasReal ? (increaseReal as number) / days : null,
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

export type PoliticalEvaluation = {
  version: string;
  generatedAt: string;
  dataThrough: string;
  design: string;
  results: Array<{ featureSet: string; n: number; mae: number; rmse: number; maeVsNaive: number }>;
  conclusion: {
    bestFeatureSet: string;
    politicalVariablesImprovePrediction: boolean;
    interpretation: string;
    causalCaveat: string;
  };
};

/** The committed political-variable evaluation artifact (see scripts/evaluate-political.ts). */
export function politicalEvaluation(): PoliticalEvaluation {
  try {
    return JSON.parse(read("data/political-evaluation.json"));
  } catch {
    throw new Error("Missing data/political-evaluation.json — run `npx tsx scripts/evaluate-political.ts` first.");
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
