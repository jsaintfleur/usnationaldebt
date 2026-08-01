/**
 * Political-variable model evaluation: does knowing who holds the White House
 * and Congress improve one-year-ahead debt-growth forecasts, or is their value
 * mainly descriptive segmentation?
 *
 * Design (annual, fiscal-year frequency, 1901+ — the era with a modern fiscal
 * state; the Jacksonian near-zero-debt years make growth rates degenerate):
 *   target      g_t = log(debt_t / debt_{t-1})   (fiscal-year-end levels)
 *   baseline    ridge on [g_{t-1}, g_{t-2}]
 *   president   baseline + president-party dummies
 *   congress    baseline + chamber-control and unified-government dummies
 *   combined    all of the above + transition/midterm indicators
 *
 * All political features are known before the fiscal year begins, so there is
 * no look-ahead. Ridge (λ=1 on standardized features) keeps small-sample
 * coefficients stable. Walk-forward: refit each year, predict the next.
 * NEVER interpret coefficients causally — divided government correlates with
 * eras, wars, and business cycles that this design does not identify.
 */

export type FeatureRow = { year: number; g: number; features: Record<string, number> };

export function ridgeFit(X: number[][], y: number[], lambda: number): number[] {
  const n = X.length;
  const k = X[0].length;
  // Normal equations: (XᵀX + λI)β = Xᵀy — intercept column excluded from penalty.
  const A: number[][] = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => {
    let s = 0;
    for (let r = 0; r < n; r++) s += X[r][i] * X[r][j];
    return s + (i === j && i > 0 ? lambda : 0);
  }));
  const b: number[] = Array.from({ length: k }, (_, i) => {
    let s = 0;
    for (let r = 0; r < n; r++) s += X[r][i] * y[r];
    return s;
  });
  return solve(A, b);
}

/** Gaussian elimination with partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const k = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < k; col++) {
    let pivot = col;
    for (let r = col + 1; r < k; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) continue;
    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= k; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[k] / row[i]));
}

export const FEATURE_SETS: Record<string, string[]> = {
  "baseline-ar": ["g1", "g2"],
  "president-only": ["g1", "g2", "presD", "presR"],
  "congress-only": ["g1", "g2", "houseR", "senateR", "unified"],
  "combined-political": ["g1", "g2", "presD", "presR", "houseR", "senateR", "unified", "transition", "midterm"],
};

export type PoliticalEvalResult = {
  featureSet: string;
  n: number;
  mae: number;
  rmse: number;
  maeVsNaive: number; // ratio: <1 means better than g_t = g_{t-1}
};

/**
 * Walk-forward one-year-ahead evaluation. rows must be chronological with
 * features known ex ante. Returns per-feature-set out-of-sample error plus the
 * naive (last growth persists) comparison computed on identical origins.
 */
export function evaluateFeatureSets(rows: FeatureRow[], minTrain = 40, lambda = 1): PoliticalEvalResult[] {
  const results: PoliticalEvalResult[] = [];
  for (const [name, cols] of Object.entries(FEATURE_SETS)) {
    let ae = 0, se = 0, naiveAe = 0, n = 0;
    for (let t = minTrain; t < rows.length; t++) {
      const train = rows.slice(0, t);
      const X = train.map((r) => [1, ...cols.map((c) => r.features[c] ?? 0)]);
      const y = train.map((r) => r.g);
      const beta = ridgeFit(X, y, lambda);
      const x = [1, ...cols.map((c) => rows[t].features[c] ?? 0)];
      const pred = x.reduce((s, v, i) => s + v * beta[i], 0);
      const err = pred - rows[t].g;
      ae += Math.abs(err);
      se += err * err;
      naiveAe += Math.abs(rows[t].features["g1"] - rows[t].g);
      n++;
    }
    results.push({ featureSet: name, n, mae: ae / n, rmse: Math.sqrt(se / n), maeVsNaive: ae / naiveAe });
  }
  return results;
}
