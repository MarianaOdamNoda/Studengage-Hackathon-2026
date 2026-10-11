"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/student/feed", label: "Feed" },
  { href: "/student/past", label: "Past" },
  { href: "/student/profile", label: "Profile" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <nav aria-label="Student" className="flex gap-1">
      {LINKS.map((l) => {
        const active = path === l.href || path.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-wash text-emerald-deep" : "text-muted hover:bg-wash hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
