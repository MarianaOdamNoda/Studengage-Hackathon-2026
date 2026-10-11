import Link from "next/link";
import { Brand } from "@/components/ui";

const NAV = [
  { href: "#why", label: "Why" },
  { href: "#how", label: "How it works" },
  { href: "#impact", label: "Impact" },
  { href: "#trust", label: "Privacy" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-ground/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <nav aria-label="Sections" className="flex items-center gap-1">
          <ul className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="rounded-md px-3 py-2 text-sm text-ink-soft hover:bg-wash hover:text-emerald-deep">
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#demo" className="btn btn-primary ml-2">
            Try the demo
          </a>
        </nav>
      </div>
    </header>
  );
}

const TEAM = ["David", "Emmanuel", "Mariana"];

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline bg-ground-2">
      <div className="mx-auto max-w-[1100px] px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Brand />
            <p className="mt-3 max-w-sm text-sm text-muted">
              The events, bursaries and co-op jobs that apply to you, ranked around your schedule.
            </p>
          </div>
          <div>
            <p className="label">The team · teamStar</p>
            <ul className="mt-2 flex flex-wrap gap-3">
              {TEAM.map((name) => (
                <li key={name} className="flex items-center gap-2">
                  <span
                    className="grid h-9 w-9 place-items-center rounded-full bg-emerald font-mono text-sm font-semibold text-white"
                    aria-hidden
                  >
                    {name[0]}
                  </span>
                  <span className="text-sm font-medium">{name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">Three students in Nova Scotia who live this problem every term.</p>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-hairline pt-6 text-xs text-muted sm:flex-row sm:justify-between">
          <p>Local demo · Bluenose University is fictional · all students are simulated.</p>
          <p>
            © 2026 teamStar ·{" "}
            <Link href="#demo" className="underline-offset-2 hover:text-emerald-deep hover:underline">
              Open the demo
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
