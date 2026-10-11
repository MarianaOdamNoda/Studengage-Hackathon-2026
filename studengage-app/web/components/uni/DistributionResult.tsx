import type { PublishResult } from "@/lib/contracts";
import { num } from "./format";

const ITEMS: { key: keyof Omit<PublishResult, "opportunityId">; label: string; hint: string; tone: string }[] = [
  { key: "matched", label: "Matched", hint: "In these students' feeds, ranked for each one", tone: "text-emerald-deep" },
  { key: "notified", label: "Notified", hint: "Strong matches, within each student's weekly cap", tone: "text-emerald-deep" },
  { key: "conflicts", label: "Conflicts", hint: "Eligible, but it clashes with their classes", tone: "text-amber" },
  { key: "ineligible", label: "Not eligible", hint: "Filtered out by your required criteria", tone: "text-muted" },
];

/** "Matched N · Notified N · Conflicts N · Not eligible N" as four tiles. */
export function DistributionResult({ result }: { result: Omit<PublishResult, "opportunityId"> }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ITEMS.map((it) => (
        <div key={it.key} className="rounded-xl border border-hairline bg-card p-4">
          <dt className="label">{it.label}</dt>
          <dd className={`text-2xl font-bold tabular-nums tracking-tight ${it.tone}`}>{num(result[it.key])}</dd>
          <dd className="mt-1 text-xs text-muted">{it.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
