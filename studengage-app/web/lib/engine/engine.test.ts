import { describe, expect, it } from "vitest";
import { closesAt, isEligible, matchCriteria } from "./filter";
import { scheduleFit, sessionFit, TRAVEL_MINUTES } from "./schedule";
import { scoreOpportunity, tagWeights, WEIGHTS } from "./score";
import { claudeScorer, formulaScorer, getScorer } from "./scorer";
import type { Opportunity, ScheduleBlock, Student } from "./types";

// 2026-10-12 is a Monday.
const NOW = new Date("2026-10-10T09:00");

const student = (over: Partial<Student> = {}): Student => ({
  id: 1, name: "Test", level: "undergrad", faculty: "Science", program: "Chemistry", year: 3, status: "full",
  residency: "domestic", campus: "Harbour", gpa: 3.5, coop: false, inResidence: false, lat: 44.6366, lon: -63.5917,
  interests: ["research", "career"], equityGroups: [], ...over,
});

const opp = (over: Partial<Opportunity> = {}): Opportunity => ({
  id: 10, title: "Talk", type: "event", description: "", department: "Science", campus: "Harbour", building: null,
  lat: 44.6366, lon: -63.5917, mode: "in_person", sessions: [{ start: "2026-10-12T17:00", end: "2026-10-12T18:00" }],
  deadline: null, tags: ["research"], required: {}, preferred: {}, ...over,
});

const block = (day: number, start: string, end: string, campus = "Harbour"): ScheduleBlock => ({ day, start, end, label: "CHEM 3401", campus });

describe("filter", () => {
  it("requires every set criterion", () => {
    expect(isEligible(student(), opp({ required: { programs: ["Chemistry"], years: [3] } }), NOW).ok).toBe(true);
    const r = isEligible(student(), opp({ required: { levels: ["grad"] } }), NOW);
    expect(r).toMatchObject({ ok: false, reason: "not_eligible", failed: ["levels"] });
  });

  it("uses equity groups only as opt-in eligibility", () => {
    const bursary = opp({ required: { equityGroups: ["Student parents"] } });
    expect(isEligible(student(), bursary, NOW).ok).toBe(false);
    expect(isEligible(student({ equityGroups: ["Student parents"] }), bursary, NOW).ok).toBe(true);
  });

  it("min GPA fails when GPA is unknown", () => {
    expect(matchCriteria(student({ gpa: null }), { minGpa: 3 }).failed).toEqual(["minGpa"]);
  });

  it("excludes closed postings and passed deadlines", () => {
    expect(isEligible(student(), opp({ sessions: [{ start: "2026-10-01T10:00", end: "2026-10-01T11:00" }] }), NOW)).toMatchObject({ reason: "closed" });
    const rsvpPassed = opp({ deadline: "2026-10-09T23:59" });
    expect(isEligible(student(), rsvpPassed, NOW)).toMatchObject({ ok: false, reason: "deadline_passed" });
    expect(closesAt(opp({ sessions: [], deadline: null }))).toBeNull();
  });
});

describe("schedule", () => {
  const s = { start: "2026-10-12T11:30", end: "2026-10-12T12:30" };

  it("fits when nothing overlaps", () => {
    expect(sessionFit(s, [block(1, "09:00", "10:00")], "Harbour", "in_person").fit).toBe("fits");
  });

  it("applies a travel buffer only between different campuses", () => {
    const blocks = [block(1, "10:00", "11:20", "Northshore")];
    expect(sessionFit(s, blocks, "Harbour", "in_person")).toMatchObject({ fit: "partial", overlapMinutes: 10 });
    expect(sessionFit(s, [block(1, "10:00", "11:20", "Harbour")], "Harbour", "in_person").fit).toBe("fits");
    expect(sessionFit(s, blocks, "Harbour", "online").fit).toBe("fits");
    expect(TRAVEL_MINUTES).toBe(20);
  });

  it("detects a full clash and labels it", () => {
    const r = scheduleFit([s], [block(1, "11:00", "13:00")], "Harbour", "in_person", NOW);
    expect(r).toMatchObject({ fit: "conflict", label: "Clashes with CHEM 3401" });
  });

  it("labels a partial overlap", () => {
    const r = scheduleFit([s], [block(1, "11:00", "12:00")], "Harbour", "in_person", NOW);
    expect(r.fit).toBe("partial");
    expect(r.label).toBe("Overlaps CHEM 3401 until 12 PM");
  });

  it("counts recurring sessions that fit (3 of 4)", () => {
    const sessions = [
      { start: "2026-10-12T16:00", end: "2026-10-12T17:00" },
      { start: "2026-10-19T16:00", end: "2026-10-19T17:00" },
      { start: "2026-10-27T16:00", end: "2026-10-27T17:00" }, // a Tuesday, during class
      { start: "2026-11-02T16:00", end: "2026-11-02T17:00" },
    ];
    const r = scheduleFit(sessions, [block(2, "15:30", "17:30")], "Harbour", "in_person", NOW);
    expect(r).toMatchObject({ fit: "partial", upcomingSessions: 4, fittingSessions: 3, label: "3 of 4 sessions fit your schedule" });
    expect(scheduleFit(sessions.slice(0, 2), [], "Harbour", "in_person", NOW).label).toBe("All 2 sessions fit your schedule");
  });

  it("returns na for undated items", () => {
    expect(scheduleFit([], [], null, "in_person", NOW).fit).toBe("na");
  });
});

