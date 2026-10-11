/**
 * View-model types shared between the core services (lib/services/*) and the UI.
 * UI code imports ONLY these types and the functions exported from lib/services/index.ts.
 * Changing a type here is a cross-team change: note it in BUILD_STATE.md.
 */
import type { Criteria, Fit, Mode, OppType, ScheduleBlock } from "./engine/types";

export interface Campus {
  name: string;
  lat: number;
  lon: number;
}

export interface UniversityVM {
  id: number;
  name: string;
  campuses: Campus[];
  faculties: Record<string, string[]>; // faculty → programs
}

export interface PersonaVM {
  id: number;
  name: string;
  persona: string; // one-line tagline
  program: string;
  year: number;
  campus: string;
}

export interface StaffVM {
  id: number;
  name: string;
  role: string;
  universityId: number;
}

export interface SessionVM {
  start: string;
  end: string;
}

export interface OpportunityVM {
  id: number;
  title: string;
  type: OppType;
  description: string;
  department: string;
  contact: string | null;
  link: string | null;
  campus: string | null;
  building: string | null;
  mode: Mode;
  sessions: SessionVM[];
  deadline: string | null;
  capacity: number | null;
  cost: number;
  rsvp: boolean;
  food: boolean;
  accessibility: string | null;
  language: string;
  tags: string[];
  required: Criteria;
  preferred: Criteria;
  source: "form" | "csv" | "seed";
  createdAt: string;
}

export interface FeedItemVM {
  opportunity: OpportunityVM;
  score: number; // 0–1
  fit: Fit;
  reasons: string[]; // 1–3 short "why you're seeing this" lines, already human-readable
  feedback: "interested" | "not_interested" | null;
  attendance: "attended" | "not_attended" | null;
  nowConflicts: boolean; // notified earlier, but the student's schedule changed and it now clashes
  scorer: string;
}

export interface FeedVM {
  feed: FeedItemVM[];
  conflicts: FeedItemVM[];
  dismissed: FeedItemVM[];
  excluded: number; // count of postings the student isn't eligible for
}

export interface NotificationVM {
  id: number;
  opportunityId: number;
  title: string;
  kind: "match" | "schedule_clash";
  createdAt: string;
  read: boolean;
}

export interface StudentProfileVM {
  id: number;
  name: string;
  persona: string | null;
  level: "undergrad" | "grad";
  faculty: string;
  program: string;
  year: number;
  status: "full" | "part";
  residency: "domestic" | "international";
  campus: string;
  gpa: number | null;
  coop: boolean;
  inResidence: boolean;
  lat: number;
  lon: number;
  locationLabel: string | null;
  interests: string[];
  weeklyCap: number;
  equityGroups: string[]; // only populated when the student has opted in
  equityConsent: boolean;
  schedule: (ScheduleBlock & { id: number })[];
}

export type ProfileUpdate = Omit<
  StudentProfileVM,
  "id" | "name" | "persona" | "schedule" | "equityConsent"
> & { equityConsent: boolean };

/** Input for creating a posting (form or CSV row, after parsing). */
export interface OpportunityInput {
  title: string;
  type: OppType;
  description: string;
  department: string;
  contact?: string | null;
  link?: string | null;
  campus?: string | null;
  building?: string | null;
  mode: Mode;
  sessions: SessionVM[];
  deadline?: string | null;
  capacity?: number | null;
  cost?: number;
  rsvp?: boolean;
  food?: boolean;
  accessibility?: string | null;
  language?: string;
  tags: string[];
  required: Criteria;
  preferred: Criteria;
}

export interface PublishResult {
  opportunityId: number;
  matched: number; // students it landed in the feed for
  conflicts: number; // eligible but schedule clash
  notified: number; // notifications actually sent (respects weekly caps)
  ineligible: number;
}

export interface ImportResult {
  importId: number;
  rowsTotal: number;
  rowsOk: number;
  errors: { row: number; message: string }[];
  published: PublishResult[];
}

export interface PostingStatsVM {
  opportunity: OpportunityVM;
  eligible: number;
  matched: number;
  conflicts: number;
  notified: number;
  interested: number;
  notInterested: number;
  attended: number;
  notAttended: number;
}

/** Broadcast (everyone gets everything) vs Studengage targeting, on the current student population. */
export interface ImpactVM {
  students: number;
  postings: number;
  broadcast: { notificationsPerStudent: number; relevantShare: number };
  studengage: { notificationsPerStudent: number; relevantShare: number; relevantReach: number };
  /** Relative improvement in relevant reach per announcement vs broadcast, as a fraction (0.3 = +30%). */
  reachLift: number;
  definition: string; // plain-language definition of "relevant" shown under the numbers
}
