import LineChart from "@/components/LineChart";
import { forecast, forecastMeta, evaluation } from "@/lib/data";
import { money } from "@/lib/format";

export default function Page() {
  const f = forecast();
  const meta = forecastMeta();
  const ev = evaluation();
  const horizonLabel: Record<string, string> = { "1": "1 quarter", "4": "1 year", "20": "5 years" };

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
          <LineChart values={f.map((x) => x.value)} />
          <div className="notice">
            Historical values end at year zero ({meta.dataThrough}). Every later value is a model estimate — not observed
            data and not a CBO projection. Longer horizons are substantially less certain.
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
    </main>
  );
}
