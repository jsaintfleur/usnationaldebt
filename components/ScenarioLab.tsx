"use client";
import { useState } from "react";
import { money } from "@/lib/format";
import { runScenario, SCENARIO_DEFAULTS, type ScenarioBaseline } from "@/lib/scenario";
import LineChart from "./LineChart";

/**
 * Client Scenario Lab. All starting conditions arrive as props from committed
 * authoritative snapshots (see lib/baseline.ts); the engine itself is the same
 * pure module the /api/scenario route uses, so the two can never drift.
 * `baselinePath` is the production walk-forward model's nominal debt path,
 * indexed by horizon year, used for the "vs model baseline" comparison.
 */
export default function ScenarioLab({ baseline, baselinePath }: { baseline: ScenarioBaseline; baselinePath: number[] }) {
  const [input, setInput] = useState(SCENARIO_DEFAULTS);
  const [view, setView] = useState<"nominal" | "real">("nominal");
  const result = runScenario(baseline, input);
  const end = result[result.length - 1];
  const series = view === "nominal" ? [baseline.debt, ...result.map((r) => r.debt)] : [(baseline.debt * baseline.cpiBase) / baseline.cpiLatest, ...result.map((r) => r.debtReal)];
  const modelBaseline = baselinePath[Math.min(input.years, baselinePath.length - 1)];

  const sliders: Array<{ key: keyof typeof input; label: string; min: number; max: number; step: number; unit: string }> = [
    { key: "realSpendingGrowthPct", label: "Real primary-spending growth", min: -2, max: 6, step: 0.1, unit: "%" },
    { key: "realRevenueGrowthPct", label: "Real revenue growth", min: -2, max: 6, step: 0.1, unit: "%" },
    { key: "realGdpGrowthPct", label: "Real GDP growth", min: -1, max: 5, step: 0.1, unit: "%" },
    { key: "inflationPct", label: "Inflation (CPI)", min: 0, max: 8, step: 0.1, unit: "%" },
    { key: "avgInterestRatePct", label: "Average interest rate on debt", min: 0, max: 8, step: 0.1, unit: "%" },
    { key: "years", label: "Horizon", min: 1, max: 20, step: 1, unit: " years" },
  ];

  return (
    <div className="forecastGrid">
      <div className="panel">
        <div className="panelHeader">
          <h2>Scenario trajectory</h2>
          <span className="pill">Deterministic calculator · user-created</span>
        </div>
        <div className="toggleRow" role="tablist" aria-label="Dollar basis">
          <button role="tab" aria-selected={view === "nominal"} className={view === "nominal" ? "toggle active" : "toggle"} onClick={() => setView("nominal")}>Nominal dollars</button>
          <button role="tab" aria-selected={view === "real"} className={view === "real" ? "toggle active" : "toggle"} onClick={() => setView("real")}>Real {baseline.baseYear} dollars</button>
        </div>
        <LineChart values={series} />
        <div className="grid4">
          <div className="card">
            <label>End debt ({view === "nominal" ? "nominal" : `${baseline.baseYear} $`})</label>
            <strong>{money(view === "nominal" ? end.debt : end.debtReal)}</strong>
            <small>{view === "nominal" ? `${money(end.debtReal)} in ${baseline.baseYear} dollars` : `${money(end.debt)} nominal`}</small>
          </div>
          <div className="card">
            <label>Debt / GDP</label>
            <strong>{end.debtToGdp.toFixed(0)}%</strong>
            <small>Same-period nominal ratio</small>
          </div>
          <div className="card">
            <label>Per resident</label>
            <strong>{money(view === "nominal" ? end.perCapita : end.perCapitaReal)}</strong>
            <small>{view === "nominal" ? "nominal" : `in ${baseline.baseYear} dollars`}</small>
          </div>
          <div className="card">
            <label>vs model baseline</label>
            <strong>{money(end.debt - modelBaseline)}</strong>
            <small>Against the walk-forward production forecast (nominal)</small>
          </div>
        </div>
      </div>
      <div className="panel controls">
        <h2>Assumptions</h2>
        {sliders.map((s) => (
          <div className="control" key={s.key}>
            <label>
              <span>{s.label}</span>
              <b>{input[s.key]}{s.unit}</b>
            </label>
            <input
              aria-label={s.label}
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={input[s.key]}
              onChange={(e) => setInput({ ...input, [s.key]: Number(e.target.value) })}
            />
          </div>
        ))}
        <button className="button" onClick={() => setInput(SCENARIO_DEFAULTS)}>Reset assumptions</button>
        <div className="notice">
          Deterministic annual cash-flow identity — not machine learning. Growth sliders are real rates; inflation is added to
          form nominal paths, and real outputs are stated in {baseline.baseYear} dollars. Starting conditions: Treasury debt
          {" "}{money(baseline.debt)} ({baseline.debtAsOf}), BEA GDP {money(baseline.gdp)}, FY receipts {money(baseline.receipts)} and
          outlays {money(baseline.outlays)} (fiscal year ending {baseline.fiscalYearEnd.slice(0, 10)}). Excludes policy feedback,
          maturity structure, and recession dynamics. Outputs depend entirely on your assumptions.
        </div>
      </div>
    </div>
  );
}
