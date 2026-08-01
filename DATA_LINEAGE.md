# Production data lineage

## Historical and real-dollar views

Treasury GFDEBTN → `data/historical-debt.csv` → `lib/data.ts::history` → CPI adjustment in `lib/real.ts` → administration/government-period calculations → server-rendered pages and JSON APIs.

## Current snapshot

Treasury Debt to the Penny API → `data/debt-latest.json` → validation of public + intragovernmental = total → `lib/data.ts::latest` → overview and scenario starting balance.

## Forecast

GFDEBTN → annualized observation subset → rolling-origin candidate evaluation → selected 10-year-CAGR baseline → empirical residual interval → `/api/forecast` and Forecast Center. Model version and data-through date are returned by the API.

## Government control

Official congressional and presidential historical records → `lib/government.ts` → exact intersection of presidential and congressional date ranges → nearest-prior debt observations → `/government-control`, `/congress/[number]`, and `/api/government-control`.
