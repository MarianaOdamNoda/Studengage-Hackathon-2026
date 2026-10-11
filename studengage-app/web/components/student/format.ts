import type { OpportunityVM } from "@/lib/contracts";
import { fmtWhen } from "@/components/ui";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Tue, Oct 14 · 4 PM–6 PM" (end time only when on the same day). */
export function fmtSession(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime())) return start;
  const sameDay = s.toDateString() === e.toDateString();
  const endTime = e.toLocaleTimeString("en-CA", { hour: "numeric", minute: e.getMinutes() ? "2-digit" : undefined });
  return sameDay ? `${fmtWhen(start)}–${endTime}` : `${fmtWhen(start)} → ${fmtWhen(end)}`;
}

export function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** Sessions that haven't ended yet; falls back to all sessions when everything is past. */
export function upcomingSessions(opp: OpportunityVM, now = Date.now()) {
  const up = opp.sessions.filter((s) => new Date(s.end).getTime() >= now);
  return up.length ? up : opp.sessions;
}

export function fmtPlace(opp: OpportunityVM) {
  if (opp.mode === "online") return "Online";
  const where = [opp.building, opp.campus ? `${opp.campus} campus` : null].filter(Boolean).join(", ");
  if (opp.mode === "hybrid") return where ? `${where} or online` : "Hybrid";
  return where || "Location to be announced";
}

export function fmtCost(cost: number) {
  return cost > 0 ? `$${cost.toFixed(cost % 1 ? 2 : 0)}` : "Free";
}

export function timeAgo(iso: string, now = Date.now()) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const m = Math.round((now - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} d ago`;
}
