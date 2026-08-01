import GovernmentExplorer from "@/components/GovernmentExplorer";
import { governmentPeriods } from "@/lib/government";
import { timelineData } from "@/lib/timeline-data";

export default function Page() {
  const periods = governmentPeriods();
  const { events } = timelineData();
  return (
    <main className="wrap">
      <header className="pageHead">
        <div className="eyebrow">Institutional control · 1789–present</div>
        <h1>Presidential and Congressional control.</h1>
        <p>
          Which president and which congressional majorities held office during every debt observation since the first
          Treasury record in 1790 — all 119 Congresses, with seat counts compiled from the official party-division
          tables. Timing is context, not proof that party control caused an outcome.
        </p>
      </header>
      <div className="notice" style={{ marginBottom: 22 }}>
        Federal debt outcomes reflect decisions made across administrations and Congresses, inherited obligations,
        economic conditions, interest costs, emergencies, and the lagged effects of previously enacted laws. This page
        shows who held institutional control during each period; it does not treat political control alone as proof of
        causation — and the model evaluation on the Forecast page found that political-control variables do not improve
        out-of-sample debt prediction.
      </div>
      <GovernmentExplorer periods={periods} events={events} />
    </main>
  );
}
