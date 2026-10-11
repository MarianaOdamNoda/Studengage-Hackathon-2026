/**
 * Repository layer: SQLite rows <-> engine types / view models. Server-only.
 * JSON columns (tags, criteria, interests, campuses …) are parsed here and nowhere else.
 */
import { db } from "../db";
import type { Campus, OpportunityVM, SessionVM } from "../contracts";
import { closesAt } from "../engine/filter";
import type {
  Criteria,
  Feedback,
  Opportunity,
  OppType,
  Mode,
  ScheduleBlock,
  Student,
} from "../engine/types";

/** Bluenose University's academic structure (not stored in the DB: it never changes in the demo). */
export const FACULTIES: Record<string, string[]> = {
  Science: ["Chemistry", "Biology", "Computer Science"],
  Health: ["Nursing"],
  Business: ["Commerce"],
  Engineering: ["Mechanical Engineering"],
  Arts: ["Psychology", "History"],
};

export const PROGRAM_FACULTY: Record<string, string> = Object.fromEntries(
  Object.entries(FACULTIES).flatMap(([f, ps]) => ps.map((p) => [p, f])),
);

export const DEFAULT_UNIVERSITY_ID = 1;

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---- rows -------------------------------------------------------------------

export interface StudentRow {
  id: number;
  university_id: number;
  name: string;
  persona: string | null;
  is_demo: number;
  level: string;
  faculty: string;
  program: string;
  year: number;
  status: string;
  residency: string;
  campus: string;
  gpa: number | null;
  coop: number;
  in_residence: number;
  lat: number;
  lon: number;
  location_label: string | null;
  interests: string;
  weekly_cap: number;
  hidden_interests: string | null;
  equity_groups?: string | null; // joined from student_sensitive
  consent_at?: string | null;
}

export interface OpportunityRow {
  id: number;
  university_id: number;
  title: string;
  type: string;
  description: string;
  department: string;
  contact: string | null;
  link: string | null;
  campus: string | null;
  building: string | null;
  lat: number | null;
  lon: number | null;
  mode: string;
  deadline: string | null;
  capacity: number | null;
  cost: number;
  rsvp: number;
  food: number;
  accessibility: string | null;
  language: string;
  tags: string;
  required: string;
  preferred: string;
  source: string;
  status: string;
  created_at: string;
}

export interface RecommendationRow {
  student_id: number;
  opportunity_id: number;
  bucket: "feed" | "conflict" | "dismissed";
  score: number;
  fit: string;
  components: string;
  reasons: string;
  scorer: string;
  now_conflicts: number;
  computed_at: string;
}

// ---- mappers ------------------------------------------------------------------

export function rowToStudent(r: StudentRow): Student {
  return {
    id: r.id,
    name: r.name,
    level: r.level as Student["level"],
    faculty: r.faculty,
    program: r.program,
    year: r.year,
    status: r.status as Student["status"],
    residency: r.residency as Student["residency"],
    campus: r.campus,
    gpa: r.gpa,
    coop: !!r.coop,
    inResidence: !!r.in_residence,
    lat: r.lat,
    lon: r.lon,
    interests: parseJson<string[]>(r.interests, []),
    equityGroups: parseJson<string[]>(r.equity_groups ?? null, []),
  };
}

export function rowToOpportunity(r: OpportunityRow, sessions: SessionVM[]): Opportunity {
  return {
    id: r.id,
    title: r.title,
    type: r.type as OppType,
    description: r.description,
    department: r.department,
    campus: r.campus,
    building: r.building,
    lat: r.lat,
    lon: r.lon,
    mode: r.mode as Mode,
    sessions,
    deadline: r.deadline,
    tags: parseJson<string[]>(r.tags, []),
    required: parseJson<Criteria>(r.required, {}),
    preferred: parseJson<Criteria>(r.preferred, {}),
  };
}

export function rowToOpportunityVM(r: OpportunityRow, sessions: SessionVM[]): OpportunityVM {
  return {
    id: r.id,
    title: r.title,
    type: r.type as OppType,
    description: r.description,
    department: r.department,
    contact: r.contact,
    link: r.link,
    campus: r.campus,
    building: r.building,
    mode: r.mode as Mode,
    sessions,
    deadline: r.deadline,
    capacity: r.capacity,
    cost: r.cost,
    rsvp: !!r.rsvp,
    food: !!r.food,
    accessibility: r.accessibility,
    language: r.language,
    tags: parseJson<string[]>(r.tags, []),
    required: parseJson<Criteria>(r.required, {}),
    preferred: parseJson<Criteria>(r.preferred, {}),
    source: r.source as OpportunityVM["source"],
    createdAt: r.created_at,
  };
}

// ---- loaders ------------------------------------------------------------------

const STUDENT_SELECT = `
  SELECT s.*, ss.equity_groups, ss.consent_at
  FROM students s LEFT JOIN student_sensitive ss ON ss.student_id = s.id`;

export function loadStudentRow(id: number): StudentRow | undefined {
  return db().prepare(`${STUDENT_SELECT} WHERE s.id = ?`).get(id) as StudentRow | undefined;
}

