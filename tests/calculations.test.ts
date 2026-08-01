import test from "node:test";
import assert from "node:assert/strict";
import { nearestPrior, summarize, forecast, forecastMeta, history, latest, evaluation, administrations } from "../lib/data";

test("transition uses the nearest prior observation", () => {
  const p = [
    { date: "2020-01-01", debt: 10 },
    { date: "2020-04-01", debt: 12 },
  ];
  assert.equal(nearestPrior(p, "2020-03-01")?.debt, 10);
});

test("nearestPrior returns null before coverage instead of a silent fallback", () => {
  const p = [{ date: "1966-03-31", debt: 10 }];
  assert.equal(nearestPrior(p, "1963-11-22"), null);
});

test("no administration predates series coverage", () => {
  const first = history()[0].date;
  for (const a of summarize()) {
    assert.ok(a.startAsOf >= first, `${a.president} start ${a.startAsOf} predates coverage ${first}`);
  }
  // Johnson (1963 start) must be excluded, Nixon must be present.
  assert.ok(!administrations.some((a) => a.start < "1966-01-01"));
  assert.ok(administrations.some((a) => a.president === "Richard Nixon"));
});

test("administration calculations reconcile in nominal and real terms", () => {
  for (const a of summarize()) {
    assert.ok(Math.abs(a.startDebt + a.increase - a.endDebt) < 1);
    assert.ok(Math.abs(a.startDebtReal + a.increaseReal - a.endDebtReal) < 1);
    assert.ok(Number.isFinite(a.cagr) && Number.isFinite(a.cagrReal));
    assert.ok(a.endDebt > 0 && a.endDebtReal > 0);
    assert.equal(a.baseYear, 2025);
  }
});

test("post-2001 transitions use exact Treasury daily balances", () => {
  const rows = summarize();
  const obama = rows.find((r) => r.president === "Barack Obama");
  assert.ok(obama);
  assert.equal(obama.startMethod, "treasury-daily");
  // Known inauguration-day balance: ≈ $10.627T on 2009-01-20, far from the $11.13T quarter proxy.
  assert.ok(Math.abs(obama.startDebt - 10_626_877_048_913) < 1e9);
  const reagan = rows.find((r) => r.president === "Ronald Reagan");
  assert.equal(reagan?.startMethod, "quarter-end-proxy");
});

test("partial-term rate metrics use observation dates, not today", () => {
  const current = summarize().find((r) => r.partial);
  assert.ok(current);
  // End as-of must be the final quarterly observation, and elapsed days must match it.
  const last = history().at(-1)!;
  assert.equal(current.endAsOf, last.date);
});

test("real values are labeled and economically sensible", () => {
  const rows = summarize();
  const nixon = rows.find((r) => r.president === "Richard Nixon")!;
  // 1970s debt is worth several times more in 2025 dollars.
  assert.ok(nixon.startDebtReal > nixon.startDebt * 3);
  // Recent debt barely changes when restated in 2025 dollars.
  const biden = rows.find((r) => r.president === "Joe Biden")!;
  assert.ok(Math.abs(biden.endDebtReal / biden.endDebt - 1) < 0.1);
});

test("forecast bands contain midpoint and carry evaluation metadata", () => {
  const f = forecast();
  for (const x of f) {
    assert.ok(x.low <= x.value + 1e-6);
    assert.ok(x.high >= x.value - 1e-6);
  }
  assert.equal(f[0].kind, "observed");
  assert.equal(f[1].kind, "model");
  const meta = forecastMeta();
  assert.ok(meta.modelVersion.startsWith("wf-"));
  assert.ok(meta.dataThrough >= "2026-01-01");
  assert.equal(meta.official, false);
});

test("production model beat the best naive baseline out-of-sample", () => {
  const ev = evaluation();
  const score = (id: string) => {
    const m = ev.models.find((x) => x.id === id)!;
    return (m.metrics["4"].mase + m.metrics["20"].mase) / 2;
  };
  const bestBaseline = Math.min(...ev.models.filter((m) => m.role === "baseline").map((m) => score(m.id)));
  assert.ok(score(ev.production.id) <= bestBaseline, "production model must not lose to naive baselines");
  assert.ok(ev.origins > 50, "evaluation must cover a substantial number of origins");
});

test("official snapshot components reconcile", () => {
  const x = latest();
  assert.ok(Math.abs(x.publicDebt + x.intragov - x.total) < 1);
});

test("historical dates are unique, ordered, and re-dated to quarter ends", () => {
  const h = history();
  assert.equal(new Set(h.map((x) => x.date)).size, h.length);
  assert.deepEqual([...h].sort((a, b) => a.date.localeCompare(b.date)), h);
  // FRED's 1966-01-01 row is the Q1 1966 end-of-period balance.
  assert.equal(h[0].date, "1966-03-31");
  for (const p of h) assert.match(p.date, /-(03-31|06-30|09-30|12-31)$/);
});
