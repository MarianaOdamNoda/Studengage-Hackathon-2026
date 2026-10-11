import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtWhen, PageHeader, TypeBadge } from "@/components/ui";
import { ServiceError } from "@/components/uni/ServiceError";
import { MODE_LABEL, num, pct } from "@/components/uni/format";
import type { Criteria } from "@/lib/engine/types";
import { getPostingStats } from "@/lib/services";
import { requireStaff, safe } from "../../_lib/staff";

export const dynamic = "force-dynamic";

function criteriaLines(c: Criteria): string[] {
  const out: string[] = [];
  if (c.levels?.length) out.push(`Level: ${c.levels.map((l) => (l === "grad" ? "Graduate" : "Undergraduate")).join(", ")}`);
  if (c.faculties?.length) out.push(`Faculties: ${c.faculties.join(", ")}`);
  if (c.programs?.length) out.push(`Programs: ${c.programs.join(", ")}`);
  if (c.years?.length) out.push(`Years: ${c.years.join(", ")}`);
  if (c.status?.length) out.push(`Study load: ${c.status.map((s) => (s === "full" ? "Full-time" : "Part-time")).join(", ")}`);
  if (c.residency?.length) out.push(`Residency: ${c.residency.join(", ")}`);
  if (c.campuses?.length) out.push(`Campuses: ${c.campuses.join(", ")}`);
  if (c.minGpa != null) out.push(`Minimum GPA: ${c.minGpa}`);
  if (c.coop != null) out.push(`Co-op enrolled: ${c.coop ? "yes" : "no"}`);
  if (c.inResidence != null) out.push(`Lives in residence: ${c.inResidence ? "yes" : "no"}`);
  if (c.equityGroups?.length) out.push(`Equity groups (self-identified): ${c.equityGroups.join(", ")}`);
  return out;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default async function PostingDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const oppId = Number(id);
  if (!Number.isInteger(oppId) || oppId <= 0) notFound();

  const res = safe(() => getPostingStats(oppId));
  if (!res.ok) return <ServiceError what="this posting" error={res.error} />;
  const s = res.value;
  if (!s) notFound();
  const o = s.opportunity;

  const funnel = [
    { label: "Eligible", value: s.eligible, hint: "Passed the required criteria" },
    { label: "Matched", value: s.matched, hint: "In their ranked feed" },
    { label: "Notified", value: s.notified, hint: "Strong matches, within weekly caps" },
    { label: "Interested", value: s.interested, hint: "Tapped “Interested”" },
    { label: "Attended", value: s.attended, hint: "Confirmed they went" },
  ];
  const top = Math.max(1, s.eligible);
  const req = criteriaLines(o.required);
  const pref = criteriaLines(o.preferred);

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/uni" className="text-muted hover:text-emerald">
          ← Dashboard
        </Link>
      </p>
      <PageHeader
        eyebrow={o.department}
        title={o.title}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            <TypeBadge type={o.type} />
            {o.tags.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </span>
        }
      />

      <section aria-labelledby="funnel-heading" className="card p-5 sm:p-6">
        <h2 id="funnel-heading" className="text-base font-bold tracking-tight">
          Funnel
        </h2>
        <p className="mt-1 text-xs text-muted">Aggregate counts only — individual students are never shown.</p>
        <ol className="mt-5 grid gap-3">
          {funnel.map((f, i) => (
            <li key={f.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)_7rem]">
              <div>
                <p className="text-sm font-semibold">{f.label}</p>
                <p className="hidden text-xs text-muted sm:block">{f.hint}</p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-ground-2" aria-hidden>
                <div className="h-full rounded-full bg-emerald" style={{ width: `${(f.value / top) * 100}%` }} />
              </div>
              <p className="text-right text-sm tabular-nums">
                <b>{num(f.value)}</b>
                {i > 0 && funnel[i - 1].value > 0 && (
                  <span className="ml-1 text-xs text-muted">{pct(f.value / funnel[i - 1].value)}</span>
                )}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-hairline pt-3 text-xs text-muted">
          Also: {num(s.conflicts)} eligible students had a timetable clash · {num(s.notInterested)} marked not interested ·{" "}
          {num(s.notAttended)} said they didn&apos;t attend.
        </p>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-bold tracking-tight">Details</h2>
          <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{o.description}</p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <Detail label="When">
              {o.sessions.length === 0 ? (
                "No fixed time"
              ) : (
                <ul>
                  {o.sessions.map((x, i) => (
                    <li key={i}>
                      {fmtWhen(x.start)} – {new Date(x.end).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit" })}
                    </li>
                  ))}
                </ul>
              )}
            </Detail>
            <Detail label="Deadline">{o.deadline ? fmtWhen(o.deadline) : "None"}</Detail>
            <Detail label="Where">
              {MODE_LABEL[o.mode]}
              {o.campus && ` · ${o.campus}`}
              {o.building && ` · ${o.building}`}
            </Detail>
            <Detail label="Capacity">{o.capacity ?? "Unlimited"}</Detail>
            <Detail label="Cost">{o.cost > 0 ? `$${o.cost.toFixed(2)}` : "Free"}</Detail>
            <Detail label="Language">{o.language}</Detail>
            <Detail label="RSVP / food">
              {o.rsvp ? "RSVP required" : "No RSVP"} · {o.food ? "Food provided" : "No food"}
            </Detail>
            {o.accessibility && <Detail label="Accessibility">{o.accessibility}</Detail>}
            {o.contact && <Detail label="Contact">{o.contact}</Detail>}
            {o.link && (
              <Detail label="Link">
                <a href={o.link} className="break-all text-emerald underline" target="_blank" rel="noreferrer">
                  {o.link}
                </a>
              </Detail>
            )}
            <Detail label="Source">
              {o.source === "csv" ? "CSV upload" : o.source === "form" ? "Posting form" : "Seeded"} · {o.createdAt.slice(0, 10)}
            </Detail>
          </dl>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="text-base font-bold tracking-tight">Targeting</h2>
          <h3 className="label mt-4">Required — only these students see it</h3>
          {req.length ? (
            <ul className="grid gap-1 text-sm">{req.map((l) => <li key={l}>{l}</li>)}</ul>
          ) : (
            <p className="text-sm text-muted">Everyone is eligible.</p>
          )}
          <h3 className="label mt-4">Preferred — ranked higher</h3>
          {pref.length ? (
            <ul className="grid gap-1 text-sm">{pref.map((l) => <li key={l}>{l}</li>)}</ul>
          ) : (
            <p className="text-sm text-muted">No preference.</p>
          )}
        </section>
      </div>
    </>
  );
}
