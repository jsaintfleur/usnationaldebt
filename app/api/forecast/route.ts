import { NextRequest, NextResponse } from "next/server";
import { forecast, forecastMeta } from "@/lib/data";

export function GET(req: NextRequest) {
  const years = Math.min(20, Math.max(1, Number(req.nextUrl.searchParams.get("years") ?? 20)));
  return NextResponse.json({ data: forecast(undefined, years), meta: { ...forecastMeta(), units: "nominal USD" } });
}
