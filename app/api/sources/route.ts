import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    data: [
      { dataset: "Debt to the Penny", agency: "U.S. Treasury Fiscal Service", frequency: "Business daily", fields: ["total", "held by public", "intragovernmental"], earliest: "1993-04-01", usedFor: "latest snapshot; exact administration-transition balances (2001+)", url: "https://fiscaldata.treasury.gov/datasets/debt-to-the-penny/" },
      { dataset: "GFDEBTN", agency: "U.S. Treasury via FRED", frequency: "Quarterly, end of period", fields: ["total public debt"], earliest: "1966-01-01", usedFor: "comparable history; forecast target; walk-forward evaluation", url: "https://fred.stlouisfed.org/series/GFDEBTN" },
      { dataset: "CPIAUCSL", agency: "BLS via FRED", frequency: "Monthly", fields: ["CPI-U index"], earliest: "1947-01-01", usedFor: "nominal → real conversion (base-year prices)", url: "https://fred.stlouisfed.org/series/CPIAUCSL" },
      { dataset: "GDP", agency: "BEA via FRED", frequency: "Quarterly SAAR", fields: ["nominal GDP"], earliest: "1947-01-01", usedFor: "debt-to-GDP ratio; scenario baseline", url: "https://fred.stlouisfed.org/series/GDP" },
      { dataset: "POPTHM", agency: "Census/BEA via FRED", frequency: "Monthly", fields: ["resident population"], earliest: "1959-01-01", usedFor: "per-resident debt; scenario population path", url: "https://fred.stlouisfed.org/series/POPTHM" },
      { dataset: "FYFR", agency: "OMB via FRED", frequency: "Annual, fiscal year", fields: ["federal receipts"], earliest: "1901-06-30", usedFor: "scenario revenue baseline", url: "https://fred.stlouisfed.org/series/FYFR" },
      { dataset: "FYONET", agency: "OMB via FRED", frequency: "Annual, fiscal year", fields: ["federal net outlays"], earliest: "1901-06-30", usedFor: "scenario outlay baseline", url: "https://fred.stlouisfed.org/series/FYONET" },
    ],
  });
}
