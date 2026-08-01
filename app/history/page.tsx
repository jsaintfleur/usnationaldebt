import LineChart from "@/components/LineChart";
import { history } from "@/lib/data";
import { money } from "@/lib/format";
import { adjustSeries } from "@/lib/real";

export default function Page() {
  const observations = history();
  const real = adjustSeries(observations);
  const markers = [["2008-09", "Financial crisis"], ["2020-03", "Pandemic"]].map(([date, label]) => ({ index: observations.findIndex((point) => point.date >= date), label }));
  return <main className="wrap">
    <header className="pageHead"><div className="eyebrow">Historical explorer</div><h1>Six decades of fiscal history.</h1><p>Quarter-end total public debt. Controls only offer observation frequencies supported by the selected window.</p></header>
    <div className="panel"><div className="panelHeader chartNarrative"><div><h2>How did the national debt evolve?</h2><p>Select a window and resolution to distinguish long-run growth from shorter fiscal shifts.</p></div><span className="pill">Nominal USD · linear</span></div><LineChart intervalControls values={observations.map((point) => point.debt)} realValues={real.map((point) => point.debt)} labels={observations.map((point) => point.date.slice(0, 7))} dates={observations.map((point) => point.date)} xLabel="Calendar year" yLabel="Total public debt · nominal USD" markers={markers}/></div>
    <div className="panel tableWrap"><table><thead><tr><th>Date</th><th>Total public debt</th><th>Frequency</th><th>Source</th></tr></thead><tbody>{observations.slice(-20).reverse().map((point) => <tr key={point.date}><td>{point.date}</td><td>{money(point.debt)}</td><td>Quarterly, end period</td><td>U.S. Treasury / FRED</td></tr>)}</tbody></table></div>
  </main>;
}
