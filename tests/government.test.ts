import test from "node:test";
import assert from "node:assert/strict";
import { governmentPeriods } from "../lib/government";

const periods = governmentPeriods();

test("periods cover 1789 to the present with no gaps within a presidency", () => {
  assert.ok(periods.length > 130, `expected 130+ president×congress segments, got ${periods.length}`);
  assert.equal(periods[0].president, "George Washington");
  assert.ok(periods[periods.length - 1].end >= "2026-01-01");
  // Segments belonging to one president must tile his term contiguously.
  const fdr = periods.filter((p) => p.president === "Franklin D. Roosevelt");
  for (let i = 1; i < fdr.length; i++) assert.equal(fdr[i].start, fdr[i - 1].end);
});

test("series-edge segments never dilute annualized rates (the 89th-Congress defect)", () => {
  // LBJ × 89th Congress: starts Jan 1965. Annual records exist for 1964, so the
  // boundary must be a real prior observation — never a silent 1966 backfill —
  // and elapsed time must run between the as-of dates actually used.
  const lbj89 = periods.find((p) => p.congress === 89)!;
  assert.equal(lbj89.president, "Lyndon B. Johnson");
  assert.ok(lbj89.startAsOf < "1965-01-03", `boundary must precede the segment start, got ${lbj89.startAsOf}`);
  assert.equal(lbj89.startMethod, "annual");
  const impliedYears = lbj89.days / 365.2425;
  assert.ok(Math.abs(lbj89.increase / impliedYears - lbj89.annualized) < 1, "annualized uses as-of elapsed time");
});

test("boundary tiers match coverage: daily 1993+, quarterly 1966+, annual before", () => {
  const c104 = periods.find((p) => p.congress === 104)!; // starts Jan 1995
  assert.equal(c104.startMethod, "treasury-daily");
  assert.ok(c104.startAsOf >= "1994-12-28" && c104.startAsOf <= "1995-01-03", `exact boundary, got ${c104.startAsOf}`);
  const c91 = periods.find((p) => p.congress === 91)!; // starts Jan 1969
  assert.equal(c91.startMethod, "quarterly");
  const c37 = periods.find((p) => p.congress === 37 && p.president === "Abraham Lincoln")!;
  assert.equal(c37.startMethod, "annual");
  // Only the 1st Congress may use the series-start anchor.
  for (const p of periods.filter((x) => x.startMethod === "series-start")) assert.equal(p.congress, 1);
});

test("classification anchors match history", () => {
  const check = (congress: number, president: string, expected: string) => {
    const p = periods.find((x) => x.congress === congress && x.president === president)!;
    assert.equal(p.classification, expected, `${congress}th under ${president}`);
  };
  check(104, "Bill Clinton", "Divided government");
  check(108, "George W. Bush", "Unified government");
  check(112, "Barack Obama", "Split Congress");
  check(117, "Joe Biden", "Unified government");
  check(119, "Donald Trump", "Unified government");
});

test("real values are base-year labeled and null before CPI coverage", () => {
  for (const p of periods) {
    assert.equal(p.baseYear, 2025);
    if (p.endAsOf < "1913-01-01") assert.equal(p.increaseReal, null, `${p.congress}th must have null real increase`);
    if (p.startAsOf >= "1913-01-01") assert.ok(p.increaseReal !== null, `${p.congress}th should have real values`);
  }
});

test("leadership names exist exactly from the 89th Congress onward", () => {
  for (const p of periods) {
    if ((p.congress ?? 0) >= 89) assert.ok(p.speaker && p.senateLeader, `${p.congress}th missing leadership`);
    else assert.ok(!("speaker" in p) || p.speaker === undefined, `${p.congress}th must not fabricate leadership`);
  }
  assert.equal(periods.find((p) => p.congress === 101)!.speaker, "Jim Wright / Tom Foley");
});

test("seat strings are present for every congress", () => {
  for (const p of periods) {
    assert.ok(p.houseSeats.length > 0 && p.senateSeats.length > 0, `${p.congress}th missing seats`);
  }
});
