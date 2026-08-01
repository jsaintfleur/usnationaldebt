/**
 * Refresh every committed data snapshot from its authoritative source.
 *
 * Sources (all public, no API key required):
 *  - U.S. Treasury Fiscal Data "Debt to the Penny" (daily debt, exact transition balances)
 *  - FRED CSV exports: GFDEBTN (quarterly debt), CPIAUCSL (BLS CPI-U), GDP (BEA nominal GDP),
 *    POPTHM (Census population), FYFR / FYONET (OMB annual federal receipts / net outlays)
 *
 * Snapshots are committed to git so builds are reproducible and refreshes are auditable.
 * Every fetch has a hard timeout; any failure aborts the whole refresh (the scheduled
 * workflow only commits results after validation passes).
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const TIMEOUT_MS = 30_000;

async function get(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "DebtScopeAI/2.0 research" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

const fredCsv = (id: string) => `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;

const TREASURY_DTP =
  "https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny";

/** Latest five daily observations (upstream response stored verbatim). */
const latestUrl = `${TREASURY_DTP}?sort=-record_date&page%5Bsize%5D=5`;

/**
 * Administration transition dates for which Treasury daily data exists.
 * Debt to the Penny coverage begins 1993-04-01, so the earliest exact
 * boundary is the 2001 inauguration; earlier boundaries use quarter-end proxies.
 */
const TRANSITION_DATES = ["2001-01-20", "2009-01-20", "2017-01-20", "2021-01-20", "2025-01-20"];

async function exactBalanceOnOrBefore(date: string) {
  const url = `${TREASURY_DTP}?filter=record_date:lte:${date}&sort=-record_date&page%5Bsize%5D=1&fields=record_date,tot_pub_debt_out_amt`;
  const body = JSON.parse(await get(url));
  const row = body.data?.[0];
  if (!row) throw new Error(`No Treasury daily observation on or before ${date}`);
  return { boundary: date, recordDate: row.record_date as string, total: Number(row.tot_pub_debt_out_amt) };
}

async function main() {
  const files: Array<[string, Promise<string>]> = [
    ["data/debt-latest.json", get(latestUrl)],
    ["data/historical-debt.csv", get(fredCsv("GFDEBTN"))],
    ["data/cpi.csv", get(fredCsv("CPIAUCSL"))],
    ["data/gdp.csv", get(fredCsv("GDP"))],
    ["data/population.csv", get(fredCsv("POPTHM"))],
    ["data/fiscal-receipts.csv", get(fredCsv("FYFR"))],
    ["data/fiscal-outlays.csv", get(fredCsv("FYONET"))],
  ];

  const transitionsPromise = Promise.all(TRANSITION_DATES.map(exactBalanceOnOrBefore));

  const written = await Promise.all(
    files.map(async ([file, body]) => {
      await fs.writeFile(path.join(root, file), await body);
      return file;
    }),
  );

  const transitions = await transitionsPromise;
  await fs.writeFile(
    path.join(root, "data/transitions.json"),
    JSON.stringify(
      {
        note: "Exact Treasury Debt to the Penny total on the last business day on or before each administration transition. Boundaries before 1993-04-01 have no daily coverage and use quarter-end proxies instead.",
        source: TREASURY_DTP,
        fetchedAt: new Date().toISOString(),
        transitions,
      },
      null,
      2,
    ),
  );

  await fs.writeFile(
    path.join(root, "data/refresh-meta.json"),
    JSON.stringify(
      {
        refreshedAt: new Date().toISOString(),
        files: [...written, "data/transitions.json"],
        sources: {
          treasury: "Debt to the Penny (fiscaldata.treasury.gov)",
          fred: ["GFDEBTN", "CPIAUCSL", "GDP", "POPTHM", "FYFR", "FYONET"],
        },
      },
      null,
      2,
    ),
  );

  console.log(`Refreshed ${written.length + 1} official snapshots.`);
}

main().catch((err) => {
  console.error("Refresh failed:", err);
  process.exit(1);
});
