import { combinedHistory, dailyHistory } from "./deep-history";
import { congresses } from "./political";
import { controlSegments, type ControlSegment } from "./timeline-data";
import { toRealMaybe, BASE_YEAR } from "./inflation";
import type { DebtPoint } from "./types";

/**
 * Government-control periods with debt attribution — the data behind
 * /government-control. Built on the anchor-tested 1789+ political dataset
 * (all 119 Congresses) rather than a hand-typed modern subset, with the same
 * boundary discipline as the administrations table:
 *
 *  - Boundary values use the finest official record covering the date:
 *    daily Treasury balances (1993+), quarter-end observations (1966+),
 *    annual fiscal-year-end records (1790+) — each labeled. The 1st Congress
 *    (1789) predates the first record and anchors on 1790, labeled.
 *  - Rate metrics use elapsed time between the observation as-of dates
 *    actually used, so series edges never dilute or inflate annualized rates
 *    (the defect that halved the 89th Congress figure in the prior build).
 *  - Real values are BASE_YEAR dollars (annual-average CPI-U) and are null
 *    before CPI coverage (1913) — never fabricated.
 *
 * Leadership names (Speaker, Senate majority leader) are included from the
 * 89th Congress (1965) onward, verified against official House and Senate
 * leader lists; earlier congresses omit the fields rather than risk error.
 * Party control is descriptive context, never causal attribution.
 */

/** Speaker / Senate majority leader, 89th–119th Congress (verified). */
const LEADERSHIP: Record<number, { speaker: string; senateLeader: string }> = {
  89: { speaker: "John McCormack", senateLeader: "Mike Mansfield" },
  90: { speaker: "John McCormack", senateLeader: "Mike Mansfield" },
  91: { speaker: "John McCormack", senateLeader: "Mike Mansfield" },
  92: { speaker: "Carl Albert", senateLeader: "Mike Mansfield" },
  93: { speaker: "Carl Albert", senateLeader: "Mike Mansfield" },
  94: { speaker: "Carl Albert", senateLeader: "Mike Mansfield" },
  95: { speaker: "Tip O'Neill", senateLeader: "Robert Byrd" },
  96: { speaker: "Tip O'Neill", senateLeader: "Robert Byrd" },
  97: { speaker: "Tip O'Neill", senateLeader: "Howard Baker" },
  98: { speaker: "Tip O'Neill", senateLeader: "Howard Baker" },
  99: { speaker: "Tip O'Neill", senateLeader: "Bob Dole" },
  100: { speaker: "Jim Wright", senateLeader: "Robert Byrd" },
  101: { speaker: "Jim Wright / Tom Foley", senateLeader: "George Mitchell" },
  102: { speaker: "Tom Foley", senateLeader: "George Mitchell" },
  103: { speaker: "Tom Foley", senateLeader: "George Mitchell" },
  104: { speaker: "Newt Gingrich", senateLeader: "Bob Dole / Trent Lott" },
  105: { speaker: "Newt Gingrich", senateLeader: "Trent Lott" },
  106: { speaker: "Dennis Hastert", senateLeader: "Trent Lott" },
  107: { speaker: "Dennis Hastert", senateLeader: "Trent Lott / Tom Daschle" },
  108: { speaker: "Dennis Hastert", senateLeader: "Bill Frist" },
  109: { speaker: "Dennis Hastert", senateLeader: "Bill Frist" },
  110: { speaker: "Nancy Pelosi", senateLeader: "Harry Reid" },
  111: { speaker: "Nancy Pelosi", senateLeader: "Harry Reid" },
  112: { speaker: "John Boehner", senateLeader: "Harry Reid" },
  113: { speaker: "John Boehner", senateLeader: "Harry Reid" },
  114: { speaker: "John Boehner / Paul Ryan", senateLeader: "Mitch McConnell" },
  115: { speaker: "Paul Ryan", senateLeader: "Mitch McConnell" },
  116: { speaker: "Nancy Pelosi", senateLeader: "Mitch McConnell" },
  117: { speaker: "Nancy Pelosi", senateLeader: "Chuck Schumer" },
  118: { speaker: "Kevin McCarthy / Mike Johnson", senateLeader: "Chuck Schumer" },
  119: { speaker: "Mike Johnson", senateLeader: "John Thune" },
};

