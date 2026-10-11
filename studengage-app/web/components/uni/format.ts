export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;

export const num = (x: number, digits = 1) =>
  Number.isInteger(x) ? x.toLocaleString("en-CA") : x.toLocaleString("en-CA", { maximumFractionDigits: digits });

export const signedPct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))}%`;

export const MODE_LABEL = { in_person: "In person", online: "Online", hybrid: "Hybrid" } as const;
