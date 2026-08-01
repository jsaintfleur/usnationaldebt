# Model card — trailing-growth baseline

- **Intended use:** transparent national-debt scenario baseline at 1–20 year horizons.
- **Training data:** quarterly GFDEBTN observations; most recent ten years determine the production growth parameter.
- **Features:** lagged debt endpoints and elapsed time only.
- **Validation design:** rolling-origin comparisons are the required promotion protocol; the current minimal release selects the model for interpretability and stability, not a claimed performance win.
- **Performance:** no numeric out-of-sample score is published until the automated evaluation artifact is added. The UI does not claim one.
- **Prediction horizon:** 1–20 years.
- **Uncertainty:** ±1.8 percentage-point annual-growth sensitivity paths; not formal prediction intervals.
- **Risks:** structural fiscal breaks, inflation regimes, recessions, legislation, wars, and interest costs can invalidate trend persistence.
- **Update schedule:** after quarterly GFDEBTN revisions; production promotion requires review.
