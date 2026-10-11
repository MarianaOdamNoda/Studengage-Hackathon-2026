const COLUMNS = [
  {
    kicker: "The problem",
    title: "Eight places to check. None of them knows who you are.",
    body: "Events, bursary deadlines and co-op postings arrive through email, portals, social accounts and posters. Every channel sends the same thing to everybody, so a student misses the three things that were meant for them.",
  },
  {
    kicker: "The insight",
    title: "The information already exists. Posting more makes it worse.",
    body: "Universities publish plenty. The gap is not content, it is sorting. Funding goes unclaimed and placements are missed because the right item was buried under everything else.",
  },
  {
    kicker: "Our solution",
    title: "We sort. We don’t write.",
    body: "The university keeps publishing as it does today. Studengage checks who is eligible, ranks what is left around each student’s interests and timetable, and shows the reasons for every pick.",
  },
];

export function Problem() {
  return (
    <section id="why" aria-labelledby="why-title" className="scroll-mt-20 py-14 sm:py-20">
      <p className="eyebrow">Problem → insight → solution</p>
      <h2 id="why-title" className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        Students can&rsquo;t find what their own university already publishes.
      </h2>
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        {COLUMNS.map((c, i) => (
          <li
            key={c.kicker}
            className={`flex flex-col gap-3 rounded-[var(--radius-card)] p-6 ${
              i === 2 ? "border-2 border-emerald/30 bg-wash" : "card"
            }`}
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[0.13em] text-emerald">
              <span className="text-muted">0{i + 1} · </span>
              {c.kicker}
            </p>
            <h3 className="text-lg font-semibold leading-snug">{c.title}</h3>
            <p className="text-[15px] leading-relaxed text-ink-soft">{c.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
