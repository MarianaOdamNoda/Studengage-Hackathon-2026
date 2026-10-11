"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/uni", label: "Dashboard" },
  { href: "/uni/new", label: "New posting" },
  { href: "/uni/upload", label: "Upload CSV" },
];

export function UniNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="University panel" className="flex flex-wrap gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/uni" ? pathname === "/uni" || pathname.startsWith("/uni/postings") : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-wash text-emerald-deep" : "text-ink-soft hover:bg-wash hover:text-emerald"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
