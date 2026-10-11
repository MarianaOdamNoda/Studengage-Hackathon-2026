/**
 * Pure parser/validator for the New posting form. Runs in the browser (instant inline errors)
 * and again in the server action (never trust the client). No server-only imports here.
 */
import type { OpportunityInput } from "@/lib/contracts";
import { EQUITY_GROUPS, OPP_TYPES, TAGS, type Criteria, type Level, type Mode, type OppType, type Residency, type Status } from "@/lib/engine/types";

export type FieldErrors = Record<string, string>;

/** Types that happen at a time, so they need at least one session. Bursaries, co-op jobs and deadlines don't. */
export const TIMED_TYPES: OppType[] = ["event", "workshop", "career_fair", "club", "wellness"];
export const MODES: Mode[] = ["in_person", "online", "hybrid"];
export const YEARS = [1, 2, 3, 4, 5];
export const MAX_GPA = 4.3;

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const all = (fd: FormData, k: string) => fd.getAll(k).filter((v): v is string => typeof v === "string" && v !== "");
const isLocalIso = (s: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());

function parseCriteria(fd: FormData, prefix: "req" | "pref", campuses: string[], errors: FieldErrors): Criteria {
  const c: Criteria = {};
  const levels = all(fd, `${prefix}.levels`).filter((v): v is Level => v === "undergrad" || v === "grad");
  if (levels.length) c.levels = levels;
  const faculties = all(fd, `${prefix}.faculties`);
  if (faculties.length) c.faculties = faculties;
  const programs = all(fd, `${prefix}.programs`);
  if (programs.length) c.programs = programs;
  const years = all(fd, `${prefix}.years`).map(Number).filter((n) => YEARS.includes(n));
  if (years.length) c.years = years;
  const status = all(fd, `${prefix}.status`).filter((v): v is Status => v === "full" || v === "part");
  if (status.length) c.status = status;
  const residency = all(fd, `${prefix}.residency`).filter((v): v is Residency => v === "domestic" || v === "international");
  if (residency.length) c.residency = residency;
  const cs = all(fd, `${prefix}.campuses`);
  if (cs.some((x) => !campuses.includes(x))) errors[`${prefix}.campuses`] = "Pick campuses from the list.";
  if (cs.length) c.campuses = cs;
  const gpa = str(fd, `${prefix}.minGpa`);
  if (gpa) {
    const n = Number(gpa);
    if (!Number.isFinite(n) || n < 0 || n > MAX_GPA) errors[`${prefix}.minGpa`] = `Enter a GPA between 0 and ${MAX_GPA}.`;
    else c.minGpa = n;
  }
  const coop = str(fd, `${prefix}.coop`);
  if (coop === "yes" || coop === "no") c.coop = coop === "yes";
  const res = str(fd, `${prefix}.inResidence`);
  if (res === "yes" || res === "no") c.inResidence = res === "yes";
  const eq = all(fd, `${prefix}.equityGroups`);
  if (eq.some((g) => !(EQUITY_GROUPS as readonly string[]).includes(g))) errors[`${prefix}.equityGroups`] = "Unknown equity group.";
  if (eq.length) c.equityGroups = eq;
  return c;
}

