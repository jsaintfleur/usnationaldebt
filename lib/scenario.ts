/**
 * Deterministic fiscal scenario engine — the single implementation used by both
 * the /api/scenario route and the client Scenario Lab. This is an accounting
 * identity model, NOT machine learning, and the UI labels it that way.
 *
 * Anchoring: the simulation starts from the last COMPLETE fiscal year, with
 * debt, GDP, population, CPI, receipts, outlays, and interest all taken as of
 * that same fiscal-year end. Mixing vintages (e.g. today's debt with last
 * year's flows) would re-count borrowing that is already inside the debt
 * figure, so the current daily debt is carried separately as display context.
 *
 * Structure per simulated fiscal year:
 *   interest       = average interest rate × start-of-year debt (zero once debt is repaid)
 *   total outlays  = primary outlays + interest, where the baseline split uses
 *                    ACTUAL OMB interest outlays (FYOINT) — primary = net
 *                    outlays − interest paid, so nothing is double-counted and
 *                    the default rate is the observed effective rate.
 *   deficit        = total outlays − receipts                  (may be negative)
 *   debt           = max(0, debt + deficit)                    (surpluses repay
 *                    debt; a fully repaid debt floors at zero rather than
 *                    compounding into meaningless negative debt)
 *
 * Inflation is explicit: users set REAL growth rates plus an inflation rate
 * (deflation allowed); nominal growth compounds both ((1+real)(1+inflation)−1)
 * for receipts, primary outlays, and GDP. Real outputs deflate cumulative
 * scenario inflation and re-anchor to BASE_YEAR prices via the CPI ratio at
 * the fiscal-year anchor.
 */

export type ScenarioBaseline = {
  /** Debt at the fiscal-year-end anchor (Treasury Historical Debt Outstanding). */
  debt: number;
  /** The fiscal-year-end date every baseline quantity is anchored to. */
  fiscalYearEnd: string;
  /** Nominal GDP (annualized dollars) at the anchor quarter. */
  gdp: number;
  gdpAsOf: string;
  /** Anchor-fiscal-year federal receipts / net outlays / net interest outlays (OMB). */
  receipts: number;
  outlays: number;
  interest: number;
  /** Observed effective net-interest rate: interest ÷ debt, percent. */
  effectiveRatePct: number;
  /** Resident population at the anchor and its trailing compound annual growth rate. */
  population: number;
  populationGrowth: number;
  /** CPI at the anchor month and the BASE_YEAR average CPI. */
  cpiAnchor: number;
  cpiBase: number;
  baseYear: number;
  /** Latest daily Treasury balance, for display context only — not simulated. */
  debtToday: number;
  debtTodayAsOf: string;
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
  /** Fiscal year the row describes (anchor FY + i). */
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

/**
 * Slider defaults. The interest-rate default is a placeholder overridden at
 * runtime with the baseline's observed effective rate (see defaultsFor).
 */
export const SCENARIO_DEFAULTS: ScenarioInput = {
  years: 10,
  realRevenueGrowthPct: 1.5,
  realSpendingGrowthPct: 2.0,
  realGdpGrowthPct: 1.9,
  inflationPct: 2.3,
  avgInterestRatePct: 2.6,
};

/** Defaults with the interest rate set to the baseline's observed effective rate. */
export function defaultsFor(baseline: ScenarioBaseline): ScenarioInput {
  return { ...SCENARIO_DEFAULTS, avgInterestRatePct: Math.round(baseline.effectiveRatePct * 10) / 10 };
}

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
  // Split total outlays using ACTUAL interest paid in the anchor fiscal year —
  // no synthetic rate is involved, so interest is never double-counted.
  let primaryOutlays = Math.max(0, b.outlays - b.interest);
  let priceFactor = 1; // cumulative scenario inflation relative to the anchor
  const anchorToBase = b.cpiBase / b.cpiAnchor; // anchor-date dollars → BASE_YEAR dollars

  const startFiscalYear = Number(b.fiscalYearEnd.slice(0, 4));
  const out: ScenarioYear[] = [];
  for (let i = 1; i <= years; i++) {
    receipts *= 1 + nomRevenue;
    primaryOutlays *= 1 + nomSpending;
    const interest = rate * Math.max(0, debt);
    const outlays = primaryOutlays + interest;
    const deficit = outlays - receipts;
    debt = Math.max(0, debt + deficit);
    gdp *= 1 + nomGdp;
    population *= 1 + b.populationGrowth;
    priceFactor *= 1 + inflation;
    const real = (x: number) => (x / priceFactor) * anchorToBase;
    out.push({
      year: startFiscalYear + i,
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
