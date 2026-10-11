"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import type { Campus } from "@/lib/contracts";
import { OPP_TYPES, TAGS, type Mode, type OppType } from "@/lib/engine/types";
import { TYPE_LABEL } from "@/components/ui";
import { publishPosting, type PublishState } from "@/app/uni/actions";
import { CriteriaEditor } from "./CriteriaEditor";
import { DistributionResult } from "./DistributionResult";
import { describe, Field, FieldError } from "./fields";
import { MODE_LABEL } from "./format";
import { parsePostingForm, TIMED_TYPES, type FieldErrors } from "./validatePosting";

const FIELD_LABELS: Record<string, string> = {
  title: "Title",
  type: "Type",
  description: "Description",
  department: "Department",
  contact: "Contact",
  link: "Link",
  mode: "Format",
  campus: "Campus",
  sessions: "Sessions",
  deadline: "Deadline",
  capacity: "Capacity",
  cost: "Cost",
  tags: "Tags",
};
const labelFor = (k: string) =>
  FIELD_LABELS[k] ??
  (k.startsWith("session.") ? `Session ${Number(k.split(".")[1]) + 1}` : k.startsWith("req.") ? "Required criteria" : k.startsWith("pref.") ? "Preferred criteria" : k);

function Section({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-base font-bold tracking-tight">{title}</h2>
      {intro && <div className="mt-1 text-sm text-muted">{intro}</div>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

let nextRowId = 1;

export function PostingForm({ campuses, faculties }: { campuses: Campus[]; faculties: Record<string, string[]> }) {
  const [formKey, setFormKey] = useState(0);
  const [state, setState] = useState<PublishState | null>(null);

  if (state?.status === "ok") {
    return (
      <PublishedView
        state={state}
        onAnother={() => {
          setState(null);
          setFormKey((k) => k + 1);
        }}
      />
    );
  }
  return <FormBody key={formKey} campuses={campuses} faculties={faculties} serverState={state} onResult={setState} />;
}

function PublishedView({ state, onAnother }: { state: Extract<PublishState, { status: "ok" }>; onAnother: () => void }) {
  const r = state.result;
  return (
    <div className="card p-5 sm:p-8" role="status" aria-live="polite">
      <p className="eyebrow mb-1">Published · distributed</p>
      <h2 className="text-xl font-bold tracking-tight">{state.title}</h2>
      <p className="mt-1 text-sm text-muted">
        The Studengage ranking engine checked every student&apos;s eligibility and timetable and ranked this posting in each
        matching feed.
      </p>
      <div className="mt-6">
        <DistributionResult result={r} />
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/uni/postings/${r.opportunityId}`} className="btn btn-primary">
          View posting funnel
        </Link>
        <button type="button" className="btn" onClick={onAnother}>
          Post another
        </button>
        <Link href="/uni" className="btn btn-ghost">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function FormBody({
  campuses,
  faculties,
  serverState,
  onResult,
}: {
  campuses: Campus[];
  faculties: Record<string, string[]>;
  serverState: PublishState | null;
  onResult: (s: PublishState) => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [type, setType] = useState<OppType>("event");
  const [mode, setMode] = useState<Mode>("in_person");
  const [campus, setCampus] = useState<string>(campuses[0]?.name ?? "");
  const [rows, setRows] = useState<number[]>(() => [nextRowId++]);

  const errors: FieldErrors = serverState?.status === "invalid" ? { ...serverState.errors, ...clientErrors } : clientErrors;
  const errorKeys = Object.keys(errors);
  const campusNames = campuses.map((c) => c.name);
  const selectedCampus = campuses.find((c) => c.name === campus);
  const timed = TIMED_TYPES.includes(type);

  function focusFirstError() {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { errors: errs } = parsePostingForm(fd, campusNames);
    setClientErrors(errs);
    if (Object.keys(errs).length) {
      focusFirstError();
      return;
    }
    startTransition(async () => {
      try {
        const res = await publishPosting(fd);
        if (res.status === "invalid") {
          setClientErrors(res.errors);
          focusFirstError();
        }
        onResult(res);
      } catch (err) {
        onResult({ status: "error", error: err instanceof Error ? err.message : "Something went wrong." });
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid gap-6">
      <Section title="Basics">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field id="title" label="Title" error={errors.title}>
              <input name="title" className="input" maxLength={120} {...describe("title", errors.title)} />
            </Field>
          </div>
          <Field id="type" label="Type" error={errors.type}>
            <select name="type" className="input" value={type} onChange={(e) => setType(e.target.value as OppType)} {...describe("type", errors.type)}>
              {OPP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="department" label="Department / office" error={errors.department}>
            <input name="department" className="input" placeholder="e.g. Student Services" {...describe("department", errors.department)} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="description" label="Description" error={errors.description}>
              <textarea name="description" rows={4} className="input" maxLength={2000} {...describe("description", errors.description)} />
            </Field>
          </div>
          <Field id="contact" label="Contact" optional error={errors.contact}>
            <input name="contact" className="input" placeholder="Name or email" {...describe("contact", errors.contact)} />
          </Field>
          <Field id="link" label="Link" optional error={errors.link}>
            <input name="link" type="url" className="input" placeholder="https://" {...describe("link", errors.link)} />
          </Field>
        </div>
      </Section>

      <Section
        title="When"
        intro={
          timed
            ? "Add every session. Recurring events (like a weekly club) get one row per meeting, so students see how many fit their week."
            : "Bursaries, co-op jobs and deadlines usually have no session — a deadline is enough."
        }
      >
        <fieldset aria-describedby={errors.sessions ? "sessions-error" : undefined}>
          <legend className="sr-only">Sessions</legend>
          <ol className="grid gap-3">
            {rows.map((rowId, i) => {
              const err = errors[`session.${i}`];
              return (
                <li key={rowId} className="rounded-xl border border-hairline p-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <p className="w-full text-xs font-semibold text-muted sm:w-auto sm:pb-2.5">Session {i + 1}</p>
                    <div className="min-w-0 flex-1 basis-40">
                      <label htmlFor={`session-start-${rowId}`} className="label">
                        Starts
                      </label>
                      <input
                        id={`session-start-${rowId}`}
                        name="session_start"
                        type="datetime-local"
                        className="input"
                        aria-invalid={err ? true : undefined}
                        aria-describedby={err ? `session-${rowId}-error` : undefined}
                      />
                    </div>
                    <div className="min-w-0 flex-1 basis-40">
                      <label htmlFor={`session-end-${rowId}`} className="label">
                        Ends
                      </label>
                      <input
                        id={`session-end-${rowId}`}
                        name="session_end"
                        type="datetime-local"
                        className="input"
                        aria-invalid={err ? true : undefined}
                        aria-describedby={err ? `session-${rowId}-error` : undefined}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost px-3"
                      aria-label={`Remove session ${i + 1}`}
                      onClick={() => {
                        setRows((r) => r.filter((x) => x !== rowId));
                        setClientErrors({});
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <FieldError id={`session-${rowId}-error`} error={err} />
                </li>
              );
            })}
          </ol>
          {rows.length === 0 && <p className="text-sm text-muted">No sessions — this posting has no fixed time.</p>}
          <button type="button" className="btn mt-3" onClick={() => setRows((r) => [...r, nextRowId++])}>
            + Add session
          </button>
          <FieldError id="sessions-error" error={errors.sessions} />
        </fieldset>

        <div className="mt-5 max-w-xs">
          <Field
            id="deadline"
            label="Deadline"
            optional={!["bursary", "coop", "deadline"].includes(type)}
            error={errors.deadline}
            hint="Applications or RSVP close at this time."
          >
            <input name="deadline" type="datetime-local" className="input" {...describe("deadline", errors.deadline, "hint")} />
          </Field>
        </div>
      </Section>

      <Section title="Where">
        <fieldset>
          <legend className="label">Format</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {(Object.keys(MODE_LABEL) as Mode[]).map((m) => (
              <label key={m} className="inline-flex items-center gap-2 text-sm">
                <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="accent-emerald" />
                {MODE_LABEL[m]}
              </label>
            ))}
          </div>
          <FieldError id="mode-error" error={errors.mode} />
        </fieldset>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field
            id="campus"
            label="Campus"
            optional={mode === "online"}
            error={errors.campus}
            hint={
              selectedCampus
                ? `Location set to ${selectedCampus.lat.toFixed(4)}, ${selectedCampus.lon.toFixed(4)} — used for distance ranking.`
                : "Online postings don't need a campus."
            }
          >
            <select name="campus" className="input" value={campus} onChange={(e) => setCampus(e.target.value)} {...describe("campus", errors.campus, "hint")}>
              <option value="">{mode === "online" ? "None (online)" : "Choose a campus"}</option>
              {campuses.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field id="building" label="Building / room" optional>
            <input name="building" className="input" placeholder="e.g. Student Union, Room 204" {...describe("building")} />
          </Field>
        </div>
      </Section>

      <Section
        title="Who should see it"
        intro={
          <div className="grid gap-2 sm:grid-cols-2">
            <p className="rounded-lg bg-wash px-3 py-2 text-ink-soft">
              <b className="text-emerald-deep">Required</b> = only these students see it. Everyone else never gets it.
            </p>
            <p className="rounded-lg bg-ground-2 px-3 py-2 text-ink-soft">
              <b>Preferred</b> = ranked higher for these students; others still see it.
            </p>
            <p className="sm:col-span-2">Leave everything empty to reach every student. Within a group, any ticked option qualifies.</p>
          </div>
        }
      >
        <div className="grid gap-6">
          <details open className="rounded-xl border border-hairline p-4">
            <summary className="cursor-pointer font-semibold">Required criteria (eligibility)</summary>
            <div className="mt-4">
              <CriteriaEditor prefix="req" campuses={campusNames} faculties={faculties} errors={errors} />
            </div>
          </details>
          <details open className="rounded-xl border border-hairline p-4">
            <summary className="cursor-pointer font-semibold">Preferred criteria (ranking boost)</summary>
            <div className="mt-4">
              <CriteriaEditor prefix="pref" campuses={campusNames} faculties={faculties} errors={errors} />
            </div>
          </details>
        </div>
      </Section>

      <Section title="Logistics">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field id="capacity" label="Capacity" optional error={errors.capacity}>
            <input name="capacity" type="number" min={1} step={1} inputMode="numeric" className="input" placeholder="Unlimited" {...describe("capacity", errors.capacity)} />
          </Field>
          <Field id="cost" label="Cost (CAD)" error={errors.cost}>
            <input name="cost" type="number" min={0} step="0.01" inputMode="decimal" defaultValue="0" className="input" {...describe("cost", errors.cost)} />
          </Field>
          <Field id="language" label="Language">
            <input name="language" className="input" defaultValue="English" {...describe("language")} />
          </Field>
          <div className="sm:col-span-3">
            <Field id="accessibility" label="Accessibility notes" optional>
              <input name="accessibility" className="input" placeholder="e.g. Step-free access, ASL on request" {...describe("accessibility")} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="rsvp" className="accent-emerald" />
              RSVP required
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="food" className="accent-emerald" />
              Food provided
            </label>
          </div>
        </div>
      </Section>

      <Section title="Tags" intro="The ranking engine matches these to each student's interests. Pick the ones that really fit.">
        <fieldset aria-describedby={errors.tags ? "tags-error" : undefined}>
          <legend className="sr-only">Tags</legend>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <label key={t} className="chip cursor-pointer has-[:checked]:border-emerald has-[:checked]:bg-wash has-[:checked]:text-emerald-deep">
                <input type="checkbox" name="tags" value={t} className="accent-emerald" aria-invalid={errors.tags ? true : undefined} />
                {t}
              </label>
            ))}
          </div>
          <FieldError id="tags-error" error={errors.tags} />
        </fieldset>
      </Section>

      <div className="card sticky bottom-[env(safe-area-inset-bottom,0px)] flex flex-wrap items-center justify-between gap-3 p-4">
        <div aria-live="polite" className="min-w-0 flex-1 text-sm">
          {serverState?.status === "error" && <p className="font-medium text-rose">{serverState.error}</p>}
          {errorKeys.length > 0 && (
            <p className="text-rose">
              Fix {errorKeys.length === 1 ? "1 field" : `${errorKeys.length} fields`}:{" "}
              {[...new Set(errorKeys.map(labelFor))].join(", ")}.
            </p>
          )}
          {!serverState && errorKeys.length === 0 && <p className="text-muted">Publishing ranks it for every student right away.</p>}
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Publishing…" : "Publish and distribute"}
        </button>
      </div>
    </form>
  );
}
