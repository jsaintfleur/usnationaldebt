import { NextRequest, NextResponse } from "next/server";
import { governmentPeriods } from "@/lib/government";
import { BASE_YEAR } from "@/lib/inflation";

/** Control-at-time periods (president × Congress) with debt attribution, 1789+. */
export function GET(r: NextRequest) {
  const q = r.nextUrl.searchParams;
  const congress = q.get("congress");
  const party = q.get("party");
  const kind = q.get("kind");
  let data = governmentPeriods();
  if (congress) data = data.filter((x) => x.congress === Number(congress));
  if (party) data = data.filter((x) => x.party.startsWith(party) || x.house === party || x.senate === party);
  if (kind) data = data.filter((x) => x.classification.toLowerCase().includes(kind.toLowerCase()));
  return NextResponse.json({
    data,
    meta: {
      view: "control-at-time",
      coverage: "1st–119th Congress; debt records begin 1790",
      boundaryRule:
        "finest official record at each boundary: Treasury daily (1993+), quarter-end (1966+), annual fiscal-year end (1790+); methods labeled per boundary",
      realBaseYear: BASE_YEAR,
      realNote: `fields ending in "Real" are CPI-U adjusted to ${BASE_YEAR} annual-average prices; null before 1913`,
      leadership: "speaker/senateLeader present from the 89th Congress (1965) onward",
      causal: false,
    },
  });
}
