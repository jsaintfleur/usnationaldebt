/**
 * Deterministic compact currency formatter. Intl compact notation differs
 * across ICU builds (Node vs browsers), which caused SSR hydration mismatches
 * ("$5.8B" vs "$5.80B"), so the scaling is done explicitly.
 */
const UNITS: Array<[number, string]> = [
  [1e12, "T"],
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"],
];

export const money = (n: number): string => {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  for (const [value, suffix] of UNITS) {
    if (abs >= value) {
      const scaled = (abs / value).toFixed(2).replace(/\.?0+$/, "");
      return `${sign}$${scaled}${suffix}`;
    }
  }
  return `${sign}$${abs.toFixed(0)}`;
};

export const pct = (n: number): string => `${n.toFixed(1)}%`;
