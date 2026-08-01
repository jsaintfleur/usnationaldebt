export type DebtPoint = { date: string; debt: number };

export type Administration = {
  president: string;
  party: string;
  start: string;
  end: string;
  partial?: boolean;
};

/** How an administration boundary value was observed. */
export type BoundaryMethod =
  | "treasury-daily"
  | "quarter-end-proxy"
  | "annual-proxy"
  | "series-start-proxy"
  | "latest-quarter";

export type AdminSummary = Administration & {
  // Nominal dollars (as reported at the time)
  startDebt: number;
  endDebt: number;
  increase: number;
  percent: number;
  cagr: number;
  daily: number;
  // Real dollars in BASE_YEAR prices (CPI-U adjusted); null before CPI coverage (1913)
  startDebtReal: number | null;
  endDebtReal: number | null;
  increaseReal: number | null;
  percentReal: number | null;
  cagrReal: number | null;
  dailyReal: number | null;
  // Provenance
  startAsOf: string;
  endAsOf: string;
  startMethod: BoundaryMethod;
  endMethod: BoundaryMethod;
  baseYear: number;
};
