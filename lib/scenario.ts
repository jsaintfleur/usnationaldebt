/**
 * Deterministic fiscal scenario engine — the single implementation used by both
 * the /api/scenario route and the client Scenario Lab. This is an accounting
 * identity model, NOT machine learning, and the UI labels it that way.
 *
 * Structure per simulated year:
 *   interest       = average interest rate × start-of-year debt
 *   total outlays  = primary outlays + interest        (no double counting:
 *                    the baseline outlay total is split into primary + interest
 *                    at the chosen average rate before the simulation starts)
 *   deficit        = total outlays − receipts           (may be negative)
 *   debt          += deficit                            (surpluses reduce debt)
 *
 * Inflation is explicit: users set REAL growth rates plus an inflation rate;
 * nominal growth compounds both ((1+real)(1+inflation)−1) for receipts, primary
 * outlays, and GDP. Real outputs deflate nominal results by cumulative scenario
 * inflation and re-anchor to BASE_YEAR prices via the CPI ratio in the baseline.
 */

export type ScenarioBaseline = {
  /** Latest Treasury total public debt (nominal dollars) and its as-of date. */
  debt: number;
  debtAsOf: string;
  /** Latest BEA nominal GDP (annualized dollars) and its quarter. */
  gdp: number;
  gdpAsOf: string;
  /** Latest complete fiscal-year federal receipts / net outlays (OMB via FRED). */
  receipts: number;
  outlays: number;
  fiscalYearEnd: string;
  /** Resident population and its trailing compound annual growth rate. */
  population: number;
  populationGrowth: number;
  /** CPI at the debt as-of month and the BASE_YEAR average CPI. */
  cpiLatest: number;
  cpiBase: number;
  baseYear: number;
};

export type ScenarioInput = {
  years: number;
  realRevenueGrowthPct: number;
  realSpendingGrowthPct: number;
  realGdpGrowthPct: number;
  inflationPct: number;
  avgInterestRatePct: number;
};

export type ScenarioYear = {
  year: number;
  debt: number;
  debtReal: number;
  gdp: number;
  debtToGdp: number;
  perCapita: number;
  perCapitaReal: number;
  receipts: number;
  outlays: number;
  interest: number;
  deficit: number;
};

export const SCENARIO_DEFAULTS: ScenarioInput = {
  years: 10,
  realRevenueGrowthPct: 1.5,
  realSpendingGrowthPct: 2.0,
  realGdpGrowthPct: 1.9,
  inflationPct: 2.3,
  avgInterestRatePct: 3.3,
};

export function runScenario(b: ScenarioBaseline, input: ScenarioInput): ScenarioYear[] {
  const years = Math.min(20, Math.max(1, Math.round(input.years)));
  const inflation = input.inflationPct / 100;
  const nomRevenue = (1 + input.realRevenueGrowthPct / 100) * (1 + inflation) - 1;
  const nomSpending = (1 + input.realSpendingGrowthPct / 100) * (1 + inflation) - 1;
  const nomGdp = (1 + input.realGdpGrowthPct / 100) * (1 + inflation) - 1;
  const rate = input.avgInterestRatePct / 100;

  let debt = b.debt;
  let gdp = b.gdp;
  let receipts = b.receipts;
  let population = b.population;
  // Split the baseline outlay total once, so interest is never counted twice.
  let primaryOutlays = Math.max(0, b.outlays - rate * b.debt);
  let priceFactor = 1; // cumulative scenario inflation relative to the start
  const anchorToBase = b.cpiBase / b.cpiLatest; // start-date dollars → BASE_YEAR dollars

  const startYear = Number(b.debtAsOf.slice(0, 4));
  const out: ScenarioYear[] = [];
  for (let i = 1; i <= years; i++) {
    receipts *= 1 + nomRevenue;
    primaryOutlays *= 1 + nomSpending;
    const interest = rate * debt;
    const outlays = primaryOutlays + interest;
    const deficit = outlays - receipts;
    debt += deficit;
    gdp *= 1 + nomGdp;
    population *= 1 + b.populationGrowth;
    priceFactor *= 1 + inflation;
    const real = (x: number) => (x / priceFactor) * anchorToBase;
    out.push({
      year: startYear + i,
      debt,
      debtReal: real(debt),
      gdp,
      debtToGdp: (debt / gdp) * 100,
      perCapita: debt / population,
      perCapitaReal: real(debt) / population,
      receipts,
      outlays,
      interest,
      deficit,
    });
  }
  return out;
}
