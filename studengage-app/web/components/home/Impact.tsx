import type { ImpactVM } from "@/lib/contracts";
import type { Loaded } from "./data";
import { DataNotice } from "./DataNotice";

const pct = (x: number) => `${Math.round(x * 100)}%`;
const signedPct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(Math.round(x * 100))}%`;
const num = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

export function Impact({ impact }: { impact: Loaded<ImpactVM> }) {
  return (
    <section id="impact" aria-labelledby="impact-title" className="scroll-mt-20 bg-ink text-ground">
      <div className="mx-auto max-w-[1100px] px-4 py-14 sm:px-6 sm:py-20">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-volt">Impact · live</p>
        <h2 id="impact-title" className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">
          Broadcast vs Studengage, measured on the same students and the same postings.
        </h2>
        {impact.ok ? <Numbers i={impact.value} /> : <DataNotice className="mt-8 max-w-xl" />}
      </div>
    </section>
  );
}

function Numbers({ i }: { i: ImpactVM }) {
  return (
    <>
      <p className="mt-4 max-w-2xl text-ground/75">
        Computed right now on <b className="text-white">{i.students.toLocaleString("en-CA")} simulated students</b> and{" "}
        <b className="text-white">{i.postings.toLocaleString("en-CA")} active postings</b>, with every student given the
        same attention budget.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[var(--radius-card)] border border-volt/40 bg-white/5 p-6">
          <p className="font-mono text-xs font-semibold uppercase tracking-wider text-ground/70">Relevant reach per announcement</p>
          <p className="mt-2 text-6xl font-bold tabular-nums tracking-tight text-volt sm:text-7xl">{signedPct(i.reachLift)}</p>
          <p className="mt-3 text-ground/80">
            more relevant items seen per student than a broadcast that sends everyone everything.
          </p>
          <p className="mt-2 text-sm text-ground/60">
            Studengage reaches {pct(i.studengage.relevantReach)} of all student–posting pairs that are relevant.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Compare
            title="Share of what they see that is relevant"
            broadcast={i.broadcast.relevantShare}
            studengage={i.studengage.relevantShare}
            format={pct}
            max={1}
          />
          <Compare
            title="Notifications per student"
            broadcast={i.broadcast.notificationsPerStudent}
            studengage={i.studengage.notificationsPerStudent}
            format={num}
            max={Math.max(i.broadcast.notificationsPerStudent, i.studengage.notificationsPerStudent, 1)}
          />
        </div>
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-ground/60">
        <span className="font-semibold text-ground/80">How we measure: </span>
        {i.definition}
      </p>

      <div className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-6 sm:flex-row sm:items-center sm:gap-6">
        <p className="shrink-0 font-mono text-xs font-semibold uppercase tracking-wider text-volt">Pilot target</p>
        <p className="text-ground/80">
          <b className="text-white">30% more relevant reach per announcement</b> at one university over one term, baselined
          on day one. This is a target for the pilot, not a result.
        </p>
      </div>
    </>
  );
}

function Compare({
  title,
  broadcast,
  studengage,
  format,
  max,
}: {
  title: string;
  broadcast: number;
  studengage: number;
  format: (x: number) => string;
  max: number;
}) {
  const rows = [
    { name: "Broadcast", value: broadcast, bar: "bg-ground/40", text: "text-ground/80" },
    { name: "Studengage", value: studengage, bar: "bg-volt", text: "text-volt" },
  ];
  return (
    <div className="rounded-[var(--radius-card)] border border-white/15 bg-white/5 p-5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <dl className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.name}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="text-ground/70">{r.name}</dt>
              <dd className={`font-mono text-lg font-semibold tabular-nums ${r.text}`}>{format(r.value)}</dd>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10" aria-hidden>
              <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${Math.min(100, (r.value / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}
