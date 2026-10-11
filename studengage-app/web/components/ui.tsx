/**
 * Shared UI primitives. Any panel may use these; changes here affect every side of the app,
 * so add new primitives rather than changing existing ones, and log it in BUILD_STATE.md.
 */
import Link from "next/link";
import type { Fit, OppType } from "@/lib/engine/types";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-mono text-base font-semibold tracking-tight">
      <span className="h-3 w-3 rounded-full bg-volt" aria-hidden />
      <span>
        Stud<b className="text-emerald">engage</b>
      </span>
    </Link>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export const TYPE_LABEL: Record<OppType, string> = {
  event: "Event",
  workshop: "Workshop",
  bursary: "Bursary",
  coop: "Co-op / job",
  career_fair: "Career fair",
  club: "Club",
  wellness: "Wellness",
  deadline: "Academic deadline",
};

export function TypeBadge({ type }: { type: OppType }) {
  return <span className="chip border-emerald/30 bg-wash text-emerald-deep">{TYPE_LABEL[type]}</span>;
}

const FIT_STYLE: Record<Fit, { text: string; cls: string }> = {
  fits: { text: "Fits your schedule", cls: "border-emerald/30 bg-wash text-emerald-deep" },
  partial: { text: "Partial overlap", cls: "border-amber/30 bg-amber-wash text-amber" },
  conflict: { text: "Clashes with class", cls: "border-rose/30 bg-rose-wash text-rose" },
  na: { text: "No fixed time", cls: "" },
};

export function FitBadge({ fit }: { fit: Fit }) {
  const s = FIT_STYLE[fit];
  return <span className={`chip ${s.cls}`}>{s.text}</span>;
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

/** Formats a local ISO datetime like "Tue, Oct 14 · 4 PM". */
export function fmtWhen(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-CA", { hour: "numeric", minute: d.getMinutes() ? "2-digit" : undefined });
  return `${date} · ${time}`;
}
