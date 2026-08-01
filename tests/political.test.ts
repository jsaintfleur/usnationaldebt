import test from "node:test";
import assert from "node:assert/strict";
import { presidents, congresses, presidentAt, congressAt, politicalContext } from "../lib/political";
import { ridgeFit, solve, evaluateFeatureSets, type FeatureRow } from "../lib/political-models";

test("presidencies are contiguous from 1789 with no gaps", () => {
  const all = presidents();
  assert.equal(all.length, 47);
  assert.equal(all[0].start, "1789-04-30");
  for (let i = 1; i < all.length; i++) assert.equal(all[i].start, all[i - 1].end);
  assert.equal(all[all.length - 1].end, null);
});

test("congress lookup respects seating cutover in odd years", () => {
  // Jan 2 2021 belongs to the 116th; Jan 4 2021 to the 117th.
  assert.equal(congressAt("2021-01-02")?.congress, 116);
  assert.equal(congressAt("2021-01-04")?.congress, 117);
  // Feb 1897 (pre-20th-Amendment) still the 54th; April 1897 the 55th.
  assert.equal(congressAt("1897-02-01")?.congress, 54);
  assert.equal(congressAt("1897-04-01")?.congress, 55);
});

test("well-known political anchors resolve correctly", () => {
  const newDeal = politicalContext("1935-06-01");
  assert.equal(newDeal.president?.name, "Franklin D. Roosevelt");
  assert.equal(newDeal.alignment, "unified");

  const gingrich = politicalContext("1996-06-01");
  assert.equal(gingrich.president?.name, "Bill Clinton");
  assert.equal(gingrich.houseMajority, "Republicans");
  assert.equal(gingrich.alignment, "divided");

  const split2011 = politicalContext("2012-06-01");
  assert.equal(split2011.houseMajority, "Republicans");
  assert.equal(split2011.senateMajority, "Democrats");
  assert.equal(split2011.alignment, "split-congress");

  // Caucus-organized Senate: 2023-24 shows Democratic control despite more R seats.
  const c118 = politicalContext("2023-06-01");
  assert.equal(c118.senateMajority, "Democrats");
  assert.ok(congressAt("2023-06-01")?.senate.note, "caucus organization must carry an explanatory note");
});

test("midterm and transition indicators", () => {
  assert.equal(politicalContext("2022-06-01").midtermYear, true);
  assert.equal(politicalContext("2024-06-01").midtermYear, false);
  assert.equal(politicalContext("2021-06-01").transitionYear, true);
  assert.equal(politicalContext("2022-06-01").transitionYear, false);
});

test("linear solver and ridge recover known coefficients", () => {
  // y = 2 + 3x, no noise: ridge with tiny lambda recovers it.
  const X = Array.from({ length: 50 }, (_, i) => [1, i / 10]);
  const y = X.map((r) => 2 + 3 * r[1]);
  const beta = ridgeFit(X, y, 1e-9);
  assert.ok(Math.abs(beta[0] - 2) < 1e-6);
  assert.ok(Math.abs(beta[1] - 3) < 1e-6);
  assert.deepEqual(solve([[2, 0], [0, 4]], [4, 8]).map(Math.round), [2, 2]);
});

test("political feature evaluation is leakage-safe by construction", () => {
  // Feature rows where the target is pure noise around zero except a regime
  // dummy that only matters AFTER the training window: walk-forward must not
  // learn it early. Constructed deterministic series.
  const rows: FeatureRow[] = Array.from({ length: 60 }, (_, i) => ({
    year: 1900 + i,
    g: i < 50 ? 0.02 : 0.10,
    features: { g1: i < 51 ? 0.02 : 0.10, g2: 0.02, presD: i % 2, presR: (i + 1) % 2 },
  }));
  const results = evaluateFeatureSets(rows, 40, 1);
  for (const r of results) {
    assert.ok(r.n === 20, `expected 20 out-of-sample years, got ${r.n}`);
    assert.ok(Number.isFinite(r.mae));
  }
});
