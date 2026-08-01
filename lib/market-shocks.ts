export type MarketShock = {
  id: string;
  label: string;
  start: string;
  end: string;
  kind: "recession" | "market" | "disruption";
  note: string;
};

// Descriptive context only: these windows do not imply causation for debt.
export const majorMarketShocks: MarketShock[] = [
  { id:"oil-embargo", label:"Oil embargo", start:"1973-10-17", end:"1974-03-18", kind:"disruption", note:"Arab oil embargo" },
  { id:"1973-recession", label:"1973–75 recession", start:"1973-11-01", end:"1975-03-31", kind:"recession", note:"NBER recession window" },
  { id:"1980-recession", label:"1980 recession", start:"1980-01-01", end:"1980-07-31", kind:"recession", note:"NBER recession window" },
  { id:"1981-recession", label:"1981–82 recession", start:"1981-07-01", end:"1982-11-30", kind:"recession", note:"NBER recession window" },
  { id:"black-monday", label:"Black Monday", start:"1987-10-19", end:"1987-10-19", kind:"market", note:"One-day global equity crash" },
  { id:"1990-recession", label:"1990–91 recession", start:"1990-07-01", end:"1991-03-31", kind:"recession", note:"NBER recession window" },
  { id:"dot-com", label:"Dot-com drawdown", start:"2000-03-24", end:"2002-10-09", kind:"market", note:"Nasdaq peak-to-trough window" },
  { id:"2001-recession", label:"2001 recession", start:"2001-03-01", end:"2001-11-30", kind:"recession", note:"NBER recession window" },
  { id:"financial-crisis", label:"Global financial crisis", start:"2007-12-01", end:"2009-06-30", kind:"recession", note:"Great Recession window" },
  { id:"covid", label:"COVID-19 shock", start:"2020-02-01", end:"2020-04-30", kind:"recession", note:"NBER recession window" },
  { id:"2022-bear", label:"2022 bear market", start:"2022-01-03", end:"2022-10-12", kind:"market", note:"S&P 500 peak-to-trough window" },
];

export function shockDurationDays(shock: MarketShock) {
  return Math.max(1, Math.round((Date.parse(shock.end) - Date.parse(shock.start)) / 86_400_000) + 1);
}
