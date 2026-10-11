import type { Mode, ScheduleBlock, ScheduleResult, Session } from "./types";

/** Minutes to get between two different campuses. Same campus = 0. */
export const TRAVEL_MINUTES = 20;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function fmtClock(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const h12 = ((h + 11) % 12) + 1;
  const suffix = h < 12 ? "AM" : "PM";
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

export interface SessionFit {
  fit: "fits" | "partial" | "conflict";
  overlapMinutes: number;
  clash?: { label: string; until: number };
}

/** How one session sits against the student's weekly timetable. */
export function sessionFit(
  session: Session,
  blocks: ScheduleBlock[],
  oppCampus: string | null,
  mode: Mode,
): SessionFit {
  const start = new Date(session.start);
  const s = minutesOfDay(start);
  const e = s + Math.round((new Date(session.end).getTime() - start.getTime()) / 60000);
  const day = start.getDay();

  // Mark every busy minute (class + travel buffer), so overlapping blocks aren't double-counted.
  const busy = new Uint8Array(24 * 60 + 1);
  let clash: SessionFit["clash"];
  for (const b of blocks) {
    if (b.day !== day) continue;
    const travel =
      mode === "online" || !oppCampus || b.campus === oppCampus ? 0 : TRAVEL_MINUTES;
    const bs = Math.max(0, toMinutes(b.start) - travel);
    const be = Math.min(24 * 60, toMinutes(b.end) + travel);
    if (bs < e && be > s) {
      if (!clash || be > clash.until) clash = { label: b.label, until: be };
      for (let m = Math.max(bs, s); m < Math.min(be, e); m++) busy[m] = 1;
    }
  }
  const overlap = busy.reduce((n, v) => n + v, 0);
  const length = Math.max(1, e - s);
  if (overlap === 0) return { fit: "fits", overlapMinutes: 0 };
  if (overlap >= length) return { fit: "conflict", overlapMinutes: overlap, clash };
  return { fit: "partial", overlapMinutes: overlap, clash };
}

/** Aggregate over all upcoming sessions and produce the label shown on the card. */
export function scheduleFit(
  sessions: Session[],
  blocks: ScheduleBlock[],
  oppCampus: string | null,
  mode: Mode,
  now: Date,
): ScheduleResult {
  const upcoming = sessions.filter((s) => new Date(s.end).getTime() > now.getTime());
  if (upcoming.length === 0)
    return { fit: "na", label: null, upcomingSessions: 0, fittingSessions: 0 };

  const fits = upcoming.map((s) => ({ s, f: sessionFit(s, blocks, oppCampus, mode) }));
  const ok = fits.filter((x) => x.f.fit === "fits");
  const partial = fits.filter((x) => x.f.fit === "partial");
  const base = { upcomingSessions: upcoming.length, fittingSessions: ok.length };

  if (upcoming.length > 1) {
    if (ok.length === upcoming.length)
      return { ...base, fit: "fits", label: `All ${upcoming.length} sessions fit your schedule` };
    if (ok.length === 0 && partial.length === 0)
      return { ...base, fit: "conflict", label: "Every session clashes with your classes" };
    return {
      ...base,
      fit: "partial",
      label: `${ok.length} of ${upcoming.length} sessions fit your schedule`,
    };
  }

  const { s, f } = fits[0];
  const start = new Date(s.start);
  const day = DAYS[start.getDay()];
  const sm = minutesOfDay(start);
  const em = minutesOfDay(new Date(s.end));
  if (f.fit === "fits")
    return { ...base, fit: "fits", label: `Fits your free time ${day} ${fmtClock(sm)}–${fmtClock(em)}` };
  if (f.fit === "conflict")
    return { ...base, fit: "conflict", label: `Clashes with ${f.clash?.label ?? "a class"}` };
  return {
    ...base,
    fit: "partial",
    label: `Overlaps ${f.clash?.label ?? "a class"} until ${fmtClock(f.clash?.until ?? em)}`,
  };
}
