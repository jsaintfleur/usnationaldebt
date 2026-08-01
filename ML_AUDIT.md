# ML and product-integrity audit

## Classification

The recovered v1 deployment was a **historical dashboard with limited deterministic forecasting**, not a mature ML product. It used authoritative debt observations, but the forecast was a fixed trailing-CAGR extrapolation with an arbitrary ±1.8 percentage-point band. The Scenario Lab used hard-coded starting debt, GDP, receipts, and outlays. Congressional control and CPI were absent.

## P0/P1 findings and remediation

| Severity | Finding | Resolution |
|---|---|---|
| P0 | Arbitrary forecast bounds could be mistaken for uncertainty | Replaced with empirical 90% rolling-origin residual intervals |
| P0 | Political context omitted from administration comparison | Added joint president/Congress periods, Government Control navigation/page, API, and required non-causal language |
| P1 | Hard-coded scenario starting state | Replaced with latest Treasury debt and latest BEA GDP; scenario explicitly labeled deterministic |
| P1 | No nominal/real method | Added BLS CPI-U, 2026 base-year conversion, real government-period metrics, tests, and labels |
| P1 | No out-of-sample model evidence | Added reproducible annual rolling-origin comparison against last-value and last-growth baselines |

## Leakage review

Evaluation trains on observations strictly before each origin. No random split, global scaling, future macro backfill, test-period tuning, or future rolling window is used. Political variables are excluded from production because the annual sample cannot defensibly identify stable incremental effects across eras.

## Remaining limitations

This remains a baseline forecasting product, not a broad feature-based ML system. Receipts, outlays, interest, unemployment, recessions, official CBO projections, and law-level cost estimates are not yet integrated. The 107th Congress had an intra-term Senate control change and is explicitly marked transitional; future work should split it into exact daily segments.
