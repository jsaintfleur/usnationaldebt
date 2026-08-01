export type DebtPoint = { date: string; debt: number };

export type Administration = {
  president: string;
  party: "Democratic" | "Republican";
  start: string;
  end: string;
  partial?: boolean;
};

/** How an administration boundary value was observed. */
export type BoundaryMethod = "treasury-daily" | "quarter-end-proxy" | "latest-quarter";

export type AdminSummary = Administration & {
  // Nominal dollars (as reported at the time)
  startDebt: number;
  endDebt: number;
  increase: number;
  percent: number;
  cagr: number;
  daily: number;
  // Real dollars in BASE_YEAR prices (CPI-U adjusted)
  startDebtReal: number;
  endDebtReal: number;
  increaseReal: number;
  percentReal: number;
  cagrReal: number;
  dailyReal: number;
  // Provenance
  startAsOf: string;
  endAsOf: string;
  startMethod: BoundaryMethod;
  endMethod: BoundaryMethod;
  baseYear: number;
};
