import Snapshot from "@/components/Snapshot";
import LineChart from "@/components/LineChart";
import { history, latest } from "@/lib/data";
import { toReal, BASE_YEAR } from "@/lib/inflation";
import { gdpAt, populationAt } from "@/lib/macro";
import { money } from "@/lib/format";

export default function Page() {
  const h = history();
  const l = latest();
  const prior = h.findLast((x) => x.date <= `${Number(l.date.slice(0, 4)) - 1}-${l.date.slice(5)}`);
  const yoy = prior ? (l.total / prior.debt - 1) * 100 : 0;
  const pop = populationAt(l.date);
  const gdp = gdpAt(l.date);
  const realTotal = toReal(l.total, l.date);

  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">National overview</div>
        <h1>America&rsquo;s balance sheet, in focus.</h1>
        <p>Latest observed debt and its longer historical trajectory. All amounts are nominal unless labeled as {BASE_YEAR} dollars.</p>
      </header>
      <Snapshot />
      <div className="panel" style={{ marginTop: 22 }}>
        <div className="panelHeader">
          <h2>Debt trajectory</h2>
          <span className="pill">Quarterly · observed · nominal</span>
        </div>
        <LineChart values={h.slice(-120).map((x) => x.debt)} />
      </div>
      <div className="grid4">
        <div className="card">
          <label>Year-over-year</label>
          <strong>{yoy.toFixed(1)}%</strong>
          <small>Nominal · approx. aligned prior observation</small>
        </div>
        <div className="card">
          <label>Per resident</label>
          <strong>{money(l.total / pop.value)}</strong>
          <small>Nominal · Census population {(pop.value / 1e6).toFixed(1)}M as of {pop.date.slice(0, 7)}</small>
        </div>
        <div className="card">
          <label>In {BASE_YEAR} dollars</label>
          <strong>{money(realTotal)}</strong>
          <small>Total debt, CPI-U adjusted to {BASE_YEAR} prices</small>
        </div>
        <div className="card">
          <label>Debt / GDP</label>
          <strong>{gdp ? ((l.total / gdp.value) * 100).toFixed(0) : "—"}%</strong>
          <small>vs BEA nominal GDP, quarter of {gdp?.date.slice(0, 7)}</small>
        </div>
      </div>
    </main>
  );
}
