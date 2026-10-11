/** Friendly panel shown when a service call fails (e.g. database not seeded yet). */
export function ServiceError({ what }: { what: string }) {
  return (
    <div role="alert" className="card border-rose/30 px-6 py-10 text-center">
      <p className="font-semibold">We couldn&apos;t load {what} right now.</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
        The demo data may still be loading or need a reset. Try refreshing the page in a moment.
      </p>
    </div>
  );
}

/** Runs a synchronous service call, returning null (and logging) instead of throwing. */
export function attempt<T>(fn: () => T, label: string): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    console.error(`[student] ${label} failed:`, e);
    return { ok: false };
  }
}
