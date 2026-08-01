/**
 * Data-quality gate. Runs after every refresh and in CI; the scheduled refresh
 * workflow only commits data that passes these checks, so invalid upstream
 * responses can never silently reach production.
 */
import { history, latest } from "../lib/data";
import { readFredCsv } from "../lib/fred";
import { toReal, cpiAt, baseCpi, BASE_YEAR } from "../lib/inflation";
import { fiscalBaseline, populationAt, gdpAt } from "../lib/macro";

function fail(msg: string): never {
  throw new Error(msg);
}

// --- Debt series ---------------------------------------------------------------
const h = history();
const dates = h.map((x) => x.date);
if (new Set(dates).size !== dates.length) fail("Duplicate dates in debt series");
if (h.length < 200) fail("Unexpectedly short debt series");
if (h.some((x) => !Number.isFinite(x.debt) || x.debt <= 0)) fail("Invalid debt observation");
if (dates.some((x, i) => i > 0 && x <= dates[i - 1])) fail("Debt dates are not increasing");

// --- Latest Treasury snapshot ----------------------------------------------------
const l = latest();
if (Math.abs(l.total - l.publicDebt - l.intragov) > 1) fail("Treasury components do not reconcile");

// --- CPI / inflation adjustment ---------------------------------------------------
const cpi = readFredCsv("data/cpi.csv");
if (cpi.length < 800) fail("Unexpectedly short CPI series");
// October 2025 was never published (federal shutdown), so 11 months is valid.
if (cpi.filter((r) => r.date.startsWith(`${BASE_YEAR}-`)).length < 10)
  fail(`CPI base year ${BASE_YEAR} has fewer than 10 monthly observations`);
// Every debt observation must have a CPI month at or before its as-of date.
for (const p of h) {
  const c = cpiAt(p.date);
  if (!Number.isFinite(c) || c <= 0) fail(`No valid CPI for debt observation ${p.date}`);
}
// Base-year identity: a nominal value observed mid-base-year converts to ≈ itself.
const identity = toReal(1_000_000, `${BASE_YEAR}-06-15`);
if (Math.abs(identity / 1_000_000 - 1) > 0.03)
  fail(`Base-year real≈nominal identity violated (${identity.toFixed(0)} vs 1000000)`);
// Real conversion must be monotone in CPI: older dollars scale UP to base year.
if (toReal(1000, "1980-06-30") <= 1000) fail("1980 dollars should inflate to more base-year dollars");
if (baseCpi() <= 0) fail("Invalid base CPI");

// --- Macro series ------------------------------------------------------------------
const gdp = gdpAt(l.date);
if (!gdp || gdp.value < 1e13) fail("GDP baseline missing or implausible");
const pop = populationAt(l.date);
if (pop.value < 2.5e8 || pop.value > 5e8) fail("Population baseline implausible");
const fiscal = fiscalBaseline();
if (fiscal.receipts < 1e12 || fiscal.outlays < 1e12) fail("Fiscal baseline implausible");
if (fiscal.outlays < fiscal.receipts * 0.5 || fiscal.receipts < fiscal.outlays * 0.3)
  fail("Fiscal receipts/outlays ratio implausible");

console.log(
  `Validated ${h.length} debt observations (through ${dates[dates.length - 1]}), latest snapshot ${l.date}, ` +
    `${cpi.length} CPI months (base ${BASE_YEAR}), GDP ${gdp.date}, population ${pop.date}, fiscal year ${fiscal.fiscalYearEnd}.`,
);
