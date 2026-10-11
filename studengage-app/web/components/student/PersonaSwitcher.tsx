"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PersonaVM } from "@/lib/contracts";
import { loginAsStudent } from "@/app/actions/auth";

/** "Viewing as: <persona> ▾" — one click switches the demo student (presenter helper). */
export function PersonaSwitcher({
  currentId,
  currentName,
  personas,
}: {
  currentId: number;
  currentName: string;
  personas: PersonaVM[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-ghost max-w-[11rem] px-2 py-1.5 sm:max-w-none"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="hidden text-muted sm:inline">Viewing as:</span>
        <span className="truncate font-semibold">{currentName}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="shrink-0">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div
          id={menuId}
          className="card absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-1"
        >
          <p className="px-3 pb-1 pt-2 text-xs text-muted">Switch demo student</p>
          {personas.length === 0 && <p className="px-3 py-2 text-sm text-muted">No demo students available.</p>}
          <ul>
            {personas.map((p) => {
              const current = p.id === currentId;
              return (
                <li key={p.id}>
                  <form action={loginAsStudent}>
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="submit"
                      aria-current={current ? "true" : undefined}
                      className={`block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-wash ${
                        current ? "bg-wash" : ""
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {p.name}
                        {current && <span className="chip border-emerald/30 bg-wash text-emerald-deep">Current</span>}
                      </span>
                      <span className="block text-xs text-muted">{p.persona}</span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