export function loadStudentRows(universityId?: number): StudentRow[] {
  const sql = universityId == null ? `${STUDENT_SELECT} ORDER BY s.id` : `${STUDENT_SELECT} WHERE s.university_id = ? ORDER BY s.id`;
  const st = db().prepare(sql);
  return (universityId == null ? st.all() : st.all(universityId)) as StudentRow[];
}

/** oppId → sessions (sorted by start). Pass ids to restrict. */
export function loadSessionsMap(oppIds?: number[]): Map<number, SessionVM[]> {
  const rows = (
    oppIds
      ? oppIds.length === 0
        ? []
        : db()
            .prepare(
              `SELECT opportunity_id, start, end FROM opportunity_sessions WHERE opportunity_id IN (${oppIds.map(() => "?").join(",")}) ORDER BY start`,
            )
            .all(...oppIds)
      : db().prepare(`SELECT opportunity_id, start, end FROM opportunity_sessions ORDER BY start`).all()
  ) as { opportunity_id: number; start: string; end: string }[];
  const m = new Map<number, SessionVM[]>();
  for (const r of rows) {
    const list = m.get(r.opportunity_id) ?? [];
    list.push({ start: r.start, end: r.end });
    m.set(r.opportunity_id, list);
  }
  return m;
}

export interface LoadedOpportunity {
  row: OpportunityRow;
  sessions: SessionVM[];
  opp: Opportunity;
  vm: OpportunityVM;
}

function load(rows: OpportunityRow[]): LoadedOpportunity[] {
  const sessions = loadSessionsMap(rows.map((r) => r.id));
  return rows.map((row) => {
    const s = sessions.get(row.id) ?? [];
    return { row, sessions: s, opp: rowToOpportunity(row, s), vm: rowToOpportunityVM(row, s) };
  });
}

/** All published opportunities (optionally for one university), newest first. */
export function loadOpportunities(universityId?: number): LoadedOpportunity[] {
  const sql =
    universityId == null
      ? `SELECT * FROM opportunities WHERE status = 'published' ORDER BY created_at DESC, id DESC`
      : `SELECT * FROM opportunities WHERE status = 'published' AND university_id = ? ORDER BY created_at DESC, id DESC`;
  const st = db().prepare(sql);
  return load((universityId == null ? st.all() : st.all(universityId)) as OpportunityRow[]);
}

export function loadOpportunity(id: number): LoadedOpportunity | null {
  const row = db().prepare(`SELECT * FROM opportunities WHERE id = ?`).get(id) as OpportunityRow | undefined;
  return row ? load([row])[0] : null;
}

/** Still actionable at `at`: no closing time, or it closes in the future. */
export function isActive(opp: Opportunity, at: Date) {
  const c = closesAt(opp);
  return !c || c.getTime() >= at.getTime();
}

export function loadBlocks(studentId: number): (ScheduleBlock & { id: number })[] {
  return db()
    .prepare(`SELECT id, day, start, end, label, campus FROM schedule_blocks WHERE student_id = ? ORDER BY day, start`)
    .all(studentId) as (ScheduleBlock & { id: number })[];
}

export function loadAllBlocks(): Map<number, ScheduleBlock[]> {
  const rows = db()
    .prepare(`SELECT student_id, day, start, end, label, campus FROM schedule_blocks ORDER BY day, start`)
    .all() as (ScheduleBlock & { student_id: number })[];
  const m = new Map<number, ScheduleBlock[]>();
  for (const { student_id, ...b } of rows) {
    const list = m.get(student_id) ?? [];
    list.push(b);
    m.set(student_id, list);
  }
  return m;
}

/** studentId → engine Feedback[] (with each opportunity's tags), for every opportunity incl. closed ones. */
export function loadAllFeedback(studentId?: number): Map<number, Feedback[]> {
  const rows = (
    studentId == null
      ? db().prepare(`SELECT f.student_id, f.opportunity_id, f.feedback, f.attendance, o.tags FROM feedback f JOIN opportunities o ON o.id = f.opportunity_id`).all()
      : db()
          .prepare(`SELECT f.student_id, f.opportunity_id, f.feedback, f.attendance, o.tags FROM feedback f JOIN opportunities o ON o.id = f.opportunity_id WHERE f.student_id = ?`)
          .all(studentId)
  ) as { student_id: number; opportunity_id: number; feedback: string | null; attendance: string | null; tags: string }[];
  const m = new Map<number, Feedback[]>();
  for (const r of rows) {
    const list = m.get(r.student_id) ?? [];
    list.push({
      oppId: r.opportunity_id,
      tags: parseJson<string[]>(r.tags, []),
      feedback: (r.feedback ?? undefined) as Feedback["feedback"],
      attendance: (r.attendance ?? undefined) as Feedback["attendance"],
    });
    m.set(r.student_id, list);
  }
  return m;
}

export function loadCampuses(universityId = DEFAULT_UNIVERSITY_ID): Campus[] {
  const row = db().prepare(`SELECT campuses FROM universities WHERE id = ?`).get(universityId) as
    | { campuses: string }
    | undefined;
  return parseJson<Campus[]>(row?.campuses, []);
}
