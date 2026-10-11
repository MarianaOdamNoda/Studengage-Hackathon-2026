"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { FeedItemVM } from "@/lib/contracts";
import { TypeBadge } from "@/components/ui";
import { setAttendanceAction } from "@/app/student/actions";
import { fmtPlace, fmtSession } from "./format";

const LATER_KEY = "sg_attendance_later";

function readLater(): number[] {
  try {
    const raw = sessionStorage.getItem(LATER_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === "number") : [];
  } catch {
    return [];
  }
}

function writeLater(ids: number[]) {
  try {
    sessionStorage.setItem(LATER_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable: "Later" just lasts for this page view */
  }
}

/**
 * Asks, one at a time, whether the student went to ended events they were notified about
 * or marked interested in. Native <dialog> gives focus trapping and Esc handling; Esc = Later.
 */
export function AttendanceModal({ pending }: { pending: FeedItemVM[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [later, setLater] = useState<number[] | null>(null); // null until sessionStorage is read
  const [answered, setAnswered] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLater(readLater());
  }, []);

  const queue = later === null ? [] : pending.filter((p) => !later.includes(p.opportunity.id) && !answered.includes(p.opportunity.id));
  const current = queue[0] ?? null;

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (current && !d.open) d.showModal();
    if (!current && d.open) d.close();
  }, [current]);

  const snooze = (id: number) => {
    const next = Array.from(new Set([...(later ?? []), id]));
    writeLater(next);
    setLater(next);
    setError(null);
  };

  const answer = (id: number, value: "attended" | "not_attended") => {
    setError(null);
    setAnswered((a) => [...a, id]);
    startTransition(async () => {
      const res = await setAttendanceAction(id, value);
      if (!res.ok) {
        setAnswered((a) => a.filter((x) => x !== id));
        setError(res.error);
      }
    });
  };

  const opp = current?.opportunity;
  const lastSession = opp?.sessions[opp.sessions.length - 1];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="attendance-title"
      aria-describedby="attendance-desc"
      onCancel={(e) => {
        e.preventDefault();
        if (current) snooze(current.opportunity.id);
      }}
      className="card m-auto w-[min(28rem,calc(100vw-2rem))] p-0 text-ink backdrop:bg-ink/40"
    >
      {current && opp && (
        <div className="p-6">
          <div className="flex items-center justify-between gap-2">
            <p className="eyebrow">Quick check-in</p>
            {queue.length > 1 && <p className="text-xs text-muted">1 of {queue.length}</p>}
          </div>
          <h2 id="attendance-title" className="mt-3 text-xl font-bold tracking-tight">
            Did you go to “{opp.title}”?
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TypeBadge type={opp.type} />
            {lastSession && <span className="text-sm text-muted">{fmtSession(lastSession.start, lastSession.end)}</span>}
          </div>
          <p className="mt-1 text-sm text-muted">{fmtPlace(opp)}</p>
          <p id="attendance-desc" className="mt-4 text-sm text-ink-soft">
            Your answer helps the Studengage ranking engine show you more of what you actually go to. Organisers
            only ever see totals, never names.
          </p>
          {error && (
            <p role="alert" className="mt-3 rounded-lg bg-rose-wash px-3 py-2 text-sm text-rose">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className="btn btn-primary flex-1"
              disabled={isPending}
              onClick={() => answer(opp.id, "attended")}
              autoFocus
            >
              I went
            </button>
            <button
              type="button"
              className="btn flex-1"
              disabled={isPending}
              onClick={() => answer(opp.id, "not_attended")}
            >
              I didn’t go
            </button>
            <button type="button" className="btn btn-ghost flex-1" disabled={isPending} onClick={() => snooze(opp.id)}>
              Later
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
