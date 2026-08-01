# Model card — CAGR rolling-origin baseline

- **Version:** `cagr-walkforward-2026.08`
- **Target:** next annual total public debt level.
- **Training data:** Treasury GFDEBTN quarterly observations sampled annually; trailing ten annual steps estimate growth.
- **Candidates:** last value, last growth, trailing ten-year CAGR.
- **Validation:** expanding-window rolling origin after a 20-observation minimum. MAE, RMSE, MAPE, and bias are available through `/api/model-metrics`; local evaluation exports `.artifacts/model-comparison.csv`.
- **Uncertainty:** 5th/95th percentiles of out-of-sample residuals, scaled by square root of horizon. This is an empirical 90% interval, not a guarantee.
- **Political features:** not retained. The available sample is insufficient to establish stable incremental predictive value across changing political eras.
- **Intended use:** transparent baseline and comparison, not official budget forecasting or causal analysis.
- **Risks:** structural fiscal breaks, legislation, inflation, recessions, wars, and interest regimes can invalidate trend persistence.
- **Update:** quarterly after validation; do not retrain when validation fails.
