import test from "node:test";import assert from "node:assert/strict";import {nearestPrior,summarize,forecast,history,latest} from "../lib/data";
test("transition uses the nearest prior observation",()=>{const p=[{date:"2020-01-01",debt:10},{date:"2020-04-01",debt:12}];assert.equal(nearestPrior(p,"2020-03-01").debt,10)});
test("administration calculations reconcile",()=>{for(const a of summarize()){assert.ok(Math.abs(a.startDebt+a.increase-a.endDebt)<1);assert.ok(Number.isFinite(a.cagr));assert.ok(a.endDebt>0)}});
test("forecast bands contain midpoint",()=>{for(const x of forecast()){assert.ok(x.low<=x.value);assert.ok(x.high>=x.value)}});
test("official snapshot components reconcile",()=>{const x=latest();assert.ok(Math.abs(x.publicDebt+x.intragov-x.total)<1)});
test("historical dates are unique and ordered",()=>{const h=history();assert.equal(new Set(h.map(x=>x.date)).size,h.length);assert.deepEqual([...h].sort((a,b)=>a.date.localeCompare(b.date)),h)});
