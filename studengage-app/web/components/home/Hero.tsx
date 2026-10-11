import { FitBadge, TypeBadge } from "@/components/ui";
import type { HomePreview } from "./data";
import { DataNotice } from "./DataNotice";
import { EnterButtons } from "./EnterButtons";

export function Hero({ ready, preview }: { ready: boolean; preview: HomePreview | null }) {
  return (
    <section aria-labelledby="hero-title" className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_0.85fr]">
      <div>
        <p className="eyebrow">teamStar · Nova Scotia</p>
        <h1 id="hero-title" className="mt-4 text-4xl font-bold leading-[1.02] tracking-tight text-balance sm:text-6xl">
          The right university information, in front of the{" "}
          <span className="bg-[linear-gradient(transparent_58%,var(--color-volt)_58%)] px-0.5">right student</span>.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
          Studengage shows each university student the events, bursaries and co-op jobs that apply to them. A student
          tells us their program, year, campus and free hours; we sort everything their university posts into a short
          list, each item with its deadline and the reasons it was picked.
        </p>
        <div className="mt-8">
          <EnterButtons ready={ready} size="lg" />
          {!ready && <DataNotice className="mt-4 max-w-xl" />}
        </div>
        <p className="mt-4 text-sm text-muted">
          Local demo for the fictional Bluenose University. No sign-up — pick a side.
        </p>
      </div>

      {preview ? <LivePreview preview={preview} /> : <PreviewPlaceholder />}
    </section>
  );
}

function LivePreview({ preview }: { preview: HomePreview }) {
  const { persona, item, shown, hidden, conflicts } = preview;
  const o = item.opportunity;
  const pct = Math.round(item.score * 100);
  return (
    <figure className="relative">
      <div aria-hidden className="absolute -inset-4 -z-10 rounded-[28px] bg-wash" />
      <figcaption className="mb-3 flex items-center gap-2 text-sm text-muted">
        <span className="relative flex h-2.5 w-2.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald" />
        </span>
        Live from the demo · <span className="font-semibold text-ink">{persona.name}&rsquo;s</span> top match
      </figcaption>
      <article className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={o.type} />
          <FitBadge fit={item.fit} />
        </div>
        <h2 className="mt-3 text-lg font-semibold leading-snug">{o.title}</h2>
        <p className="mt-1 text-sm text-muted">
          {persona.program} · year {persona.year} · {persona.campus} campus
        </p>

        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs">
            <span className="label mb-0">Match</span>
            <span className="font-mono tabular-nums text-ink-soft">{pct} / 100</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ground-2" role="img" aria-label={`Match score ${pct} out of 100`}>
            <div className="h-full rounded-full bg-emerald" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {item.reasons.length > 0 && (
          <div className="mt-4 rounded-lg bg-ground p-3">
            <p className="label">Why you&rsquo;re seeing this</p>
            <ul className="space-y-1.5">
              {item.reasons.map((r) => (
                <li key={r} className="flex gap-2 text-sm text-ink-soft">
                  <Check />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </article>
      <p className="mt-3 text-xs text-muted">
        {shown} in {persona.name}&rsquo;s feed · {conflicts} clash with class · {hidden} hidden as not eligible.
        Ranked by the Studengage ranking engine.
      </p>
    </figure>
  );
}

function PreviewPlaceholder() {
  return (
    <div className="card flex flex-col gap-3 p-6" aria-hidden>
      <div className="flex gap-2">
        <span className="h-5 w-16 rounded-full bg-wash" />
        <span className="h-5 w-24 rounded-full bg-ground-2" />
      </div>
      <span className="h-5 w-3/4 rounded bg-ground-2" />
      <span className="h-3 w-1/2 rounded bg-ground-2" />
      <span className="mt-2 h-1.5 w-full rounded-full bg-ground-2" />
      <div className="mt-2 space-y-2 rounded-lg bg-ground p-3">
        <span className="block h-3 w-5/6 rounded bg-ground-2" />
        <span className="block h-3 w-2/3 rounded bg-ground-2" />
        <span className="block h-3 w-3/4 rounded bg-ground-2" />
      </div>
    </div>
  );
}

function Check() {
  return (
    <svg className="mt-0.5 shrink-0 text-emerald" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}
