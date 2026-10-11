import { isEligible } from "./filter";
import { scheduleFit } from "./schedule";
import { scoreOpportunity, tagWeights } from "./score";
import type { Feedback, Opportunity, ScheduleBlock, Scored, Student } from "./types";

export interface RankContext {
  student: Student;
  blocks: ScheduleBlock[];
  opportunities: Opportunity[];
  feedback: Feedback[];
  /** oppId → share of same-program students who marked it interested. */
  peerInterest: Map<number, number>;
  now: Date;
}

export interface RankResult {
  /** Eligible, not dismissed, not a full clash. Highest score first. */
  feed: Scored[];
  /** Eligible but every session clashes with classes. Shown collapsed. */
  conflicts: Scored[];
  /** Marked "not interested" by the student. */
  dismissed: Scored[];
  excluded: number;
}

/**
 * A scorer turns candidates into a ranking. The formula is the only implementation today;
 * the Claude slot exists so a model-backed scorer can be switched in by config later.
 * Every stored recommendation records which scorer produced it.
 */
export interface Scorer {
  readonly id: "formula" | "claude";
  rank(ctx: RankContext): RankResult;
}

export const formulaScorer: Scorer = {
  id: "formula",
  rank(ctx) {
    const weights = tagWeights(ctx.student, ctx.feedback);
    const fb = new Map(ctx.feedback.map((f) => [f.oppId, f]));
    const out: RankResult = { feed: [], conflicts: [], dismissed: [], excluded: 0 };

    for (const opp of ctx.opportunities) {
      if (!isEligible(ctx.student, opp, ctx.now).ok) {
        out.excluded++;
        continue;
      }
      const schedule = scheduleFit(opp.sessions, ctx.blocks, opp.campus, opp.mode, ctx.now);
      const s = scoreOpportunity({
        student: ctx.student,
        opp,
        schedule,
        weights,
        peerInterest: ctx.peerInterest.get(opp.id) ?? 0,
        now: ctx.now,
      });
      const item: Scored = { oppId: opp.id, fit: schedule.fit, ...s };
      if (fb.get(opp.id)?.feedback === "not_interested") out.dismissed.push(item);
      else if (schedule.fit === "conflict") out.conflicts.push(item);
      else out.feed.push(item);
    }
    const byScore = (a: Scored, b: Scored) => b.score - a.score || a.oppId - b.oppId;
    out.feed.sort(byScore);
    out.conflicts.sort(byScore);
    out.dismissed.sort(byScore);
    return out;
  },
};

/** Placeholder for the Claude-backed scorer. Not wired up yet — the formula is in use. */
export const claudeScorer: Scorer = {
  id: "claude",
  rank() {
    throw new Error("Claude scorer is not configured yet. Set STUDENGAGE_SCORER=formula.");
  },
};

export function getScorer(): Scorer {
  return process.env.STUDENGAGE_SCORER === "claude" ? claudeScorer : formulaScorer;
}
