/** Student-facing services. Server-only. */
import { db, nowIso } from "../db";
import type { FeedItemVM, FeedVM, NotificationVM, ProfileUpdate, StudentProfileVM } from "../contracts";
import { closesAt } from "../engine/filter";
import { EQUITY_GROUPS, TAGS, type Fit, type ScheduleBlock } from "../engine/types";
import { DAY_MS, now } from "./clock";
import { parseIcsToBlocks } from "../ics";
import { recomputeStudent } from "./recompute";
import {
  FACULTIES,
  isActive,
  loadBlocks,
  loadCampuses,
  loadOpportunities,
  loadStudentRow,
  parseJson,
  type LoadedOpportunity,
  type RecommendationRow,
} from "./repo";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function requireStudent(id: number) {
  const row = loadStudentRow(id);
  if (!row) throw new Error("Student not found.");
  return row;
}

export function getStudentProfile(studentId: number): StudentProfileVM | null {
  const r = loadStudentRow(studentId);
  if (!r) return null;
  const consent = !!r.consent_at;
  return {
    id: r.id,
    name: r.name,
    persona: r.persona,
    level: r.level as StudentProfileVM["level"],
    faculty: r.faculty,
    program: r.program,
    year: r.year,
    status: r.status as StudentProfileVM["status"],
    residency: r.residency as StudentProfileVM["residency"],
    campus: r.campus,
    gpa: r.gpa,
    coop: !!r.coop,
    inResidence: !!r.in_residence,
    lat: r.lat,
    lon: r.lon,
    locationLabel: r.location_label,
    interests: parseJson<string[]>(r.interests, []),
    weeklyCap: r.weekly_cap,
    equityGroups: consent ? parseJson<string[]>(r.equity_groups ?? null, []) : [],
    equityConsent: consent,
    schedule: loadBlocks(studentId),
  };
}

export function updateStudentProfile(studentId: number, u: ProfileUpdate): void {
  requireStudent(studentId);
  const programs = FACULTIES[u.faculty];
  if (!programs) throw new Error(`Unknown faculty "${u.faculty}".`);
  if (!programs.includes(u.program)) throw new Error(`${u.program} is not a ${u.faculty} program.`);
  if (!loadCampuses().some((c) => c.name === u.campus)) throw new Error(`Unknown campus "${u.campus}".`);
  if (!Number.isInteger(u.year) || u.year < 1 || u.year > 6) throw new Error("Year must be between 1 and 6.");
  if (u.gpa != null && (u.gpa < 0 || u.gpa > 4.3)) throw new Error("GPA must be between 0 and 4.3.");
  if (!Number.isFinite(u.lat) || !Number.isFinite(u.lon)) throw new Error("Location is missing.");
  const cap = Math.round(u.weeklyCap);
  if (!(cap >= 1 && cap <= 20)) throw new Error("Weekly notification limit must be between 1 and 20.");
  const interests = [...new Set(u.interests)].filter((t) => (TAGS as readonly string[]).includes(t));
  const groups = [...new Set(u.equityGroups)].filter((g) => (EQUITY_GROUPS as readonly string[]).includes(g));

  const conn = db();
  conn.transaction(() => {
    conn
      .prepare(
        `UPDATE students SET level=?, faculty=?, program=?, year=?, status=?, residency=?, campus=?, gpa=?, coop=?, in_residence=?,
           lat=?, lon=?, location_label=?, interests=?, weekly_cap=? WHERE id=?`,
      )
      .run(
        u.level, u.faculty, u.program, u.year, u.status, u.residency, u.campus, u.gpa ?? null, u.coop ? 1 : 0, u.inResidence ? 1 : 0,
        u.lat, u.lon, u.locationLabel ?? null, JSON.stringify(interests), cap, studentId,
      );
    if (u.equityConsent && groups.length) {
      conn
        .prepare(
          `INSERT INTO student_sensitive (student_id, equity_groups, consent_at) VALUES (?, ?, ?)
           ON CONFLICT(student_id) DO UPDATE SET equity_groups = excluded.equity_groups`,
        )
        .run(studentId, JSON.stringify(groups), nowIso());
    } else {
      conn.prepare(`DELETE FROM student_sensitive WHERE student_id = ?`).run(studentId);
    }
  })();
  recomputeStudent(studentId);
}

