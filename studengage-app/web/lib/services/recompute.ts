/**
 * Ranking pipeline: loads everything the scorer needs, ranks, and writes `recommendations`.
 * Rows for opportunities that have already closed are left untouched (historical record).
 */
import { db, nowIso } from "../db";
import { getScorer } from "../engine/scorer";
import type { Scored } from "../engine/types";
import { now } from "./clock";
import {
  isActive,
  loadAllBlocks,
  loadAllFeedback,
  loadOpportunities,
  loadStudentRows,
  rowToStudent,
  type LoadedOpportunity,
} from "./repo";

/** program → (oppId → share of that program's students who marked it interested). */
export function peerInterestByProgram(): Map<string, Map<number, number>> {
  const sizes = db().prepare(`SELECT program, COUNT(*) n FROM students GROUP BY program`).all() as {
    program: string;
    n: number;
  }[];
  const size = new Map(sizes.map((r) => [r.program, r.n]));
  const rows = db()
    .prepare(
      `SELECT s.program, f.opportunity_id, COUNT(*) n FROM feedback f JOIN students s ON s.id = f.student_id
       WHERE f.feedback = 'interested' GROUP BY s.program, f.opportunity_id`,
    )
    .all() as { program: string; opportunity_id: number; n: number }[];
  const out = new Map<string, Map<number, number>>();
  for (const r of rows) {
    const m = out.get(r.program) ?? new Map<number, number>();
    m.set(r.opportunity_id, r.n / Math.max(1, size.get(r.program) ?? 1));
    out.set(r.program, m);
  }
  return out;
}

export interface RecomputeOptions {
  /** Restrict to these students (default: everyone). */
  studentIds?: number[];
  opportunities?: LoadedOpportunity[];
}

/** Rank and persist recommendations. Returns per-student results (for distribution). */
export function recompute(opts: RecomputeOptions = {}) {
  const t = now();
  const scorer = getScorer();
  const opps = (opts.opportunities ?? loadOpportunities()).filter((o) => isActive(o.opp, t));
  const activeIds = opps.map((o) => o.row.id);
  const ids = opts.studentIds ? new Set(opts.studentIds) : null;
  const students = loadStudentRows().filter((s) => !ids || ids.has(s.id));
  const blocks = loadAllBlocks();
  const feedback = opts.studentIds?.length === 1 ? loadAllFeedback(opts.studentIds[0]) : loadAllFeedback();
  const peers = peerInterestByProgram();
  const one = opts.studentIds?.length === 1 ? opts.studentIds[0] : null;
  const notified = new Set(
    (
      (one == null
        ? db().prepare(`SELECT student_id || ':' || opportunity_id k FROM notifications WHERE kind = 'match'`).all()
        : db().prepare(`SELECT student_id || ':' || opportunity_id k FROM notifications WHERE kind = 'match' AND student_id = ?`).all(one)) as { k: string }[]
    ).map((r) => r.k),
  );

  const conn = db();
  const del = activeIds.length
    ? conn.prepare(
        `DELETE FROM recommendations WHERE student_id = ? AND opportunity_id IN (SELECT value FROM json_each(?))`,
      )
    : null;
  const ins = conn.prepare(
    `INSERT OR REPLACE INTO recommendations (student_id, opportunity_id, bucket, score, fit, components, reasons, scorer, now_conflicts, computed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const at = nowIso();
  const results = new Map<number, { feed: Scored[]; conflicts: Scored[]; dismissed: Scored[]; excluded: number }>();

  conn.transaction(() => {
    for (const sr of students) {
      const student = rowToStudent(sr);
      const res = scorer.rank({
        student,
        blocks: blocks.get(sr.id) ?? [],
        opportunities: opps.map((o) => o.opp),
        feedback: feedback.get(sr.id) ?? [],
        peerInterest: peers.get(sr.program) ?? new Map(),
        now: t,
      });
      // A notified item that now clashes stays in the feed, flagged — it must not silently vanish.
      const stillShown = res.conflicts.filter((c) => notified.has(`${sr.id}:${c.oppId}`));
      const feed = [...res.feed, ...stillShown].sort((a, b) => b.score - a.score || a.oppId - b.oppId);
      const conflicts = res.conflicts.filter((c) => !stillShown.includes(c));
      results.set(sr.id, { feed, conflicts, dismissed: res.dismissed, excluded: res.excluded });

      del?.run(sr.id, JSON.stringify(activeIds));
      const write = (bucket: string, s: Scored, nowConflicts: boolean) =>
        ins.run(sr.id, s.oppId, bucket, s.score, s.fit, JSON.stringify(s.components), JSON.stringify(s.reasons), scorer.id, nowConflicts ? 1 : 0, at);
      for (const s of feed) write("feed", s, s.fit === "conflict");
      for (const s of conflicts) write("conflict", s, false);
      for (const s of res.dismissed) write("dismissed", s, false);
    }
  })();
  return results;
}

export function recomputeStudent(id: number) {
  return recompute({ studentIds: [id] }).get(id);
}

export function recomputeAll() {
  return recompute();
}
