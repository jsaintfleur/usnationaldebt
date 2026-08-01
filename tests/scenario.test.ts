import test from "node:test";
import assert from "node:assert/strict";
import { runScenario, defaultsFor, SCENARIO_DEFAULTS, type ScenarioBaseline } from "../lib/scenario";

const baseline: ScenarioBaseline = {
  debt: 37.6e12,
  fiscalYearEnd: "2025-09-30",
  gdp: 30.5e12,
  gdpAsOf: "2025-07-01",
  receipts: 5.24e12,
  outlays: 7.01e12,
  interest: 0.97e12,
  effectiveRatePct: (0.97e12 / 37.6e12) * 100,
  population: 342e6,
  populationGrowth: 0.005,
  cpiAnchor: 324,
  cpiBase: 322,
  baseYear: 2025,
  debtToday: 39.8e12,
  debtTodayAsOf: "2026-07-30",
};

test("defaults adopt the observed effective interest rate", () => {
  const d = defaultsFor(baseline);
  assert.equal(d.avgInterestRatePct, 2.6);
  assert.equal(d.years, SCENARIO_DEFAULTS.years);
});

test("interest split uses actual OMB interest, not a synthetic rate on today's debt", () => {
  const input = { ...defaultsFor(baseline), years: 1, inflationPct: 0 };
  const [r] = runScenario(baseline, input);
  const rate = input.avgInterestRatePct / 100;
  const expectedPrimary = (baseline.outlays - baseline.interest) * (1 + input.realSpendingGrowthPct / 100);
  assert.ok(Math.abs(r.outlays - (expectedPrimary + rate * baseline.debt)) < 1e6);
  // Year labels are fiscal years counted from the anchor.
  assert.equal(r.year, 2026);
});

test("deficits accumulate and identities hold each fiscal year", () => {
  const rows = runScenario(baseline, defaultsFor(baseline));
  let debt = baseline.debt;
  for (const r of rows) {
    assert.ok(Math.abs(r.outlays - (r.deficit + r.receipts)) < 1, "outlays = receipts + deficit");
    debt = Math.max(0, debt + r.deficit);
    assert.ok(Math.abs(r.debt - debt) < 1, "debt accumulates exactly by the deficit");
    assert.ok(Math.abs(r.debtToGdp - (r.debt / r.gdp) * 100) < 1e-9, "debt/GDP consistent");
  }
});

test("surpluses reduce debt, and repaid debt floors at zero instead of going negative", () => {
  const rows = runScenario(baseline, {
    ...defaultsFor(baseline),
    realRevenueGrowthPct: 10,
    realSpendingGrowthPct: -5,
    avgInterestRatePct: 0,
    inflationPct: 0,
    years: 20,
  });
  assert.ok(rows.some((r) => r.deficit < 0), "must produce surpluses");
  for (const r of rows) {
    assert.ok(r.debt >= 0, `debt must never go negative (got ${r.debt} in ${r.year})`);
    assert.ok(r.interest >= 0, "interest must never be negative");
  }
  assert.equal(rows[rows.length - 1].debt, 0, "sustained large surpluses fully repay the debt");
});

test("zero inflation makes nominal and real paths differ only by the base-year anchor", () => {
  const rows = runScenario(baseline, { ...defaultsFor(baseline), inflationPct: 0 });
  const anchor = baseline.cpiBase / baseline.cpiAnchor;
  for (const r of rows) assert.ok(Math.abs(r.debtReal - r.debt * anchor) < 1);
});

test("higher inflation raises nominal debt but erodes its real value; deflation does the reverse", () => {
  const d = defaultsFor(baseline);
  const none = runScenario(baseline, { ...d, inflationPct: 0 });
  const high = runScenario(baseline, { ...d, inflationPct: 6 });
  const defl = runScenario(baseline, { ...d, inflationPct: -2 });
  const n = d.years - 1;
  assert.ok(high[n].debt > none[n].debt, "inflation raises nominal debt via nominal flow growth");
  assert.ok(high[n].debtReal < high[n].debt, "real debt below nominal under inflation");
  assert.ok(defl[n].debtReal > defl[n].debt * (baseline.cpiBase / baseline.cpiAnchor), "deflation raises real relative to nominal");
});

test("all baseline vintages share the fiscal anchor (guard against vintage mixing)", () => {
  // The engine must never see today's debt: simulate with a baseline whose
  // debtToday is wildly different and confirm results are unchanged.
  const tampered = { ...baseline, debtToday: 99e12 };
  const a = runScenario(baseline, defaultsFor(baseline));
  const b = runScenario(tampered, defaultsFor(baseline));
  assert.deepEqual(a, b, "debtToday is display context only and must not affect the simulation");
});
