/** npm run seed — wipe + reseed the demo DB, regenerate demo-data/, print a per-persona summary. */
import { DB_PATH } from "../lib/db";
import { getFeed, getImpact, getPendingAttendance, listPersonas, resetDemo } from "../lib/services";
import { DEMO_DIR } from "../lib/services/seed";

const t0 = Date.now();
resetDemo();
console.log(`Seeded Bluenose University demo into ${DB_PATH} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`Demo CSV + README written to ${DEMO_DIR}\n`);

for (const p of listPersonas()) {
  const f = getFeed(p.id);
  const pending = getPendingAttendance(p.id).length;
  const partial = f.feed.filter((i) => i.fit === "partial").length;
  console.log(
    `${p.name} (${p.program}, ${p.campus}) — feed ${f.feed.length}, conflicts ${f.conflicts.length}, partial ${partial}, not eligible ${f.excluded}${pending ? `, attendance pop-ups ${pending}` : ""}`,
  );
  f.feed.slice(0, 3).forEach((i, n) => console.log(`   ${n + 1}. ${i.opportunity.title}  [${i.score.toFixed(2)}] ${i.reasons.join(" · ")}`));
}

const imp = getImpact(1);
console.log(
  `\nImpact (${imp.students} simulated students, ${imp.postings} active postings): relevant share broadcast ${(imp.broadcast.relevantShare * 100).toFixed(0)}% vs Studengage ${(imp.studengage.relevantShare * 100).toFixed(0)}%, reach lift +${(imp.reachLift * 100).toFixed(0)}%`,
);
