/**
 * Political-variable evaluation: builds the annual feature table (1901+),
 * runs the walk-forward comparison across feature sets, and writes
 * data/political-evaluation.json + POLITICAL_MODEL_COMPARISON.csv.
 *
 * The question answered is narrow and honest: do political-control variables
 * improve ONE-YEAR-AHEAD debt-growth prediction over a purely autoregressive
 * baseline? Whatever the answer, it is not a causal claim.
 */
import fs from "node:fs";
import path from "node:path";
import { readFredCsv } from "../lib/fred";
import { politicalContext } from "../lib/political";
import { evaluateFeatureSets, FEATURE_SETS, type FeatureRow } from "../lib/political-models";

const annual = fs
  .readFileSync(path.join(process.cwd(), "data/debt-annual.csv"), "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [date, value] = line.split(",");
    return { date, debt: Number(value) };
  })
  .filter((r) => Number.isFinite(r.debt) && r.debt > 0 && r.date >= "1899-01-01");

const rows: FeatureRow[] = [];
for (let i = 2; i < annual.length; i++) {
  const g = Math.log(annual[i].debt / annual[i - 1].debt);
  const g1 = Math.log(annual[i - 1].debt / annual[i - 2].debt);
  const g2 = i >= 3 ? Math.log(annual[i - 2].debt / annual[i - 3].debt) : g1;
  // Political state as of the start of the fiscal year being predicted —
  // approximated by January 1 of the record's calendar year, which is inside
  // the fiscal year under both the pre-1977 (July–June) and modern (Oct–Sep)
  // conventions and is always known ex ante.
  const year = Number(annual[i].date.slice(0, 4));
  const ctx = politicalContext(`${year}-01-01`);
  const p = (ctx.presidentParty ?? "").toLowerCase();
  rows.push({
    year,
    g,
    features: {
      g1,
      g2,
      presD: p.startsWith("democratic") ? 1 : 0,
      presR: p.startsWith("republican") ? 1 : 0,
      houseR: (ctx.houseMajority ?? "").toLowerCase().includes("republican") ? 1 : 0,
      senateR: (ctx.senateMajority ?? "").toLowerCase().includes("republican") ? 1 : 0,
      unified: ctx.alignment === "unified" ? 1 : 0,
      transition: ctx.transitionYear ? 1 : 0,
      midterm: ctx.midtermYear ? 1 : 0,
    },
  });
}

const results = evaluateFeatureSets(rows, 40, 1);
const baseline = results.find((r) => r.featureSet === "baseline-ar")!;
const best = [...results].sort((a, b) => a.mae - b.mae)[0];
const politicalHelps = best.featureSet !== "baseline-ar" && best.mae < baseline.mae * 0.98;

const artifact = {
  version: `pol-${annual[annual.length - 1].date}`,
  generatedAt: new Date().toISOString(),
  dataThrough: annual[annual.length - 1].date,
  design:
    "annual fiscal-year debt growth (log), 1901+; ridge (lambda=1) walk-forward, one-year-ahead, min 40 training years; political features known ex ante",
  featureSets: FEATURE_SETS,
  results,
  conclusion: {
    bestFeatureSet: best.featureSet,
    politicalVariablesImprovePrediction: politicalHelps,
    interpretation: politicalHelps
      ? "Political-control variables produced a material out-of-sample improvement over the autoregressive baseline at the one-year horizon."
      : "Political-control variables do not materially improve one-year-ahead debt-growth prediction over an autoregressive baseline; their value in this product is segmentation and historical interpretability, not forecasting power. This matches the economic prior: debt dynamics are driven by inherited budgets, economic conditions, and emergencies more than by party control alone.",
    causalCaveat: "None of this measures causation. Party control correlates with eras, wars, and business cycles that this design does not identify.",
  },
};

fs.writeFileSync(path.join(process.cwd(), "data/political-evaluation.json"), JSON.stringify(artifact, null, 2));

const csv = [
  "feature_set,n_forecasts,mae_log_growth,rmse_log_growth,mae_vs_naive_ratio",
  ...results.map((r) => [r.featureSet, r.n, r.mae.toFixed(5), r.rmse.toFixed(5), r.maeVsNaive.toFixed(4)].join(",")),
  `# walk-forward one-year-ahead, data through ${annual[annual.length - 1].date}; ratio <1 beats last-growth naive`,
].join("\n");
fs.writeFileSync(path.join(process.cwd(), "POLITICAL_MODEL_COMPARISON.csv"), csv + "\n");

console.log(`Political evaluation over ${baseline.n} out-of-sample years (through ${annual[annual.length - 1].date}):`);
for (const r of [...results].sort((a, b) => a.mae - b.mae)) {
  console.log(`  MAE ${r.mae.toFixed(5)}  rmse ${r.rmse.toFixed(5)}  vs-naive ${r.maeVsNaive.toFixed(3)}  ${r.featureSet}`);
}
console.log(politicalHelps ? "→ political variables improve prediction" : "→ political variables do NOT materially improve prediction (kept for segmentation/interpretability)");
