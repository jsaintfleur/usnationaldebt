import AdminTable from "@/components/AdminTable";
import { summarize } from "@/lib/data";
import { BASE_YEAR } from "@/lib/inflation";

export default function Page() {
  const rows = summarize();
  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">Administration comparison</div>
        <h1>Fiscal change, with context.</h1>
        <p>
          Transitions from 2001 onward use exact Treasury daily balances; earlier transitions use the quarter-end
          observation immediately preceding the inauguration. Toggle between nominal dollars and inflation-adjusted
          {" "}{BASE_YEAR} dollars — sorting a metric is not a judgment of presidential performance.
        </p>
      </header>
      <div className="notice" style={{ marginBottom: 22 }}>
        Debt change spans decisions by Congress and administrations, inherited programs, automatic stabilizers, interest
        costs, wars, emergencies, and economic cycles. These figures describe periods; they do not establish causation.
        The comparable series begins in 1966, so administrations that started earlier (Lyndon B. Johnson and before) are
        not shown rather than being backfilled with later data.
      </div>
      <AdminTable rows={rows} />
    </main>
  );
}
