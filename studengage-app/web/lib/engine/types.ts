// Shared domain types for the Studengage engine. Pure data, no DB or UI concerns.

export const OPP_TYPES = [
  "event",
  "workshop",
  "bursary",
  "coop",
  "career_fair",
  "club",
  "wellness",
  "deadline",
] as const;
export type OppType = (typeof OPP_TYPES)[number];

export const TAGS = [
  "career",
  "research",
  "social",
  "sports",
  "arts",
  "volunteering",
  "wellness",
  "tech",
  "finance",
  "networking",
  "leadership",
  "culture",
  "food",
  "outdoors",
  "academic",
] as const;

export const EQUITY_GROUPS = [
  "African Nova Scotian",
  "Indigenous / Mi'kmaq",
  "2SLGBTQIA+",
  "Students with disabilities",
  "First-generation",
  "Mature students",
  "Student parents",
] as const;

export type Level = "undergrad" | "grad";
export type Status = "full" | "part";
export type Residency = "domestic" | "international";
export type Mode = "in_person" | "online" | "hybrid";

/** Targeting rules. Every field is optional; an empty object means "everyone". */
export interface Criteria {
  levels?: Level[];
  faculties?: string[];
  programs?: string[];
  years?: number[];
  status?: Status[];
  residency?: Residency[];
  campuses?: string[];
  minGpa?: number;
  coop?: boolean;
  inResidence?: boolean;
  equityGroups?: string[];
}

/** Local wall-clock ISO strings, e.g. "2026-10-14T16:00". */
export interface Session {
  start: string;
  end: string;
}

export interface Opportunity {
  id: number;
  title: string;
  type: OppType;
  description: string;
  department: string;
  campus: string | null;
  building: string | null;
  lat: number | null;
  lon: number | null;
  mode: Mode;
  sessions: Session[];
  deadline: string | null;
  tags: string[];
  required: Criteria;
  preferred: Criteria;
}

export interface Student {
  id: number;
  name: string;
  level: Level;
  faculty: string;
  program: string;
  year: number;
  status: Status;
  residency: Residency;
  campus: string;
  gpa: number | null;
  coop: boolean;
  inResidence: boolean;
  lat: number;
  lon: number;
  interests: string[];
  /** Opt-in self-identification. Only ever read by the eligibility filter. */
  equityGroups: string[];
}

/** A weekly recurring class block. day: 0 = Sunday … 6 = Saturday. */
export interface ScheduleBlock {
  day: number;
  start: string; // "HH:MM"
  end: string;
  label: string;
  campus: string;
}

export type FeedbackKind = "interested" | "not_interested";
export type AttendanceKind = "attended" | "not_attended";

/** The student's current feedback on one opportunity, with that opportunity's tags. */
export interface Feedback {
  oppId: number;
  tags: string[];
  feedback?: FeedbackKind;
  attendance?: AttendanceKind;
}

export type Fit = "fits" | "partial" | "conflict" | "na";

export interface ScheduleResult {
  fit: Fit;
  label: string | null;
  upcomingSessions: number;
  fittingSessions: number;
}

export type Component =
  | "interest"
  | "schedule"
  | "urgency"
  | "distance"
  | "preferred"
  | "popularity";

export interface Scored {
  oppId: number;
  score: number;
  fit: Fit;
  components: Record<Component, number>;
  reasons: string[];
}
