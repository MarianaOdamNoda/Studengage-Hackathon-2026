import type { ImpactVM } from "@/lib/contracts";
import { num, pct, signedPct } from "./format";

function Bar({ value, tone }: { value: number; tone: "muted" | "emerald" }) {
  const w = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ground-2" aria-hidden>
      <div className={`h-full rounded-full ${tone === "emerald" ? "bg-emerald" : "bg-hairline-strong"}`} style={{ width: `${w}%` }} />
    </div>
  );
}

function Row({
  label,
  broadcast,
  studengage,
  broadcastBar,
  studengageBar,
}: {
  label: string;
  broadcast: string;
  studengage: string;
  broadcastBar?: number;
  studengageBar?: number;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1 border-t border-hairline py-3 first:border-t-0">
      <p className="text-sm text-ink-soft">{label}</p>
      <div className="w-20 text-right sm:w-28">
        <p className="text-sm font-semibold tabular-nums text-muted">{broadcast}</p>
        {broadcastBar != null && <Bar value={broadcastBar} tone="muted" />}
      </div>
      <div className="w-20 text-right sm:w-28">
        <p className="text-sm font-bold tabular-nums text-emerald-deep">{studengage}</p>
        {studengageBar != null && <Bar value={studengageBar} tone="emerald" />}
      </div>
    </div>
  );
}

export function ImpactPanel({ impact }: { impact: ImpactVM }) {
  return (
    <section aria-labelledby="impact-heading" className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Impact · on simulated students</p>
          <h2 id="impact-heading" className="text-lg font-bold tracking-tight">
            Broadcast vs Studengage
          </h2>
          <p className="mt-1 text-sm text-muted">
            {num(impact.students)} simulated students · {num(impact.postings)} active postings
          </p>
        </div>
        <div className="rounded-xl bg-wash px-4 py-3 text-right">
          <p className="text-3xl font-bold tabular-nums tracking-tight text-emerald-deep">{signedPct(impact.reachLift)}</p>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-deep">relevant reach</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
          <span />
          <span className="w-20 text-right sm:w-28">Broadcast</span>
          <span className="w-20 text-right text-emerald-deep sm:w-28">Studengage</span>
        </div>
        <Row
          label="Notifications per student"
          broadcast={num(impact.broadcast.notificationsPerStudent)}
          studengage={num(impact.studengage.notificationsPerStudent)}
        />
        <Row
          label="Share of what students see that is relevant to them"
          broadcast={pct(impact.broadcast.relevantShare)}
          studengage={pct(impact.studengage.relevantShare)}
          broadcastBar={impact.broadcast.relevantShare}
          studengageBar={impact.studengage.relevantShare}
        />
        <Row
          label="Relevant student–posting pairs reached"
          broadcast="—"
          studengage={pct(impact.studengage.relevantReach)}
          studengageBar={impact.studengage.relevantReach}
        />
      </div>

      <p className="mt-4 border-t border-hairline pt-3 text-xs text-muted">{impact.definition}</p>
    </section>
  );
}
