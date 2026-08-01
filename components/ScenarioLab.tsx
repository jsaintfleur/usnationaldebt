"use client";
import { useState } from "react";
import { money, pct } from "@/lib/format";
import { runScenario, defaultsFor, type ScenarioBaseline } from "@/lib/scenario";
import FiscalChart from "./FiscalChart";

/**
 * Client Scenario Lab. All starting conditions arrive as props from committed
 * authoritative snapshots, anchored at the last complete fiscal year (see
 * lib/baseline.ts); the engine is the same pure module the /api/scenario route
 * uses, so the two can never drift. `baselinePath` is the production
 * walk-forward model's nominal debt path as {year, value} pairs, matched to
 * the scenario's end year by label.
 */
export default function ScenarioLab({ baseline, baselinePath }: { baseline: ScenarioBaseline; baselinePath: Array<{ year: number; value: number }> }) {
  const defaults = defaultsFor(baseline);
  const [input, setInput] = useState(defaults);
  const result = runScenario(baseline, input);
  const end = result[result.length - 1];
  const anchorReal = (baseline.debt * baseline.cpiBase) / baseline.cpiAnchor;
  const points = [
    { d: baseline.fiscalYearEnd, v: baseline.debt, r: anchorReal },
    ...result.map((r) => ({ d: `${r.year}-09-30`, v: r.debt, r: r.debtReal })),
  ];
  const modelAtEnd = baselinePath.find((p) => p.year === end.year) ?? baselinePath[baselinePath.length - 1];

  const sliders: Array<{ key: keyof typeof input; label: string; min: number; max: number; step: number; unit: string }> = [
    { key: "realSpendingGrowthPct", label: "Real primary-spending growth", min: -2, max: 6, step: 0.1, unit: "%" },
    { key: "realRevenueGrowthPct", label: "Real revenue growth", min: -2, max: 6, step: 0.1, unit: "%" },
    { key: "realGdpGrowthPct", label: "Real GDP growth", min: -1, max: 5, step: 0.1, unit: "%" },
    { key: "inflationPct", label: "Inflation (CPI)", min: -2, max: 8, step: 0.1, unit: "%" },
    { key: "avgInterestRatePct", label: "Average interest rate on debt", min: 0, max: 8, step: 0.1, unit: "%" },
    { key: "years", label: "Horizon", min: 1, max: 20, step: 1, unit: " fiscal years" },
  ];

  return (
    <div className="forecastGrid">
      <div className="panel">
        <div className="panelHeader">
          <h2>Scenario trajectory</h2>
          <span className="pill">Deterministic calculator · user-created</span>
        </div>
        <FiscalChart
          primary={{ label: "Scenario debt path", points, color: "#a87719" }}
          baseYear={baseline.baseYear}
          showControlStrips={false}
          showWindowStats
          height={330}
          exportName="debtscope-scenario"
        />
        <div className="grid4">
          <div className="card">
            <label>End debt · FY{end.year}</label>
            <strong>{money(end.debt)}</strong>
            <small>{money(end.debtReal)} in {baseline.baseYear} dollars</small>
          </div>
          <div className="card">
            <label>Debt / GDP</label>
            <strong>{end.debtToGdp.toFixed(0)}%</strong>
            <small>Same-period nominal ratio</small>
          </div>
          <div className="card">
            <label>Per resident</label>
            <strong>{money(end.perCapita)}</strong>
            <small>{money(end.perCapitaReal)} in {baseline.baseYear} dollars</small>
          </div>
          <div className="card">
            <label>vs model baseline</label>
            <strong>{money(end.debt - modelAtEnd.value)}</strong>
            <small>Against the walk-forward production forecast for {modelAtEnd.year} (nominal)</small>
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
        <button className="button" onClick={() => setInput(defaults)}>Reset assumptions</button>
        <div className="notice">
          Deterministic annual cash-flow identity — not machine learning. The simulation is anchored at the last complete
          fiscal year so every input shares one vintage: FY{baseline.fiscalYearEnd.slice(0, 4)} debt {money(baseline.debt)},
          receipts {money(baseline.receipts)}, outlays {money(baseline.outlays)} including {money(baseline.interest)} of
          actual net interest (OMB), GDP {money(baseline.gdp)}, population {(baseline.population / 1e6).toFixed(1)}M growing
          {" "}{pct(baseline.populationGrowth * 100)}/yr (trailing Census trend). The first simulated year is
          FY{Number(baseline.fiscalYearEnd.slice(0, 4)) + 1}, much of which has already occurred — actual debt was
          {" "}{money(baseline.debtToday)} on {baseline.debtTodayAsOf}. The interest slider defaults to the observed effective
          net-interest rate ({pct(baseline.effectiveRatePct)}); a fully repaid debt floors at zero rather than going
          negative. Growth sliders are real rates; inflation (deflation allowed) forms nominal paths, and real outputs are
          stated in {baseline.baseYear} dollars. Excludes policy feedback, maturity structure, and recession dynamics.
          Outputs depend entirely on your assumptions and are not official projections.
        </div>
      </div>
    </div>
  );
}
