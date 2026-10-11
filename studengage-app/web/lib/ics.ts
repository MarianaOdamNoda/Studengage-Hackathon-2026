/**
 * .ics → weekly timetable blocks. Every timed VEVENT becomes a weekly block on its weekday;
 * weekly RRULEs with BYDAY expand to one block per listed day. Duplicates collapse
 * (a term exported as one event per week gives the same block every week).
 */
import ical from "node-ical";
import type { ScheduleBlock } from "./engine/types";

const BYDAY: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function parseIcsToBlocks(text: string, campuses: string[], defaultCampus: string): ScheduleBlock[] {
  let parsed: ReturnType<typeof ical.sync.parseICS>;
  try {
    parsed = ical.sync.parseICS(text);
  } catch {
    throw new Error("That file isn't a readable calendar (.ics).");
  }
  const out = new Map<string, ScheduleBlock>();
  for (const comp of Object.values(parsed)) {
    if (!comp || comp.type !== "VEVENT") continue;
    const ev = comp as ical.VEvent;
    if (!(ev.start instanceof Date) || !(ev.end instanceof Date)) continue;
    if ((ev.start as { dateOnly?: boolean }).dateOnly || ev.datetype === "date") continue; // all-day
    const start = ev.start;
    const end = ev.end;
    const mins = (end.getTime() - start.getTime()) / 60000;
    if (mins <= 0 || mins > 12 * 60 || start.getDate() !== end.getDate()) continue;
    const summary = typeof ev.summary === "string" ? ev.summary : String((ev.summary as { val?: string })?.val ?? "Class");
    const location = typeof ev.location === "string" ? ev.location : "";
    const campus = campuses.find((c) => location.toLowerCase().includes(c.toLowerCase())) ?? defaultCampus;

    let days = [start.getDay()];
    const rule = ev.rrule?.origOptions;
    if (rule && rule.freq === 2 /* WEEKLY */ && rule.byweekday) {
      const list = Array.isArray(rule.byweekday) ? rule.byweekday : [rule.byweekday];
      const mapped = list
        .map((w) => (typeof w === "number" ? (w + 1) % 7 : typeof w === "string" ? BYDAY[w] : BYDAY[w.toString().slice(0, 2)]))
        .filter((d): d is number => d != null);
      if (mapped.length) days = mapped;
    }
    for (const day of days) {
      const b: ScheduleBlock = { day, start: hhmm(start), end: hhmm(end), label: summary.trim() || "Class", campus };
      out.set(`${b.day}|${b.start}|${b.end}|${b.label}`, b);
    }
  }
  return [...out.values()].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
}
