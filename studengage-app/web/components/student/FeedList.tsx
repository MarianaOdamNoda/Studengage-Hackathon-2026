"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import type { FeedItemVM, FeedVM } from "@/lib/contracts";
import type { OppType } from "@/lib/engine/types";
import { EmptyState, FitBadge, TYPE_LABEL, TypeBadge, fmtWhen } from "@/components/ui";
import { setFeedbackAction } from "@/app/student/actions";
import { fmtCost, fmtPlace, fmtSession, upcomingSessions } from "./format";

type Feedback = FeedItemVM["feedback"];
type Override = { id: number; value: Feedback };

export function FeedList({ data }: { data: FeedVM }) {
  const [overrides, applyOptimistic] = useOptimistic<Record<number, Feedback>, Override>(
    {},
    (state, o) => ({ ...state, [o.id]: o.value }),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OppType | "all">("all");

  const fb = (i: FeedItemVM): Feedback => (i.opportunity.id in overrides ? overrides[i.opportunity.id] : i.feedback);

  const setFb = (id: number, value: Feedback) => {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ id, value });
      const res = await setFeedbackAction(id, value);
      if (!res.ok) setError(res.error);
    });
  };

  const { main, conflicts, dismissed } = useMemo(() => {
    const all = [...data.feed, ...data.conflicts, ...data.dismissed];
    const isConflict = new Set(data.conflicts.map((i) => i.opportunity.id));
    const effective = (i: FeedItemVM) => (i.opportunity.id in overrides ? overrides[i.opportunity.id] : i.feedback);
    const dismissed = all.filter((i) => effective(i) === "not_interested");
    const rest = all.filter((i) => effective(i) !== "not_interested");
    return {
      main: rest.filter((i) => !isConflict.has(i.opportunity.id) && i.fit !== "conflict").sort((a, b) => b.score - a.score),
      conflicts: rest.filter((i) => isConflict.has(i.opportunity.id) || i.fit === "conflict"),
      dismissed,
    };
  }, [data, overrides]);

  const types = useMemo(() => {
    const seen = new Set<OppType>();
    for (const i of main) seen.add(i.opportunity.type);
    return [...seen];
  }, [main]);
  const activeFilter = filter !== "all" && types.includes(filter) ? filter : "all";
  const shown = activeFilter === "all" ? main : main.filter((i) => i.opportunity.type === activeFilter);

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="rounded-lg bg-rose-wash px-4 py-2 text-sm text-rose">
          {error}
        </p>
      )}

      {types.length > 1 && (
        <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
          {(["all", ...types] as const).map((t) => {
            const on = activeFilter === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(t)}
                className={`chip cursor-pointer px-3 py-1 text-sm transition-colors ${
                  on ? "border-emerald bg-emerald text-white" : "hover:border-emerald"
                }`}
              >
                {t === "all" ? `All (${main.length})` : TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>
      )}

      {main.length === 0 ? (
        <EmptyState title="You're all caught up">
          Nothing new matches you right now. When the university posts something that fits your interests and schedule,
          it will appear here and in your notifications.
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState title="Nothing of this type right now">Try another filter.</EmptyState>
      ) : (
        <ol className="space-y-4">
          {shown.map((item, idx) => (
            <li key={item.opportunity.id}>
              <FeedCard item={item} rank={idx + 1} feedback={fb(item)} onFeedback={setFb} />
            </li>
          ))}
        </ol>
      )}

      {data.excluded > 0 && (
        <p className="text-sm text-muted">
          {data.excluded} {data.excluded === 1 ? "posting is" : "postings are"} hidden because you&apos;re not eligible
          (for example, a different program or level).
        </p>
      )}

      {conflicts.length > 0 && (
        <details className="card group p-0">
          <summary className="cursor-pointer list-none px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Conflicts with your schedule ({conflicts.length})
              <span className="text-sm font-normal text-muted group-open:hidden">Show</span>
              <span className="hidden text-sm font-normal text-muted group-open:inline">Hide</span>
            </span>
            <span className="block text-sm font-normal text-muted">
              These match you, but every session overlaps one of your classes.
            </span>
          </summary>
          <ul className="space-y-4 border-t border-hairline p-4">
            {conflicts.map((item) => (
              <li key={item.opportunity.id}>
                <FeedCard item={item} feedback={fb(item)} onFeedback={setFb} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {dismissed.length > 0 && (
        <details className="card group p-0">
          <summary className="cursor-pointer list-none px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Dismissed ({dismissed.length})
              <span className="text-sm font-normal text-muted group-open:hidden">Show</span>
              <span className="hidden text-sm font-normal text-muted group-open:inline">Hide</span>
            </span>
          </summary>
          <ul className="divide-y divide-hairline border-t border-hairline">
            {dismissed.map((item) => (
              <li key={item.opportunity.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{item.opportunity.title}</p>
                  <p className="text-xs text-muted">{TYPE_LABEL[item.opportunity.type]}</p>
                </div>
                <button type="button" className="btn px-3 py-1.5" onClick={() => setFb(item.opportunity.id, null)}>
                  Undo
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function FeedCard({
  item,
  rank,
  feedback,
  onFeedback,
}: {
  item: FeedItemVM;
  rank?: number;
  feedback: Feedback;
  onFeedback: (id: number, value: Feedback) => void;
}) {
  const opp = item.opportunity;
  const sessions = upcomingSessions(opp);
  const pct = Math.round(Math.max(0, Math.min(1, item.score)) * 100);
  const interested = feedback === "interested";

  return (
    <article id={`opp-${opp.id}`} className="card scroll-mt-24 p-5 sm:p-6" aria-labelledby={`opp-title-${opp.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        {rank !== undefined && <span className="font-mono text-xs font-semibold text-muted">#{rank}</span>}
        <TypeBadge type={opp.type} />
        <FitBadge fit={item.fit} />
        {interested && <span className="chip border-emerald bg-emerald text-white">Interested</span>}
      </div>

      <h2 id={`opp-title-${opp.id}`} className="mt-3 text-lg font-bold leading-snug tracking-tight sm:text-xl">
        {opp.title}
      </h2>

      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-ink-soft sm:grid-cols-2">
        {sessions.length > 0 && (
          <div>
            <dt className="sr-only">When</dt>
            <dd>
              {fmtSession(sessions[0].start, sessions[0].end)}
              {sessions.length > 1 && <span className="text-muted"> · +{sessions.length - 1} more</span>}
            </dd>
          </div>
        )}
        <div>
          <dt className="sr-only">Where</dt>
          <dd>{fmtPlace(opp)}</dd>
        </div>
        {opp.deadline && (
          <div>
            <dt className="sr-only">Deadline</dt>
            <dd className="font-medium text-amber">Apply by {fmtWhen(opp.deadline)}</dd>
          </div>
        )}
      </dl>

      {item.nowConflicts && (
        <p className="mt-4 rounded-lg border border-amber/30 bg-amber-wash px-3 py-2 text-sm text-amber">
          Your schedule changed since we told you about this — it now overlaps one of your classes.
        </p>
      )}

      {item.reasons.length > 0 && (
        <div className="mt-4 rounded-xl bg-wash px-4 py-3">
          <p className="eyebrow">Why you&apos;re seeing this</p>
          <ul className="mt-2 space-y-1">
            {item.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-sm font-medium text-ink">
                <span aria-hidden className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-emerald" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3" title="How well this matches you, per the Studengage ranking engine">
        <span className="text-xs font-medium text-muted">Match</span>
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-ground-2"
          role="meter"
          aria-label="Match strength"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="h-full rounded-full bg-volt" style={{ width: `${pct}%` }} />
        </div>
        <span className="w-9 text-right font-mono text-xs tabular-nums text-muted">{pct}%</span>
      </div>

      <details className="group mt-4">
        <summary className="cursor-pointer text-sm font-medium text-emerald hover:text-emerald-deep">
          <span className="group-open:hidden">More details</span>
          <span className="hidden group-open:inline">Fewer details</span>
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <p className="whitespace-pre-line text-ink-soft">{opp.description}</p>
          {sessions.length > 1 && (
            <div>
              <p className="label">All sessions</p>
              <ul className="space-y-0.5 text-ink-soft">
                {sessions.map((s) => (
                  <li key={s.start}>{fmtSession(s.start, s.end)}</li>
                ))}
              </ul>
            </div>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Fact label="Cost" value={fmtCost(opp.cost)} />
            <Fact label="Registration" value={opp.rsvp ? "RSVP required" : "Drop in"} />
            {opp.food && <Fact label="Food" value="Provided" />}
            {opp.capacity != null && <Fact label="Capacity" value={`${opp.capacity} spots`} />}
            <Fact label="Language" value={opp.language} />
            <Fact label="Hosted by" value={opp.department} />
            {opp.accessibility && <Fact label="Accessibility" value={opp.accessibility} />}
            {opp.contact && <Fact label="Contact" value={opp.contact} />}
          </dl>
          {opp.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {opp.tags.map((t) => (
                <span key={t} className="chip">
                  {t}
                </span>
              ))}
            </div>
          )}
          {opp.link && (
            <a href={opp.link} target="_blank" rel="noreferrer" className="btn inline-flex">
              Open posting
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </details>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-hairline pt-4">
        <button
          type="button"
          aria-pressed={interested}
          className={`btn flex-1 sm:flex-none ${interested ? "btn-primary" : ""}`}
          onClick={() => onFeedback(opp.id, interested ? null : "interested")}
        >
          {interested ? "Interested ✓" : "Interested"}
        </button>
        <button
          type="button"
          className="btn btn-ghost flex-1 sm:flex-none"
          onClick={() => onFeedback(opp.id, "not_interested")}
        >
          Not interested
        </button>
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="break-words font-medium text-ink-soft">{value}</dd>
    </div>
  );
}
