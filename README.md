# DebtScope AI

DebtScope AI is a premium, nonpartisan U.S. national-debt intelligence platform. It combines a current Treasury snapshot, a comparable historical series, administration-period calculations, transparent forecasts, and an interactive scenario laboratory.

**Live production:** [debtscope-ai.vercel.app](https://debtscope-ai.vercel.app)

## Architecture

- Next.js 16 App Router and TypeScript
- Server-rendered analytical pages and typed JSON route handlers
- Dependency-free accessible SVG charts
- Official source snapshots committed for resilient and reproducible builds
- Refresh and validation scripts suitable for scheduled GitHub Actions
- Vercel-ready single-service deployment

## Data sources

- U.S. Treasury Fiscal Data, **Debt to the Penny**: daily total, public, and intragovernmental debt
- Federal Reserve Bank of St. Louis, **GFDEBTN**: quarterly Treasury total-public-debt series
- BEA GDP and BLS CPI via FRED are documented future integrations

No production value is fabricated. Snapshot files are exact upstream responses and retain source dates. See [DATA_SOURCES.md](DATA_SOURCES.md) and [METHODOLOGY.md](METHODOLOGY.md).

## Local setup

```bash
npm install
npm run data:validate
npm test
npm run dev
```

Open `http://localhost:3000`. No environment variable is required for the included sources. An optional `FRED_API_KEY` is reserved for future multi-series ingestion.

## Data ingestion

```bash
npm run data:refresh
npm run data:validate
```

The refresh command downloads official Treasury/FRED data. The validator checks numeric integrity, duplicates, date ordering, minimum coverage, and component reconciliation.

## Quality gates

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## API

- `GET /api/latest`
- `GET /api/history?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `GET /api/administrations`
- `GET /api/forecast?years=20`
- `GET /api/scenario?years=10&spendingGrowth=5&revenueGrowth=4`
- `GET /api/sources`

## Deployment

Import the repository in Vercel. Framework detection and build settings require no override. Run `npm run build`, output `.next`, Node.js 22. Preview and production deploys are supported without secrets.

## Limitations

The embedded comparable historical series begins in 1966, so pre-Johnson administrations are not presented. Quarterly transition proxies are used. GDP, CPI, deficits, interest expense, recession months, and official CBO projections are documented but not yet integrated. The forecast band is a sensitivity range rather than a statistically calibrated confidence interval. See [MODEL_CARD.md](MODEL_CARD.md).

## License

MIT. Government source data is public domain; source-specific terms still apply.
