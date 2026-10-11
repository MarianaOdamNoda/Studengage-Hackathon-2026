/**
 * Wipes and reseeds the demo database. History is simulated by replaying each baseline
 * posting through the real pipeline at the time it was published (clock time travel).
 * All dates are relative to the moment of seeding.
 */
import fs from "node:fs";
import path from "node:path";
import { db } from "../db";
import { postingsToCsv } from "../csv";
import { DAY_MS, now, setNow } from "./clock";
import {
  baselinePostings,
  CAMPUSES,
  demoCsvPostings,
  generateStudents,
  PERSONAS,
  prng,
  STAFF,
  UNIVERSITY_NAME,
  type GeneratedStudent,
  type PersonaSeed,
} from "./demo-data";
import { distributeNotifications, insertOpportunity } from "./publish";
import { recompute } from "./recompute";
import { DEFAULT_UNIVERSITY_ID, isActive, loadOpportunities, parseJson } from "./repo";

export const GENERATED_STUDENTS = 250;
export const DEMO_DIR = path.resolve(process.cwd(), "..", "demo-data");

export function getDemoCsv(): string {
  return postingsToCsv(demoCsvPostings(now()));
}

const DEMO_README = `# Demo data

\`bluenose-postings.csv\` holds ~30 new postings for fictional Bluenose University. Upload it in the
University panel (Upload CSV) to watch Studengage rank and distribute them live. \`npm run seed\`
regenerates it with dates relative to today, and the panel's "Download demo CSV" always gives a fresh copy.

## Format

- First row is the header. Row numbers in error messages count the header as row 1.
- Standard CSV quoting: wrap a field in double quotes if it contains a comma, quote or line break; write a quote as \`""\`.
- Lists use \`;\` between items (e.g. \`tags\` = \`career;networking\`).
- Booleans: \`yes\` / \`no\` (blank = not set).
- \`sessions\`: \`start/end;start/end\` in local time, e.g. \`2026-10-14T16:00/2026-10-14T18:00\`.
- \`deadline\`: \`2026-10-20\` (end of day) or \`2026-10-20T17:00\`.
- Every posting needs at least one session or a deadline, at least one tag, and a campus if it meets in person.

| Column | Values |
|---|---|
| title, description, department | required text |
| type | event, workshop, bursary, coop, career_fair, club, wellness, deadline |
| contact, link, building, accessibility | optional text |
| campus | Harbour, Northshore, Valley |
| mode | in_person (default), online, hybrid |
| capacity | whole number; cost: number (0 = free) |
| rsvp, food | yes / no |
| language | default English |
| tags | career, research, social, sports, arts, volunteering, wellness, tech, finance, networking, leadership, culture, food, outdoors, academic |
| req_* | hard eligibility: students who don't match never see the posting |
| pref_* | ranking boost only |

Criteria suffixes (for both \`req_\` and \`pref_\`): \`levels\` (undergrad;grad), \`faculties\` (Science;Health;Business;Engineering;Arts),
\`programs\` (Chemistry;Biology;Computer Science;Nursing;Commerce;Mechanical Engineering;Psychology;History), \`years\` (1–6),
\`status\` (full;part), \`residency\` (domestic;international), \`campuses\`, \`min_gpa\` (0–4.3), \`coop\` (yes/no),
\`in_residence\` (yes/no), \`equity_groups\` (opt-in self-identification; only ever used for eligibility, never for ranking):
African Nova Scotian; Indigenous / Mi'kmaq; 2SLGBTQIA+; Students with disabilities; First-generation; Mature students; Student parents.
`;

/** Writes demo-data/bluenose-postings.csv + README.md. Returns the CSV path. */
export function writeDemoFiles(dir = DEMO_DIR) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "bluenose-postings.csv");
  fs.writeFileSync(file, getDemoCsv(), "utf8");
  fs.writeFileSync(path.join(dir, "README.md"), DEMO_README, "utf8");
  return file;
}

