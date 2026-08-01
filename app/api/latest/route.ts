import { NextResponse } from "next/server";
import { latest } from "@/lib/data";

export function GET() {
  return NextResponse.json({
    data: latest(),
    meta: {
      units: "nominal USD",
      storage: "committed Treasury snapshot; freshness is governed by the scheduled data refresh, not runtime caching",
    },
  });
}
