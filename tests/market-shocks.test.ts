import assert from "node:assert/strict";
import test from "node:test";
import { majorMarketShocks, shockDurationDays } from "../lib/market-shocks";

test("major shock windows are valid, ordered, and uniquely identified", () => {
  assert.equal(new Set(majorMarketShocks.map((shock) => shock.id)).size, majorMarketShocks.length);
  for (const shock of majorMarketShocks) {
    assert.ok(Number.isFinite(Date.parse(shock.start)));
    assert.ok(Number.isFinite(Date.parse(shock.end)));
    assert.ok(Date.parse(shock.start) <= Date.parse(shock.end));
    assert.ok(shockDurationDays(shock) >= 1);
  }
});

test("single-day shocks retain a one-day duration", () => {
  const blackMonday = majorMarketShocks.find((shock) => shock.id === "black-monday");
  assert.ok(blackMonday);
  assert.equal(shockDurationDays(blackMonday), 1);
});
