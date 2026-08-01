import test from "node:test";
import assert from "node:assert/strict";
import { runScenario, SCENARIO_DEFAULTS, type ScenarioBaseline } from "../lib/scenario";

const baseline: ScenarioBaseline = {
  debt: 40e12,
  debtAsOf: "2026-07-30",
  gdp: 32e12,
  gdpAsOf: "2026-04-01",
  receipts: 5.2e12,
  outlays: 7.0e12,
  fiscalYearEnd: "2025-09-30",
  population: 342e6,
  populationGrowth: 0.005,
  cpiLatest: 330,
  cpiBase: 322,
  baseYear: 2025,
};

test("deficits accumulate and identities hold each year", () => {
  const rows = runScenario(baseline, SCENARIO_DEFAULTS);
  assert.equal(rows.length, SCENARIO_DEFAULTS.years);
  let debt = baseline.debt;
  for (const r of rows) {
    assert.ok(Math.abs(r.outlays - (r.deficit + r.receipts)) < 1, "outlays = receipts + deficit");
    debt += r.deficit;
    assert.ok(Math.abs(r.debt - debt) < 1, "debt accumulates exactly by the deficit");
    assert.ok(Math.abs(r.debtToGdp - (r.debt / r.gdp) * 100) < 1e-9, "debt/GDP consistent");
    assert.ok(Math.abs(r.perCapita * (r.debt / r.perCapita) - r.debt) < 1);
  }
});

test("surpluses reduce debt (no Math.max floor)", () => {
  const rows = runScenario(baseline, {
    ...SCENARIO_DEFAULTS,
    realRevenueGrowthPct: 6,
    realSpendingGrowthPct: -2,
    years: 20,
  });
  const last = rows[rows.length - 1];
  const mid = rows[10];
  assert.ok(last.deficit < 0, "strong revenue growth must eventually produce surpluses");
  assert.ok(last.debt < mid.debt, "surpluses must reduce nominal debt");
});

test("zero inflation makes nominal and real paths differ only by the base-year anchor", () => {
  const rows = runScenario(baseline, { ...SCENARIO_DEFAULTS, inflationPct: 0 });
  const anchor = baseline.cpiBase / baseline.cpiLatest;
  for (const r of rows) {
    assert.ok(Math.abs(r.debtReal - r.debt * anchor) < 1);
  }
});

test("higher inflation raises nominal debt but erodes its real value", () => {
  const low = runScenario(baseline, { ...SCENARIO_DEFAULTS, inflationPct: 0 });
  const high = runScenario(baseline, { ...SCENARIO_DEFAULTS, inflationPct: 6 });
  const n = SCENARIO_DEFAULTS.years - 1;
  assert.ok(high[n].debt > low[n].debt, "inflation must raise nominal debt via nominal flow growth");
  assert.ok(high[n].debtReal < high[n].debt, "real debt must be below nominal under positive inflation");
  // Real debt under high inflation stays in the same order of magnitude as the zero-inflation path
  // (inflation mostly cancels in real terms; interest dynamics create the remaining gap).
  assert.ok(high[n].debtReal < low[n].debtReal * 1.2);
});

test("interest is not double-counted: primary outlays are the baseline minus initial interest", () => {
  const oneYear = runScenario(baseline, { ...SCENARIO_DEFAULTS, years: 1 });
  const r = oneYear[0];
  const rate = SCENARIO_DEFAULTS.avgInterestRatePct / 100;
  const infl = SCENARIO_DEFAULTS.inflationPct / 100;
  const nomSpend = (1 + SCENARIO_DEFAULTS.realSpendingGrowthPct / 100) * (1 + infl) - 1;
  const expectedPrimary = (baseline.outlays - rate * baseline.debt) * (1 + nomSpend);
  assert.ok(Math.abs(r.outlays - (expectedPrimary + rate * baseline.debt)) < 1);
});
