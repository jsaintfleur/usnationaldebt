import AdminTable from "@/components/AdminTable";
import { summarize } from "@/lib/data";
import { BASE_YEAR } from "@/lib/inflation";

export default function Page() {
  const rows = summarize();
  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">Administration comparison · 1789–present</div>
        <h1>Fiscal change, with context.</h1>
        <p>
          Every presidency since Washington. Boundary values use the finest official record available — exact Treasury
          daily balances from 2001, quarter-end observations from 1966, annual fiscal-year-end records back to 1790 —
          and each value is marked with its provenance. Toggle between nominal dollars and inflation-adjusted
          {" "}{BASE_YEAR} dollars; sorting a metric is not a judgment of presidential performance.
        </p>
      </header>
      <div className="notice" style={{ marginBottom: 22 }}>
        Debt change spans decisions by Congress and administrations, inherited programs, automatic stabilizers, interest
        costs, wars, emergencies, and economic cycles. These figures describe periods; they do not establish causation.
        Early-era comparisons are additionally limited by coarser annual records and, before 1913, the absence of CPI
        data for inflation adjustment.
      </div>
      <AdminTable rows={rows} />
    </main>
  );
}
