const POINTS = [
  {
    title: "Only what the student types in",
    body: "Program, year, campus, timetable, interests and a home area. Visible to the student and editable any time. No health information, ever.",
  },
  {
    title: "Equity self-ID is opt-in and eligibility-only",
    body: "A student can choose to share it, with explicit consent, and remove it later. It only unlocks postings reserved for that group. It never changes a score.",
  },
  {
    title: "The university pushes its own postings",
    body: "No scraping, no purchased data, no brokers. Staff publish through a form or a CSV upload, and see only aggregate numbers, never individual students.",
  },
  {
    title: "No language model in the loop",
    body: "Ranking is a fixed, published formula. It does not write content, does not decide eligibility, and explains every recommendation it makes.",
  },
];

export function Trust() {
  return (
    <section id="trust" aria-labelledby="trust-title" className="scroll-mt-20 py-14 sm:py-20">
      <p className="eyebrow">Privacy &amp; trust</p>
      <h2 id="trust-title" className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        Built to stay clear of privacy trouble, by not collecting.
      </h2>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2">
        {POINTS.map((p) => (
          <li key={p.title} className="card flex gap-4 p-5 sm:p-6">
            <span className="mt-1.5 h-3 w-3 shrink-0 rounded-[3px] bg-emerald" aria-hidden />
            <div>
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{p.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-muted">
        Privacy framing states design intent, not a legal opinion. A real launch would be confirmed with the
        institution&rsquo;s privacy office.
      </p>
    </section>
  );
}
