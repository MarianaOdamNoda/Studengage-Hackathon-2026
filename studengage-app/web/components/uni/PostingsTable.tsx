import Link from "next/link";
import type { PostingStatsVM } from "@/lib/contracts";
import { EmptyState, TypeBadge } from "@/components/ui";
import { num, pct } from "./format";

export const SORT_KEYS = ["newest", "title", "matched", "notified", "interested", "attended"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function sortPostings(rows: PostingStatsVM[], sort: SortKey): PostingStatsVM[] {
  const copy = [...rows];
  switch (sort) {
    case "title":
      return copy.sort((a, b) => a.opportunity.title.localeCompare(b.opportunity.title));
    case "matched":
    case "notified":
    case "interested":
    case "attended":
      return copy.sort((a, b) => b[sort] - a[sort]);
    default:
      return copy.sort(
        (a, b) => b.opportunity.createdAt.localeCompare(a.opportunity.createdAt) || b.opportunity.id - a.opportunity.id,
      );
  }
}

const COLS: { key: SortKey | null; label: string; numeric?: boolean }[] = [
  { key: "title", label: "Posting" },
  { key: null, label: "Source" },
  { key: "matched", label: "Matched", numeric: true },
  { key: "notified", label: "Notified", numeric: true },
  { key: "interested", label: "Interested", numeric: true },
  { key: "attended", label: "Attended", numeric: true },
];

function SortHeader({ col, sort }: { col: (typeof COLS)[number]; sort: SortKey }) {
  const align = col.numeric ? "text-right" : "text-left";
  if (!col.key) {
    return (
      <th scope="col" className={`px-3 py-2 ${align}`}>
        {col.label}
      </th>
    );
  }
  const active = sort === col.key;
  return (
    <th scope="col" className={`px-3 py-2 ${align}`} aria-sort={active ? (col.key === "title" ? "ascending" : "descending") : undefined}>
      <Link
        href={active ? "/uni" : `/uni?sort=${col.key}`}
        scroll={false}
        className={`hover:text-emerald ${active ? "text-emerald-deep" : ""}`}
      >
        {col.label}
        {active ? (col.key === "title" ? " ↑" : " ↓") : ""}
      </Link>
    </th>
  );
}

const SOURCE_LABEL = { form: "Form", csv: "CSV", seed: "Seeded" } as const;

export function PostingsTable({ rows, sort }: { rows: PostingStatsVM[]; sort: SortKey }) {
  if (rows.length === 0) {
    return (
      <EmptyState title="No postings yet">
        Create one with <Link href="/uni/new" className="text-emerald underline">New posting</Link> or upload the demo CSV.
      </EmptyState>
    );
  }
  const sorted = sortPostings(rows, sort);
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">
          Postings with distribution stats. {sort === "newest" ? "Newest first." : `Sorted by ${sort}.`}
        </caption>
        <thead className="border-b border-hairline text-xs font-semibold uppercase tracking-wide text-muted">
          <tr>
            {COLS.map((c) => (
              <SortHeader key={c.label} col={c} sort={sort} />
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const o = r.opportunity;
            return (
              <tr key={o.id} className="border-b border-hairline last:border-b-0 hover:bg-wash">
                <td className="px-3 py-2.5">
                  <Link href={`/uni/postings/${o.id}`} className="font-medium hover:text-emerald hover:underline">
                    {o.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <TypeBadge type={o.type} />
                    <span>{o.department}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted">{SOURCE_LABEL[o.source]}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {num(r.matched)}
                  <span className="block text-xs text-muted">of {num(r.eligible)} eligible</span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{num(r.notified)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {num(r.interested)}
                  {r.matched > 0 && <span className="block text-xs text-muted">{pct(r.interested / r.matched)} of matched</span>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{num(r.attended)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
