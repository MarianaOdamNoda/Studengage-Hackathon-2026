import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetTestDb } from "../../test/db";
import { db } from "../db";
import { parseCsv, toCsv } from "../csv";
import { DAY_MS } from "./clock";
import {
  addScheduleBlock,
  getDemoCsv,
  getFeed,
  getImpact,
  getPendingAttendance,
  getPostingStats,
  getStudentProfile,
  importCsv,
  importScheduleIcs,
  listNotifications,
  listPersonas,
  listPostingStats,
  previewCsv,
  publishOpportunity,
  resetDemo,
  setFeedback,
  updateStudentProfile,
} from "./index";

const persona = (first: string) => listPersonas().find((p) => p.name.startsWith(first))!;

beforeAll(() => {
  resetTestDb();
  resetDemo();
});
afterAll(() => resetTestDb());

describe("seed", () => {
  it("creates 6 personas and ~250 generated students", () => {
    expect(listPersonas()).toHaveLength(6);
    const n = (db().prepare(`SELECT COUNT(*) n FROM students`).get() as { n: number }).n;
    expect(n).toBe(256);
  });

  it("tells the persona stories", () => {
    const amara = persona("Amara");
    expect(getPendingAttendance(amara.id)).toHaveLength(1);
    expect(getFeed(amara.id).conflicts.length).toBeGreaterThan(0);
    for (const p of listPersonas().filter((p) => p.id !== amara.id)) expect(getPendingAttendance(p.id)).toHaveLength(0);

    const bursary = "Student Parent Bursary";
    const withBursary = listPersonas().filter((p) => getFeed(p.id).feed.some((i) => i.opportunity.title === bursary));
    expect(withBursary.map((p) => p.name)).toEqual(["Jordan Ellis"]);

    const liam = getFeed(persona("Liam").id);
    expect(liam.feed.some((i) => i.fit === "partial")).toBe(true);

    const tops = listPersonas().map((p) => getFeed(p.id).feed[0]?.opportunity.title);
    expect(new Set(tops).size).toBeGreaterThanOrEqual(5);
    expect(getFeed(amara.id).feed.every((i) => i.scorer === "formula")).toBe(true);
  });
});