export type BoundaryTier = "treasury-daily" | "quarterly" | "annual" | "series-start";

export type GovernmentPeriod = ControlSegment & {
  classification: "Unified government" | "Divided government" | "Split Congress";
  houseSeats: string;
  senateSeats: string;
  speaker?: string;
  senateLeader?: string;
  startDebt: number;
  endDebt: number;
  increase: number;
  annualized: number;
  increaseReal: number | null;
  annualizedReal: number | null;
  baseYear: number;
  startAsOf: string;
  endAsOf: string;
  startMethod: BoundaryTier;
  endMethod: BoundaryTier;
  days: number;
  observations: number;
};

function nearestPriorPoint(points: DebtPoint[], date: string): DebtPoint | null {
  for (let i = points.length - 1; i >= 0; i--) if (points[i].date <= date) return points[i];
  return null;
}

function formatSeats(seats: Record<string, number>): string {
  const parts = Object.entries(seats)
    .filter(([name, n]) => n > 0 && name !== "Other")
    .map(([name, n]) => `${n} ${name.slice(0, 1)}`);
  const other = seats["Other"] ?? 0;
  if (other > 0) parts.push(`${other} other`);
  return parts.join(" – ");
}

export function governmentPeriods(): GovernmentPeriod[] {
  const coarse = combinedHistory();
  const daily = dailyHistory();
  const dailyStart = daily[0].date;
  const byCongress = new Map(congresses().map((c) => [c.congress, c]));

  const boundary = (date: string): { asOf: string; debt: number; method: BoundaryTier } => {
    if (date >= dailyStart) {
      const p = nearestPriorPoint(daily, date)!;
      return { asOf: p.date, debt: p.debt, method: "treasury-daily" };
    }
    const p = nearestPriorPoint(coarse, date);
    if (p) {
      const tier = coarse.find((x) => x.date === p.date)!.tier;
      return { asOf: p.date, debt: p.debt, method: tier === "quarterly" ? "quarterly" : "annual" };
    }
    // Only the 1st Congress (1789) predates the first 1790 record.
    return { asOf: coarse[0].date, debt: coarse[0].debt, method: "series-start" };
  };

  const lastObs = coarse[coarse.length - 1];
  return controlSegments().map((seg) => {
    const c = byCongress.get(seg.congress ?? -1);
    const s = boundary(seg.start);
    const endDate = seg.end > lastObs.date && seg.end > daily[daily.length - 1].date ? daily[daily.length - 1].date : seg.end;
    const e = boundary(endDate);
    const days = Math.max(1, (Date.parse(e.asOf) - Date.parse(s.asOf)) / 86400000);
    const years = days / 365.2425;
    const increase = e.debt - s.debt;
    const startReal = toRealMaybe(s.debt, s.asOf);
    const endReal = toRealMaybe(e.debt, e.asOf);
    const increaseReal = startReal !== null && endReal !== null ? endReal - startReal : null;
    const observations = coarse.filter((p) => p.date >= seg.start && p.date < seg.end).length;
    const classification =
      seg.alignment === "unified" ? ("Unified government" as const) : seg.alignment === "split-congress" ? ("Split Congress" as const) : ("Divided government" as const);
    return {
      ...seg,
      classification,
      houseSeats: c ? formatSeats(c.house.seats) : "",
      senateSeats: c ? formatSeats(c.senate.seats) : "",
      ...(seg.congress != null && LEADERSHIP[seg.congress] ? LEADERSHIP[seg.congress] : {}),
      startDebt: s.debt,
      endDebt: e.debt,
      increase,
      annualized: increase / years,
      increaseReal,
      annualizedReal: increaseReal !== null ? increaseReal / years : null,
      baseYear: BASE_YEAR,
      startAsOf: s.asOf,
      endAsOf: e.asOf,
      startMethod: s.method,
      endMethod: e.method,
      days,
      observations,
    };
  });
}