export function parsePostingForm(
  fd: FormData,
  campuses: string[],
  now: Date = new Date(),
): { input: OpportunityInput | null; errors: FieldErrors } {
  const errors: FieldErrors = {};

  const title = str(fd, "title");
  if (!title) errors.title = "Give the posting a title.";
  else if (title.length > 120) errors.title = "Keep the title under 120 characters.";

  const type = str(fd, "type") as OppType;
  if (!OPP_TYPES.includes(type)) errors.type = "Choose a type.";

  const description = str(fd, "description");
  if (!description) errors.description = "Describe the opportunity in a sentence or two.";
  else if (description.length > 2000) errors.description = "Keep the description under 2,000 characters.";

  const department = str(fd, "department");
  if (!department) errors.department = "Which office or department is posting this?";

  const contact = str(fd, "contact") || null;
  if (contact && contact.length > 200) errors.contact = "Keep contact details under 200 characters.";

  const link = str(fd, "link") || null;
  if (link && !/^https?:\/\/\S+\.\S+/.test(link)) errors.link = "Enter a full link starting with https://";

  const mode = str(fd, "mode") as Mode;
  if (!MODES.includes(mode)) errors.mode = "Choose how students take part.";

  const campus = str(fd, "campus") || null;
  if (campus && !campuses.includes(campus)) errors.campus = "Pick a campus from the list.";
  if (!campus && (mode === "in_person" || mode === "hybrid")) errors.campus = "In-person and hybrid postings need a campus.";
  const building = str(fd, "building") || null;

  // Sessions: parallel lists session_start[] / session_end[], in row order.
  const starts = fd.getAll("session_start").map((v) => (typeof v === "string" ? v.trim() : ""));
  const ends = fd.getAll("session_end").map((v) => (typeof v === "string" ? v.trim() : ""));
  const sessions: { start: string; end: string }[] = [];
  for (let i = 0; i < Math.max(starts.length, ends.length); i++) {
    const s = starts[i] ?? "";
    const e = ends[i] ?? "";
    if (!s && !e) continue; // blank row is ignored
    if (!isLocalIso(s)) errors[`session.${i}`] = "Enter a start date and time.";
    else if (!isLocalIso(e)) errors[`session.${i}`] = "Enter an end date and time.";
    else if (new Date(e) <= new Date(s)) errors[`session.${i}`] = "The session must end after it starts.";
    else sessions.push({ start: s, end: e });
  }
  if (TIMED_TYPES.includes(type) && sessions.length === 0 && !Object.keys(errors).some((k) => k.startsWith("session."))) {
    errors.sessions = "This type of posting happens at a time — add at least one session.";
  }
  if (sessions.length && sessions.every((s) => new Date(s.end) < now)) {
    errors.sessions = "Every session has already ended. Add a session in the future.";
  }
  sessions.sort((a, b) => a.start.localeCompare(b.start));

  const deadlineRaw = str(fd, "deadline");
  let deadline: string | null = null;
  if (deadlineRaw) {
    if (!isLocalIso(deadlineRaw)) errors.deadline = "Enter a valid date and time.";
    else if (new Date(deadlineRaw) < now) errors.deadline = "The deadline has already passed.";
    else deadline = deadlineRaw;
  }
  if ((type === "bursary" || type === "coop" || type === "deadline") && !deadline && sessions.length === 0) {
    errors.deadline = "Bursaries, co-op jobs and deadlines need a deadline date.";
  }

  const capRaw = str(fd, "capacity");
  let capacity: number | null = null;
  if (capRaw) {
    const n = Number(capRaw);
    if (!Number.isInteger(n) || n < 1) errors.capacity = "Capacity must be a whole number of 1 or more.";
    else capacity = n;
  }
  const costRaw = str(fd, "cost");
  let cost = 0;
  if (costRaw) {
    const n = Number(costRaw);
    if (!Number.isFinite(n) || n < 0) errors.cost = "Cost must be 0 or more.";
    else cost = Math.round(n * 100) / 100;
  }

  const tags = all(fd, "tags").filter((t) => (TAGS as readonly string[]).includes(t));
  if (tags.length === 0) errors.tags = "Pick at least one tag — the ranking engine matches tags to student interests.";

  const language = str(fd, "language") || "English";
  const accessibility = str(fd, "accessibility") || null;

  const required = parseCriteria(fd, "req", campuses, errors);
  const preferred = parseCriteria(fd, "pref", campuses, errors);

  if (Object.keys(errors).length) return { input: null, errors };
  return {
    input: {
      title,
      type,
      description,
      department,
      contact,
      link,
      campus,
      building,
      mode,
      sessions,
      deadline,
      capacity,
      cost,
      rsvp: fd.get("rsvp") === "on",
      food: fd.get("food") === "on",
      accessibility,
      language,
      tags,
      required,
      preferred,
    },
    errors,
  };
}