describe("CSV", () => {
  it("round-trips quoting (commas, quotes, newlines)", () => {
    const rows = [["a", 'He said "hi", then left', "line1\nline2"], ["", "x", "y"]];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it("the demo CSV parses cleanly", () => {
    const { rows, errors } = previewCsv(getDemoCsv());
    expect(errors).toEqual([]);
    expect(rows.length).toBeGreaterThanOrEqual(28);
  });

  it("reports row-level errors with spreadsheet row numbers", () => {
    const csv = [
      "title,type,description,department,campus,sessions,deadline,tags,req_levels",
      'Good one,event,"Fine, really",Dept,Harbour,2030-01-07T10:00/2030-01-07T11:00,,career,',
      "Bad type,party,desc,Dept,Harbour,2030-01-07T10:00/2030-01-07T11:00,,career,",
      "No when,event,desc,Dept,Harbour,,,career,",
      "Bad tag,event,desc,Dept,Harbour,2030-01-07T10:00/2030-01-07T11:00,,juggling,",
      "Bad level,bursary,desc,Dept,,,2030-01-07,finance,phd",
      "Ends early,event,desc,Dept,Harbour,2030-01-07T10:00/2030-01-07T09:00,,career,",
    ].join("\n");
    const { rows, errors } = previewCsv(csv);
    expect(rows.map((r) => r.title)).toEqual(["Good one"]);
    expect(rows[0].description).toBe("Fine, really");
    expect(errors.map((e) => e.row)).toEqual([3, 4, 5, 6, 7]);
    expect(errors[0].message).toMatch(/type/);
    expect(errors[1].message).toMatch(/session or a deadline/);
    expect(errors[2].message).toMatch(/juggling/);
    expect(errors[3].message).toMatch(/req_levels/);
    expect(errors[4].message).toMatch(/ends before/);
  });

  it("rejects a file without the required columns", () => {
    expect(previewCsv("name,when\nx,y").errors[0]).toMatchObject({ row: 1 });
  });
});

describe("publishing + notifications", () => {
  it("a CSV import distributes to many students and respects weekly caps", () => {
    const res = importCsv(1, "bluenose-postings.csv", getDemoCsv());
    expect(res.errors).toEqual([]);
    expect(res.published.length).toBe(res.rowsOk);
    const totalNotified = res.published.reduce((n, p) => n + p.notified, 0);
    expect(totalNotified).toBeGreaterThan(300);

    const since = new Date(Date.now() - 7 * DAY_MS).toISOString();
    const perStudent = db()
      .prepare(
        `SELECT s.id, s.weekly_cap cap, COUNT(n.id) n FROM students s JOIN notifications n ON n.student_id = s.id
         WHERE n.kind='match' AND n.created_at >= ? GROUP BY s.id`,
      )
      .all(since) as { id: number; cap: number; n: number }[];
    expect(perStudent.length).toBeGreaterThan(150);
    for (const r of perStudent) expect(r.n).toBeLessThanOrEqual(r.cap);

    // Personas each got live notifications, and they differ.
    const firsts = listPersonas().map((p) => listNotifications(p.id).filter((n) => !n.read).map((n) => n.title));
    for (const f of firsts) expect(f.length).toBeGreaterThan(0);
    expect(new Set(firsts.map((f) => f.join("|"))).size).toBe(6);

    // Equity-targeted bursary reaches Amara (opted in) but is not visible to Wei.
    const amara = getFeed(persona("Amara").id);
    expect(amara.feed.some((i) => i.opportunity.title === "Black Student Success Bursary")).toBe(true);
    expect(getFeed(persona("Wei").id).feed.some((i) => i.opportunity.title === "Black Student Success Bursary")).toBe(false);

    // Stats line up with the publish result.
    const first = res.published[0];
    const stats = getPostingStats(first.opportunityId)!;
    expect(stats.notified).toBe(first.notified);
    expect(stats.matched).toBe(first.matched);
    expect(listPostingStats(1).length).toBeGreaterThan(40);
  });

  it("a capped student gets no more notifications, and nobody is notified twice", () => {
    const wei = persona("Wei").id;
    const before = listNotifications(wei).length;
    const r = publishOpportunity(1, {
      title: "Late-night Hack Social",
      type: "event",
      description: "Pizza and side projects.",
      department: "CS Society",
      campus: "Harbour",
      mode: "in_person",
      sessions: [{ start: "2031-01-04T19:00", end: "2031-01-04T21:00" }],
      tags: ["tech", "social", "food"],
      required: {},
      preferred: {},
    });
    expect(r.matched).toBeGreaterThan(0);
    const after = listNotifications(wei).length;
    const weekly = getStudentProfile(wei)!.weeklyCap;
    const recent = listNotifications(wei).filter((n) => new Date(n.createdAt).getTime() > Date.now() - 7 * DAY_MS).length;
    expect(recent).toBeLessThanOrEqual(weekly);
    if (recent - (after - before) >= weekly) expect(after).toBe(before);
    const dupes = db().prepare(`SELECT COUNT(*) n FROM (SELECT student_id, opportunity_id FROM notifications GROUP BY 1,2 HAVING COUNT(*) > 1)`).get() as { n: number };
    expect(dupes.n).toBe(0);
  });

  it("derives coordinates from the campus; online postings have none", () => {
    const base = { type: "workshop" as const, description: "d", department: "D", sessions: [{ start: "2031-02-03T10:00", end: "2031-02-03T11:00" }], tags: ["tech"], required: {}, preferred: {} };
    const a = publishOpportunity(1, { ...base, title: "On Valley", campus: "Valley", mode: "in_person" });
    const b = publishOpportunity(1, { ...base, title: "Online", mode: "online" });
    const row = (id: number) => db().prepare(`SELECT lat, lon FROM opportunities WHERE id = ?`).get(id) as { lat: number | null; lon: number | null };
    expect(row(a.opportunityId).lat).toBeCloseTo(45.088);
    expect(row(b.opportunityId).lat).toBeNull();
  });

  it("rejects invalid input with a readable message", () => {
    expect(() =>
      publishOpportunity(1, { title: "", type: "event", description: "", department: "", mode: "in_person", sessions: [], tags: [], required: {}, preferred: {} }),
    ).toThrow(/Title is required/);
  });
});

describe("student feedback + schedule", () => {
  it("not interested dismisses the item and lowers similar items", () => {
    const liam = persona("Liam").id;
    const feed = getFeed(liam).feed;
    const target = feed.find((i) => i.opportunity.tags.includes("finance"))!;
    const sibling = feed.find((i) => i.opportunity.id !== target.opportunity.id && i.opportunity.tags.includes("finance"))!;
    setFeedback(liam, target.opportunity.id, "not_interested");
    const after = getFeed(liam);
    expect(after.dismissed.map((i) => i.opportunity.id)).toContain(target.opportunity.id);
    const sib2 = after.feed.find((i) => i.opportunity.id === sibling.opportunity.id)!;
    expect(sib2.score).toBeLessThan(sibling.score);
    const logged = db().prepare(`SELECT COUNT(*) n FROM interaction_log WHERE student_id = ? AND kind = 'not_interested'`).get(liam) as { n: number };
    expect(logged.n).toBe(1);
    setFeedback(liam, target.opportunity.id, null); // undo
    expect(getFeed(liam).dismissed).toHaveLength(0);
  });

  it("a schedule change that clashes with a notified item sets now_conflicts without a new notification", () => {
    const jordan = persona("Jordan").id;
    const notified = new Set(listNotifications(jordan).map((n) => n.opportunityId));
    const item = getFeed(jordan).feed.find((i) => notified.has(i.opportunity.id) && i.opportunity.sessions.length === 1 && i.opportunity.mode !== "online");
    expect(item).toBeTruthy();
    const s = item!.opportunity.sessions[0];
    const start = new Date(s.start);
    const hh = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const before = listNotifications(jordan).length;
    addScheduleBlock(jordan, { day: start.getDay(), start: "00:00", end: hh(new Date(s.end)) === "00:00" ? "23:59" : "23:59", label: "Night shift", campus: item!.opportunity.campus ?? "Northshore" });
    const after = getFeed(jordan).feed.find((i) => i.opportunity.id === item!.opportunity.id)!;
    expect(after.nowConflicts).toBe(true);
    expect(after.fit).toBe("conflict");
    expect(listNotifications(jordan).length).toBe(before);
    void hh(start);
  });

  it("imports weekly classes from .ics (RRULE + single events)", () => {
    const priya = persona("Priya").id;
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//test//EN",
      "BEGIN:VEVENT", "UID:1", "DTSTART:20261012T130000", "DTEND:20261012T142000", "RRULE:FREQ=WEEKLY;BYDAY=MO,WE", "SUMMARY:BIOL 5020", "LOCATION:Harbour LSC 220", "END:VEVENT",
      "BEGIN:VEVENT", "UID:2", "DTSTART:20261016T090000", "DTEND:20261016T110000", "SUMMARY:Field methods", "LOCATION:Valley campus", "END:VEVENT",
      "BEGIN:VEVENT", "UID:3", "DTSTART;VALUE=DATE:20261017", "DTEND;VALUE=DATE:20261018", "SUMMARY:All day", "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    expect(importScheduleIcs(priya, ics)).toEqual({ added: 3 });
    const sched = getStudentProfile(priya)!.schedule;
    expect(sched.map((b) => `${b.day} ${b.start}-${b.end} ${b.campus}`)).toEqual(["1 13:00-14:20 Harbour", "3 13:00-14:20 Harbour", "5 09:00-11:00 Valley"]);
  });

  it("profile update recomputes and equity data can be removed", () => {
    const amara = persona("Amara").id;
    const p = getStudentProfile(amara)!;
    expect(p.equityConsent).toBe(true);
    const { id: _id, name: _n, persona: _p, schedule: _s, ...rest } = p;
    void _id; void _n; void _p; void _s;
    updateStudentProfile(amara, { ...rest, equityConsent: false, equityGroups: [] });
    expect(getStudentProfile(amara)!.equityGroups).toEqual([]);
    expect(getFeed(amara).feed.some((i) => i.opportunity.title === "Black Student Success Bursary")).toBe(false);
  });
});

describe("impact", () => {
  it("is sane and favours Studengage", () => {
    const imp = getImpact(1);
    expect(imp.students).toBe(256);
    for (const v of [imp.broadcast.relevantShare, imp.studengage.relevantShare, imp.studengage.relevantReach]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(imp.studengage.relevantShare).toBeGreaterThan(imp.broadcast.relevantShare);
    expect(imp.reachLift).toBeGreaterThan(0.3);
    expect(imp.broadcast.notificationsPerStudent).toBe(imp.postings);
    expect(imp.studengage.notificationsPerStudent).toBeLessThan(imp.postings);
    expect(imp.definition).toMatch(/simulated students/);
  });
});
