import { DataNotice } from "./DataNotice";
import { EnterButtons } from "./EnterButtons";
import { ResetDemoButton } from "./ResetDemoButton";

const SIDES = [
  {
    name: "Student side",
    body: "Open a ranked feed with reasons, schedule clashes set aside, and live notifications. Switch between six demo students from the top bar.",
  },
  {
    name: "University side",
    body: "Publish a posting or upload the demo CSV, then see who it reached, the funnel per posting, and broadcast vs Studengage.",
  },
];

export function DemoEntry({ ready, error }: { ready: boolean; error?: string }) {
  return (
    <section id="demo" aria-labelledby="demo-title" className="scroll-mt-20 py-14 sm:py-20">
      <div className="card overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1fr]">
          <div>
            <p className="eyebrow">Try the demo</p>
            <h2 id="demo-title" className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              Pick a side of Bluenose University.
            </h2>
            <p className="mt-3 max-w-md leading-relaxed text-ink-soft">
              No sign-up. Everything runs locally on simulated students, and you can reset it whenever you like.
            </p>
            <div className="mt-6">
              <EnterButtons ready={ready} size="lg" />
            </div>
            {(!ready || error) && <DataNotice className="mt-5 max-w-md" />}
          </div>
          <ul className="grid gap-4">
            {SIDES.map((s) => (
              <li key={s.name} className="rounded-xl border border-hairline bg-ground p-5">
                <h3 className="font-semibold">{s.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-hairline bg-ground-2/60 px-6 py-4 sm:px-10">
          <ResetDemoButton />
        </div>
      </div>
    </section>
  );
}
