import { NextRequest, NextResponse } from "next/server";
import { politicalContext } from "@/lib/political";

/** Political context (president, chamber control, alignment) for a given date. */
export function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < "1789-04-30" || date > "2100-01-01") {
    return NextResponse.json({ error: "date must be YYYY-MM-DD between 1789-04-30 and today" }, { status: 400 });
  }
  return NextResponse.json({
    data: politicalContext(date),
    meta: {
      sources: [
        "data/presidents.json (official records)",
        "data/political-control.json (Senate.gov / House.gov party divisions)",
      ],
      causalAttribution: false,
      note: "Party control is descriptive context; it does not establish causation of fiscal outcomes.",
    },
  });
}
