import { NextRequest, NextResponse } from "next/server";
import { runScenario, SCENARIO_DEFAULTS } from "@/lib/scenario";
import { scenarioBaseline } from "@/lib/baseline";

export function GET(r: NextRequest) {
  const q = r.nextUrl.searchParams;
  const num = (key: string, fallback: number) => {
    const v = Number(q.get(key) ?? fallback);
    return Number.isFinite(v) ? v : fallback;
  };
  const baseline = scenarioBaseline();
  const input = {
    years: Math.min(20, Math.max(1, num("years", SCENARIO_DEFAULTS.years))),
    realRevenueGrowthPct: Math.min(10, Math.max(-5, num("realRevenueGrowth", SCENARIO_DEFAULTS.realRevenueGrowthPct))),
    realSpendingGrowthPct: Math.min(10, Math.max(-5, num("realSpendingGrowth", SCENARIO_DEFAULTS.realSpendingGrowthPct))),
    realGdpGrowthPct: Math.min(8, Math.max(-3, num("realGdpGrowth", SCENARIO_DEFAULTS.realGdpGrowthPct))),
    inflationPct: Math.min(10, Math.max(0, num("inflation", SCENARIO_DEFAULTS.inflationPct))),
    avgInterestRatePct: Math.min(10, Math.max(0, num("interestRate", SCENARIO_DEFAULTS.avgInterestRatePct))),
  };
  return NextResponse.json({
    data: runScenario(baseline, input),
    meta: {
      official: false,
      kind: "user-scenario",
      engine: "deterministic annual cash-flow identity (not machine learning)",
      baseline,
      input,
      units: { debt: "nominal USD", debtReal: `USD in ${baseline.baseYear} prices` },
      warning: "Analytical estimate driven entirely by user assumptions; not an official projection.",
    },
  });
}
