/**
 * Publishing + notification distribution.
 * Rules: in-app only, immediately on publish, score >= NOTIFY_THRESHOLD, at most `weekly_cap`
 * "match" notifications per student per rolling 7 days, never twice for the same posting.
 * When several postings are published together (CSV), each student gets their best ones first.
 */
import { db } from "../db";
import type { OpportunityInput, PublishResult } from "../contracts";
import { OPP_TYPES, TAGS } from "../engine/types";
import { DAY_MS, now } from "./clock";
import { recompute } from "./recompute";
import { loadCampuses, loadOpportunities } from "./repo";

export const NOTIFY_THRESHOLD = 0.5;
const SESSION_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/** Throws a readable Error if the input can't be published. */
export function validateOpportunityInput(input: OpportunityInput, campuses = loadCampuses()) {
  const errs: string[] = [];
  if (!input.title?.trim()) errs.push("Title is required.");
  if (!OPP_TYPES.includes(input.type)) errs.push(`Unknown type "${input.type}".`);
  if (!input.description?.trim()) errs.push("Description is required.");
  if (!input.department?.trim()) errs.push("Department is required.");
  if (!["in_person", "online", "hybrid"].includes(input.mode)) errs.push(`Unknown mode "${input.mode}".`);
  if (input.campus && !campuses.some((c) => c.name === input.campus)) errs.push(`Unknown campus "${input.campus}".`);
  if (input.mode !== "online" && input.sessions.length > 0 && !input.campus) errs.push("In-person events need a campus.");
  for (const s of input.sessions) {
    if (!SESSION_RE.test(s.start) || !SESSION_RE.test(s.end)) errs.push(`Session times must look like 2026-10-14T16:00.`);
    else if (new Date(s.end) <= new Date(s.start)) errs.push(`A session ends before it starts (${s.start}).`);
  }
  if (input.sessions.length === 0 && !input.deadline) errs.push("Add at least one session or a deadline.");
  if (input.deadline && isNaN(new Date(input.deadline).getTime())) errs.push("Deadline is not a valid date.");
  if (!input.tags.length) errs.push("Add at least one tag.");
  for (const t of input.tags) if (!(TAGS as readonly string[]).includes(t)) errs.push(`Unknown tag "${t}".`);
  if (errs.length) throw new Error(errs.join(" "));
}

export function insertOpportunity(
  universityId: number,
  input: OpportunityInput,
  source: "form" | "csv" | "seed",
  createdAt = now().toISOString(),
): number {
  const campus = input.campus ? loadCampuses(universityId).find((c) => c.name === input.campus) : undefined;
  const online = input.mode === "online";
  const conn = db();
  const id = Number(
    conn
      .prepare(
        `INSERT INTO opportunities (university_id, title, type, description, department, contact, link, campus, building, lat, lon, mode,
          deadline, capacity, cost, rsvp, food, accessibility, language, tags, required, preferred, source, status, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'published', ?)`,
      )
      .run(
        universityId,
        input.title.trim(),
        input.type,
        input.description.trim(),
        input.department.trim(),
        input.contact || null,
        input.link || null,
        input.campus || null,
        input.building || null,
        online ? null : (campus?.lat ?? null),
        online ? null : (campus?.lon ?? null),
        input.mode,
        input.deadline || null,
        input.capacity ?? null,
        input.cost ?? 0,
        input.rsvp ? 1 : 0,
        input.food ? 1 : 0,
        input.accessibility || null,
        input.language || "English",
        JSON.stringify(input.tags),
        JSON.stringify(input.required ?? {}),
        JSON.stringify(input.preferred ?? {}),
        source,
        createdAt,
      ).lastInsertRowid,
  );
  const ins = conn.prepare(`INSERT INTO opportunity_sessions (opportunity_id, start, end) VALUES (?, ?, ?)`);
  for (const s of input.sessions) ins.run(id, s.start, s.end);
  return id;
}

/**
 * Sends match notifications for `oppIds`, using the stored recommendations.
 * Each student gets their highest-scoring new postings first, up to their remaining weekly cap.
 */
export function distributeNotifications(oppIds: number[], at = now()): Map<number, number> {
  const sent = new Map<number, number>(oppIds.map((id) => [id, 0]));
  if (!oppIds.length) return sent;
  const conn = db();
  const windowStart = new Date(at.getTime() - 7 * DAY_MS).toISOString();
  const candidates = conn
    .prepare(
      `SELECT r.student_id, r.opportunity_id, r.score, s.weekly_cap FROM recommendations r JOIN students s ON s.id = r.student_id
       WHERE r.bucket = 'feed' AND r.now_conflicts = 0 AND r.score >= ? AND r.opportunity_id IN (SELECT value FROM json_each(?))
         AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.student_id = r.student_id AND n.opportunity_id = r.opportunity_id AND n.kind = 'match')
       ORDER BY r.student_id, r.score DESC, r.opportunity_id`,
    )
    .all(NOTIFY_THRESHOLD, JSON.stringify(oppIds)) as { student_id: number; opportunity_id: number; score: number; weekly_cap: number }[];
  const used = new Map(
    (
      conn
        .prepare(`SELECT student_id, COUNT(*) n FROM notifications WHERE kind = 'match' AND created_at >= ? GROUP BY student_id`)
        .all(windowStart) as { student_id: number; n: number }[]
    ).map((r) => [r.student_id, r.n]),
  );
  const ins = conn.prepare(
    `INSERT OR IGNORE INTO notifications (student_id, opportunity_id, kind, created_at) VALUES (?, ?, 'match', ?)`,
  );
  const ts = at.toISOString();
  conn.transaction(() => {
    for (const c of candidates) {
      const n = used.get(c.student_id) ?? 0;
      if (n >= c.weekly_cap) continue;
      if (ins.run(c.student_id, c.opportunity_id, ts).changes) {
        used.set(c.student_id, n + 1);
        sent.set(c.opportunity_id, (sent.get(c.opportunity_id) ?? 0) + 1);
      }
    }
  })();
  return sent;
}

function resultFor(oppId: number, notified: number): PublishResult {
  const counts = db()
    .prepare(
      `SELECT SUM(bucket IN ('feed','dismissed')) matched, SUM(bucket = 'conflict') conflicts, COUNT(*) eligible
       FROM recommendations WHERE opportunity_id = ?`,
    )
    .get(oppId) as { matched: number | null; conflicts: number | null; eligible: number };
  const students = (db().prepare(`SELECT COUNT(*) n FROM students`).get() as { n: number }).n;
  return {
    opportunityId: oppId,
    matched: counts.matched ?? 0,
    conflicts: counts.conflicts ?? 0,
    notified,
    ineligible: students - counts.eligible,
  };
}

/** Insert several postings, rank once for everyone, then distribute notifications together. */
export function publishMany(universityId: number, inputs: OpportunityInput[], source: "form" | "csv"): PublishResult[] {
  const campuses = loadCampuses(universityId);
  inputs.forEach((i) => validateOpportunityInput(i, campuses));
  const ids = db().transaction(() => inputs.map((i) => insertOpportunity(universityId, i, source)))();
  recompute({ opportunities: loadOpportunities() });
  const sent = distributeNotifications(ids);
  return ids.map((id) => resultFor(id, sent.get(id) ?? 0));
}

export function publishOpportunity(universityId: number, input: OpportunityInput, source: "form" | "csv" = "form"): PublishResult {
  return publishMany(universityId, [input], source)[0];
}
