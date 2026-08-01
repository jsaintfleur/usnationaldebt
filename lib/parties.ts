/** Shared party color mapping across all party systems since 1789 (client-safe). */
const PARTY_COLORS: Record<string, string> = {
  democratic: "#2f6fd6",
  republican: "#d64a4a",
  "democratic-republican": "#2e8b57",
  federalist: "#8065c9",
  whig: "#c9884a",
  jacksonian: "#2f6fd6",
  unaffiliated: "#8a93a3",
};

export function partyColor(name: string): string {
  const k = name.toLowerCase();
  for (const key of Object.keys(PARTY_COLORS)) if (k.startsWith(key) || k.includes(key)) return PARTY_COLORS[key];
  if (k.includes("pro-admin")) return PARTY_COLORS.federalist;
  if (k.includes("anti-admin")) return PARTY_COLORS["democratic-republican"];
  if (k.includes("anti-jackson") || k.includes("opposition")) return PARTY_COLORS.whig;
  if (k.includes("democrat")) return PARTY_COLORS.democratic;
  return "#8a93a3";
}
