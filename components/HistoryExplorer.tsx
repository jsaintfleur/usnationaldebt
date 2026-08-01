"use client";
import { useState } from "react";
import { money } from "@/lib/format";
import LineChart from "./LineChart";

type Point = { date: string; nominal: number; real: number };

/**
 * Historical chart with three bases: nominal dollars, inflation-adjusted dollars
 * (BASE_YEAR prices), and an indexed view (first shown observation = 100) that
 * makes growth comparable across eras. Real and indexed views always state the
 * base year so no adjusted figure ever appears unlabeled.
 */
export default function HistoryExplorer({ points, baseYear }: { points: Point[]; baseYear: number }) {
  const [view, setView] = useState<"nominal" | "real" | "indexed">("nominal");
  const values =
    view === "nominal"
      ? points.map((p) => p.nominal)
      : view === "real"
        ? points.map((p) => p.real)
        : points.map((p) => (p.real / points[0].real) * 100);
  const pill =
    view === "nominal" ? "Nominal USD" : view === "real" ? `Real USD · ${baseYear} prices` : `Index (start = 100, real ${baseYear} $)`;

  return (
    <>
      <div className="panel">
        <div className="panelHeader">
          <h2>Total public debt</h2>
          <span className="pill">{pill}</span>
        </div>
        <div className="toggleRow" role="tablist" aria-label="Chart basis">
          <button role="tab" aria-selected={view === "nominal"} className={view === "nominal" ? "toggle active" : "toggle"} onClick={() => setView("nominal")}>Nominal dollars</button>
          <button role="tab" aria-selected={view === "real"} className={view === "real" ? "toggle active" : "toggle"} onClick={() => setView("real")}>Real {baseYear} dollars</button>
          <button role="tab" aria-selected={view === "indexed"} className={view === "indexed" ? "toggle active" : "toggle"} onClick={() => setView("indexed")}>Indexed (100)</button>
        </div>
        <LineChart values={values} />
      </div>
      <div className="panel tableWrap">
        <table>
          <thead>
            <tr><th>As of</th><th>Nominal</th><th>In {baseYear} dollars</th><th>Source</th></tr>
          </thead>
          <tbody>
            {points.slice(-20).reverse().map((x) => (
              <tr key={x.date}>
                <td>{x.date}</td>
                <td>{money(x.nominal)}</td>
                <td>{money(x.real)}</td>
                <td>U.S. Treasury / FRED · BLS CPI-U</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
