"use client";

import { EQUITY_GROUPS } from "@/lib/engine/types";
import { MAX_GPA, YEARS, type FieldErrors } from "./validatePosting";
import { CheckGroup, FieldError } from "./fields";

const LEVELS = [
  { value: "undergrad", label: "Undergraduate" },
  { value: "grad", label: "Graduate" },
];
const STATUS = [
  { value: "full", label: "Full-time" },
  { value: "part", label: "Part-time" },
];
const RESIDENCY = [
  { value: "domestic", label: "Domestic" },
  { value: "international", label: "International" },
];

export function CriteriaEditor({
  prefix,
  campuses,
  faculties,
  errors,
}: {
  prefix: "req" | "pref";
  campuses: string[];
  faculties: Record<string, string[]>;
  errors: FieldErrors;
}) {
  const n = (k: string) => `${prefix}.${k}`;
  const id = (k: string) => `${prefix}-${k}`;
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <CheckGroup legend="Level" name={n("levels")} options={LEVELS} />
        <CheckGroup legend="Study load" name={n("status")} options={STATUS} />
        <CheckGroup legend="Residency" name={n("residency")} options={RESIDENCY} />
        <CheckGroup legend="Year of study" name={n("years")} options={YEARS.map((y) => ({ value: String(y), label: y === 5 ? "5+" : String(y) }))} />
      </div>

      <CheckGroup legend="Faculties" name={n("faculties")} options={Object.keys(faculties).map((f) => ({ value: f, label: f }))} />

      <fieldset>
        <legend className="label">Programs</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(faculties).map(([fac, progs]) => (
            <div key={fac}>
              <p className="mb-1 text-xs text-muted">{fac}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {progs.map((p) => (
                  <label key={p} className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" name={n("programs")} value={p} className="accent-emerald" />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div>
        <CheckGroup legend="Campuses" name={n("campuses")} options={campuses.map((c) => ({ value: c, label: c }))} />
        <FieldError id={id("campuses-error")} error={errors[n("campuses")]} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor={id("minGpa")} className="label">
            Minimum GPA
          </label>
          <input
            id={id("minGpa")}
            name={n("minGpa")}
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0}
            max={MAX_GPA}
            placeholder="Any"
            className="input"
            aria-invalid={!!errors[n("minGpa")]}
            aria-describedby={errors[n("minGpa")] ? id("minGpa-error") : undefined}
          />
          <FieldError id={id("minGpa-error")} error={errors[n("minGpa")]} />
        </div>
        <div>
          <label htmlFor={id("coop")} className="label">
            Co-op enrolled
          </label>
          <select id={id("coop")} name={n("coop")} className="input" defaultValue="">
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div>
          <label htmlFor={id("inResidence")} className="label">
            Lives in residence
          </label>
          <select id={id("inResidence")} name={n("inResidence")} className="input" defaultValue="">
            <option value="">Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      {prefix === "req" ? (
        <div className="rounded-xl border border-hairline bg-ground p-4">
          <CheckGroup legend="Equity groups" name={n("equityGroups")} options={EQUITY_GROUPS.map((g) => ({ value: g, label: g }))} />
          <p className="mt-2 text-xs text-muted">
            Students self-identify on an opt-in basis and can remove it at any time. It is used only to decide who is eligible —
            never for ranking — and you never see who identified.
          </p>
          <FieldError id={id("equityGroups-error")} error={errors[n("equityGroups")]} />
        </div>
      ) : (
        <p className="text-xs text-muted">
          Equity groups can only be a required criterion: self-identification is used for eligibility, never to rank.
        </p>
      )}
    </div>
  );
}
