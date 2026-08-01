import HistoryExplorer from "@/components/HistoryExplorer";
import { history } from "@/lib/data";
import { toReal, BASE_YEAR } from "@/lib/inflation";

export default function Page() {
  const points = history().map((x) => ({ date: x.date, nominal: x.debt, real: toReal(x.debt, x.date) }));
  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">Historical explorer</div>
        <h1>Six decades of fiscal history.</h1>
        <p>
          Quarter-end total public debt, shown in nominal dollars, in inflation-adjusted {BASE_YEAR} dollars (BLS CPI-U),
          or as an index. Daily observations are available from Treasury from April 1993 onward via the API.
        </p>
      </header>
      <HistoryExplorer points={points} baseYear={BASE_YEAR} />
    </main>
  );
}
