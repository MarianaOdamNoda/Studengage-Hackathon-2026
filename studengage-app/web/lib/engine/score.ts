import { matchCriteria } from "./filter";
import type { Component, Feedback, Fit, Opportunity, ScheduleResult, Student } from "./types";

/** Agreed weights. They sum to 1, so a score is always between 0 and 1. */
export const WEIGHTS: Record<Component, number> = {
  interest: 0.35,
  schedule: 0.2,
  urgency: 0.15,
  distance: 0.1,
  preferred: 0.1,
  popularity: 0.1,
};

/** How much one piece of feedback moves the weight of each tag on that opportunity. */
export const FEEDBACK_DELTA = {
  interested: 0.3,
  not_interested: -0.4,
  attended: 0.5,
  not_attended: -0.1,
} as const;

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const DAY = 86_400_000;

/** Declared interests start at 1; explicit feedback nudges tags up or down. */
export function tagWeights(student: Student, feedback: Feedback[]) {
  const w: Record<string, number> = {};
  for (const t of student.interests) w[t] = 1;
  for (const f of feedback) {
    const delta =
      (f.feedback ? FEEDBACK_DELTA[f.feedback] : 0) +
      (f.attendance ? FEEDBACK_DELTA[f.attendance] : 0);
    if (!delta) continue;
    for (const t of f.tags) w[t] = clamp((w[t] ?? 0) + delta, -1, 2);
  }
  return w;
}

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(bLat - aLat);
  const dLon = r(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const SCHEDULE_VALUE: Record<Fit, number> = { fits: 1, na: 0.8, partial: 0.4, conflict: 0 };

export interface ScoreInput {
  student: Student;
  opp: Opportunity;
  schedule: ScheduleResult;
  weights: Record<string, number>;
  /** Share (0–1) of students in the same program who marked this interested. */
  peerInterest: number;
  now: Date;
}

/** The formula. Every component is 0–1 and comes with a human-readable reason. */
export function scoreOpportunity({ student, opp, schedule, weights, peerInterest, now }: ScoreInput) {
  const reasons: Partial<Record<Component, string>> = {};

  // Interest: sum of the student's tag weights over the posting's tags; two strong matches = full marks.
  const matched = opp.tags.filter((t) => (weights[t] ?? 0) > 0);
  const raw = opp.tags.reduce((n, t) => n + (weights[t] ?? 0), 0);
  const interest = clamp(raw / 2);
  if (matched.length) reasons.interest = `Matches your interest in ${matched.slice(0, 2).join(" and ")}`;

  const scheduleScore = SCHEDULE_VALUE[schedule.fit];
  if (schedule.label) reasons.schedule = schedule.label;

  // Urgency: the nearer the deadline (or first session), the higher. Nothing dated = low, steady value.
  const firstSession = opp.sessions
    .map((s) => new Date(s.start).getTime())
    .filter((t) => t > now.getTime())
    .sort((a, b) => a - b)[0];
  const due = opp.deadline ? new Date(opp.deadline).getTime() : firstSession;
  let urgency = 0.3;
  if (due) {
    const days = (due - now.getTime()) / DAY;
    urgency = days <= 2 ? 1 : days >= 21 ? 0.2 : 1 - ((days - 2) / 19) * 0.8;
    const n = Math.max(0, Math.ceil(days));
    const when = n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
    reasons.urgency = opp.deadline ? `Deadline ${when}` : `Starts ${when}`;
  }

  let distance = 1;
  if (opp.mode === "online") {
    reasons.distance = "Online — join from anywhere";
  } else if (opp.lat != null && opp.lon != null) {
    const km = haversineKm(student.lat, student.lon, opp.lat, opp.lon);
    distance = clamp(1 - km / 25);
    reasons.distance = km < 1 ? "Less than 1 km from you" : `${km.toFixed(1)} km from you`;
  }

  const pm = matchCriteria(student, opp.preferred);
  const preferred = pm.total === 0 ? 0.5 : pm.matched / pm.total;
  if (pm.total > 0 && pm.matched > 0) reasons.preferred = `${opp.department} is especially looking for students like you`;

  const popularity = clamp(peerInterest * 3);
  if (peerInterest >= 0.15) reasons.popularity = `Popular with ${student.program} students`;

  const components: Record<Component, number> = {
    interest,
    schedule: scheduleScore,
    urgency,
    distance,
    preferred,
    popularity,
  };
  const score = (Object.keys(WEIGHTS) as Component[]).reduce((n, k) => n + WEIGHTS[k] * components[k], 0);

  // Top three reasons by actual contribution to the score. Schedule clashes are always shown.
  const ranked = (Object.keys(WEIGHTS) as Component[])
    .filter((k) => reasons[k])
    .sort((a, b) => WEIGHTS[b] * components[b] - WEIGHTS[a] * components[a]);
  const top = ranked.slice(0, 3);
  if (schedule.fit !== "fits" && reasons.schedule && !top.includes("schedule")) top[2] = "schedule";

  return {
    score: Math.round(score * 1000) / 1000,
    components,
    reasons: top.filter(Boolean).map((k) => reasons[k]!),
  };
}
