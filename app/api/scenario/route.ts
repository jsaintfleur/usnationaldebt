import { NextRequest, NextResponse } from "next/server";
import { runScenario, defaultsFor } from "@/lib/scenario";
import { scenarioBaseline } from "@/lib/baseline";

export function GET(r: NextRequest) {
  const q = r.nextUrl.searchParams;
  const num = (key: string, fallback: number) => {
    const v = Number(q.get(key) ?? fallback);
    return Number.isFinite(v) ? v : fallback;
  };
  const baseline = scenarioBaseline();
  const defaults = defaultsFor(baseline);
  const input = {
    years: Math.min(20, Math.max(1, num("years", defaults.years))),
    realRevenueGrowthPct: Math.min(10, Math.max(-5, num("realRevenueGrowth", defaults.realRevenueGrowthPct))),
    realSpendingGrowthPct: Math.min(10, Math.max(-5, num("realSpendingGrowth", defaults.realSpendingGrowthPct))),
    realGdpGrowthPct: Math.min(8, Math.max(-3, num("realGdpGrowth", defaults.realGdpGrowthPct))),
    inflationPct: Math.min(10, Math.max(-2, num("inflation", defaults.inflationPct))),
    avgInterestRatePct: Math.min(10, Math.max(0, num("interestRate", defaults.avgInterestRatePct))),
  };
  return NextResponse.json({
    data: runScenario(baseline, input),
    meta: {
      official: false,
      kind: "user-scenario",
      engine: "deterministic annual cash-flow identity (not machine learning)",
      anchoring:
        "all baseline quantities share the last complete fiscal-year vintage; the latest daily debt is context only and is not simulated",
      baseline,
      input,
      units: { debt: "nominal USD", debtReal: `USD in ${baseline.baseYear} prices`, year: "fiscal year" },
      warning: "Analytical estimate driven entirely by user assumptions; not an official projection.",
    },
  });
}
