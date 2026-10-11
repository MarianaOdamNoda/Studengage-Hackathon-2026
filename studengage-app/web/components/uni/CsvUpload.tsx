"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { TypeBadge } from "@/components/ui";
import { importCsvAction, previewCsvAction, type ImportState, type PreviewState } from "@/app/uni/actions";
import { DistributionResult } from "./DistributionResult";
import { num } from "./format";

const MAX_BYTES = 1_000_000;

export function CsvUpload() {
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [imported, setImported] = useState<ImportState | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setFile(null);
    setPreview(null);
    setImported(null);
    setLocalError(null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPreview(null);
    setImported(null);
    setLocalError(null);
    if (!f) return setFile(null);
    if (f.size > MAX_BYTES) return setLocalError("That file is larger than 1 MB.");
    const text = await f.text();
    setFile({ name: f.name, text });
    startTransition(async () => {
      try {
        setPreview(await previewCsvAction(text));
      } catch (err) {
        setPreview({ status: "error", error: err instanceof Error ? err.message : "Couldn't read the file." });
      }
    });
  }

  function publish() {
    if (!file) return;
    startTransition(async () => {
      try {
        setImported(await importCsvAction(file.name, file.text));
      } catch (err) {
        setImported({ status: "error", error: err instanceof Error ? err.message : "Import failed." });
      }
    });
  }

  if (imported?.status === "ok") return <ImportResults state={imported} onAgain={reset} />;

  const okRows = preview?.status === "ok" ? preview.rows : [];
  const rowErrors = preview?.status === "ok" ? preview.errors : [];

  return (
    <div className="grid gap-6">
      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <label htmlFor="csv-file" className="label">
              CSV file
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={onFile}
              className="block w-full max-w-sm text-sm file:mr-3 file:rounded-lg file:border file:border-hairline-strong file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:border-emerald"
            />
            <p className="mt-1 text-xs text-muted">One posting per row. Lists inside a cell are separated by “;”.</p>
          </div>
          <a href="/uni/demo-csv" className="btn" download>
            Download demo CSV
          </a>
        </div>
        <div aria-live="polite" className="mt-3 text-sm">
          {pending && !preview && <p className="text-muted">Checking the file…</p>}
          {localError && <p className="text-rose">{localError}</p>}
          {preview?.status === "error" && <p className="text-rose">{preview.error}</p>}
          {imported?.status === "error" && <p className="text-rose">{imported.error}</p>}
        </div>
      </section>

      {preview?.status === "ok" && (
        <section aria-labelledby="preview-heading" className="grid gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="preview-heading" className="text-lg font-bold tracking-tight">
                Preview · {file?.name}
              </h2>
              <p className="text-sm text-muted">
                {num(okRows.length)} valid {okRows.length === 1 ? "row" : "rows"}
                {rowErrors.length > 0 && ` · ${num(rowErrors.length)} with errors (skipped on publish)`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost" onClick={reset} disabled={pending}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={publish} disabled={pending || okRows.length === 0}>
                {pending ? "Publishing…" : `Publish ${okRows.length} ${okRows.length === 1 ? "posting" : "postings"}`}
              </button>
            </div>
          </div>

          {rowErrors.length > 0 && (
            <div role="alert" className="card border-rose/30 bg-rose-wash p-4">
              <p className="text-sm font-semibold text-rose">Rows with errors</p>
              <ul className="mt-2 grid gap-1 text-sm text-ink-soft">
                {rowErrors.map((e, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs font-semibold text-rose">Row {e.row}</span> — {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {okRows.length > 0 && (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <caption className="sr-only">Valid rows ready to publish</caption>
                <thead className="border-b border-hairline text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2">#</th>
                    <th scope="col" className="px-3 py-2">Posting</th>
                    <th scope="col" className="px-3 py-2">Where</th>
                    <th scope="col" className="px-3 py-2 text-right">Sessions</th>
                    <th scope="col" className="px-3 py-2">Deadline</th>
                    <th scope="col" className="px-3 py-2">Targeting</th>
                  </tr>
                </thead>
                <tbody>
                  {okRows.map((r, i) => {
                    const reqKeys = Object.keys(r.required ?? {}).length;
                    const prefKeys = Object.keys(r.preferred ?? {}).length;
                    return (
                      <tr key={i} className="border-b border-hairline align-top last:border-b-0">
                        <td className="px-3 py-2 tabular-nums text-muted">{i + 1}</td>
                        <td className="px-3 py-2">
                          <p className="font-medium">{r.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                            <TypeBadge type={r.type} />
                            {r.tags.map((t) => (
                              <span key={t} className="chip">{t}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-muted">
                          {r.mode === "online" ? "Online" : (r.campus ?? "—")}
                          {r.mode === "hybrid" && " · hybrid"}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{r.sessions.length || "—"}</td>
                        <td className="px-3 py-2 text-muted">{r.deadline ? r.deadline.slice(0, 10) : "—"}</td>
                        <td className="px-3 py-2 text-xs text-muted">
                          {reqKeys === 0 && prefKeys === 0
                            ? "Everyone"
                            : [reqKeys && `${reqKeys} required`, prefKeys && `${prefKeys} preferred`].filter(Boolean).join(" · ")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ImportResults({ state, onAgain }: { state: Extract<ImportState, { status: "ok" }>; onAgain: () => void }) {
  const { result, postings } = state;
  const totals = postings.reduce(
    (t, p) => ({
      matched: t.matched + p.matched,
      notified: t.notified + p.notified,
      conflicts: t.conflicts + p.conflicts,
      ineligible: t.ineligible + p.ineligible,
    }),
    { matched: 0, notified: 0, conflicts: 0, ineligible: 0 },
  );
  const maxMatched = Math.max(1, ...postings.map((p) => p.matched));

  return (
    <div className="grid gap-6" role="status" aria-live="polite">
      <section className="card p-5 sm:p-8">
        <p className="eyebrow mb-1">Published · distributed</p>
        <h2 className="text-xl font-bold tracking-tight">
          {num(postings.length)} postings, each sent to a different set of students
        </h2>
        <p className="mt-1 text-sm text-muted">
          {num(result.rowsOk)} of {num(result.rowsTotal)} rows published
          {result.errors.length > 0 && ` · ${num(result.errors.length)} skipped with errors`}. Totals across all postings
          (student × posting placements):
        </p>
        <div className="mt-6">
          <DistributionResult result={totals} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/uni" className="btn btn-primary">
            See dashboard impact
          </Link>
          <button type="button" className="btn" onClick={onAgain}>
            Upload another file
          </button>
        </div>
      </section>

      <section aria-labelledby="per-posting" className="grid gap-3">
        <h2 id="per-posting" className="text-lg font-bold tracking-tight">
          Per posting
        </h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">Distribution result per published posting</caption>
            <thead className="border-b border-hairline text-left text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">Posting</th>
                <th scope="col" className="w-1/4 px-3 py-2">Reach</th>
                <th scope="col" className="px-3 py-2 text-right">Matched</th>
                <th scope="col" className="px-3 py-2 text-right">Notified</th>
                <th scope="col" className="px-3 py-2 text-right">Conflicts</th>
                <th scope="col" className="px-3 py-2 text-right">Not eligible</th>
              </tr>
            </thead>
            <tbody>
              {postings.map((p) => (
                <tr key={p.opportunityId} className="border-b border-hairline last:border-b-0 hover:bg-wash">
                  <td className="px-3 py-2">
                    <Link href={`/uni/postings/${p.opportunityId}`} className="font-medium hover:text-emerald hover:underline">
                      {p.title}
                    </Link>
                    {p.type && (
                      <div className="mt-1">
                        <TypeBadge type={p.type} />
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-ground-2" aria-hidden>
                      <div className="h-full rounded-full bg-emerald" style={{ width: `${(p.matched / maxMatched) * 100}%` }} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-deep">{num(p.matched)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{num(p.notified)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber">{num(p.conflicts)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted">{num(p.ineligible)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.errors.length > 0 && (
          <div className="card border-rose/30 bg-rose-wash p-4 text-sm">
            <p className="font-semibold text-rose">Skipped rows</p>
            <ul className="mt-2 grid gap-1 text-ink-soft">
              {result.errors.map((e, i) => (
                <li key={i}>
                  <span className="font-mono text-xs font-semibold text-rose">Row {e.row}</span> — {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
