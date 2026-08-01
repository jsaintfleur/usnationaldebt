import fs from "node:fs";
import path from "node:path";

/**
 * Political-control lookups: who was President, which party organized each
 * chamber, and derived indicators (unified/divided/split government,
 * transition years, midterm years) for any date since 1789.
 *
 * Data: data/presidents.json (curated from official records) and
 * data/political-control.json (compiled from the official Senate.gov /
 * House.gov party-division tables; caucus and tie-break organizations carry
 * explicit notes). Party control never implies causation of fiscal outcomes —
 * every consumer of this module must preserve that framing.
 */

export type President = { n: number; name: string; party: string; start: string; end: string | null };

export type Chamber = {
  total: number;
  seats: Record<string, number>;
  majority: string;
  note?: string;
};

export type Congress = {
  congress: number;
  startYear: number;
  endYear: number;
  senate: Chamber;
  house: Chamber;
};

export type GovernmentAlignment = "unified" | "divided" | "split-congress";

export type PoliticalContext = {
  president: President | null;
  presidentParty: string | null;
  congress: Congress | null;
  houseMajority: string | null;
  senateMajority: string | null;
  alignment: GovernmentAlignment | null;
  midtermYear: boolean;
  transitionYear: boolean;
};

const read = (file: string) => JSON.parse(fs.readFileSync(path.join(process.cwd(), file), "utf8"));

let presidentsCache: President[] | null = null;
let congressesCache: Congress[] | null = null;

export function presidents(): President[] {
  presidentsCache ??= read("data/presidents.json").presidents;
  return presidentsCache!;
}

export function congresses(): Congress[] {
  congressesCache ??= read("data/political-control.json").congresses;
  return congressesCache!;
}

export function presidentAt(date: string): President | null {
  return (
    presidents().find((p) => date >= p.start && (p.end === null || date < p.end)) ?? null
  );
}

/**
 * Congress in session on a date. A new Congress is seated on Jan 3 of odd
 * years (Mar 4 before the 20th Amendment took effect in 1935); dates earlier
 * in an odd year belong to the outgoing Congress.
 */
export function congressAt(date: string): Congress | null {
  const y = Number(date.slice(0, 4));
  const cutover = y >= 1935 ? `${y}-01-03` : `${y}-03-04`;
  const effectiveYear = y % 2 === 1 && date < cutover ? y - 1 : y;
  const all = congresses();
  const last = all[all.length - 1];
  if (effectiveYear >= last.endYear) return null;
  return all.find((c) => effectiveYear >= c.startYear && effectiveYear < c.endYear) ?? null;
}

/**
 * Map a presidential party label onto the congressional party naming of that
 * era, so unified/divided classification works across party systems.
 */
function sameParty(presidentParty: string, chamberMajority: string): boolean {
  const p = presidentParty.toLowerCase();
  const c = chamberMajority.toLowerCase();
  if (c.includes("democrat") && !c.includes("republican")) return p.startsWith("democratic") && !p.includes("republican");
  if (c.includes("republican") && !c.includes("democrat")) return p.startsWith("republican");
  if (c.includes("democratic-republican")) return p.includes("democratic-republican");
  if (c.includes("pro-admin") || c.includes("federalist")) return p.includes("federalist") || p === "unaffiliated";
  if (c.includes("anti-admin")) return p.includes("democratic-republican");
  if (c.includes("jacksonian")) return p === "democratic";
  if (c.includes("anti-jackson") || c.includes("whig") || c.includes("opposition")) return p.includes("whig");
  return false;
}

export function politicalContext(date: string): PoliticalContext {
  const president = presidentAt(date);
  const congress = congressAt(date);
  const houseMajority = congress?.house.majority ?? null;
  const senateMajority = congress?.senate.majority ?? null;
  let alignment: GovernmentAlignment | null = null;
  if (president && houseMajority && senateMajority) {
    const houseAligned = sameParty(president.party, houseMajority);
    const senateAligned = sameParty(president.party, senateMajority);
    if (houseAligned && senateAligned) alignment = "unified";
    else if (houseMajority !== senateMajority) alignment = "split-congress";
    else alignment = "divided";
  }
  const y = Number(date.slice(0, 4));
  const transitionYear = presidents().some((p) => Number(p.start.slice(0, 4)) === y);
  // Federal midterm elections fall in even years that are not presidential-election years.
  const midtermYear = y % 2 === 0 && (y - 2) % 4 === 0;
  return {
    president,
    presidentParty: president?.party ?? null,
    congress,
    houseMajority,
    senateMajority,
    alignment,
    midtermYear,
    transitionYear,
  };
}
