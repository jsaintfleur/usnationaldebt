import test from "node:test";
import assert from "node:assert/strict";
import { windowStats, RANGE_PRESETS } from "../lib/chart-stats";

const ms = (d: string) => Date.parse(d + "T00:00:00Z");

const points = [
  { d: "2000-12-31", v: 1000, r: 1800 },
  { d: "2005-12-31", v: 1500, r: 2200 },
  { d: "2010-12-31", v: 2000, r: 2400 },
];

test("window stats compute endpoints, change, percent, CAGR, and real change", () => {
  const s = windowStats(points, ms("2000-01-01"), ms("2011-01-01"))!;
  assert.equal(s.startDate, "2000-12-31");
  assert.equal(s.endDate, "2010-12-31");
  assert.equal(s.change, 1000);
  assert.ok(Math.abs(s.percent! - 100) < 1e-9);
  // CAGR over ~10 years for a doubling ≈ 7.18%
  assert.ok(Math.abs(s.cagrPct! - 7.18) < 0.1);
  assert.equal(s.realChange, 600);
  assert.ok(Math.abs(s.realPercent! - (600 / 1800) * 100) < 1e-9);
  assert.equal(s.observations, 3);
});

test("window stats respect the selected interval boundaries", () => {
  const s = windowStats(points, ms("2004-01-01"), ms("2011-01-01"))!;
  assert.equal(s.startDate, "2005-12-31");
  assert.equal(s.change, 500);
});

test("degenerate windows return null instead of misleading numbers", () => {
  assert.equal(windowStats(points, ms("2004-01-01"), ms("2005-01-01")), null, "fewer than 2 observations");
  assert.equal(windowStats([], 0, 1), null);
});

test("zero-debt start yields null percent/CAGR (Jackson 1835 case), not Infinity", () => {
  const s = windowStats(
    [
      { d: "1835-12-31", v: 0, r: null },
      { d: "1845-12-31", v: 100, r: null },
    ],
    ms("1835-01-01"),
    ms("1846-01-01"),
  )!;
  assert.equal(s.percent, null);
  assert.equal(s.cagrPct, null);
  assert.equal(s.realChange, null, "pre-CPI era must not fabricate real change");
});

test("range presets are sane and include All", () => {
  assert.ok(RANGE_PRESETS.some((p) => p.years === null));
  assert.ok(RANGE_PRESETS.every((p) => p.years === null || p.years > 0));
});
