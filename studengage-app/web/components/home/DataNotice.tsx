/** Shown wherever live demo data is missing (DB not seeded, or services unavailable). */
export function DataNotice({ className = "" }: { className?: string }) {
  return (
    <div role="status" className={`rounded-lg border border-amber/30 bg-amber-wash px-4 py-3 text-sm text-amber ${className}`}>
      <p className="font-semibold">Demo data not loaded.</p>
      <p className="mt-0.5">
        Run <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs text-ink">npm run seed</code> in the{" "}
        <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs text-ink">web</code> folder, then reload this page.
      </p>
    </div>
  );
}
