"use client";
import { useState } from "react";
import { money, pct } from "@/lib/format";
import type { AdminSummary } from "@/lib/types";

type SortKey = "chrono" | "increase" | "percent" | "cagr";

/**
 * Sortable administration comparison with a nominal / inflation-adjusted toggle.
 * Real values are CPI-U adjusted and always labeled with their base year.
 * Boundary markers: † exact Treasury daily balance, otherwise the quarter-end
 * observation immediately preceding the transition.
 */
export default function AdminTable({ rows }: { rows: AdminSummary[] }) {
  const [basis, setBasis] = useState<"nominal" | "real">("nominal");
  const [sort, setSort] = useState<SortKey>("chrono");
  const baseYear = rows[0]?.baseYear;
  const real = basis === "real";

  const val = (r: AdminSummary) => ({
    start: real ? r.startDebtReal : r.startDebt,
    end: real ? r.endDebtReal : r.endDebt,
    increase: real ? r.increaseReal : r.increase,
    percent: real ? r.percentReal : r.percent,
    cagr: real ? r.cagrReal : r.cagr,
    daily: real ? r.dailyReal : r.daily,
  });

  const sorted = [...rows];
  if (sort !== "chrono") sorted.sort((a, b) => val(b)[sort] - val(a)[sort]);
  else sorted.reverse();

  const exact = (m: string) => (m === "treasury-daily" ? "†" : "");

  return (
    <div className="panel tableWrap">
      <div className="toggleRow" role="tablist" aria-label="Dollar basis">
        <button role="tab" aria-selected={!real} className={!real ? "toggle active" : "toggle"} onClick={() => setBasis("nominal")}>Nominal dollars</button>
        <button role="tab" aria-selected={real} className={real ? "toggle active" : "toggle"} onClick={() => setBasis("real")}>Inflation-adjusted ({baseYear} dollars)</button>
        <span className="toggleNote">{real ? `All dollar figures below are in ${baseYear} prices (CPI-U).` : "All dollar figures below are nominal (as reported at the time)."}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th><button className="sortBtn" onClick={() => setSort("chrono")} aria-label="Sort chronologically">President{sort === "chrono" ? " ↓" : ""}</button></th>
            <th>Party</th>
            <th>Start debt</th>
            <th>End debt</th>
            <th><button className="sortBtn" onClick={() => setSort("increase")}>Increase{sort === "increase" ? " ↓" : ""}</button></th>
            <th><button className="sortBtn" onClick={() => setSort("percent")}>Change{sort === "percent" ? " ↓" : ""}</button></th>
            <th><button className="sortBtn" onClick={() => setSort("cagr")}>CAGR{sort === "cagr" ? " ↓" : ""}</button></th>
            <th>Avg/day</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((x) => {
            const v = val(x);
            return (
              <tr key={x.president}>
                <td><b>{x.president}</b>{x.partial ? " · partial term" : ""}</td>
                <td>{x.party}</td>
                <td>{money(v.start)}{exact(x.startMethod)}</td>
                <td>{money(v.end)}{exact(x.endMethod)}</td>
                <td>{money(v.increase)}</td>
                <td>{pct(v.percent)}</td>
                <td>{pct(v.cagr)}</td>
                <td>{money(v.daily)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="tableFoot">
        † exact Treasury daily balance on the last business day at the transition (available from 2001 onward). Other
        boundaries use the quarter-end observation immediately preceding the transition. Rate metrics use the elapsed time
        between the two observation dates actually used.{real ? ` Real values are stated in ${baseYear} dollars using the BLS CPI-U annual average.` : ""}
      </div>
    </div>
  );
}