function validateBlock(b: ScheduleBlock) {
  if (!Number.isInteger(b.day) || b.day < 0 || b.day > 6) throw new Error("Pick a day of the week.");
  if (!TIME_RE.test(b.start) || !TIME_RE.test(b.end)) throw new Error("Times must look like 09:30.");
  if (b.end <= b.start) throw new Error("The class must end after it starts.");
  if (!b.label?.trim()) throw new Error("Give the class a name.");
  if (!loadCampuses().some((c) => c.name === b.campus)) throw new Error(`Unknown campus "${b.campus}".`);
}

export function addScheduleBlock(studentId: number, block: ScheduleBlock): void {
  requireStudent(studentId);
  validateBlock(block);
  db()
    .prepare(`INSERT INTO schedule_blocks (student_id, day, start, end, label, campus) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(studentId, block.day, block.start, block.end, block.label.trim(), block.campus);
  recomputeStudent(studentId);
}

export function removeScheduleBlock(studentId: number, blockId: number): void {
  db().prepare(`DELETE FROM schedule_blocks WHERE id = ? AND student_id = ?`).run(blockId, studentId);
  recomputeStudent(studentId);
}

export function importScheduleIcs(studentId: number, icsText: string): { added: number } {
  const student = requireStudent(studentId);
  const blocks = parseIcsToBlocks(icsText, loadCampuses().map((c) => c.name), student.campus);
  if (!blocks.length) throw new Error("No weekly classes found in that calendar file.");
  const conn = db();
  conn.transaction(() => {
    conn.prepare(`DELETE FROM schedule_blocks WHERE student_id = ?`).run(studentId);
    const ins = conn.prepare(`INSERT INTO schedule_blocks (student_id, day, start, end, label, campus) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const b of blocks) ins.run(studentId, b.day, b.start, b.end, b.label, b.campus);
  })();
  recomputeStudent(studentId);
  return { added: blocks.length };
}

// ---- feed ---------------------------------------------------------------------

interface FbRow {
  opportunity_id: number;
  feedback: FeedItemVM["feedback"];
  attendance: FeedItemVM["attendance"];
}

function feedbackMap(studentId: number) {
  const rows = db()
    .prepare(`SELECT opportunity_id, feedback, attendance FROM feedback WHERE student_id = ?`)
    .all(studentId) as FbRow[];
  return new Map(rows.map((r) => [r.opportunity_id, r]));
}

function recMap(studentId: number) {
  const rows = db().prepare(`SELECT * FROM recommendations WHERE student_id = ?`).all(studentId) as RecommendationRow[];
  return new Map(rows.map((r) => [r.opportunity_id, r]));
}

function toItem(o: LoadedOpportunity, rec: RecommendationRow | undefined, fb: FbRow | undefined, fallbackReasons: string[] = []): FeedItemVM {
  return {
    opportunity: o.vm,
    score: rec?.score ?? 0,
    fit: (rec?.fit ?? "na") as Fit,
    reasons: rec ? parseJson<string[]>(rec.reasons, []) : fallbackReasons,
    feedback: fb?.feedback ?? null,
    attendance: fb?.attendance ?? null,
    nowConflicts: !!rec?.now_conflicts,
    scorer: rec?.scorer ?? "formula",
  };
}

export function getFeed(studentId: number): FeedVM {
  requireStudent(studentId);
  const res = recomputeStudent(studentId)!;
  const byId = new Map(loadOpportunities().map((o) => [o.row.id, o]));
  const recs = recMap(studentId);
  const fbs = feedbackMap(studentId);
  const map = (list: { oppId: number }[]) =>
    list.flatMap((s) => {
      const o = byId.get(s.oppId);
      return o ? [toItem(o, recs.get(s.oppId), fbs.get(s.oppId))] : [];
    });
  return { feed: map(res.feed), conflicts: map(res.conflicts), dismissed: map(res.dismissed), excluded: res.excluded };
}

