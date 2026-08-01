"use client";
import { useState } from "react";
import { money, pct } from "@/lib/format";
import type { AdminSummary, BoundaryMethod } from "@/lib/types";

type SortKey = "chrono" | "increase" | "percent" | "cagr";

/**
 * Sortable administration comparison across all presidencies since 1789, with
 * a nominal / inflation-adjusted toggle. Real values exist only where CPI
 * coverage does (1913+); earlier rows show "—" rather than a fabricated
 * adjustment. Boundary markers: † exact Treasury daily balance, ‡ annual
 * fiscal-year-end record, § first available record (1790).
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
  if (sort !== "chrono") sorted.sort((a, b) => (val(b)[sort] ?? -Infinity) - (val(a)[sort] ?? -Infinity));
  else sorted.reverse();

  const mark = (m: BoundaryMethod) =>
    m === "treasury-daily" ? "†" : m === "annual-proxy" ? "‡" : m === "series-start-proxy" ? "§" : "";
  const fmt = (v: number | null, kind: "money" | "pct") =>
    v === null ? "—" : !Number.isFinite(v) ? "n/a" : kind === "money" ? money(v) : pct(v);

  return (
    <div className="panel tableWrap">
      <div className="toggleRow" role="tablist" aria-label="Dollar basis">
        <button role="tab" aria-selected={!real} className={!real ? "toggle active" : "toggle"} onClick={() => setBasis("nominal")}>Nominal dollars</button>
        <button role="tab" aria-selected={real} className={real ? "toggle active" : "toggle"} onClick={() => setBasis("real")}>Inflation-adjusted ({baseYear} dollars)</button>
        <span className="toggleNote">
          {real
            ? `All dollar figures below are in ${baseYear} prices (CPI-U). Values before 1913 predate CPI records and show —.`
            : "All dollar figures below are nominal (as reported at the time)."}
        </span>
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
              <tr key={x.start}>
                <td><b>{x.president}</b>{x.partial ? " · partial term" : ""}</td>
                <td>{x.party}</td>
                <td>{fmt(v.start, "money")}{mark(x.startMethod)}</td>
                <td>{fmt(v.end, "money")}{mark(x.endMethod)}</td>
                <td>{fmt(v.increase, "money")}</td>
                <td>{fmt(v.percent, "pct")}</td>
                <td>{fmt(v.cagr, "pct")}</td>
                <td>{fmt(v.daily, "money")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="tableFoot">
        † exact Treasury daily balance at the transition (available from 2001). ‡ preceding annual fiscal-year-end record
        (used before quarterly coverage begins in 1966). § first available record — Washington took office in 1789, one
        year before the earliest Treasury figure. Unmarked values use the quarter-end observation immediately preceding
        the transition. Rate metrics use elapsed time between the observation dates actually used; annual-proxy boundaries
        can differ from inauguration day by several months, so pre-1966 rate metrics are coarser.
        {real ? ` Real values are stated in ${baseYear} dollars using the BLS CPI-U.` : ""}
      </div>
    </div>
  );
}
