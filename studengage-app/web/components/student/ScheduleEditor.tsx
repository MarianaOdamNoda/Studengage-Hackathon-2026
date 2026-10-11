"use client";

import { useRef, useState, useTransition } from "react";
import type { StudentProfileVM } from "@/lib/contracts";
import { addScheduleBlockAction, importIcsAction, removeScheduleBlockAction } from "@/app/student/actions";
import { DAY_NAMES, DAY_SHORT } from "./format";

type Block = StudentProfileVM["schedule"][number];

const START_H = 8;
const END_H = 20;
const SPAN = (END_H - START_H) * 60;
const WEEKDAYS = [1, 2, 3, 4, 5];

const mins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function ScheduleEditor({ blocks, campuses, defaultCampus }: { blocks: Block[]; campuses: string[]; defaultCampus: string }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ day: 1, start: "09:00", end: "10:00", label: "", campus: defaultCampus });
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = [...blocks].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  const done = (ok: boolean, text: string) => setMsg({ ok, text });
  const RERANKED = "Your feed was re-ranked around your new schedule.";

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.end <= form.start) return done(false, "End time must be after the start time.");
    if (!form.label.trim()) return done(false, "Give the block a name, e.g. CHEM 2201.");
    startTransition(async () => {
      const res = await addScheduleBlockAction(form);
      if (res.ok) {
        setForm((f) => ({ ...f, label: "" }));
        done(true, `Added. ${RERANKED}`);
      } else done(false, res.error);
    });
  };

  const remove = (b: Block) =>
    startTransition(async () => {
      const res = await removeScheduleBlockAction(b.id);
      done(res.ok, res.ok ? `Removed ${b.label}. ${RERANKED}` : res.error);
    });

  const upload = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await importIcsAction(fd);
      if (res.ok) {
        if (fileRef.current) fileRef.current.value = "";
        done(true, `Imported ${res.data?.added ?? 0} weekly blocks (replacing your old ones). ${RERANKED}`);
      } else done(false, res.error);
    });
  };

  return (
    <section className="card p-5 sm:p-6" aria-labelledby="sec-sched">
      <h2 id="sec-sched" className="text-lg font-semibold">Weekly schedule</h2>
      <p className="text-sm text-muted">
        Things that clash with your classes move out of your main feed. We allow 20 minutes to travel between campuses.
      </p>

      {/* Visual week grid (Mon–Fri, 8:00–20:00). The list below is the accessible version. */}
      <div className="mt-4 overflow-x-auto" aria-hidden>
        <div className="grid min-w-[340px] grid-cols-[2.25rem_repeat(5,1fr)] gap-x-1">
          <div />
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-xs font-semibold text-muted">
              {DAY_SHORT[d]}
            </div>
          ))}
          <div className="relative h-[420px]">
            {Array.from({ length: END_H - START_H + 1 }, (_, i) => (
              <span
                key={i}
                className="absolute right-1 -translate-y-1/2 font-mono text-[0.65rem] text-muted"
                style={{ top: `${(i * 60 * 100) / SPAN}%` }}
              >
                {START_H + i}
              </span>
            ))}
          </div>
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="relative h-[420px] rounded-lg border border-hairline bg-ground"
              style={{
                backgroundImage: "linear-gradient(var(--color-hairline) 1px, transparent 1px)",
                backgroundSize: `100% ${100 / (END_H - START_H)}%`,
              }}
            >
              {sorted
                .filter((b) => b.day === d)
                .map((b) => {
                  const top = Math.max(0, mins(b.start) - START_H * 60);
                  const bottom = Math.min(SPAN, mins(b.end) - START_H * 60);
                  if (bottom <= 0 || top >= SPAN) return null;
                  return (
                    <div
                      key={b.id}
                      className="absolute inset-x-0.5 overflow-hidden rounded-md border border-emerald/30 bg-wash px-1 py-0.5 text-[0.65rem] leading-tight text-emerald-deep"
                      style={{ top: `${(top * 100) / SPAN}%`, height: `${((bottom - top) * 100) / SPAN}%` }}
                      title={`${b.label} · ${b.start}–${b.end} · ${b.campus}`}
                    >
                      <span className="block truncate font-semibold">{b.label}</span>
                      <span className="block truncate">{b.start}</span>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="label">Your blocks ({sorted.length})</h3>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">No classes yet. Add them below or import a calendar file.</p>
        ) : (
          <ul className="divide-y divide-hairline rounded-lg border border-hairline">
            {sorted.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{b.label}</span>
                  <span className="block text-xs text-muted">
                    {DAY_NAMES[b.day]} {b.start}–{b.end} · {b.campus}
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost px-2 py-1 text-xs"
                  disabled={isPending}
                  onClick={() => remove(b)}
                  aria-label={`Remove ${b.label} on ${DAY_NAMES[b.day]} at ${b.start}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={add} className="mt-6 grid gap-3 sm:grid-cols-[1fr_1fr_1fr] lg:grid-cols-[1fr_0.8fr_0.8fr_1.4fr_1fr_auto] lg:items-end">
        <div>
          <label htmlFor="b-day" className="label">Day</label>
          <select id="b-day" className="input" value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <option key={d} value={d}>
                {DAY_NAMES[d]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="b-start" className="label">Start</label>
          <input id="b-start" type="time" className="input" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required />
        </div>
        <div>
          <label htmlFor="b-end" className="label">End</label>
          <input id="b-end" type="time" className="input" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required />
        </div>
        <div>
          <label htmlFor="b-label" className="label">Class</label>
          <input
            id="b-label"
            className="input"
            maxLength={60}
            placeholder="e.g. CHEM 2201"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="b-campus" className="label">Campus</label>
          <select id="b-campus" className="input" value={form.campus} onChange={(e) => setForm({ ...form, campus: e.target.value })}>
            {campuses.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          Add block
        </button>
      </form>

      <form onSubmit={upload} className="mt-6 rounded-lg border border-dashed border-hairline-strong p-4">
        <label htmlFor="ics" className="label">Import from a calendar (.ics)</label>
        <p className="mb-2 text-xs text-muted">Replaces your current blocks with the weekly classes in the file.</p>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} id="ics" name="ics" type="file" accept=".ics,text/calendar" className="text-sm" required />
          <button type="submit" className="btn" disabled={isPending}>
            Import
          </button>
        </div>
      </form>

      <p role="status" aria-live="polite" className={`mt-4 text-sm ${msg?.ok ? "text-emerald-deep" : "text-rose"}`}>
        {isPending ? "Saving…" : msg?.text}
      </p>
    </section>
  );
}