describe("score", () => {
  it("weights sum to 1", () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });

  it("feedback moves tag weights", () => {
    const w = tagWeights(student(), [{ oppId: 1, tags: ["research", "tech"], feedback: "not_interested" }]);
    expect(w.research).toBeCloseTo(0.6);
    expect(w.tech).toBeCloseTo(-0.4);
  });

  it("gives a perfect match a high score with readable reasons", () => {
    const o = opp({ tags: ["research", "career"], sessions: [{ start: "2026-10-11T17:00", end: "2026-10-11T18:00" }] });
    const st = student();
    const schedule = scheduleFit(o.sessions, [], o.campus, o.mode, NOW);
    const r = scoreOpportunity({ student: st, opp: o, schedule, weights: tagWeights(st, []), peerInterest: 0.5, now: NOW });
    expect(r.components.interest).toBe(1);
    expect(r.components.popularity).toBe(1);
    expect(r.score).toBeGreaterThan(0.9);
    expect(r.reasons[0]).toBe("Matches your interest in research and career");
    expect(r.reasons.length).toBeLessThanOrEqual(3);
  });

  it("always shows a schedule problem among the reasons", () => {
    const o = opp({ tags: ["research", "career"] });
    const schedule = scheduleFit(o.sessions, [block(1, "16:30", "17:30")], o.campus, o.mode, NOW);
    const r = scoreOpportunity({ student: student(), opp: o, schedule, weights: tagWeights(student(), []), peerInterest: 0.5, now: NOW });
    expect(r.reasons).toContain(schedule.label);
  });

  it("online events get full distance score", () => {
    const o = opp({ mode: "online", lat: null, lon: null });
    const schedule = scheduleFit(o.sessions, [], null, "online", NOW);
    const r = scoreOpportunity({ student: student({ lat: 45.09, lon: -64.36 }), opp: o, schedule, weights: {}, peerInterest: 0, now: NOW });
    expect(r.components.distance).toBe(1);
  });
});

describe("scorer", () => {
  it("sorts into feed / conflicts / dismissed and counts exclusions", () => {
    const opps = [
      opp({ id: 1, tags: ["research"] }),
      opp({ id: 2, tags: ["career"], sessions: [{ start: "2026-10-12T10:00", end: "2026-10-12T11:00" }] }),
      opp({ id: 3, tags: ["tech"] }),
      opp({ id: 4, required: { levels: ["grad"] } }),
    ];
    const r = formulaScorer.rank({
      student: student(),
      blocks: [block(1, "09:30", "11:30")],
      opportunities: opps,
      feedback: [{ oppId: 3, tags: ["tech"], feedback: "not_interested" }],
      peerInterest: new Map(),
      now: NOW,
    });
    expect(r.feed.map((s) => s.oppId)).toEqual([1]);
    expect(r.conflicts.map((s) => s.oppId)).toEqual([2]);
    expect(r.dismissed.map((s) => s.oppId)).toEqual([3]);
    expect(r.excluded).toBe(1);
  });

  it("formula is the default scorer; the Claude slot is not wired", () => {
    expect(getScorer().id).toBe("formula");
    expect(() => claudeScorer.rank({} as never)).toThrow();
  });
});
