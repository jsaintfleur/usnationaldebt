import FiscalChart from "@/components/FiscalChart";
import { timelineData } from "@/lib/timeline-data";
import { BASE_YEAR } from "@/lib/inflation";

export default function Page() {
  const data = timelineData();
  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">Historical timeline · 1790–present</div>
        <h1>236 years of fiscal history, one canvas.</h1>
        <p>
          Every observation is an official Treasury record — annual fiscal-year balances from 1790, quarterly from 1966,
          daily from 1993 (the chart upgrades resolution automatically as you zoom). Hover anywhere to see the debt, the
          President, chamber control, unified/divided status, and active wars, crises, and fiscal legislation. Overlays
          are independently toggleable; recession shading is NBER. Political context is descriptive — it does not
          establish causation.
        </p>
      </header>
      <div className="panel">
        <FiscalChart
          primary={{ label: "Total public debt", points: data.debtCoarse }}
          daily={data.debtDaily}
          baseYear={BASE_YEAR}
          overlays={[
            { id: "d2g", label: "Debt-to-GDP (right axis)", unit: "pct", color: "#15846d", points: data.overlays.debtToGdp },
            { id: "deficit", label: "Annual surplus/deficit", unit: "usd", color: "#a87719", points: data.overlays.deficit },
            { id: "gdp", label: "Nominal GDP", unit: "usd", color: "#8065c9", points: data.overlays.gdp },
            { id: "infl", label: "CPI inflation YoY (right axis)", unit: "pct", color: "#c9564a", points: data.overlays.inflation },
            { id: "gs10", label: "10-year Treasury yield (right axis)", unit: "pct", color: "#21a4be", points: data.overlays.treasury10y },
          ]}
          recessions={data.recessions}
          control={data.control}
          events={data.events}
          tiers={data.tiers}
          height={520}
          exportName="us-debt-timeline"
        />
      </div>
      <div className="grid4">
        <div className="card"><label>Coverage</label><strong>1790–present</strong><small>Treasury Historical Debt Outstanding; earliest federal record ($71.06M in 1790)</small></div>
        <div className="card"><label>Data quality</label><strong>3 tiers</strong><small>Annual → quarterly (1966) → daily (1993); pre-1843 records predate standardized fiscal years</small></div>
        <div className="card"><label>Real dollars</label><strong>{BASE_YEAR} prices</strong><small>CPI-U begins 1913; earlier real values shown as unavailable, never fabricated</small></div>
        <div className="card"><label>Political context</label><strong>1st–119th Congress</strong><small>Presidency, House, and Senate control strips; descriptive only</small></div>
      </div>
      <div className="notice">
        Overlay coverage differs by source: GDP from 1929 (BEA), deficits from 1901 (OMB), CPI inflation from 1914 (BLS),
        10-year Treasury yield from 1953 (Federal Reserve), recessions from 1854 (NBER). Debt-to-GDP therefore begins in
        1929 — earlier ratios would require non-government GDP reconstructions, which DebtScope does not present as data.
      </div>
    </main>
  );
}
