/**
 * Rolling-origin (walk-forward) model evaluation.
 *
 * Runs every candidate in lib/models.ts over the committed quarterly debt series,
 * scores 1-quarter, 1-year, and 5-year horizons out-of-sample, selects the
 * production model, calibrates empirical interval quantiles, and writes:
 *
 *   data/model-evaluation.json  — the artifact production forecasts load
 *   MODEL_COMPARISON.csv        — the full model × horizon metric table
 *
 * Selection rule (deterministic, documented in MODEL_CARD.md):
 *   lowest mean MASE across the 1-year and 5-year horizons, and it must not be
 *   worse than the best naive baseline at those horizons — a sophisticated
 *   model that loses to a naive baseline is not promoted.
 *
 * Interval calibration: the production model's annualized-growth errors at the
 * 5-year horizon are split chronologically; quantiles are estimated on the first
 * half and coverage is verified on the second half (no reuse of the same errors
 * for both estimation and assessment).
 */
import fs from "node:fs";
import path from "node:path";
import { history } from "../lib/data";
import { MODELS, walkForward, quantile } from "../lib/models";

const HORIZONS = [1, 4, 20]; // quarters: 1 quarter, 1 year, 5 years
const MIN_TRAIN = 80; // ≥20 years of quarterly history before the first origin

const points = history();
const values = points.map((p) => p.debt);
const dataThrough = points[points.length - 1].date;

const result = walkForward(values, HORIZONS, MIN_TRAIN);

// --- Select the production model ---------------------------------------------
const selectionHorizons = [4, 20];
const score = (id: string) =>
  selectionHorizons.reduce((sum, h) => sum + result.metrics[id][h].mase, 0) / selectionHorizons.length;

const baselines = MODELS.filter((m) => m.role === "baseline");
const bestBaselineScore = Math.min(...baselines.map((m) => score(m.id)));
const ranked = [...MODELS].sort((a, b) => score(a.id) - score(b.id));
const production = ranked.find((m) => score(m.id) <= bestBaselineScore) ?? baselines[0];

// --- Calibrate empirical growth-error intervals for the production model -----
const H_CAL = 20;
const errors = result.growthErrors[production.id][H_CAL];
const half = Math.floor(errors.length / 2);
const calibration = [...errors.slice(0, half)].sort((a, b) => a - b);
const holdout = errors.slice(half);
const q10 = quantile(calibration, 0.1);
const q90 = quantile(calibration, 0.9);
const covered = holdout.filter((e) => e >= q10 && e <= q90).length;
const observedCoverage = holdout.length > 0 ? covered / holdout.length : 0;

// --- Write artifact -----------------------------------------------------------
const artifact = {
  version: `wf-${dataThrough}`,
  generatedAt: new Date().toISOString(),
  dataThrough,
  target: "nominal total public debt outstanding (GFDEBTN, quarterly, quarter-end as-of dates)",
  horizonsQuarters: HORIZONS,
  minTrainQuarters: MIN_TRAIN,
  origins: result.origins,
  models: MODELS.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    metrics: Object.fromEntries(
      HORIZONS.filter((h) => result.metrics[m.id][h]).map((h) => [String(h), result.metrics[m.id][h]]),
    ),
  })),
  production: {
    id: production.id,
    selectedBy: "lowest mean out-of-sample MASE across 1-year and 5-year horizons; must not lose to the best naive baseline",
    growthErrorQuantiles: { q10, q90, horizonQuarters: H_CAL },
    intervalCoverage: { horizonQuarters: H_CAL, nominal: 0.8, observed: observedCoverage },
  },
};

fs.writeFileSync(path.join(process.cwd(), "data/model-evaluation.json"), JSON.stringify(artifact, null, 2));

// --- Write MODEL_COMPARISON.csv -----------------------------------------------
const rows = ["model_id,model_name,role,horizon_quarters,n_forecasts,mae_usd,rmse_usd,mape_pct,smape_pct,mase,bias_usd,production"];
for (const m of MODELS) {
  for (const h of HORIZONS) {
    const x = result.metrics[m.id][h];
    if (!x) continue;
    rows.push(
      [
        m.id,
        `"${m.name}"`,
        m.role,
        h,
        x.n,
        x.mae.toFixed(0),
        x.rmse.toFixed(0),
        x.mape.toFixed(3),
        x.smape.toFixed(3),
        x.mase.toFixed(4),
        x.bias.toFixed(0),
        m.id === production.id ? "yes" : "no",
      ].join(","),
    );
  }
}
rows.push(
  `# validation: rolling-origin walk-forward, ${result.origins} origins, min train ${MIN_TRAIN} quarters, data through ${dataThrough}`,
);
fs.writeFileSync(path.join(process.cwd(), "MODEL_COMPARISON.csv"), rows.join("\n") + "\n");

console.log(`Evaluated ${MODELS.length} models over ${result.origins} origins (data through ${dataThrough}).`);
console.log(`Production model: ${production.id} — mean MASE(4q,20q) = ${score(production.id).toFixed(4)} (best baseline ${bestBaselineScore.toFixed(4)}).`);
for (const m of ranked) console.log(`  ${score(m.id).toFixed(4)}  ${m.id}${m.role === "baseline" ? " (baseline)" : ""}`);
console.log(`Interval calibration (5y): q10=${(q10 * 100).toFixed(2)}pp q90=${(q90 * 100).toFixed(2)}pp, holdout coverage ${(observedCoverage * 100).toFixed(0)}% (nominal 80%).`);
