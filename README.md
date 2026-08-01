# DebtScope AI

DebtScope AI is a nonpartisan U.S. national-debt intelligence platform: every official federal debt record since 1790 on an interactive timeline with political-control context, administration-period calculations for all 47 presidencies with exact transition balances, nominal and inflation-adjusted views, walk-forward-validated trend forecasts with empirical uncertainty ranges, and a clearly labeled deterministic scenario laboratory.

**Live production:** [debtscope-ai.vercel.app](https://debtscope-ai.vercel.app)

## What "AI" means here — honestly

Forecasts come from transparent statistical time-series models selected by **rolling-origin walk-forward validation** against naive baselines (160 historical origins; selection by out-of-sample MASE; the winner must beat the best naive baseline). Uncertainty ranges are empirical out-of-sample error quantiles with verified holdout coverage. The Scenario Lab is a deterministic fiscal calculator and is labeled as such. There are no neural networks and no black boxes. Full details: [MODEL_CARD.md](MODEL_CARD.md), [METHODOLOGY.md](METHODOLOGY.md), [MODEL_COMPARISON.csv](MODEL_COMPARISON.csv).

## Architecture

- Next.js 16 App Router + TypeScript, single-service Vercel deployment
- Committed authoritative snapshots (Treasury Fiscal Data + FRED: BLS, BEA, OMB, Census) for reproducible builds — see [DATA_SOURCES.md](DATA_SOURCES.md) and [DATA_LINEAGE.md](DATA_LINEAGE.md)
- `scripts/refresh-data.ts` → `scripts/validate-data.ts` → `scripts/evaluate-models.ts` pipeline; the scheduled workflow commits refreshed data only when validation, evaluation, and tests pass
- Production forecasts are generated from the committed, versioned evaluation artifact (`data/model-evaluation.json`); model version, data-through date, and interval coverage are displayed in the UI and returned by the API
- Nominal and inflation-adjusted (2025-dollar, BLS CPI-U) views for history, administrations, and scenarios — every real figure states its base year; real values before CPI coverage (1913) are shown as unavailable, never fabricated
- Deep history: Treasury annual records from 1790, quarterly from 1966, daily from 1993, tier-labeled; interactive charts (zoom/pan/log/exports) with recession shading, presidential and congressional control strips, and event annotations
- Political control (1st–119th Congress) compiled from official party-division tables with anchor tests; evaluated as ML features (finding: no out-of-sample predictive gain — see `POLITICAL_MODEL_COMPARISON.csv`) and used for descriptive context only

## Local setup

```bash
npm install
npm run data:validate
npm run models:evaluate
npm test
npm run dev
```

Open `http://localhost:3000`. No environment variables are required.

## Pipeline

```bash
npm run data:refresh      # rewrite all snapshots from Treasury/FRED
npm run data:validate     # data-quality gate (must pass before commit)
npm run models:evaluate   # walk-forward evaluation → data/model-evaluation.json + MODEL_COMPARISON.csv
```

## Quality gates

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

CI runs all of the above plus a from-scratch re-derivation of the evaluation artifact on every push.

## API

- `GET /api/latest`
- `GET /api/history?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `GET /api/administrations` — nominal + real (2025 $) fields, boundary provenance
- `GET /api/forecast?years=20` — production model output with full metadata
- `GET /api/scenario?years=10&realSpendingGrowth=2&realRevenueGrowth=1.5&inflation=2.3&interestRate=3.3&realGdpGrowth=1.9`
- `GET /api/history?resolution=annual|quarterly|daily|auto` — tiered history back to 1790
- `GET /api/political?date=YYYY-MM-DD` — president, chamber control, unified/divided (1789+)
- `GET /api/sources`

## Audit trail

This application was audited end-to-end as an ML product; see [ML_AUDIT.md](ML_AUDIT.md) (verdict, maturity scores before/after) and [ML_GAP_REGISTER.md](ML_GAP_REGISTER.md) (every gap, severity, and status).

## Limitations

The comparable series begins 1966-Q1, so administrations beginning earlier are excluded. Models are univariate trend models; they do not represent legislation, debt-ceiling mechanics, or recessions (see the MODEL_CARD roadmap). October 2025 CPI was never published by BLS (federal shutdown) and is handled explicitly. Model forecasts are not official government projections.

## License

MIT. Government source data is public domain; source-specific terms still apply.
