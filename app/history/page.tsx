import FiscalChart from "@/components/FiscalChart";
import { timelineData } from "@/lib/timeline-data";
import { toRealMaybe, BASE_YEAR } from "@/lib/inflation";
import { history } from "@/lib/data";
import { money } from "@/lib/format";

export default function Page() {
  const data = timelineData();
  const recent = history().slice(-20).reverse();
  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">Historical explorer</div>
        <h1>Every federal debt record since 1790.</h1>
        <p>
          Annual Treasury records from 1790, quarterly from 1966, daily from 1993 — zoom in and the chart upgrades
          resolution automatically. Toggle nominal vs inflation-adjusted {BASE_YEAR} dollars and linear vs logarithmic
          scale (log makes early history readable across five orders of magnitude).
        </p>
      </header>
      <div className="panel">
        <FiscalChart
          primary={{ label: "Total public debt", points: data.debtCoarse }}
          daily={data.debtDaily}
          baseYear={BASE_YEAR}
          recessions={data.recessions}
          control={data.control}
          events={data.events}
          tiers={data.tiers}
          height={470}
          exportName="us-debt-history"
        />
      </div>
      <div className="panel tableWrap">
        <table>
          <thead>
            <tr><th>As of</th><th>Nominal</th><th>In {BASE_YEAR} dollars</th><th>Source</th></tr>
          </thead>
          <tbody>
            {recent.map((x) => {
              const real = toRealMaybe(x.debt, x.date);
              return (
                <tr key={x.date}>
                  <td>{x.date}</td>
                  <td>{money(x.debt)}</td>
                  <td>{real === null ? "—" : money(real)}</td>
                  <td>U.S. Treasury / FRED · BLS CPI-U</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
