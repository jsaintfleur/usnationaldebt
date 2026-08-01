import { latest, annualDebt, nearestPrior } from "./data";
import { gdpAt, populationAt, populationTrendGrowth, fiscalBaseline } from "./macro";
import { baseCpi, cpiAt, BASE_YEAR } from "./inflation";
import type { ScenarioBaseline } from "./scenario";

/**
 * Server-side scenario baseline, anchored entirely at the last COMPLETE fiscal
 * year so every quantity shares one vintage: debt (Treasury annual record),
 * GDP, population, CPI, and OMB receipts/outlays/interest all as of the same
 * fiscal-year end. The latest daily Treasury balance is included separately as
 * display context only. Nothing is hard-coded.
 */
export function scenarioBaseline(): ScenarioBaseline {
  const fiscal = fiscalBaseline();
  const anchor = fiscal.fiscalYearEnd;
  const debtAtAnchor = nearestPrior(annualDebt(), anchor);
  if (!debtAtAnchor || debtAtAnchor.date !== anchor) {
    throw new Error(`No annual debt record at fiscal anchor ${anchor}; refresh data.`);
  }
  const gdp = gdpAt(anchor);
  if (!gdp) throw new Error("No GDP observation available for the scenario baseline.");
  const population = populationAt(anchor);
  const today = latest();
  return {
    debt: debtAtAnchor.debt,
    fiscalYearEnd: anchor,
    gdp: gdp.value,
    gdpAsOf: gdp.date,
    receipts: fiscal.receipts,
    outlays: fiscal.outlays,
    interest: fiscal.interest,
    effectiveRatePct: (fiscal.interest / debtAtAnchor.debt) * 100,
    population: population.value,
    populationGrowth: populationTrendGrowth(),
    cpiAnchor: cpiAt(anchor),
    cpiBase: baseCpi(),
    baseYear: BASE_YEAR,
    debtToday: today.total,
    debtTodayAsOf: today.date,
  };
}
