"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { FeedItemVM } from "@/lib/contracts";
import { EmptyState, TypeBadge } from "@/components/ui";
import { setAttendanceAction } from "@/app/student/actions";
import { fmtPlace, fmtSession } from "./format";

type Att = "attended" | "not_attended";

export function PastList({ items }: { items: FeedItemVM[] }) {
  const [att, applyOptimistic] = useOptimistic<Record<number, Att>, { id: number; value: Att }>(
    {},
    (s, o) => ({ ...s, [o.id]: o.value }),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0)
    return (
      <EmptyState title="No past events yet">
        Events you were notified about or marked interested in show up here once they end.
      </EmptyState>
    );

  const set = (id: number, value: Att) => {
    setError(null);
    startTransition(async () => {
      applyOptimistic({ id, value });
      const res = await setAttendanceAction(id, value);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg bg-rose-wash px-4 py-2 text-sm text-rose">
          {error}
        </p>
      )}
      <ul className="space-y-3">
        {items.map((item) => {
          const opp = item.opportunity;
          const value = att[opp.id] ?? item.attendance;
          const last = opp.sessions[opp.sessions.length - 1];
          return (
            <li key={opp.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <TypeBadge type={opp.type} />
                  {value === "attended" && <span className="chip border-emerald/30 bg-wash text-emerald-deep">You went</span>}
                  {value === "not_attended" && <span className="chip">You didn&apos;t go</span>}
                  {!value && <span className="chip border-amber/30 bg-amber-wash text-amber">Not answered</span>}
                </div>
                <h2 className="mt-2 font-semibold leading-snug">{opp.title}</h2>
                <p className="text-sm text-muted">
                  {last ? `${fmtSession(last.start, last.end)} · ` : ""}
                  {fmtPlace(opp)}
                </p>
              </div>
              <div role="group" aria-label={`Did you go to ${opp.title}?`} className="flex shrink-0 gap-2">
                <button
                  type="button"
                  aria-pressed={value === "attended"}
                  className={`btn px-3 py-1.5 ${value === "attended" ? "btn-primary" : ""}`}
                  onClick={() => set(opp.id, "attended")}
                >
                  I went
                </button>
                <button
                  type="button"
                  aria-pressed={value === "not_attended"}
                  className={`btn px-3 py-1.5 ${value === "not_attended" ? "border-ink bg-ink text-white hover:text-white" : ""}`}
                  onClick={() => set(opp.id, "not_attended")}
                >
                  I didn&apos;t go
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
