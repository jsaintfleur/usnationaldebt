import ScenarioLab from "@/components/ScenarioLab";
import { scenarioBaseline } from "@/lib/baseline";
import { forecast } from "@/lib/data";

export default function Page() {
  const baseline = scenarioBaseline();
  const baselinePath = forecast(undefined, 21).map((p) => ({ year: p.year, value: p.value }));
  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">Scenario laboratory</div>
        <h1>Stress the fiscal trajectory.</h1>
        <p>
          A deterministic fiscal calculator — not machine learning. Adjust real growth, inflation, and interest-rate
          assumptions to see their directional effect on nominal debt, real {baseline.baseYear}-dollar debt, debt-to-GDP,
          and per-resident burden. The simulation runs in fiscal years from the last complete fiscal-year baseline.
          Scenario outputs depend entirely on your assumptions and are not official projections.
        </p>
      </header>
      <ScenarioLab baseline={baseline} baselinePath={baselinePath} />
    </main>
  );
}
