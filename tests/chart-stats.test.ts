import assert from "node:assert/strict";
import test from "node:test";
import { availableResolutions, computeChartStats, observationsBetween, observationsInTrailingYears, resampleObservations } from "../lib/chart-stats";

const points = [
  { date: "2020-01-01", value: 10, realValue: 12 },
  { date: "2020-04-01", value: 11, realValue: 12.5 },
  { date: "2021-01-01", value: 15, realValue: 16 },
  { date: "2022-01-01", value: 20, realValue: 19 },
];

test("computes nominal, real, annualized, and daily window statistics", () => {
  const stats = computeChartStats(points)!;
  assert.equal(stats.change, 10);
  assert.equal(stats.percentChange, 100);
  assert.equal(stats.realChange, 7);
  assert.ok(stats.cagr! > 40 && stats.cagr! < 42);
  assert.ok(stats.averagePerDay! > 0);
});

test("zero starting values do not produce infinite percentages", () => {
  const stats = computeChartStats([{ date: "1835-01-01", value: 0 }, { date: "1836-01-01", value: 2 }])!;
  assert.equal(stats.percentChange, null);
  assert.equal(stats.cagr, null);
});

test("windows with fewer than two observations have no statistics", () => {
  assert.equal(computeChartStats(points.slice(0, 1)), null);
});

test("range selection anchors to the latest observation", () => {
  assert.deepEqual(observationsInTrailingYears(points, 1).map((point) => point.date), ["2021-01-01", "2022-01-01"]);
});

test("explicit start and end dates are inclusive", () => {
  assert.deepEqual(observationsBetween(points, "2020-04-01", "2021-01-01").map((point) => point.value), [11, 15]);
  assert.deepEqual(observationsBetween(points, "2022-01-01", "2020-01-01"), []);
});

test("resolution options reflect actual coverage and annual sampling uses the last observation", () => {
  assert.deepEqual(availableResolutions(points), ["auto", "annual", "quarterly"]);
  assert.deepEqual(resampleObservations(points, "annual").map((point) => point.value), [11, 15, 20]);
});
