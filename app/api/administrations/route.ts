import { NextResponse } from "next/server";
import { summarize } from "@/lib/data";
import { BASE_YEAR } from "@/lib/inflation";

export function GET() {
  return NextResponse.json({
    data: summarize(),
    meta: {
      transitionRule:
        "exact Treasury daily balance where daily coverage exists (2001 onward); otherwise the quarter-end observation immediately preceding the transition",
      realDollars: `fields ending in "Real" are CPI-U adjusted to ${BASE_YEAR} prices`,
      coverage: "comparable series begins 1966; administrations starting earlier are excluded",
      causalAttribution: false,
    },
  });
}
