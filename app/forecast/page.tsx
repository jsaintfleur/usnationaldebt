import FiscalChart from "@/components/FiscalChart";
import { forecast, forecastMeta, evaluation, history, politicalEvaluation } from "@/lib/data";
import { BASE_YEAR } from "@/lib/inflation";
import { money } from "@/lib/format";

export default function Page() {
  const f = forecast();
  const meta = forecastMeta();
  const ev = evaluation();
  const horizonLabel: Record<string, string> = { "1": "1 quarter", "4": "1 year", "20": "5 years" };
  const pol = politicalEvaluation();
  // Chart data: 15 years of observed quarterly history, then the model path.
  const observed = history().slice(-60).map((p) => ({ d: p.date, v: p.debt }));
  const modelPts = f.filter((x) => x.kind === "model").map((x) => ({ d: `${x.year}-03-31`, v: x.value }));
  const anchor = observed[observed.length - 1];
  const bandLow = [{ d: anchor.d, v: anchor.v }, ...f.filter((x) => x.kind === "model").map((x) => ({ d: `${x.year}-03-31`, v: x.low }))];
  const bandHigh = [{ d: anchor.d, v: anchor.v }, ...f.filter((x) => x.kind === "model").map((x) => ({ d: `${x.year}-03-31`, v: x.high }))];

  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">Forecast center</div>
        <h1>Possible paths—not predictions carved in stone.</h1>
        <p>
          The production model is <b>{meta.modelName.toLowerCase()}</b>, selected by rolling-origin walk-forward validation
          against naive baselines ({ev.origins} historical forecast origins). The shaded range is the empirical 10th–90th
          percentile of out-of-sample growth errors — an evidence-based range, not a guarantee, and it widens with horizon.
          Forecasts target <b>nominal</b> debt and therefore embed assumptions about future price levels; they are not
          statements about purchasing power, and they are not official government projections.
        </p>
      </header>
      <div className="forecastGrid">
        <div className="panel">
          <div className="panelHeader">
            <h2>20-year trajectory</h2>
            <span className="pill">Model-generated · nominal dollars</span>
          </div>
          <FiscalChart
            primary={{ label: "Observed total public debt", points: observed }}
            baseYear={BASE_YEAR}
            overlays={[{ id: "model", label: "Model midpoint (dashed = forecast)", unit: "usd", color: "#15846d", points: modelPts, dash: true }]}
            defaultVisible={["model"]}
            band={{ low: bandLow, high: bandHigh, label: "empirical walk-forward range" }}
            showControlStrips={false}
            allowReal={false}
            height={380}
            exportName="us-debt-forecast"
          />
          <div className="notice">
            Solid line: observed Treasury data through {meta.dataThrough}. Dashed line and shaded range: model estimates —
            not observed data and not a CBO projection. Longer horizons are substantially less certain.
          </div>
        </div>
        <div className="panel">
          <h2>Horizon readout</h2>
          {[1, 5, 10, 20].map((i) => (
            <div className="card" style={{ marginTop: 14 }} key={i}>
              <label>{i}-year midpoint (nominal)</label>
              <strong>{money(f[i].value)}</strong>
              <small>{money(f[i].low)} – {money(f[i].high)} · empirical walk-forward range</small>
            </div>
          ))}
          <div className="metaFoot">
            Model {meta.modelId} · version {meta.modelVersion} · data through {meta.dataThrough} · evaluated {meta.evaluatedAt.slice(0, 10)} ·
            5-year interval holdout coverage {(meta.intervalCoverage.observed * 100).toFixed(0)}% (target {(meta.intervalCoverage.nominal * 100).toFixed(0)}%)
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panelHeader">
          <h2>Model comparison — out-of-sample</h2>
          <span className="pill">Rolling-origin walk-forward · {ev.origins} origins</span>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Model</th>
                <th>Role</th>
                {ev.horizonsQuarters.map((h) => (
                  <th key={h}>MASE · {horizonLabel[String(h)]}</th>
                ))}
                <th>MAPE · 5y</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...ev.models]
                .sort((a, b) => (a.metrics["20"]?.mase ?? 99) - (b.metrics["20"]?.mase ?? 99))
                .map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.role}</td>
                    {ev.horizonsQuarters.map((h) => (
                      <td key={h}>{m.metrics[String(h)]?.mase.toFixed(2) ?? "—"}</td>
                    ))}
                    <td>{m.metrics["20"]?.mape.toFixed(1) ?? "—"}%</td>
                    <td>{m.id === ev.production.id ? <b>Production</b> : "Evaluated"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <div className="notice">
          MASE scales each error by the typical historical quarter-to-quarter move at the forecast origin, so values are
          comparable across eras; lower is better, and long horizons naturally score far above 1. The production model is
          chosen by the lowest mean MASE across the 1-year and 5-year horizons and must not lose to the best naive
          baseline. Full metric table: <code>MODEL_COMPARISON.csv</code> in the repository.
        </div>
      </div>
      <div className="panel">
        <div className="panelHeader">
          <h2>Do political variables help forecast debt?</h2>
          <span className="pill">Evaluated, not assumed</span>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>Feature set</th><th>Out-of-sample years</th><th>MAE (log growth)</th><th>RMSE</th><th>vs last-growth naive</th></tr>
            </thead>
            <tbody>
              {[...pol.results].sort((a, b) => a.mae - b.mae).map((r) => (
                <tr key={r.featureSet}>
                  <td>{r.featureSet}{r.featureSet === pol.conclusion.bestFeatureSet ? " ★" : ""}</td>
                  <td>{r.n}</td>
                  <td>{r.mae.toFixed(4)}</td>
                  <td>{r.rmse.toFixed(4)}</td>
                  <td>{r.maeVsNaive.toFixed(2)}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="notice">
          {pol.conclusion.interpretation} {pol.conclusion.causalCaveat} Design: {pol.design}. Full table:
          {" "}<code>POLITICAL_MODEL_COMPARISON.csv</code>.
        </div>
      </div>
    </main>
  );
}