/** Closed opportunities the student was notified about, marked interested, or answered attendance for. */
function pastFor(studentId: number) {
  const t = now();
  const notified = new Set(
    (db().prepare(`SELECT opportunity_id FROM notifications WHERE student_id = ?`).all(studentId) as { opportunity_id: number }[]).map(
      (r) => r.opportunity_id,
    ),
  );
  const fbs = feedbackMap(studentId);
  const recs = recMap(studentId);
  return loadOpportunities()
    .filter((o) => !isActive(o.opp, t))
    .filter((o) => {
      const fb = fbs.get(o.row.id);
      return notified.has(o.row.id) || fb?.feedback === "interested" || !!fb?.attendance;
    })
    .map((o) => {
      const fb = fbs.get(o.row.id);
      const why = fb?.feedback === "interested" ? "You marked this interested" : "We sent you a notification about this";
      return { o, item: toItem(o, recs.get(o.row.id), fb, [why]), closed: closesAt(o.opp)?.getTime() ?? 0 };
    })
    .sort((a, b) => b.closed - a.closed);
}

export function getPast(studentId: number): FeedItemVM[] {
  return pastFor(studentId).map((p) => p.item);
}

export function getPendingAttendance(studentId: number): FeedItemVM[] {
  const since = now().getTime() - 14 * DAY_MS;
  return pastFor(studentId)
    .filter((p) => p.o.sessions.length > 0 && p.closed >= since)
    .filter((p) => !p.item.attendance && p.item.feedback !== "not_interested")
    .map((p) => p.item);
}

function log(studentId: number, oppId: number, kind: string) {
  db().prepare(`INSERT INTO interaction_log (student_id, opportunity_id, kind, at) VALUES (?, ?, ?, ?)`).run(studentId, oppId, kind, nowIso());
}

function requireOpp(id: number) {
  if (!db().prepare(`SELECT 1 FROM opportunities WHERE id = ?`).get(id)) throw new Error("Posting not found.");
}

export function setFeedback(studentId: number, opportunityId: number, value: "interested" | "not_interested" | null): void {
  requireStudent(studentId);
  requireOpp(opportunityId);
  db()
    .prepare(
      `INSERT INTO feedback (student_id, opportunity_id, feedback, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(student_id, opportunity_id) DO UPDATE SET feedback = excluded.feedback, updated_at = excluded.updated_at`,
    )
    .run(studentId, opportunityId, value, nowIso());
  log(studentId, opportunityId, value ?? "cleared");
  recomputeStudent(studentId);
}

export function setAttendance(studentId: number, opportunityId: number, value: "attended" | "not_attended"): void {
  requireStudent(studentId);
  requireOpp(opportunityId);
  if (value !== "attended" && value !== "not_attended") throw new Error("Invalid attendance answer.");
  db()
    .prepare(
      `INSERT INTO feedback (student_id, opportunity_id, attendance, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(student_id, opportunity_id) DO UPDATE SET attendance = excluded.attendance, updated_at = excluded.updated_at`,
    )
    .run(studentId, opportunityId, value, nowIso());
  log(studentId, opportunityId, value);
  recomputeStudent(studentId);
}

/** Newest first (max 50). With `afterId`, only notifications with a larger id. */
export function listNotifications(studentId: number, afterId?: number): NotificationVM[] {
  const rows = db()
    .prepare(
      `SELECT n.id, n.opportunity_id, o.title, n.kind, n.created_at, n.read_at FROM notifications n
       JOIN opportunities o ON o.id = n.opportunity_id
       WHERE n.student_id = ? AND n.id > ? ORDER BY n.id DESC LIMIT 50`,
    )
    .all(studentId, afterId ?? 0) as {
    id: number;
    opportunity_id: number;
    title: string;
    kind: NotificationVM["kind"];
    created_at: string;
    read_at: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    opportunityId: r.opportunity_id,
    title: r.title,
    kind: r.kind,
    createdAt: r.created_at,
    read: !!r.read_at,
  }));
}

export function markNotificationsRead(studentId: number): void {
  db().prepare(`UPDATE notifications SET read_at = ? WHERE student_id = ? AND read_at IS NULL`).run(nowIso(), studentId);
}
