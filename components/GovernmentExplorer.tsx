"use client";
import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { partyColor } from "@/lib/parties";
import type { GovernmentPeriod } from "@/lib/government";
import type { TimelineEvent } from "@/lib/timeline-data";

/**
 * Interactive control-at-time explorer: four proportional timeline strips
 * (President / House / Senate / Government) across all 119 Congresses, with
 * era presets, control filtering, a nominal / real basis toggle where BOTH
 * dollar columns switch together (and state their basis), keyboard-accessible
 * hover cards, and the full attribution table with boundary provenance.
 */

const ERAS: Array<{ label: string; start: string }> = [
  { label: "All · 1789+", start: "1789-01-01" },
  { label: "Civil War+", start: "1861-01-01" },
  { label: "New Deal+", start: "1933-01-01" },
  { label: "Reagan+", start: "1981-01-01" },
  { label: "2001+", start: "2001-01-01" },
];

const mark = (m: GovernmentPeriod["startMethod"]) =>
  m === "treasury-daily" ? "†" : m === "annual" ? "‡" : m === "series-start" ? "§" : "";

export default function GovernmentExplorer({ periods, events }: { periods: GovernmentPeriod[]; events: TimelineEvent[] }) {
  const [basis, setBasis] = useState<"nominal" | "real">("nominal");
  const [era, setEra] = useState(ERAS[2].start);
  const [kind, setKind] = useState("All");
  const [tip, setTip] = useState<{ p: GovernmentPeriod; x: number; y: number } | null>(null);
  const baseYear = periods[0]?.baseYear;
  const real = basis === "real";

  const filtered = useMemo(
    () =>
      periods.filter(
        (p) => p.end > era && (kind === "All" || p.classification.toLowerCase().includes(kind.toLowerCase())),
      ),
    [periods, era, kind],
  );
  const totalDays = filtered.reduce((s, p) => s + p.days, 0);

  const show = (p: GovernmentPeriod, x: number, y: number) =>
    setTip({ p, x: Math.min((typeof window !== "undefined" ? window.innerWidth : 1200) - 320, x + 12), y: y + 14 });
  const activeEvents = (p: GovernmentPeriod) =>
    events.filter((e) => (e.end ? e.start < p.end && e.end > p.start : e.start >= p.start && e.start < p.end)).slice(0, 3);

  const rows: Array<{ label: string; text: (p: GovernmentPeriod) => string; color: (p: GovernmentPeriod) => string; striped?: (p: GovernmentPeriod) => boolean }> = [
    { label: "President", text: (p) => p.president, color: (p) => partyColor(p.party) },
    { label: "House", text: (p) => `H · ${p.house}`, color: (p) => partyColor(p.house) },
    { label: "Senate", text: (p) => `S · ${p.senate}`, color: (p) => partyColor(p.senate) },
    {
      label: "Government",
      text: (p) => (p.classification === "Unified government" ? "Unified" : p.classification === "Split Congress" ? "Split" : "Divided"),
      color: (p) => (p.classification === "Unified government" ? partyColor(p.party) : "#8a93a3"),
      striped: (p) => p.classification !== "Unified government",
    },
  ];

  const val = (p: GovernmentPeriod, field: "increase" | "annualized") =>
    real ? (field === "increase" ? p.increaseReal : p.annualizedReal) : p[field];
  const fmt = (v: number | null) => (v === null ? "—" : money(v));

  return (
    <>
      <div className="controlToolbar">
        <span className="fcGroup" role="tablist" aria-label="Dollar basis">
          <button role="tab" aria-selected={!real} className={!real ? "toggle active" : "toggle"} onClick={() => setBasis("nominal")}>Nominal</button>
          <button role="tab" aria-selected={real} className={real ? "toggle active" : "toggle"} onClick={() => setBasis("real")}>Real {baseYear} $</button>
        </span>
        <span className="fcGroup" aria-label="Era">
          {ERAS.map((e) => (
            <button key={e.start} className={era === e.start ? "toggle active" : "toggle"} onClick={() => setEra(e.start)}>{e.label}</button>
          ))}
        </span>
        <label className="fcCheck" style={{ gap: 8 }}>
          Control
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by control type">
            <option>All</option>
            <option>Unified</option>
            <option>Divided</option>
            <option>Split</option>
          </select>
        </label>
        <a className="toggle" href="/api/government-control">Download JSON</a>
      </div>
      <div className="politicalLegend">
        {["Democratic", "Republican", "Democratic-Republican", "Federalist", "Whig"].map((p) => (
          <span key={p}><i className="partyMark" style={{ background: partyColor(p) }} />{p}</span>
        ))}
        <span><i className="partyMark striped" />Striped = divided or split</span>
        <span>H / S text preserves color-blind readability</span>
      </div>
      <div className="timelineStack" aria-label="President, congressional, and institutional-control timeline">
        {rows.map((row) => (
          <div className="timelineRow" key={row.label}>
            <div className="timelineLabel">{row.label}</div>
            <div className="timelineSegments">
              {filtered.map((p) => {
                const w = (p.days / totalDays) * 100;
                return (
                  <div
                    key={`${row.label}-${p.congress}-${p.start}`}
                    className={`timelineSegment${row.striped?.(p) ? " striped" : ""}`}
                    style={{ width: `${w}%`, background: row.color(p) }}
                    tabIndex={0}
                    aria-label={`${row.label}: ${row.text(p)}, ${p.start.slice(0, 4)}–${p.end.slice(0, 4)}`}
                    onMouseMove={(e) => show(p, e.clientX, e.clientY)}
                    onMouseLeave={() => setTip(null)}
                    onFocus={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      show(p, r.left, r.bottom);
                    }}
                    onBlur={() => setTip(null)}
                  >
                    {w > 3.5 && <b>{row.text(p)}</b>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {tip && (
        <div className="govTooltip" style={{ left: tip.x, top: tip.y }}>
          <b>{tip.p.president} · {tip.p.congress}th Congress</b>
          <dl>
            <dt>President</dt><dd>{tip.p.party}</dd>
            <dt>House</dt><dd>{tip.p.house}{tip.p.houseSeats ? ` (${tip.p.houseSeats})` : ""}</dd>
            <dt>Senate</dt><dd>{tip.p.senate}{tip.p.senateSeats ? ` (${tip.p.senateSeats})` : ""}</dd>
            {tip.p.speaker && (<><dt>Speaker</dt><dd>{tip.p.speaker}</dd></>)}
            {tip.p.senateLeader && (<><dt>Senate leader</dt><dd>{tip.p.senateLeader}</dd></>)}
            <dt>Government</dt><dd>{tip.p.classification}</dd>
            <dt>Debt {tip.p.startAsOf} → {tip.p.endAsOf}</dt>
            <dd>{money(tip.p.startDebt)}{mark(tip.p.startMethod)} → {money(tip.p.endDebt)}{mark(tip.p.endMethod)}</dd>
            <dt>Added ({real ? `${baseYear} $` : "nominal"})</dt><dd>{fmt(val(tip.p, "increase"))}</dd>
            <dt>Annualized ({real ? `${baseYear} $` : "nominal"})</dt><dd>{val(tip.p, "annualized") === null ? "—" : `${money(val(tip.p, "annualized")!)}/yr`}</dd>
          </dl>
          {tip.p.note && <p className="govNote">{tip.p.note}</p>}
          {activeEvents(tip.p).length > 0 && (
            <p className="govEvents">{activeEvents(tip.p).map((e) => `◆ ${e.label}`).join("  ")}</p>
          )}
          {real && val(tip.p, "increase") === null && <p className="govNote">Real values unavailable before CPI records begin (1913).</p>}
        </div>
      )}
      <div className="panel tableWrap">
        <table>
          <thead>
            <tr>
              <th>Period</th><th>President</th><th>House / Senate</th><th>Control</th><th>Duration</th><th>Obs.</th>
              <th>Debt added ({real ? `${baseYear} $` : "nominal"})</th>
              <th>Annualized ({real ? `${baseYear} $` : "nominal"})</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={`${p.congress}-${p.start}`}>
                <td><b>{p.congress}th Congress</b><br /><small>{p.start} – {p.end}</small></td>
                <td>{p.president}<br /><small>{p.party}</small></td>
                <td>{p.house} / {p.senate}</td>
                <td>{p.classification}</td>
                <td>{(p.days / 365.2425).toFixed(1)} yr</td>
                <td>{p.observations}</td>
                <td>{fmt(val(p, "increase"))}</td>
                <td>{val(p, "annualized") === null ? "—" : `${money(val(p, "annualized")!)}/yr`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tableFoot">
          † exact Treasury daily balance · ‡ preceding annual fiscal-year-end record · § first available record (1790).
          Unmarked boundaries use the preceding quarter-end observation. Rate metrics use elapsed time between the
          observation dates actually used, so series edges never distort annualized rates. Real values are {baseYear}-dollar
          (CPI-U annual average) and unavailable before 1913. Speaker and Senate-leader names are shown from the 89th
          Congress (1965) onward, verified against official House and Senate leader lists.
        </div>
      </div>
    </>
  );
}
