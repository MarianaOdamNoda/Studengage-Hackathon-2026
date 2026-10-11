import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

/** Shared SQLite file at studengage-app/data/studengage.db (override with STUDENGAGE_DB). */
export const DB_PATH =
  process.env.STUDENGAGE_DB ?? path.resolve(process.cwd(), "..", "data", "studengage.db");

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS universities (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  campuses TEXT NOT NULL            -- JSON: [{name, lat, lon}]
);
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY,
  university_id INTEGER NOT NULL REFERENCES universities(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY,
  university_id INTEGER NOT NULL REFERENCES universities(id),
  name TEXT NOT NULL,
  persona TEXT,                     -- short tagline for demo personas; NULL for generated students
  is_demo INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL, faculty TEXT NOT NULL, program TEXT NOT NULL, year INTEGER NOT NULL,
  status TEXT NOT NULL, residency TEXT NOT NULL, campus TEXT NOT NULL,
  gpa REAL, coop INTEGER NOT NULL DEFAULT 0, in_residence INTEGER NOT NULL DEFAULT 0,
  lat REAL NOT NULL, lon REAL NOT NULL, location_label TEXT,
  interests TEXT NOT NULL DEFAULT '[]',   -- JSON string[]
  weekly_cap INTEGER NOT NULL DEFAULT 5,
  hidden_interests TEXT                    -- JSON string[]; simulation ground truth, never read by the engine
);
-- Opt-in equity self-identification, kept apart from the profile. Read only by the eligibility filter.
CREATE TABLE IF NOT EXISTS student_sensitive (
  student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  equity_groups TEXT NOT NULL DEFAULT '[]',
  consent_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS schedule_blocks (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day INTEGER NOT NULL, start TEXT NOT NULL, end TEXT NOT NULL,
  label TEXT NOT NULL, campus TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS opportunities (
  id INTEGER PRIMARY KEY,
  university_id INTEGER NOT NULL REFERENCES universities(id),
  title TEXT NOT NULL, type TEXT NOT NULL, description TEXT NOT NULL,
  department TEXT NOT NULL, contact TEXT, link TEXT,
  campus TEXT, building TEXT, lat REAL, lon REAL, mode TEXT NOT NULL DEFAULT 'in_person',
  deadline TEXT,
  capacity INTEGER, cost REAL NOT NULL DEFAULT 0, rsvp INTEGER NOT NULL DEFAULT 0,
  food INTEGER NOT NULL DEFAULT 0, accessibility TEXT, language TEXT NOT NULL DEFAULT 'English',
  tags TEXT NOT NULL DEFAULT '[]',
  required TEXT NOT NULL DEFAULT '{}',    -- JSON Criteria (hard eligibility)
  preferred TEXT NOT NULL DEFAULT '{}',   -- JSON Criteria (ranking boost only)
  source TEXT NOT NULL DEFAULT 'form',    -- form | csv | seed
  status TEXT NOT NULL DEFAULT 'published', -- draft | published
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS opportunity_sessions (
  id INTEGER PRIMARY KEY,
  opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  start TEXT NOT NULL, end TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS recommendations (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,                   -- feed | conflict | dismissed
  score REAL NOT NULL, fit TEXT NOT NULL,
  components TEXT NOT NULL, reasons TEXT NOT NULL,
  scorer TEXT NOT NULL,                   -- which scorer produced this row (formula today)
  now_conflicts INTEGER NOT NULL DEFAULT 0, -- was notified, but a schedule change now clashes
  computed_at TEXT NOT NULL,
  PRIMARY KEY (student_id, opportunity_id)
);
-- Current feedback state per student/opportunity (latest wins).
CREATE TABLE IF NOT EXISTS feedback (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  feedback TEXT,                          -- interested | not_interested | NULL
  attendance TEXT,                        -- attended | not_attended | NULL
  updated_at TEXT NOT NULL,
  PRIMARY KEY (student_id, opportunity_id)
);
-- Append-only log of every click, for analytics and future model training.
CREATE TABLE IF NOT EXISTS interaction_log (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL, opportunity_id INTEGER NOT NULL,
  kind TEXT NOT NULL, at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  opportunity_id INTEGER NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'match',     -- match | schedule_clash
  created_at TEXT NOT NULL,
  read_at TEXT,
  UNIQUE (student_id, opportunity_id, kind)
);
CREATE TABLE IF NOT EXISTS imports (
  id INTEGER PRIMARY KEY,
  university_id INTEGER NOT NULL,
  filename TEXT NOT NULL, rows_total INTEGER NOT NULL, rows_ok INTEGER NOT NULL,
  errors TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rec_student ON recommendations(student_id, bucket, score DESC);
CREATE INDEX IF NOT EXISTS idx_notif_student ON notifications(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_opp ON opportunity_sessions(opportunity_id);
`;

declare global {
  var __studengageDb: Database.Database | undefined;
}

/** One connection per process (survives Next.js hot reload). */
export function db(): Database.Database {
  if (!globalThis.__studengageDb) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    const conn = new Database(DB_PATH);
    conn.pragma("journal_mode = WAL");
    conn.pragma("foreign_keys = ON");
    conn.exec(SCHEMA);
    globalThis.__studengageDb = conn;
  }
  return globalThis.__studengageDb;
}

export const nowIso = () => new Date().toISOString();
