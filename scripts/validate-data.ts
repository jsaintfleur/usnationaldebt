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
if (fiscal.interest <= 0 || fiscal.interest > fiscal.outlays * 0.5)
  fail("Fiscal interest outlays implausible relative to total outlays");

// --- Deep history -------------------------------------------------------------------
import { annualHistory, dailyHistory, recessions } from "../lib/deep-history";
import { presidents, congresses, politicalContext } from "../lib/political";

const annual = annualHistory();
if (annual[0].date.slice(0, 4) !== "1790") fail("Annual debt series must begin in 1790");
if (Math.abs(annual[0].debt - 71060508.5) > 1) fail("1790 debt does not match the canonical Treasury figure ($71,060,508.50)");
if (annual.length < 230) fail("Annual debt series unexpectedly short");
if (annual.some((x, i) => i > 0 && x.date <= annual[i - 1].date)) fail("Annual dates not increasing");

const dailyPts = dailyHistory();
if (dailyPts.length < 8000) fail("Daily debt series unexpectedly short");
if (dailyPts[0].date !== "1993-04-01") fail("Daily series must begin 1993-04-01");
// Cross-check: the latest daily observation must match the committed Treasury snapshot.
if (Math.abs(dailyPts[dailyPts.length - 1].debt - l.total) > 1e6) fail("Daily series tail disagrees with debt-latest.json");

const rec = recessions();
if (rec.length < 30) fail("Recession ranges unexpectedly few");
if (rec[0].start.slice(0, 4) !== "1854") fail("NBER recession series must begin in 1854");

// --- Political data -------------------------------------------------------------------
const pres = presidents();
if (pres.length !== 47) fail(`Expected 47 presidencies, got ${pres.length}`);
for (let i = 1; i < pres.length; i++) {
  if (pres[i].start !== pres[i - 1].end) fail(`Presidency gap/overlap at ${pres[i].name} (${pres[i].start} vs ${pres[i - 1].end})`);
}
const cong = congresses();
if (cong.length < 119) fail(`Expected >=119 congresses, got ${cong.length}`);
for (let i = 1; i < cong.length; i++) {
  if (cong[i].congress !== cong[i - 1].congress + 1) fail(`Congress numbering gap at ${cong[i].congress}`);
  if (cong[i].startYear !== cong[i - 1].endYear) fail(`Congress year gap at ${cong[i].congress}`);
}
// Political anchor facts (official record checks)
const anchors: Array<[string, string | null, string | null, string | null]> = [
  ["1933-06-01", "Franklin D. Roosevelt", "Democrats", "Democrats"],
  ["1995-06-01", "Bill Clinton", "Republicans", "Republicans"],
  ["2007-06-01", "George W. Bush", "Democrats", "Democrats"],
  ["2011-06-01", "Barack Obama", "Republicans", "Democrats"],
  ["2021-06-01", "Joe Biden", "Democrats", "Democrats"],
  ["2025-06-01", "Donald Trump", "Republicans", "Republicans"],
];
for (const [date, president, house, senate] of anchors) {
  const ctx = politicalContext(date);
  if (ctx.president?.name !== president) fail(`Political anchor ${date}: president ${ctx.president?.name} != ${president}`);
  if (ctx.houseMajority !== house) fail(`Political anchor ${date}: house ${ctx.houseMajority} != ${house}`);
  if (ctx.senateMajority !== senate) fail(`Political anchor ${date}: senate ${ctx.senateMajority} != ${senate}`);
}

console.log(
  `Validated ${h.length} quarterly + ${annual.length} annual + ${dailyPts.length} daily debt observations, latest snapshot ${l.date}, ` +
    `${cpi.length} CPI months (base ${BASE_YEAR}), GDP ${gdp.date}, population ${pop.date}, fiscal year ${fiscal.fiscalYearEnd}, ` +
    `${pres.length} presidencies, ${cong.length} congresses, ${rec.length} recessions.`,
);
