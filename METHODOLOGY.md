# Methodology

## Historical coverage and data-quality tiers

Debt history extends to the earliest official federal record — Treasury's Historical Debt Outstanding, beginning with $71,060,508.50 in 1790 — rather than being truncated to the modern era. Coverage is tiered and every tier is labeled in the product: annual fiscal-year-end records 1790–1965 (records before 1843 predate standardized fiscal years and are flagged as lower-certainty), quarterly from 1966 (GFDEBTN), and business-daily from April 1993 (Debt to the Penny). Charts pick the finest defensible resolution for the visible window and state which tier is displayed. Methodology transitions are documented instead of hidden; nothing is interpolated across tiers.

## Political context

Every date since 1789 resolves to a president (party, exact term dates), the sitting Congress (chamber majorities and seat counts from the official Senate/House party-division tables), and derived indicators: unified government, divided government, split Congress, transition years, and midterm years. Five Senates and two Houses whose organization differed from raw seat counts (50–50 tie-breaks, independents caucusing, contested organizations) carry explicit notes rather than silent adjustments. Political control is presented as descriptive context and evaluated as candidate model features (see below) — it is never presented as the cause of debt outcomes.

## Observations and dating

Current totals come from Treasury's Debt to the Penny endpoint. Comparable history is GFDEBTN (Treasury via FRED, millions of dollars, converted to dollars on load). FRED dates end-of-period quarterly series by the first day of the quarter — the row dated January 1 is the March 31 balance — so every observation is re-dated to its true quarter-end as-of date before any calculation. This matters for administration boundaries, inflation matching, and honest walk-forward evaluation.

## Administration assignment

From the 2001 inauguration onward, boundary values are the exact Treasury daily balance on the last business day on or before the transition (`data/transitions.json`). Earlier boundaries use the quarter-end observation immediately preceding the transition and are labeled proxies. The comparable series begins in 1966, so administrations that started earlier (Johnson and before) are excluded rather than silently backfilled. A current term ends at the latest quarterly observation and is labeled partial.

Increase = end − start. Percent = increase ÷ start. CAGR and per-day averages use the elapsed days **between the two observation dates actually used** (÷ 365.2425 for years), so partial terms and proxy boundaries are not diluted by publication lag.

These are period descriptions, not causal attributions. Presidents do not independently control debt: Congress authorizes taxation and spending, while inherited statutes, economic conditions, emergencies, and interest obligations shape every period.

## Nominal and real dollars

Nominal dollars are amounts as reported at the time. Real dollars restate purchasing power in **2025 prices** using BLS CPI-U (CPIAUCSL):

```
real = nominal × (2025 average CPI ÷ CPI at observation month)
```

The base year is the latest calendar year with a (near-)complete CPI record — October 2025 was never published due to the federal shutdown, so the 2025 average uses the 11 published months (the loader refuses fewer than 10). The base year is a single documented constant (`lib/inflation.ts BASE_YEAR`) applied consistently everywhere and changed only deliberately. CPI-U was chosen as the primary deflator because it is the most widely recognized household purchasing-power index; the GDP price index or PCE deflator would shift long-horizon levels by a few percent without changing qualitative rankings. Debt-to-GDP requires no separate deflation: nominal debt is divided by nominal GDP from the same period, so the price level cancels. Every inflation-adjusted figure in the UI states its base year; no real value is ever displayed unlabeled, and no series is adjusted twice.

## Forecasting

Target: nominal total public debt, quarterly. Eight candidates — last-value naive, drift, last-growth naive, full-sample mean log-growth, trailing 5y and 10y CAGR, 10-year linear trend, 10-year exponential trend — are evaluated by **rolling-origin walk-forward validation**: at each of 160 origins (first origin after 80 quarters of history) each model is refitted on data up to that origin only and scored out-of-sample at 1-quarter, 1-year, and 5-year horizons (MAE, RMSE, MAPE, sMAPE, MASE, bias). The production model minimizes mean MASE across the 1-year and 5-year horizons and must not lose to the best naive baseline. Current selection: mean log-growth (see `MODEL_CARD.md`, `MODEL_COMPARISON.csv`, `data/model-evaluation.json`).

Displayed ranges are the empirical 10th–90th percentile of out-of-sample annualized-growth errors at the 5-year horizon, estimated on the first half of origins and coverage-verified on the second half (observed 79% vs 80% nominal). They are evidence-based ranges — not arbitrary sensitivity bands, not formal Bayesian intervals, and not official projections. Because the target is nominal, forecasts embed price-level behavior and are not purchasing-power statements.

## Political variables in the ML pipeline

Political-control variables (presidential party, chamber control, unified-government, transition and midterm indicators) were evaluated as forecasting features with a ridge-regression walk-forward on annual debt growth (1901+, one-year-ahead, 85 out-of-sample years; see `POLITICAL_MODEL_COMPARISON.csv` and `data/political-evaluation.json`). Result: **they do not improve out-of-sample prediction** — every political feature set underperformed the purely autoregressive baseline (MAE 0.056–0.060 vs 0.040 in log-growth terms). This matches the economic prior: debt dynamics are driven by inherited budgets, economic conditions, and emergencies more than by party control alone. Political variables are therefore used for segmentation and historical interpretability in the UI, not in the production forecast, and none of this analysis measures causation.

## Scenario engine

The Scenario Lab is a deterministic annual cash-flow identity, explicitly distinct from the validated forecast models: interest = average rate × start-of-year debt; total outlays = primary outlays + interest (the baseline outlay total is split once so interest is never double-counted); deficit = outlays − receipts; surpluses reduce debt. Users set real growth rates plus inflation; nominal paths compound both ((1+real)(1+inflation)−1), and real outputs are restated in 2025 dollars by deflating cumulative scenario inflation. Starting conditions come from committed Treasury, BEA, OMB, and Census snapshots — nothing is hard-coded.

## Validation and revision policy

Automated checks reject duplicate or non-increasing dates, invalid numbers, short coverage, Treasury component mismatches, sparse base-year CPI, and implausible macro baselines. Official upstream revisions are accepted on refresh, then validated and reviewed in source control; snapshot commits make every change auditable. The scheduled refresh workflow commits only after validation, evaluation, and tests pass.
