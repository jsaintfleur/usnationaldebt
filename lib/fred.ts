import fs from "node:fs";
import path from "node:path";

/**
 * Parse a committed FRED CSV snapshot (`observation_date,VALUE` header row,
 * one ISO-dated observation per line). Missing observations are marked "." by
 * FRED and are skipped explicitly rather than coerced to zero.
 */
export function readFredCsv(file: string): Array<{ date: string; value: number }> {
  const text = fs.readFileSync(path.join(process.cwd(), file), "utf8").trim();
  return text
    .split("\n")
    .slice(1)
    .map((line) => {
      const [date, raw] = line.split(",");
      // FRED marks missing observations with "." or an empty cell; Number("")
      // would silently coerce those to 0, so they are dropped explicitly.
      const trimmed = (raw ?? "").trim();
      return { date, value: trimmed === "" || trimmed === "." ? NaN : Number(trimmed) };
    })
    .filter((row) => Number.isFinite(row.value));
}

/** Latest observation whose date is on or before `date` (null if none). */
export function atOrBefore(
  series: Array<{ date: string; value: number }>,
  date: string,
): { date: string; value: number } | null {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].date <= date) return series[i];
  }
  return null;
}
