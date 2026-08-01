# Data source registry

| Dataset | Agency | Location | Frequency | Fields used | Earliest | Quality notes |
|---|---|---|---|---|---|---|
| Debt to the Penny | U.S. Treasury Fiscal Service | `api.fiscaldata.treasury.gov/.../debt_to_penny` | Business daily | record date, total, held by public, intragovernmental | 1993-04-01 | Latest five rows retained; components reconciled to total |
| GFDEBTN | U.S. Treasury via FRED | `fred.stlouisfed.org/series/GFDEBTN` | Quarterly, end of period | date, total public debt | 1966-01-01 | Millions converted to dollars; dates checked for uniqueness and ordering |

`data/debt-latest.json` contains the upstream metadata and last successful response timestamp. Refreshes are manual or workflow-triggered. Missing values, duplicates, invalid numbers, short coverage, ordering, and latest-component reconciliation are automated checks.
