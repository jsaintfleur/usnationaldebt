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
| Historical Debt Outstanding | U.S. Treasury Fiscal Service | `api.fiscaldata.treasury.gov/.../od/debt_outstanding` | Annual, fiscal-year end | debt outstanding | 1790 | Deep timeline; pre-1966 administration boundaries | Pre-1843 records predate standardized fiscal years — tier-labeled |
| Debt to the Penny (full daily) | U.S. Treasury Fiscal Service | same dataset, full extract | Business daily | total debt | 1993-04-01 | Daily zoom resolution | Single-page extract; cross-checked against latest snapshot |
| CPIAUCNS | BLS via FRED | `fred.stlouisfed.org/series/CPIAUCNS` | Monthly | CPI-U (NSA) | 1913-01-01 | Real conversion before 1947; YoY inflation overlay | Same 1982–84=100 base as CPIAUCSL; pre-1913 real values shown as unavailable |
| GDPA | BEA via FRED | `fred.stlouisfed.org/series/GDPA` | Annual | nominal GDP | 1929 | Historical debt-to-GDP overlay | Pre-1929 ratios not shown (would require non-government reconstructions) |
| FYFSD | OMB via FRED | `fred.stlouisfed.org/series/FYFSD` | Annual, fiscal year | surplus/deficit | 1901 | Deficit overlay | Negative = deficit |
| USREC | NBER via FRED | `fred.stlouisfed.org/series/USREC` | Monthly | recession indicator | 1854-12 | Recession shading | Compressed to date ranges on load |
| GS10 | Federal Reserve via FRED | `fred.stlouisfed.org/series/GS10` | Monthly | 10-year Treasury yield | 1953-04 | Interest-rate overlay | Percent |
| Party divisions | Senate.gov / House.gov (via Wikipedia consolidation) | `data/political-control.json` | Per Congress | seats, chamber majorities | 1789 (1st Congress) | Political context, control strips, political-feature evaluation | Curated snapshot with anchor tests; caucus/tie-break organizations carry explicit notes |
| Presidents | Official records | `data/presidents.json` | Per term | name, party, exact term dates | 1789 | Administration table, political context | Hand-curated; succession dates exact |
| Fiscal events | Official enactment/declaration dates | `data/fiscal-events.json` | Per event | wars, crises, pandemics, legislation | 1790 | Chart annotations | Curated reference annotations, not statistical data |

`data/refresh-meta.json` records the last successful refresh; `data/transitions.json` records exact boundary balances with their record dates. Refreshes run on a weekly schedule (`.github/workflows/refresh-data.yml`) and on demand; results are committed only after `npm run data:validate`, `npm run models:evaluate`, and `npm test` all pass, so failed refreshes can never silently reach production. Failure behavior: any fetch error or validation failure aborts the workflow and leaves the previous committed snapshots in place.
