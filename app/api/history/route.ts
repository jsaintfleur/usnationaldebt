import { NextRequest, NextResponse } from "next/server";
import { history } from "@/lib/data";
import { annualHistory, dailyHistory, resolveDebtSeries } from "@/lib/deep-history";

/**
 * Debt history at a chosen resolution:
 *   resolution=annual    1790+ fiscal-year-end (Treasury Historical Debt Outstanding)
 *   resolution=quarterly 1966+ quarter-end (GFDEBTN)
 *   resolution=daily     1993+ business daily (Debt to the Penny)
 *   resolution=auto      finest defensible resolution for the requested window
 */
export function GET(req: NextRequest) {
  const s = req.nextUrl.searchParams;
  const start = s.get("start") ?? "0000-01-01";
  const end = s.get("end") ?? "9999-12-31";
  const resolution = s.get("resolution") ?? "quarterly";
  const window = (points: Array<{ date: string; debt: number }>) => points.filter((x) => x.date >= start && x.date <= end);

  if (resolution === "annual") {
    return NextResponse.json({ data: window(annualHistory()), meta: { frequency: "annual (fiscal-year end)", units: "nominal USD", observed: true, coverage: "1790+" } });
  }
  if (resolution === "daily") {
    return NextResponse.json({ data: window(dailyHistory()), meta: { frequency: "business daily", units: "nominal USD", observed: true, coverage: "1993-04-01+" } });
  }
  if (resolution === "auto") {
    const { points, resolution: used } = resolveDebtSeries(start === "0000-01-01" ? "1790-01-01" : start, end === "9999-12-31" ? new Date().toISOString().slice(0, 10) : end);
    return NextResponse.json({ data: points, meta: { frequency: used, units: "nominal USD", observed: true } });
  }
  return NextResponse.json({ data: window(history()), meta: { frequency: "quarterly", units: "nominal USD", observed: true, coverage: "1966+" } });
}
