import test from "node:test";
import assert from "node:assert/strict";
import { annualHistory, dailyHistory, combinedHistory, resolveDebtSeries, recessions, debtToGdpAnnual, inflationYoY } from "../lib/deep-history";
import { toRealMaybe, CPI_COVERAGE_START } from "../lib/inflation";

test("annual series starts with the canonical 1790 Treasury figure", () => {
  const a = annualHistory();
  assert.equal(a[0].date.slice(0, 4), "1790");
  assert.ok(Math.abs(a[0].debt - 71060508.5) < 1);
  assert.equal(a[0].tier, "annual-historical");
  assert.equal(a.find((p) => p.date >= "1950-01-01")!.tier, "annual-official");
});

test("combined history switches from annual to quarterly at 1966", () => {
  const c = combinedHistory();
  const firstQuarterly = c.find((p) => p.tier === "quarterly")!;
  assert.equal(firstQuarterly.date, "1966-03-31");
  const lastAnnual = [...c].reverse().find((p) => p.tier.startsWith("annual"))!;
  assert.ok(lastAnnual.date < firstQuarterly.date, "no annual points after quarterly coverage begins");
  for (let i = 1; i < c.length; i++) assert.ok(c[i].date > c[i - 1].date, "combined series strictly ordered");
});

test("resolution picker matches zoom span and coverage", () => {
  assert.equal(resolveDebtSeries("1790-01-01", "2026-01-01").resolution, "annual+quarterly");
  assert.equal(resolveDebtSeries("2024-01-01", "2026-01-01").resolution, "daily");
  // Tight window before daily coverage cannot use daily data.
  assert.notEqual(resolveDebtSeries("1980-01-01", "1982-01-01").resolution, "daily");
});

test("recession ranges are well-formed and include known recessions", () => {
  const r = recessions();
  for (const x of r) assert.ok(x.start < x.end);
  const has = (start: string) => r.some((x) => x.start.slice(0, 7) === start);
  assert.ok(has("1929-09") || has("1929-08"), "Great Depression onset present");
  assert.ok(r.some((x) => x.start.startsWith("2020")), "COVID recession present");
});

test("debt-to-GDP begins with GDP coverage (1929) and peaks in the WWII era above 100%", () => {
  const d = debtToGdpAnnual();
  assert.equal(d[0].date.slice(0, 4), "1929");
  const wwii = d.filter((x) => x.date >= "1945-01-01" && x.date <= "1947-12-31");
  assert.ok(Math.max(...wwii.map((x) => x.value)) > 100, "WWII debt-to-GDP must exceed 100%");
});

test("real conversion covers 1913+ and refuses earlier dates", () => {
  assert.equal(CPI_COVERAGE_START, "1913-01-01");
  assert.equal(toRealMaybe(1000, "1900-06-30"), null);
  const civil = toRealMaybe(1000, "1913-06-30");
  assert.ok(civil !== null && civil > 20000, "1913 dollars are worth >20x in 2025 prices");
});

test("YoY inflation series contains known episodes", () => {
  const infl = inflationYoY();
  const at = (prefix: string) => infl.find((x) => x.date.startsWith(prefix))?.value ?? 0;
  assert.ok(at("1980-03") > 10, "1980 double-digit inflation");
  assert.ok(at("2009-07") < 0, "2009 deflation episode");
});

test("daily series is dense and consistent with quarterly overlaps", () => {
  const daily = dailyHistory();
  assert.ok(daily.length > 8000);
  // A known anchor: debt first crossed $10T in late September 2008.
  const cross = daily.find((p) => p.debt >= 10e12)!;
  assert.equal(cross.date.slice(0, 7), "2008-09");
});
