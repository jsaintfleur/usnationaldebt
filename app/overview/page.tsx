import Snapshot from "@/components/Snapshot";
import LineChart from "@/components/LineChart";
import { history, latest } from "@/lib/data";
import { money } from "@/lib/format";
import { adjustSeries } from "@/lib/real";

export default function Page() {
  const observations = history();
  const current = latest();
  const recent = observations.slice(-120);
  const real = adjustSeries(recent);
  const prior = observations.findLast((point) => point.date <= `${Number(current.date.slice(0, 4)) - 1}-${current.date.slice(5)}`);
  const yoy = prior ? (current.total / prior.debt - 1) * 100 : 0;
  return <main className="wrap"><header className="pageHead"><div className="eyebrow">National overview</div><h1>America’s balance sheet, in focus.</h1><p>Latest observed debt and its longer historical trajectory. All amounts are nominal unless marked otherwise.</p></header><Snapshot/><div className="panel" style={{marginTop:22}}><div className="panelHeader chartNarrative"><div><h2>How quickly is debt growing?</h2><p>Choose a time window to see the level, cumulative change, annualized growth, inflation-adjusted change, and daily pace.</p></div><span className="pill">Quarterly · observed</span></div><LineChart intervalControls values={recent.map((point) => point.debt)} realValues={real.map((point) => point.debt)} labels={recent.map((point) => point.date.slice(0, 7))} dates={recent.map((point) => point.date)} xLabel="Quarter-end observation" yLabel="Total public debt · nominal USD"/></div><div className="grid4"><div className="card"><label>Year-over-year</label><strong>{yoy.toFixed(1)}%</strong><small>Approx. aligned prior observation</small></div><div className="card"><label>Per resident</label><strong>{money(current.total/342_000_000)}</strong><small>Using 342.0M planning estimate</small></div><div className="card"><label>Coverage</label><strong>1966–present</strong><small>Comparable quarterly series</small></div><div className="card"><label>Lineage</label><strong>Treasury</strong><small>Distributed through Fiscal Data & FRED</small></div></div></main>;
}
