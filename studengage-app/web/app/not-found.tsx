import Link from "next/link";
import { Brand } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-hairline">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center px-4 sm:px-6">
          <Brand />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-start justify-center px-4 py-20 sm:px-6">
        <p className="eyebrow">404 · Not found</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">This page isn&rsquo;t in anyone&rsquo;s feed.</h1>
        <p className="mt-4 max-w-lg text-lg text-ink-soft">
          The link may be old, or the posting may have been removed when the demo data was reset.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="btn btn-primary">
            Back to the homepage
          </Link>
          <Link href="/#demo" className="btn">
            Open the demo
          </Link>
        </div>
      </main>
    </div>
  );
}
