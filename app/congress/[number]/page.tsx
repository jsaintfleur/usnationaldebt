import { notFound } from "next/navigation";
import Link from "next/link";
import { congresses } from "@/lib/political";
import { governmentPeriods } from "@/lib/government";
import { money } from "@/lib/format";
import { BASE_YEAR } from "@/lib/inflation";

export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const n = Number((await params).number);
  const c = congresses().find((x) => x.congress === n);
  if (!c) notFound();
  const periods = governmentPeriods().filter((x) => x.congress === n);
  const totalNominal = periods.reduce((s, x) => s + x.increase, 0);
  const totalReal = periods.every((x) => x.increaseReal !== null) ? periods.reduce((s, x) => s + (x.increaseReal ?? 0), 0) : null;
  const lead = periods.find((p) => p.speaker);
  const seats = (ch: typeof c.house) =>
    Object.entries(ch.seats).filter(([k, v]) => v > 0 && k !== "Other").map(([k, v]) => `${v} ${k}`).join(" · ") +
    ((ch.seats["Other"] ?? 0) > 0 ? ` · ${ch.seats["Other"]} other` : "");

  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">Congress detail</div>
        <h1>{n}th Congress ({c.startYear}–{c.endYear})</h1>
        <p>
          House: {c.house.majority} majority ({seats(c.house)}) · Senate: {c.senate.majority} majority ({seats(c.senate)}).
          Compiled from the official party-division tables.
        </p>
      </header>
      <div className="grid4">
        {lead?.speaker && (
          <div className="card"><label>Speaker</label><strong>{lead.speaker}</strong><small>Verified, 89th Congress onward</small></div>
        )}
        {lead?.senateLeader && (
          <div className="card"><label>Senate majority leader</label><strong>{lead.senateLeader}</strong><small>Verified, 89th Congress onward</small></div>
        )}
        <div className="card"><label>Presidents serving</label><strong>{[...new Set(periods.map((x) => x.president))].join(" / ")}</strong></div>
        <div className="card">
          <label>Debt change (nominal)</label>
          <strong>{money(totalNominal)}</strong>
          <small>{totalReal === null ? "Real values unavailable before 1913" : `${money(totalReal)} in ${BASE_YEAR} dollars`}</small>
        </div>
      </div>
      {(c.senate.note || c.house.note) && (
        <div className="notice" style={{ marginTop: 22 }}>{c.senate.note ?? c.house.note}</div>
      )}
      <div className="panel tableWrap" style={{ marginTop: 22 }}>
        <table>
          <thead>
            <tr><th>Period</th><th>President</th><th>Control</th><th>Debt {periods[0]?.startAsOf} → {periods[periods.length - 1]?.endAsOf}</th><th>Added (nominal)</th><th>Added ({BASE_YEAR} $)</th></tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.start}>
                <td>{p.start} – {p.end}</td>
                <td>{p.president} ({p.party})</td>
                <td>{p.classification}</td>
                <td>{money(p.startDebt)} → {money(p.endDebt)}</td>
                <td>{money(p.increase)}</td>
                <td>{p.increaseReal === null ? "—" : money(p.increaseReal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="notice" style={{ marginTop: 22 }}>
        Presidents propose and administer fiscal policy while Congress passes tax and spending legislation; debt changes
        occurred under both branches&rsquo; institutional control and do not establish causation.
        {" "}<Link href="/government-control">Back to the control timeline →</Link>
      </div>
    </main>
  );
}
