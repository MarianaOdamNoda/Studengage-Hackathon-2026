/** Directory + university-side services. Server-only. */
import { db, nowIso } from "../db";
import type { ImpactVM, ImportResult, OpportunityInput, PersonaVM, PostingStatsVM, StaffVM, UniversityVM } from "../contracts";
import { parsePostingsCsv } from "../csv";
import { matchCriteria } from "../engine/filter";
import { now } from "./clock";
import { publishMany } from "./publish";
import { recompute } from "./recompute";
import {
  DEFAULT_UNIVERSITY_ID,
  FACULTIES,
  isActive,
  loadCampuses,
  loadOpportunities,
  loadOpportunity,
  loadStudentRows,
  parseJson,
  rowToStudent,
  type LoadedOpportunity,
} from "./repo";

export function getUniversity(): UniversityVM {
  const row = db().prepare(`SELECT id, name FROM universities ORDER BY id LIMIT 1`).get() as { id: number; name: string } | undefined;
  if (!row) throw new Error("The demo database is empty. Run `npm run seed` or reset the demo.");
  return { id: row.id, name: row.name, campuses: loadCampuses(row.id), faculties: FACULTIES };
}

export function listPersonas(): PersonaVM[] {
  return (
    db().prepare(`SELECT id, name, persona, program, year, campus FROM students WHERE is_demo = 1 ORDER BY id`).all() as (PersonaVM & {
      persona: string | null;
    })[]
  ).map((r) => ({ ...r, persona: r.persona ?? "" }));
}

export function listStaff(): StaffVM[] {
  return (
    db().prepare(`SELECT id, name, role, university_id FROM staff ORDER BY id`).all() as {
      id: number;
      name: string;
      role: string;
      university_id: number;
    }[]
  ).map((r) => ({ id: r.id, name: r.name, role: r.role, universityId: r.university_id }));
}

// ---- CSV ----------------------------------------------------------------------

function csvContext() {
  return { campuses: loadCampuses().map((c) => c.name), faculties: FACULTIES };
}

export function previewCsv(csvText: string): { rows: OpportunityInput[]; errors: { row: number; message: string }[] } {
  return parsePostingsCsv(csvText, csvContext());
}

