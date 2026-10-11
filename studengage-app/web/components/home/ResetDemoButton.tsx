"use client";

import { useActionState, useState } from "react";
import { resetDemoAction, type ResetState } from "./actions";

const INITIAL: ResetState = { status: "idle", message: "" };

/** Two-step reset: first click asks for confirmation inline (no browser dialogs). */
export function ResetDemoButton() {
  const [state, formAction, pending] = useActionState(resetDemoAction, INITIAL);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex flex-col items-start gap-2">
      {!confirming ? (
        <button type="button" className="btn btn-ghost text-muted" onClick={() => setConfirming(true)}>
          <ResetIcon />
          Reset demo data
        </button>
      ) : (
        <form
          action={formAction}
          onSubmit={() => setConfirming(false)}
          className="flex flex-wrap items-center gap-2"
        >
          <span className="text-sm text-ink-soft">Wipe all changes and reseed?</span>
          <button type="submit" className="btn border-rose/40 text-rose hover:border-rose hover:text-rose">
            Yes, reset
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </form>
      )}
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {pending ? (
          <span className="text-muted">Resetting demo data…</span>
        ) : state.status === "done" ? (
          <span className="text-emerald-deep">{state.message}</span>
        ) : state.status === "error" ? (
          <span className="text-rose">{state.message}</span>
        ) : null}
      </p>
    </div>
  );
}

function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}
