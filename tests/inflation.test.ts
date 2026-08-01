import test from "node:test";
import assert from "node:assert/strict";
import { toReal, cpiAt, baseCpi, BASE_YEAR, cpiThrough } from "../lib/inflation";

test("base-year identity: nominal ≈ real inside the base year", () => {
  // Monthly CPI varies inside the year, so allow a small tolerance around the annual average.
  const real = toReal(1_000_000, `${BASE_YEAR}-06-15`);
  assert.ok(Math.abs(real / 1_000_000 - 1) < 0.03, `got ${real}`);
});

test("conversion formula matches real = nominal × (base ÷ observed)", () => {
  const nominal = 123_456;
  const date = "1990-06-30";
  assert.equal(toReal(nominal, date), nominal * (baseCpi() / cpiAt(date)));
});

test("older dollars scale up; no series silently switches base year", () => {
  assert.ok(toReal(1000, "1975-06-30") > 4000, "1975 dollars should be worth >4x in 2025 prices");
  assert.ok(toReal(1000, "2000-06-30") > 1500);
  assert.equal(BASE_YEAR, 2025);
});

test("no double adjustment: converting an already-real value would inflate it further", () => {
  const once = toReal(1000, "1990-06-30");
  const twice = toReal(once, "1990-06-30");
  assert.ok(twice > once, "applying the conversion twice must change the value (guard against silent idempotence assumptions)");
});

test("CPI coverage reaches the recent past", () => {
  assert.ok(cpiThrough() >= "2026-01-01");
});

test("manual spot checks against published CPI ratios", () => {
  // CPI-U annual average was ≈ 172.2 in 2000; each 2000 dollar is ≈ base/172.2 in 2025 prices.
  const factor2000 = toReal(1, "2000-06-30");
  assert.ok(factor2000 > 1.6 && factor2000 < 2.1, `2000→${BASE_YEAR} factor ${factor2000}`);
  const factor1980 = toReal(1, "1980-06-30");
  assert.ok(factor1980 > 3.2 && factor1980 < 4.5, `1980→${BASE_YEAR} factor ${factor1980}`);
});
