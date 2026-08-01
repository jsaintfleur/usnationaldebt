# Data source registry

| Dataset | Agency | Location | Frequency | Fields used | Earliest | Used for | Quality notes |
|---|---|---|---|---|---|---|---|
| Debt to the Penny | U.S. Treasury Fiscal Service | `api.fiscaldata.treasury.gov/.../debt_to_penny` | Business daily | record date, total, held by public, intragovernmental | 1993-04-01 | Latest snapshot; exact administration-transition balances (2001+) | Latest five rows retained verbatim; components reconciled to total |
| GFDEBTN | U.S. Treasury via FRED | `fred.stlouisfed.org/series/GFDEBTN` | Quarterly, end of period | total public debt | 1966-01-01 | Comparable history; forecast target; walk-forward evaluation | Millions→dollars; FRED quarter-start dates re-dated to true quarter ends; uniqueness/ordering checked |
| CPIAUCSL | BLS via FRED | `fred.stlouisfed.org/series/CPIAUCSL` | Monthly | CPI-U index | 1947-01-01 | Nominal→real conversion (base year 2025) | Oct 2025 missing upstream (shutdown); missing cells dropped explicitly; base year requires ≥10 months |
| GDP | BEA via FRED | `fred.stlouisfed.org/series/GDP` | Quarterly SAAR | nominal GDP | 1947-01-01 | Debt-to-GDP; scenario baseline | Billions→dollars; matched to debt by quarter |
| POPTHM | Census/BEA via FRED | `fred.stlouisfed.org/series/POPTHM` | Monthly | resident population | 1959-01-01 | Per-resident debt; scenario population path | Thousands→persons |
| FYFR | OMB via FRED | `fred.stlouisfed.org/series/FYFR` | Annual, fiscal year | federal receipts | 1901 | Scenario revenue baseline | Millions→dollars; latest complete FY |
| FYONET | OMB via FRED | `fred.stlouisfed.org/series/FYONET` | Annual, fiscal year | federal net outlays | 1901 | Scenario outlay baseline | Millions→dollars; latest complete FY |

`data/refresh-meta.json` records the last successful refresh; `data/transitions.json` records exact boundary balances with their record dates. Refreshes run on a weekly schedule (`.github/workflows/refresh-data.yml`) and on demand; results are committed only after `npm run data:validate`, `npm run models:evaluate`, and `npm test` all pass, so failed refreshes can never silently reach production. Failure behavior: any fetch error or validation failure aborts the workflow and leaves the previous committed snapshots in place.
