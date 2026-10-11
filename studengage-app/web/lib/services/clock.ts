/**
 * The services' notion of "now". Tests (and the seed's time-travel simulation) can pin it;
 * everything else just gets the wall clock.
 */
declare global {
  var __studengageNow: Date | undefined;
}

export function now(): Date {
  return globalThis.__studengageNow ? new Date(globalThis.__studengageNow) : new Date();
}

/** Pin the clock (pass null to go back to real time). Test/seed helper only. */
export function setNow(d: Date | null) {
  globalThis.__studengageNow = d ?? undefined;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local wall-clock ISO without seconds, e.g. "2026-10-14T16:00" (the format sessions use). */
export function localIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const DAY_MS = 86_400_000;