function insertStudent(s: PersonaSeed | GeneratedStudent, demo: boolean, consentAt: string) {
  const conn = db();
  const id = Number(
    conn
      .prepare(
        `INSERT INTO students (university_id, name, persona, is_demo, level, faculty, program, year, status, residency, campus, gpa, coop, in_residence,
           lat, lon, location_label, interests, weekly_cap, hidden_interests) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        DEFAULT_UNIVERSITY_ID, s.name, demo ? (s as PersonaSeed).persona : null, demo ? 1 : 0, s.level, s.faculty, s.program, s.year, s.status,
        s.residency, s.campus, s.gpa, s.coop ? 1 : 0, s.inResidence ? 1 : 0, s.lat, s.lon, s.locationLabel, JSON.stringify(s.interests),
        demo ? 5 : (s as GeneratedStudent).weeklyCap, demo ? null : JSON.stringify((s as GeneratedStudent).hiddenInterests),
      ).lastInsertRowid,
  );
  const ins = conn.prepare(`INSERT INTO schedule_blocks (student_id, day, start, end, label, campus) VALUES (?,?,?,?,?,?)`);
  for (const b of s.schedule) ins.run(id, b.day, b.start, b.end, b.label, b.campus);
  if (s.equityGroups.length)
    conn.prepare(`INSERT INTO student_sensitive (student_id, equity_groups, consent_at) VALUES (?,?,?)`).run(id, JSON.stringify(s.equityGroups), consentAt);
  return id;
}

export function resetDemo(): void {
  setNow(null);
  const t = now();
  const conn = db();
  const personaIds = new Map<string, number>();
  conn.transaction(() => {
    for (const table of [
      "interaction_log", "notifications", "feedback", "recommendations", "opportunity_sessions", "opportunities",
      "imports", "schedule_blocks", "student_sensitive", "students", "staff", "universities",
    ])
      conn.exec(`DELETE FROM ${table}`);
    conn.prepare(`INSERT INTO universities (id, name, campuses) VALUES (?, ?, ?)`).run(DEFAULT_UNIVERSITY_ID, UNIVERSITY_NAME, JSON.stringify(CAMPUSES));
    for (const s of STAFF) conn.prepare(`INSERT INTO staff (university_id, name, role) VALUES (?, ?, ?)`).run(DEFAULT_UNIVERSITY_ID, s.name, s.role);
    const consent = new Date(t.getTime() - 30 * DAY_MS).toISOString();
    for (const p of PERSONAS) personaIds.set(p.key, insertStudent(p, true, consent));
    for (const g of generateStudents(GENERATED_STUDENTS)) insertStudent(g, false, consent);
  })();
  const personaSet = new Set(personaIds.values());

  // Replay history: publish each baseline posting at its own time through the real pipeline.
  const baseline = baselinePostings(t).sort((a, b) => b.publishedDaysAgo - a.publishedDaysAgo);
  const published: { id: number; personaInterested?: string[] }[] = [];
  try {
    for (const bp of baseline) {
      const at = new Date(t.getTime() - bp.publishedDaysAgo * DAY_MS);
      setNow(at);
      const id = insertOpportunity(DEFAULT_UNIVERSITY_ID, bp.input, "seed", at.toISOString());
      recompute({ opportunities: loadOpportunities().filter((o) => o.row.id === id) });
      distributeNotifications([id], at);
      published.push({ id, personaInterested: bp.personaInterested });
    }
  } finally {
    setNow(null);
  }

  const ended = new Set(loadOpportunities().filter((o) => !isActive(o.opp, t)).map((o) => o.row.id));
  // Personas only carry the story beats we chose (no surprise attendance pop-ups).
  const del = conn.prepare(`DELETE FROM notifications WHERE student_id = ? AND opportunity_id = ?`);
  for (const pid of personaSet) for (const oid of ended) del.run(pid, oid);

  // Simulated feedback from generated students, driven by their hidden interests (with noise).
  const r = prng(4242);
  const tags = new Map(loadOpportunities().map((o) => [o.row.id, o.opp.tags]));
  const students = conn.prepare(`SELECT id, hidden_interests FROM students WHERE is_demo = 0`).all() as { id: number; hidden_interests: string }[];
  const keys = (sql: string) => new Set((conn.prepare(sql).all() as { k: string }[]).map((x) => x.k));
  const eligible = keys(`SELECT student_id || ':' || opportunity_id k FROM recommendations`);
  const notified = keys(`SELECT student_id || ':' || opportunity_id k FROM notifications`);
  const fb = conn.prepare(`INSERT OR REPLACE INTO feedback (student_id, opportunity_id, feedback, attendance, updated_at) VALUES (?,?,?,?,?)`);
  const log = conn.prepare(`INSERT INTO interaction_log (student_id, opportunity_id, kind, at) VALUES (?,?,?,?)`);
  conn.transaction(() => {
    for (const s of students) {
      const hidden = new Set(parseJson<string[]>(s.hidden_interests, []));
      for (const { id } of published) {
        const key = `${s.id}:${id}`;
        if (!eligible.has(key)) continue;
        const overlap = (tags.get(id) ?? []).filter((x) => hidden.has(x)).length;
        const seen = notified.has(key);
        let feedback: string | null = null;
        if (overlap > 0 && r.chance(seen ? 0.55 : 0.25)) feedback = "interested";
        else if (overlap === 0 && r.chance(0.03)) feedback = "interested";
        else if (seen && overlap === 0 && r.chance(0.35)) feedback = "not_interested";
        let attendance: string | null = null;
        if (ended.has(id)) {
          if (feedback === "interested") attendance = r.chance(0.7) ? "attended" : "not_attended";
          else if (seen && overlap > 0 && r.chance(0.15)) attendance = "attended";
        }
        if (!feedback && !attendance) continue;
        const at = new Date(t.getTime() - (1 + r.next() * 5) * DAY_MS).toISOString();
        fb.run(s.id, id, feedback, attendance, at);
        if (feedback) log.run(s.id, id, feedback, at);
        if (attendance) log.run(s.id, id, attendance, at);
      }
    }
    // Story beats for personas (e.g. Amara marked the mixer interested → attendance pop-up).
    for (const { id, personaInterested } of published)
      for (const key of personaInterested ?? []) {
        const pid = personaIds.get(key);
        if (!pid) continue;
        const at = new Date(t.getTime() - 6 * DAY_MS).toISOString();
        fb.run(pid, id, "interested", null, at);
        log.run(pid, id, "interested", at);
      }
    // History is history: the bell starts clean so live uploads stand out.
    conn.prepare(`UPDATE notifications SET read_at = created_at WHERE read_at IS NULL`).run();
  })();

  recompute();
  try {
    writeDemoFiles();
  } catch {
    // Read-only folder: the panel's download helper regenerates the CSV on demand.
  }
}
