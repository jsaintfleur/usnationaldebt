/**
 * Candidate forecasting models, error metrics, and the rolling-origin
 * (walk-forward) evaluation protocol.
 *
 * Target variable: nominal total public debt outstanding (GFDEBTN), quarterly,
 * re-dated to true quarter-end as-of dates by lib/data.ts. Nominal is modeled
 * because it is the observable policy quantity; real conversions are applied
 * downstream and forecasts are explicitly labeled as embedding future price
 * levels (see MODEL_CARD.md).
 *
 * Leakage rules enforced by construction:
 *  - A model fitted at origin t receives series[0..t] only.
 *  - No scaling, differencing statistic, or window is computed on the full series.
 *  - Origins step forward one quarter at a time; horizons are strictly future.
 */

export type Model = {
  id: string;
  name: string;
  role: "baseline" | "candidate";
  /** Fit on the training slice; return a function producing the h-quarter-ahead level. */
  fit: (train: number[]) => (h: number) => number;
};

function olsLine(y: number[]): { slope: number; intercept: number } {
  const n = y.length;
  const xMean = (n - 1) / 2;
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (y[i] - yMean);
    den += (i - xMean) * (i - xMean);
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: yMean - slope * xMean };
}

const TREND_WINDOW = 40; // quarters (10 years) for windowed models

export const MODELS: Model[] = [
  {
    id: "naive-last",
    name: "Last observed value",
    role: "baseline",
    fit: (train) => {
      const last = train[train.length - 1];
      return () => last;
    },
  },
  {
    id: "naive-drift",
    name: "Last value + average historical drift",
    role: "baseline",
    fit: (train) => {
      const last = train[train.length - 1];
      const drift = (last - train[0]) / (train.length - 1);
      return (h) => last + drift * h;
    },
  },
  {
    id: "naive-last-growth",
    name: "Last observed quarterly growth rate",
    role: "baseline",
    fit: (train) => {
      const last = train[train.length - 1];
      const prev = train[train.length - 2];
      const g = prev > 0 ? last / prev : 1;
      return (h) => last * Math.pow(g, h);
    },
  },
  {
    id: "mean-log-growth",
    name: "Historical average growth (full sample)",
    role: "candidate",
    fit: (train) => {
      const last = train[train.length - 1];
      let sum = 0;
      for (let i = 1; i < train.length; i++) sum += Math.log(train[i] / train[i - 1]);
      const g = sum / (train.length - 1);
      return (h) => last * Math.exp(g * h);
    },
  },
  {
    id: "cagr-5y",
    name: "Trailing 5-year CAGR",
    role: "candidate",
    fit: (train) => {
      const last = train[train.length - 1];
      const base = train[Math.max(0, train.length - 1 - 20)];
      const span = Math.min(20, train.length - 1);
      const g = Math.pow(last / base, 1 / span);
      return (h) => last * Math.pow(g, h);
    },
  },
  {
    id: "cagr-10y",
    name: "Trailing 10-year CAGR",
    role: "candidate",
    fit: (train) => {
      const last = train[train.length - 1];
      const base = train[Math.max(0, train.length - 1 - TREND_WINDOW)];
      const span = Math.min(TREND_WINDOW, train.length - 1);
      const g = Math.pow(last / base, 1 / span);
      return (h) => last * Math.pow(g, h);
    },
  },
  {
    id: "linear-trend-10y",
    name: "Linear trend (10-year window)",
    role: "candidate",
    fit: (train) => {
      const window = train.slice(-TREND_WINDOW);
      const { slope, intercept } = olsLine(window);
      const n = window.length;
      return (h) => intercept + slope * (n - 1 + h);
    },
  },
  {
    id: "exp-trend-10y",
    name: "Exponential trend (log-linear, 10-year window)",
    role: "candidate",
    fit: (train) => {
      const window = train.slice(-TREND_WINDOW).map(Math.log);
      const { slope, intercept } = olsLine(window);
      const n = window.length;
      return (h) => Math.exp(intercept + slope * (n - 1 + h));
    },
  },
];

export type Metrics = {
  n: number;
  mae: number;
  rmse: number;
  mape: number;
  smape: number;
  mase: number;
  bias: number;
};

export function computeMetrics(pairs: Array<{ actual: number; predicted: number; scale: number }>): Metrics {
  const n = pairs.length;
  let ae = 0, se = 0, ape = 0, sape = 0, scaled = 0, err = 0;
  for (const { actual, predicted, scale } of pairs) {
    const e = predicted - actual;
    ae += Math.abs(e);
    se += e * e;
    ape += Math.abs(e / actual);
    sape += (2 * Math.abs(e)) / (Math.abs(actual) + Math.abs(predicted));
    scaled += Math.abs(e) / scale;
    err += e;
  }
  return {
    n,
    mae: ae / n,
    rmse: Math.sqrt(se / n),
    mape: (ape / n) * 100,
    smape: (sape / n) * 100,
    mase: scaled / n,
    bias: err / n,
  };
}

export type WalkForwardResult = {
  horizons: number[];
  minTrain: number;
  origins: number;
  metrics: Record<string, Record<number, Metrics>>;
  /** Per-model annualized-growth errors at each horizon (for interval calibration). */
  growthErrors: Record<string, Record<number, number[]>>;
};

/**
 * Rolling-origin evaluation. For each origin t (t >= minTrain observations of
 * training data) and each horizon h with t + h inside the sample, every model is
 * refitted on series[0..t] and its h-step prediction is scored against the actual.
 *
 * MASE scale: mean absolute one-step difference of the training slice at that
 * origin (the classic in-sample naive scale), so MASE < 1 means "better than a
 * random-walk step of typical historical size".
 */
export function walkForward(
  series: number[],
  horizons: number[] = [1, 4, 20],
  minTrain = 80,
): WalkForwardResult {
  const pairs: Record<string, Record<number, Array<{ actual: number; predicted: number; scale: number }>>> = {};
  const growthErrors: Record<string, Record<number, number[]>> = {};
  for (const m of MODELS) {
    pairs[m.id] = Object.fromEntries(horizons.map((h) => [h, []]));
    growthErrors[m.id] = Object.fromEntries(horizons.map((h) => [h, []]));
  }

  let origins = 0;
  for (let t = minTrain; t < series.length - 1; t++) {
    const train = series.slice(0, t + 1);
    let scale = 0;
    for (let i = 1; i < train.length; i++) scale += Math.abs(train[i] - train[i - 1]);
    scale /= train.length - 1;
    origins++;

    for (const m of MODELS) {
      const predict = m.fit(train);
      for (const h of horizons) {
        if (t + h >= series.length) continue;
        const actual = series[t + h];
        const predicted = predict(h);
        pairs[m.id][h].push({ actual, predicted, scale });
        const years = h / 4;
        const last = train[train.length - 1];
        const actualG = Math.pow(actual / last, 1 / years) - 1;
        const predictedG = Math.pow(Math.max(predicted, 1) / last, 1 / years) - 1;
        growthErrors[m.id][h].push(actualG - predictedG);
      }
    }
  }

  const metrics: Record<string, Record<number, Metrics>> = {};
  for (const m of MODELS) {
    metrics[m.id] = {};
    for (const h of horizons) {
      if (pairs[m.id][h].length > 0) metrics[m.id][h] = computeMetrics(pairs[m.id][h]);
    }
  }

  return { horizons, minTrain, origins, metrics, growthErrors };
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
