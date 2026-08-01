# Data source registry

| Dataset | Agency | Endpoint/file | Frequency | Fields | Coverage | Refresh | Validation / limitations |
|---|---|---|---|---|---|---|---|
| Debt to the Penny | U.S. Treasury Fiscal Service | Fiscal Data `debt_to_penny` | Business daily | total, public, intragovernmental debt | 1993–present | Scheduled/manual | Components reconcile; prior-business-day release |
| GFDEBTN | U.S. Treasury via FRED | `fredgraph.csv?id=GFDEBTN` | Quarterly | total public debt | 1966–present | Quarterly | Millions converted to dollars; quarterly transition proxies |
| CPIAUCSL | BLS via FRED | `fredgraph.csv?id=CPIAUCSL` | Monthly | CPI-U index | 1947–present | Monthly | Prior-observation alignment; revised seasonal series |
| GDP | BEA via FRED | `fredgraph.csv?id=GDP` | Quarterly SAAR | nominal GDP | 1947–present | Quarterly | Used as latest Scenario Lab starting GDP |
| Party divisions of Congress | U.S. Senate / House History | senate.gov/history; history.house.gov | Congress | majority party, seats, leaders | 89th–119th | Per Congress | 107th Senate changed control intra-term; flagged transitional |
| Presidential terms | White House / National Archives | whitehouse.gov; archives.gov | Event | president, party, term dates | Johnson–present | On transition | Succession dates preserved |

Last source snapshot: August 1, 2026. Refresh scripts must fail visibly; no fabricated fallback is permitted.
