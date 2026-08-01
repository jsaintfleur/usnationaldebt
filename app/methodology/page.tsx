import { evaluation } from "@/lib/data";
import { BASE_YEAR } from "@/lib/inflation";

export default function Page() {
  const ev = evaluation();
  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">Data & methodology</div>
        <h1>Every number needs a lineage.</h1>
        <p>Definitions, transformation rules, refresh status, and limitations are part of the product—not footnotes.</p>
      </header>

      <div className="panel">
        <h2>Source registry</h2>
        <div className="sourceRow"><b>Debt to the Penny</b><span>U.S. Treasury Fiscal Data</span><span>Daily · 1993–present · snapshot + exact transition balances</span></div>
        <div className="sourceRow"><b>Federal Debt: Total Public Debt (GFDEBTN)</b><span>U.S. Treasury via FRED</span><span>Quarterly · 1966–present · comparable history & forecast target</span></div>
        <div className="sourceRow"><b>CPI-U (CPIAUCSL)</b><span>BLS via FRED</span><span>Monthly · nominal→real conversion, base year {BASE_YEAR}</span></div>
        <div className="sourceRow"><b>Gross Domestic Product (GDP)</b><span>BEA via FRED</span><span>Quarterly · debt-to-GDP & scenario baseline</span></div>
        <div className="sourceRow"><b>Population (POPTHM)</b><span>Census/BEA via FRED</span><span>Monthly · per-resident figures</span></div>
        <div className="sourceRow"><b>Federal receipts & net outlays (FYFR, FYONET)</b><span>OMB via FRED</span><span>Annual fiscal year · scenario starting conditions</span></div>
      </div>

      <div className="panel">
        <h2>Dating convention</h2>
        <p>
          FRED dates end-of-period quarterly series by the first day of the quarter, so a row dated January 1 is the
          March 31 balance. DebtScope re-dates every observation to its true quarter-end as-of date before any
          calculation — administration boundaries, inflation adjustment, and forecast evaluation all use real as-of dates.
        </p>
        <h2>Transition attribution</h2>
        <p>
          From 2001 onward, administration boundary values are the exact Treasury daily balance on the last business day
          on or before the transition. Earlier boundaries use the quarter-end observation immediately preceding the
          transition, and are labeled as proxies. The comparable series begins in 1966, so administrations that started
          earlier are excluded rather than silently backfilled. Rate metrics (CAGR, per-day averages) use the elapsed time
          between the two observation dates actually used, so partial terms are not diluted by publication lag. Presidents
          do not independently control debt: Congress authorizes taxation and spending, and inherited statutes, economic
          conditions, emergencies, and interest obligations shape every period.
        </p>
        <h2>Nominal and real dollars</h2>
        <p>
          Nominal dollars are amounts as reported at the time. Real dollars restate purchasing power in {BASE_YEAR} prices
          using the BLS Consumer Price Index for All Urban Consumers (CPI-U, series CPIAUCSL):
          real&nbsp;=&nbsp;nominal&nbsp;×&nbsp;(base-year average CPI ÷ CPI at the observation month). CPI-U is used because it is
          the most widely recognized household purchasing-power index; the GDP price index or PCE deflator would produce
          modestly different levels (typically a few percent over long spans) but the same qualitative rankings. The base
          year is the latest calendar year with a complete CPI record and changes only deliberately, never silently.
          Debt-to-GDP needs no separate inflation adjustment: nominal debt is divided by nominal GDP from the same period,
          so the price level cancels.
        </p>
        <h2>Forecasting and validation</h2>
        <p>
          The forecast target is nominal total public debt (quarterly). Eight candidate models — including three naive
          baselines — are evaluated by rolling-origin walk-forward validation: at each of {ev.origins} historical origins the
          model is refitted on data available up to that origin only, and scored out-of-sample at 1-quarter, 1-year, and
          5-year horizons (MAE, RMSE, MAPE, sMAPE, MASE, bias). The production model is the lowest mean MASE across the
          1-year and 5-year horizons and must not lose to the best naive baseline. Displayed ranges are the empirical
          10th–90th percentile of out-of-sample annualized-growth errors, calibrated on the first half of origins and
          coverage-checked on the second half — evidence-based ranges, not formal Bayesian prediction intervals, and not
          official projections. Because the target is nominal, forecasts embed historical price-level behavior and should
          not be read as purchasing-power statements.
        </p>
        <h2>Scenario engine</h2>
        <p>
          The Scenario Lab is a deterministic annual cash-flow identity, clearly distinct from the validated forecast
          models: interest = average rate × start-of-year debt; total outlays = primary outlays + interest (the baseline
          outlay total is split once, so interest is never double-counted); deficit = outlays − receipts; surpluses reduce
          debt. Users set real growth rates plus inflation; nominal paths compound both, and real outputs are restated in
          {" "}{BASE_YEAR} dollars. Starting conditions come from committed Treasury, BEA, OMB, and Census snapshots — nothing
          is hard-coded.
        </p>
        <h2>Validation & revision policy</h2>
        <p>
          Automated checks reject duplicate or non-increasing dates, invalid numbers, short coverage, component
          mismatches, missing CPI months for the base year, and misaligned index frequencies. Official upstream revisions
          are accepted on refresh, validated, and reviewed in source control; snapshot commits make every change auditable.
        </p>
      </div>
    </main>
  );
}
