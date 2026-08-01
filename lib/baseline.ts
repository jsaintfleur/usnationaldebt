import { latest } from "./data";
import { gdpAt, populationAt, populationTrendGrowth, fiscalBaseline } from "./macro";
import { baseCpi, cpiAt, BASE_YEAR } from "./inflation";
import type { ScenarioBaseline } from "./scenario";

/**
 * Server-side scenario baseline assembled entirely from committed authoritative
 * snapshots — no hard-coded starting conditions. Passed as props to the client
 * Scenario Lab and used directly by /api/scenario.
 */
export function scenarioBaseline(): ScenarioBaseline {
  const debt = latest();
  const gdp = gdpAt(debt.date);
  if (!gdp) throw new Error("No GDP observation available for the scenario baseline.");
  const population = populationAt(debt.date);
  const fiscal = fiscalBaseline();
  return {
    debt: debt.total,
    debtAsOf: debt.date,
    gdp: gdp.value,
    gdpAsOf: gdp.date,
    receipts: fiscal.receipts,
    outlays: fiscal.outlays,
    fiscalYearEnd: fiscal.fiscalYearEnd,
    population: population.value,
    populationGrowth: populationTrendGrowth(),
    cpiLatest: cpiAt(debt.date),
    cpiBase: baseCpi(),
    baseYear: BASE_YEAR,
  };
}
