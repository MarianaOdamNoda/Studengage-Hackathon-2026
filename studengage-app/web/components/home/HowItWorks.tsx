import { WEIGHTS } from "@/lib/engine/score";
import type { Component } from "@/lib/engine/types";

const STEPS = [
  {
    name: "Post",
    body: "Staff publish a posting by form or CSV upload, the way they already write them. Students are matched the moment it goes live.",
  },
  {
    name: "Filter",
    body: "Hard rules come first: required criteria, closed items, passed deadlines. Equity self-ID is used here only, never for scoring.",
  },
  {
    name: "Rank",
    body: "A transparent weighted formula scores what is left. It reads the timetable: a full clash with class is set aside, a partial one ranks lower.",
  },
  {
    name: "Deliver",
    body: "Each student gets a short in-app feed. Strong matches also send a notification, capped per student per week.",
  },
  {
    name: "Feedback",
    body: "Interested, not interested and attended nudge the student's tag weights, so the next ranking is sharper.",
  },
];

const COMPONENT_COPY: Record<Component, { label: string; hint: string }> = {
  interest: { label: "Interests", hint: "Shares tags with what the student cares about, tuned by their feedback" },
  schedule: { label: "Schedule fit", hint: "Free at that time, with a 20-minute buffer between campuses" },
  urgency: { label: "Urgency", hint: "The deadline or start date is close" },
  distance: { label: "Distance", hint: "Near where the student lives or studies" },
  preferred: { label: "Preferred audience", hint: "Matches who the posting is aimed at" },
  popularity: { label: "Peer interest", hint: "Students in the same program marked it interested" },
};

export function HowItWorks() {
  const entries = (Object.entries(WEIGHTS) as [Component, number][]).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...entries.map(([, w]) => w));

  return (
    <section id="how" aria-labelledby="how-title" className="scroll-mt-20 py-14 sm:py-20">
      <p className="eyebrow">How it works</p>
      <h2 id="how-title" className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        Five steps, and the university keeps publishing exactly as it does today.
      </h2>

      <FlowDiagram />

      <ol className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.name} className="flex flex-col gap-2 bg-card p-5">
            <span className="font-mono text-xs font-bold tracking-widest text-emerald">0{i + 1}</span>
            <h3 className="font-semibold">{s.name}</h3>
            <p className="text-sm leading-relaxed text-ink-soft">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-12 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">The ranking is a formula you can read.</h3>
          <p className="mt-3 leading-relaxed text-ink-soft">
            The Studengage ranking engine adds up six signals, each between 0 and 1, with fixed weights that sum to 1.
            Every card in a student&rsquo;s feed lists the reasons behind its score, so nobody has to trust a black box.
          </p>
          <p className="mt-3 text-sm text-muted">
            These are the weights the engine runs with in this demo, read straight from its source.
          </p>
        </div>
        <div className="card p-5 sm:p-6">
          <p className="label">Score weights</p>
          <ul className="mt-3 space-y-4">
            {entries.map(([key, w]) => {
              const pct = Math.round(w * 100);
              return (
                <li key={key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{COMPONENT_COPY[key].label}</span>
                    <span className="font-mono text-sm tabular-nums text-emerald-deep">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ground-2" aria-hidden>
                    <div className="h-full rounded-full bg-emerald" style={{ width: `${(w / max) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{COMPONENT_COPY[key].hint}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Decorative overview of the pipeline; the ordered list below carries the same content for screen readers. */
function FlowDiagram() {
  const w = 156;
  const gap = 48;
  const x0 = 14;
  const xs = STEPS.map((_, i) => x0 + i * (w + gap));
  const y = 24;
  const h = 64;
  const rankMid = xs[2] + w / 2;
  const fbMid = xs[4] + w / 2;
  return (
    <div className="mt-10 hidden md:block" aria-hidden>
      <svg viewBox="0 0 1000 170" className="h-auto w-full" role="presentation">
        <defs>
          <marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="var(--color-emerald)" />
          </marker>
        </defs>
        {STEPS.slice(0, -1).map((_, i) => (
          <line
            key={i}
            x1={xs[i] + w + 4}
            y1={y + h / 2}
            x2={xs[i + 1] - 6}
            y2={y + h / 2}
            stroke="var(--color-emerald)"
            strokeWidth="2"
            markerEnd="url(#flow-arrow)"
          />
        ))}
        <path
          d={`M${fbMid} ${y + h + 4} C ${fbMid} ${y + h + 62}, ${rankMid} ${y + h + 62}, ${rankMid} ${y + h + 8}`}
          fill="none"
          stroke="var(--color-volt)"
          strokeWidth="2"
          strokeDasharray="6 5"
          markerEnd="url(#flow-arrow)"
        />
        <text x={(fbMid + rankMid) / 2} y={y + h + 58} textAnchor="middle" fontSize="13" fill="var(--color-muted)" fontFamily="var(--font-mono)">
          feedback re-ranks the feed
        </text>
        {STEPS.map((s, i) => (
          <g key={s.name}>
            <rect
              x={xs[i]}
              y={y}
              width={w}
              height={h}
              rx="14"
              fill={i === 2 ? "var(--color-emerald)" : "var(--color-card)"}
              stroke={i === 2 ? "var(--color-emerald)" : "var(--color-hairline-strong)"}
              strokeWidth="1.5"
            />
            <text x={xs[i] + 18} y={y + 25} fontSize="12" fontWeight="700" letterSpacing="1.5" fontFamily="var(--font-mono)" fill={i === 2 ? "var(--color-ground)" : "var(--color-emerald)"}>
              0{i + 1}
            </text>
            <text x={xs[i] + 18} y={y + 48} fontSize="18" fontWeight="600" fill={i === 2 ? "#ffffff" : "var(--color-ink)"}>
              {s.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