export function importCsv(universityId: number, filename: string, csvText: string): ImportResult {
  const { rows, errors } = previewCsv(csvText);
  const published = rows.length ? publishMany(universityId, rows, "csv") : [];
  const rowsTotal = Math.max(0, csvText.trim() ? rows.length + new Set(errors.filter((e) => e.row > 1).map((e) => e.row)).size : 0);
  const importId = Number(
    db()
      .prepare(`INSERT INTO imports (university_id, filename, rows_total, rows_ok, errors, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(universityId, filename || "upload.csv", rowsTotal, rows.length, JSON.stringify(errors), nowIso()).lastInsertRowid,
  );
  return { importId, rowsTotal, rowsOk: rows.length, errors, published };
}

// ---- posting stats --------------------------------------------------------------

interface Agg {
  matched: number;
  conflicts: number;
  notified: number;
  interested: number;
  notInterested: number;
  attended: number;
  notAttended: number;
}

function aggregates(oppId?: number): Map<number, Agg> {
  const where = oppId == null ? "" : "WHERE opportunity_id = ?";
  const args = oppId == null ? [] : [oppId];
  const m = new Map<number, Agg>();
  const get = (id: number) => {
    let a = m.get(id);
    if (!a) m.set(id, (a = { matched: 0, conflicts: 0, notified: 0, interested: 0, notInterested: 0, attended: 0, notAttended: 0 }));
    return a;
  };
  for (const r of db()
    .prepare(`SELECT opportunity_id id, SUM(bucket IN ('feed','dismissed')) matched, SUM(bucket='conflict') conflicts FROM recommendations ${where} GROUP BY opportunity_id`)
    .all(...args) as { id: number; matched: number; conflicts: number }[]) {
    Object.assign(get(r.id), { matched: r.matched, conflicts: r.conflicts });
  }
  for (const r of db()
    .prepare(`SELECT opportunity_id id, COUNT(*) n FROM notifications ${where ? where + " AND" : "WHERE"} kind='match' GROUP BY opportunity_id`)
    .all(...args) as { id: number; n: number }[]) {
    get(r.id).notified = r.n;
  }
  for (const r of db()
    .prepare(
      `SELECT opportunity_id id, SUM(feedback='interested') i, SUM(feedback='not_interested') ni, SUM(attendance='attended') a, SUM(attendance='not_attended') na
       FROM feedback ${where} GROUP BY opportunity_id`,
    )
    .all(...args) as { id: number; i: number; ni: number; a: number; na: number }[]) {
    Object.assign(get(r.id), { interested: r.i ?? 0, notInterested: r.ni ?? 0, attended: r.a ?? 0, notAttended: r.na ?? 0 });
  }
  return m;
}

function statsFor(opps: LoadedOpportunity[], aggs: Map<number, Agg>): PostingStatsVM[] {
  const students = loadStudentRows().map(rowToStudent);
  return opps.map((o) => ({
    opportunity: o.vm,
    eligible: students.filter((s) => matchCriteria(s, o.opp.required).failed.length === 0).length,
    ...(aggs.get(o.row.id) ?? { matched: 0, conflicts: 0, notified: 0, interested: 0, notInterested: 0, attended: 0, notAttended: 0 }),
  }));
}

export function listPostingStats(universityId: number): PostingStatsVM[] {
  return statsFor(loadOpportunities(universityId), aggregates());
}

export function getPostingStats(opportunityId: number): PostingStatsVM | null {
  const o = loadOpportunity(opportunityId);
  return o ? statsFor([o], aggregates(opportunityId))[0] : null;
}

// ---- impact -----------------------------------------------------------------------

/**
 * Equal attention budget: every student looks at `weekly_cap` items.
 * Broadcast picks them uniformly from all active postings; Studengage shows the top of the feed.
 */
export function getImpact(universityId: number = DEFAULT_UNIVERSITY_ID): ImpactVM {
  const t = now();
  const active = loadOpportunities(universityId).filter((o) => isActive(o.opp, t));
  const activeIds = new Set(active.map((o) => o.row.id));
  // Make sure rankings are current (time passes between page loads).
  recompute({ opportunities: active });
  const students = loadStudentRows(universityId);
  const recs = db()
    .prepare(`SELECT student_id, opportunity_id, bucket, fit, score FROM recommendations ORDER BY student_id, score DESC, opportunity_id`)
    .all() as { student_id: number; opportunity_id: number; bucket: string; fit: string; score: number }[];
  const byStudent = new Map<number, typeof recs>();
  for (const r of recs) {
    if (!activeIds.has(r.opportunity_id)) continue;
    const list = byStudent.get(r.student_id) ?? [];
    list.push(r);
    byStudent.set(r.student_id, list);
  }
  const tags = new Map(active.map((o) => [o.row.id, o.opp.tags]));

  let bSeen = 0, bRel = 0, sSeen = 0, sRel = 0, relTotal = 0;
  for (const s of students) {
    const truth = new Set(s.is_demo ? parseJson<string[]>(s.interests, []) : parseJson<string[]>(s.hidden_interests ?? s.interests, []));
    const rows = byStudent.get(s.id) ?? [];
    // eligible = has a row (feed / conflict / dismissed); relevant also needs no full clash + a shared tag
    const relevant = new Set(
      rows.filter((r) => r.fit !== "conflict" && (tags.get(r.opportunity_id) ?? []).some((tg) => truth.has(tg))).map((r) => r.opportunity_id),
    );
    relTotal += relevant.size;
    const cap = s.weekly_cap;
    if (active.length) {
      const seen = Math.min(cap, active.length);
      bSeen += seen;
      bRel += (seen * relevant.size) / active.length;
    }
    const top = rows.filter((r) => r.bucket === "feed").slice(0, cap);
    sSeen += top.length;
    sRel += top.filter((r) => relevant.has(r.opportunity_id)).length;
  }
  const n = students.length || 1;
  const notifs = (
    db()
      .prepare(`SELECT COUNT(*) n FROM notifications WHERE kind='match' AND opportunity_id IN (SELECT value FROM json_each(?))`)
      .get(JSON.stringify([...activeIds])) as { n: number }
  ).n;
  const r3 = (x: number) => Math.round(x * 1000) / 1000;
  return {
    students: students.length,
    postings: active.length,
    broadcast: { notificationsPerStudent: active.length, relevantShare: r3(bSeen ? bRel / bSeen : 0) },
    studengage: {
      notificationsPerStudent: r3(notifs / n),
      relevantShare: r3(sSeen ? sRel / sSeen : 0),
      relevantReach: r3(relTotal ? sRel / relTotal : 0),
    },
    reachLift: r3(bRel ? sRel / bRel - 1 : 0),
    definition:
      `On ${students.length} simulated students, each looking at the same number of items per week (their weekly limit): ` +
      `an item counts as relevant when the student is eligible, it doesn't clash with their classes, and it shares at least one topic with what they actually care about.`,
  };
}
