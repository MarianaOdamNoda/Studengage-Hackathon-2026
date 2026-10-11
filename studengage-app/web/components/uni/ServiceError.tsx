export function ServiceError({ what, error }: { what: string; error: string }) {
  return (
    <div role="alert" className="card border-rose/30 bg-rose-wash p-4 text-sm text-rose">
      <p className="font-semibold">Couldn&apos;t load {what}.</p>
      <p className="mt-1 text-ink-soft">
        The demo data service returned an error. Try reloading, or reset the demo data from the home page.
      </p>
      <p className="mt-2 font-mono text-xs text-muted">{error}</p>
    </div>
  );
}
