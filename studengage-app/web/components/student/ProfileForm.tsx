"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ProfileUpdate, StudentProfileVM, UniversityVM } from "@/lib/contracts";
import { EQUITY_GROUPS, TAGS } from "@/lib/engine/types";
import { saveProfileAction } from "@/app/student/actions";
import { presetsFor, samePlace } from "./locations";

const CUSTOM = "__current__";

export function ProfileForm({ profile, university }: { profile: StudentProfileVM; university: UniversityVM }) {
  const [f, setF] = useState<ProfileUpdate>(() => ({
    level: profile.level,
    faculty: profile.faculty,
    program: profile.program,
    year: profile.year,
    status: profile.status,
    residency: profile.residency,
    campus: profile.campus,
    gpa: profile.gpa,
    coop: profile.coop,
    inResidence: profile.inResidence,
    lat: profile.lat,
    lon: profile.lon,
    locationLabel: profile.locationLabel,
    interests: profile.interests,
    weeklyCap: profile.weeklyCap,
    equityGroups: profile.equityGroups,
    equityConsent: profile.equityConsent,
  }));
  const [gpaText, setGpaText] = useState(profile.gpa == null ? "" : String(profile.gpa));
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const set = <K extends keyof ProfileUpdate>(k: K, v: ProfileUpdate[K]) => {
    setStatus(null);
    setF((cur) => ({ ...cur, [k]: v }));
  };

  const faculties = Object.keys(university.faculties);
  const programs = university.faculties[f.faculty] ?? [];
  const presets = presetsFor(f.campus);
  const presetIdx = presets.findIndex((p) => samePlace(p, f));

  const toggle = (k: "interests" | "equityGroups", v: string) =>
    set(k, f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const gpa = gpaText.trim() === "" ? null : Number(gpaText);
    if (gpa !== null && (Number.isNaN(gpa) || gpa < 0 || gpa > 4.3)) {
      setStatus({ ok: false, msg: "GPA must be a number between 0 and 4.3, or left blank." });
      return;
    }
    const payload: ProfileUpdate = { ...f, gpa, equityGroups: f.equityConsent ? f.equityGroups : [] };
    startTransition(async () => {
      const res = await saveProfileAction(payload);
      setStatus(
        res.ok
          ? { ok: true, msg: "Saved. Your feed was re-ranked with your new profile." }
          : { ok: false, msg: res.error },
      );
    });
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="card p-5 sm:p-6" aria-labelledby="sec-study">
        <h2 id="sec-study" className="text-lg font-semibold">Your studies</h2>
        <p className="text-sm text-muted">Used to check which postings you&apos;re eligible for.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Level" id="level">
            <select id="level" className="input" value={f.level} onChange={(e) => set("level", e.target.value as ProfileUpdate["level"])}>
              <option value="undergrad">Undergraduate</option>
              <option value="grad">Graduate</option>
            </select>
          </Field>
          <Field label="Year of study" id="year">
            <select id="year" className="input" value={f.year} onChange={(e) => set("year", Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Faculty" id="faculty">
            <select
              id="faculty"
              className="input"
              value={f.faculty}
              onChange={(e) => {
                const fac = e.target.value;
                setStatus(null);
                setF((cur) => ({ ...cur, faculty: fac, program: university.faculties[fac]?.[0] ?? "" }));
              }}
            >
              {faculties.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Program" id="program">
            <select id="program" className="input" value={f.program} onChange={(e) => set("program", e.target.value)}>
              {programs.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label="Study load" id="status">
            <select id="status" className="input" value={f.status} onChange={(e) => set("status", e.target.value as ProfileUpdate["status"])}>
              <option value="full">Full-time</option>
              <option value="part">Part-time</option>
            </select>
          </Field>
          <Field label="Residency" id="residency">
            <select
              id="residency"
              className="input"
              value={f.residency}
              onChange={(e) => set("residency", e.target.value as ProfileUpdate["residency"])}
            >
              <option value="domestic">Domestic</option>
              <option value="international">International</option>
            </select>
          </Field>
          <Field label="GPA (optional)" id="gpa">
            <input
              id="gpa"
              className="input"
              inputMode="decimal"
              placeholder="e.g. 3.4"
              value={gpaText}
              onChange={(e) => {
                setStatus(null);
                setGpaText(e.target.value);
              }}
            />
          </Field>
          <div className="flex flex-col justify-end gap-2 pb-1">
            <Check label="Enrolled in co-op" checked={f.coop} onChange={(v) => set("coop", v)} />
            <Check label="Living in residence" checked={f.inResidence} onChange={(v) => set("inResidence", v)} />
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="sec-where">
        <h2 id="sec-where" className="text-lg font-semibold">Where you are</h2>
        <p className="text-sm text-muted">Closer things rank a little higher. A neighbourhood is enough — no address needed.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Home campus" id="campus">
            <select
              id="campus"
              className="input"
              value={f.campus}
              onChange={(e) => {
                const campus = e.target.value;
                const p = presetsFor(campus)[0];
                setStatus(null);
                setF((cur) => ({ ...cur, campus, ...(p ? { lat: p.lat, lon: p.lon, locationLabel: p.label } : {}) }));
              }}
            >
              {university.campuses.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Neighbourhood" id="hood">
            <select
              id="hood"
              className="input"
              value={presetIdx >= 0 ? String(presetIdx) : CUSTOM}
              onChange={(e) => {
                const p = presets[Number(e.target.value)];
                if (!p) return;
                setStatus(null);
                setF((cur) => ({ ...cur, lat: p.lat, lon: p.lon, locationLabel: p.label }));
              }}
            >
              {presetIdx < 0 && <option value={CUSTOM}>{f.locationLabel || "Current location"}</option>}
              {presets.map((p, i) => (
                <option key={p.label} value={i}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Label shown on your profile" id="loclabel">
            <input
              id="loclabel"
              className="input"
              maxLength={80}
              value={f.locationLabel ?? ""}
              onChange={(e) => set("locationLabel", e.target.value)}
              placeholder="e.g. Near the Commons"
            />
          </Field>
        </div>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="sec-int">
        <h2 id="sec-int" className="text-lg font-semibold">Interests</h2>
        <p className="text-sm text-muted">The biggest part of your ranking. Pick as many as you like.</p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-labelledby="sec-int">
          {TAGS.map((t) => {
            const on = f.interests.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => toggle("interests", t)}
                className={`chip cursor-pointer px-3 py-1 text-sm capitalize transition-colors ${
                  on ? "border-emerald bg-emerald text-white" : "hover:border-emerald"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        <div className="mt-6 max-w-xs">
          <Field label="Notifications per week (max)" id="cap">
            <input
              id="cap"
              type="number"
              min={1}
              max={20}
              className="input"
              value={f.weeklyCap}
              onChange={(e) => set("weeklyCap", Number(e.target.value))}
            />
          </Field>
          <p className="text-xs text-muted">Only your best matches get a notification. Everything else waits in your feed.</p>
        </div>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="sec-eq">
        <h2 id="sec-eq" className="text-lg font-semibold">Targeted programs and bursaries (optional)</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Some bursaries and programs are only open to certain groups. If you tell us, we&apos;ll show you the ones you
          qualify for. This is used <strong className="text-ink-soft">only</strong> to check eligibility — never to rank
          your feed, and never shown to anyone. You can remove it at any time by unticking the box below.
        </p>
        <div className="mt-4">
          <Check
            label="I agree to Studengage using this information only to check my eligibility"
            checked={f.equityConsent}
            onChange={(v) => set("equityConsent", v)}
          />
        </div>
        <fieldset disabled={!f.equityConsent} className="mt-4 grid gap-2 disabled:opacity-50 sm:grid-cols-2">
          <legend className="sr-only">Groups you identify with</legend>
          {EQUITY_GROUPS.map((g) => (
            <Check key={g} label={g} checked={f.equityConsent && f.equityGroups.includes(g)} onChange={() => toggle("equityGroups", g)} />
          ))}
        </fieldset>
        {!f.equityConsent && profile.equityGroups.length > 0 && (
          <p className="mt-3 text-sm text-amber">Saving now will delete the groups you shared earlier.</p>
        )}
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-hairline bg-ground/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0">
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Saving…" : "Save and re-rank"}
        </button>
        <p role="status" aria-live="polite" className={`text-sm ${status?.ok ? "text-emerald-deep" : "text-rose"}`}>
          {status?.msg}
          {status?.ok && (
            <>
              {" "}
              <Link href="/student/feed" className="font-medium underline">
                See your feed
              </Link>
            </>
          )}
        </p>
      </div>
    </form>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 accent-emerald"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
