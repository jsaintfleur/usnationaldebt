import fs from "node:fs";
import path from "node:path";
import { combinedHistory, annualHistory, quarterlyHistory, dailyHistory, recessions, annualGdp, annualDeficit, treasury10y, inflationYoY, debtToGdpAnnual } from "./deep-history";
import { presidents, congresses, politicalContext } from "./political";
import { toRealMaybe, BASE_YEAR } from "./inflation";

/**
 * Assembles everything the client FiscalChart needs, server-side, from
 * committed snapshots: multi-resolution debt (nominal + real), overlay series,
 * recession ranges, political control segments, and event annotations.
 */

export type ChartPoint = { d: string; v: number | null; r?: number | null };

export type ControlSegment = {
  start: string;
  end: string;
  president: string;
  party: string;
  house: string;
  senate: string;
  alignment: string | null;
  congress: number | null;
  note?: string;
};

export type TimelineEvent = { id: string; kind: string; label: string; start: string; end?: string };

export type TimelineData = {
  baseYear: number;
  debtCoarse: ChartPoint[]; // annual 1790–1965 + quarterly 1966+, nominal + real
  /** Pure single-resolution series for the explicit interval picker. */
  debtAnnual: ChartPoint[]; // 1790+, nominal + real
  debtQuarterly: ChartPoint[]; // 1966+, nominal + real
  debtDaily: ChartPoint[]; // 1993+, nominal only (real toggle at daily zoom uses monthly CPI anyway)
  tiers: Array<{ start: string; end: string; label: string }>;
  overlays: {
    debtToGdp: ChartPoint[];
    deficit: ChartPoint[];
    gdp: ChartPoint[];
    inflation: ChartPoint[];
    treasury10y: ChartPoint[];
  };
  recessions: Array<{ start: string; end: string }>;
  control: ControlSegment[];
  events: TimelineEvent[];
};

/** Political control segments: one per (president × congress) overlap, so both band rows and tooltips resolve from a single list. */
function controlSegments(): ControlSegment[] {
  const out: ControlSegment[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const p of presidents()) {
    const pEnd = p.end ?? today;
    for (const c of congresses()) {
      // Congress runs Jan 3 (Mar 4 pre-1935) of startYear to same of endYear.
      const cStart = `${c.startYear}-${c.startYear >= 1935 ? "01-03" : "03-04"}`;
      const cEnd = `${c.endYear}-${c.endYear >= 1935 ? "01-03" : "03-04"}`;
      const start = p.start > cStart ? p.start : cStart;
      const end = pEnd < cEnd ? pEnd : cEnd;
      if (start >= end) continue;
      const ctx = politicalContext(start > cStart ? start : cStart);
      out.push({
        start,
        end,
        president: p.name,
        party: p.party,
        house: c.house.majority,
        senate: c.senate.majority,
        alignment: ctx.alignment,
        congress: c.congress,
        note: c.senate.note ?? c.house.note,
      });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

export function timelineData(): TimelineData {
  const coarse = combinedHistory();
  const events = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/fiscal-events.json"), "utf8")).events as TimelineEvent[];
  return {
    baseYear: BASE_YEAR,
    debtCoarse: coarse.map((p) => ({ d: p.date, v: p.debt, r: toRealMaybe(p.debt, p.date) })),
    debtAnnual: annualHistory().map((p) => ({ d: p.date, v: p.debt, r: toRealMaybe(p.debt, p.date) })),
    debtQuarterly: quarterlyHistory().map((p) => ({ d: p.date, v: p.debt, r: toRealMaybe(p.debt, p.date) })),
    debtDaily: dailyHistory().map((p) => ({ d: p.date, v: p.debt })),
    tiers: [
      { start: "1790-01-01", end: "1843-01-01", label: "Annual Treasury records; pre-standardized fiscal years — lower certainty" },
      { start: "1843-01-01", end: "1966-03-31", label: "Annual official fiscal-year-end records" },
      { start: "1966-03-31", end: "1993-04-01", label: "Quarterly comparable series (GFDEBTN)" },
      { start: "1993-04-01", end: "2100-01-01", label: "Daily Treasury records available" },
    ],
    overlays: {
      debtToGdp: debtToGdpAnnual().map((p) => ({ d: p.date, v: p.value })),
      deficit: annualDeficit().map((p) => ({ d: p.date, v: p.value })),
      gdp: annualGdp().map((p) => ({ d: p.date, v: p.value })),
      inflation: inflationYoY().filter((_, i) => i % 3 === 0).map((p) => ({ d: p.date, v: p.value })),
      treasury10y: treasury10y().filter((_, i) => i % 3 === 0).map((p) => ({ d: p.date, v: p.value })),
    },
    recessions: recessions(),
    control: controlSegments(),
    events,
  };
}
