import Link from "next/link";
import { PageHeader, Stat } from "@/components/ui";
import { ImpactPanel } from "@/components/uni/ImpactPanel";
import { PostingsTable, SORT_KEYS, type SortKey } from "@/components/uni/PostingsTable";
import { ServiceError } from "@/components/uni/ServiceError";
import { num } from "@/components/uni/format";
import { getImpact, listPostingStats } from "@/lib/services";
import { requireStaff, safe } from "./_lib/staff";

export const dynamic = "force-dynamic";

export default async function UniDashboard({ searchParams }: { searchParams: Promise<{ sort?: string }> }) {
  const staff = await requireStaff();
  const { sort: rawSort } = await searchParams;
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(rawSort ?? "") ? (rawSort as SortKey) : "newest";

  const impact = safe(() => getImpact(staff.universityId));
  const stats = safe(() => listPostingStats(staff.universityId));

  const totals = stats.ok
    ? stats.value.reduce(
        (t, r) => ({ matched: t.matched + r.matched, notified: t.notified + r.notified, interested: t.interested + r.interested }),
        { matched: 0, notified: 0, interested: 0 },
      )
    : null;

  return (
    <>
      <PageHeader
        eyebrow="University panel"
        title="Dashboard"
        subtitle="Post once. The Studengage ranking engine puts each posting in front of the students it fits, around their timetables."
        actions={
          <>
            <Link href="/uni/upload" className="btn">
              Upload CSV
            </Link>
            <Link href="/uni/new" className="btn btn-primary">
              New posting
            </Link>
          </>
        }
      />

      {impact.ok ? <ImpactPanel impact={impact.value} /> : <ServiceError what="impact numbers" error={impact.error} />}

      <section aria-labelledby="postings-heading" className="mt-10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="postings-heading" className="text-lg font-bold tracking-tight">
            Postings
          </h2>
          <p className="text-xs text-muted">Click a column to sort. Counts are aggregate; no individual student data is shown.</p>
        </div>
        {stats.ok && totals && stats.value.length > 0 && (
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Postings" value={num(stats.value.length)} />
            <Stat label="Feed placements" value={num(totals.matched)} hint="Posting × student matches" />
            <Stat label="Notifications sent" value={num(totals.notified)} hint="Within weekly caps" />
            <Stat label="Marked interested" value={num(totals.interested)} />
          </div>
        )}
        {stats.ok ? <PostingsTable rows={stats.value} sort={sort} /> : <ServiceError what="postings" error={stats.error} />}
      </section>
    </>
  );
}
