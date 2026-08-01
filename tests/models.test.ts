import test from "node:test";
import assert from "node:assert/strict";
import { MODELS, walkForward, computeMetrics, quantile } from "../lib/models";

test("every model only sees data before the forecast origin (leakage guard)", () => {
  // Two series identical up to index 99, wildly different afterwards: fitted
  // predictions from the shared prefix must be identical for every model.
  const base = Array.from({ length: 100 }, (_, i) => 1000 + i * 10);
  const futureA = [...base, 99999, 99999];
  const futureB = [...base, 1, 1];
  for (const m of MODELS) {
    const predA = m.fit(futureA.slice(0, 100))(4);
    const predB = m.fit(futureB.slice(0, 100))(4);
    assert.equal(predA, predB, `${m.id} must not depend on post-origin data`);
  }
});

test("naive baseline scores MASE = 1 on a constant-drift series at h=1", () => {
  // Constant increments: the naive error at h=1 equals the typical historical
  // step, so MASE must be exactly 1.
  const series = Array.from({ length: 120 }, (_, i) => 100 + i * 5);
  const result = walkForward(series, [1], 60);
  assert.ok(Math.abs(result.metrics["naive-last"][1].mase - 1) < 1e-9);
  // Drift and trend models fit a linear series perfectly.
  assert.ok(result.metrics["naive-drift"][1].mae < 1e-6);
  assert.ok(result.metrics["linear-trend-10y"][1].mae < 1e-6);
});

test("exponential models fit a compound-growth series perfectly", () => {
  const series = Array.from({ length: 120 }, (_, i) => 100 * Math.pow(1.02, i));
  const result = walkForward(series, [4], 60);
  assert.ok(result.metrics["mean-log-growth"][4].mape < 1e-6);
  assert.ok(result.metrics["exp-trend-10y"][4].mape < 1e-6);
  // The last-value naive must be biased low on a growing series.
  assert.ok(result.metrics["naive-last"][4].bias < 0);
});

test("metrics behave correctly on known errors", () => {
  const m = computeMetrics([
    { actual: 100, predicted: 110, scale: 5 },
    { actual: 100, predicted: 90, scale: 5 },
  ]);
  assert.equal(m.mae, 10);
  assert.equal(m.rmse, 10);
  assert.equal(m.mase, 2);
  assert.equal(m.bias, 0);
  assert.ok(Math.abs(m.mape - 10) < 1e-9);
});

test("quantile interpolates and stays within bounds", () => {
  const sorted = [1, 2, 3, 4, 5];
  assert.equal(quantile(sorted, 0), 1);
  assert.equal(quantile(sorted, 1), 5);
  assert.equal(quantile(sorted, 0.5), 3);
  assert.equal(quantile(sorted, 0.25), 2);
});

test("walk-forward respects horizon boundaries", () => {
  const series = Array.from({ length: 90 }, (_, i) => 100 + i);
  const result = walkForward(series, [1, 20], 80);
  // Origins run from 80 to 88; h=20 never fits inside the sample.
  assert.ok(result.metrics["naive-last"][1].n > 0);
  assert.equal(result.metrics["naive-last"][20], undefined);
});
