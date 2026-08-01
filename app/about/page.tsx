export default function Page() {
  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">About</div>
        <h1>Fiscal intelligence without partisan scorekeeping.</h1>
        <p>DebtScope AI is an independent educational and analytical project designed for researchers, journalists, students, and policy professionals.</p>
      </header>
      <div className="panel">
        <h2>What &ldquo;AI&rdquo; means here</h2>
        <p>
          DebtScope&rsquo;s forecasts come from transparent statistical time-series models selected by rolling-origin
          walk-forward validation against naive baselines — not neural networks, and not a black box. The Scenario Lab is a
          deterministic fiscal calculator driven entirely by user assumptions. Every model, metric, and data source is
          documented in the repository, and the full out-of-sample comparison is published on the Forecast page.
        </p>
      </div>
      <div className="panel">
        <h2>Important disclaimer</h2>
        <p>
          DebtScope AI is not affiliated with the U.S. government. It does not provide investment, legal, accounting, tax,
          or government advice. Data can be revised and forecasts are estimates whose uncertainty grows with horizon.
          Presidential-period comparisons describe time windows and do not assign sole responsibility or causation —
          Congress, inherited budgets, economic conditions, and emergencies shape every period. Model forecasts and
          official government projections (such as CBO&rsquo;s) are different products; DebtScope displays only its own
          clearly labeled model output.
        </p>
      </div>
    </main>
  );
}
