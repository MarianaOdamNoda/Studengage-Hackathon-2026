import type { Criteria, Opportunity, Student } from "./types";

export type CriteriaField = keyof Criteria;

/** Which criteria fields are set, and which of those the student satisfies. */
export function matchCriteria(student: Student, c: Criteria) {
  const checks: [CriteriaField, boolean][] = [];
  const has = <T,>(arr: T[] | undefined): arr is T[] => !!arr && arr.length > 0;

  if (has(c.levels)) checks.push(["levels", c.levels.includes(student.level)]);
  if (has(c.faculties)) checks.push(["faculties", c.faculties.includes(student.faculty)]);
  if (has(c.programs)) checks.push(["programs", c.programs.includes(student.program)]);
  if (has(c.years)) checks.push(["years", c.years.includes(student.year)]);
  if (has(c.status)) checks.push(["status", c.status.includes(student.status)]);
  if (has(c.residency)) checks.push(["residency", c.residency.includes(student.residency)]);
  if (has(c.campuses)) checks.push(["campuses", c.campuses.includes(student.campus)]);
  if (c.minGpa != null) checks.push(["minGpa", student.gpa != null && student.gpa >= c.minGpa]);
  if (c.coop != null) checks.push(["coop", student.coop === c.coop]);
  if (c.inResidence != null) checks.push(["inResidence", student.inResidence === c.inResidence]);
  if (has(c.equityGroups))
    checks.push(["equityGroups", c.equityGroups.some((g) => student.equityGroups.includes(g))]);

  return {
    total: checks.length,
    matched: checks.filter(([, ok]) => ok).length,
    failed: checks.filter(([, ok]) => !ok).map(([f]) => f),
  };
}

/** Last moment the opportunity is still actionable. */
export function closesAt(opp: Opportunity): Date | null {
  const ends = opp.sessions.map((s) => new Date(s.end).getTime());
  const candidates = [...ends];
  if (opp.deadline) candidates.push(new Date(opp.deadline).getTime());
  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates));
}

/**
 * Hard rules. No scoring, no learning: either the student may take part or not.
 * Equity-group criteria are only ever evaluated here.
 */
export function isEligible(student: Student, opp: Opportunity, now: Date) {
  const close = closesAt(opp);
  if (close && close.getTime() < now.getTime()) return { ok: false, reason: "closed" as const };
  if (opp.deadline && new Date(opp.deadline).getTime() < now.getTime())
    return { ok: false, reason: "deadline_passed" as const };
  const m = matchCriteria(student, opp.required);
  if (m.failed.length > 0) return { ok: false, reason: "not_eligible" as const, failed: m.failed };
  return { ok: true as const };
}
