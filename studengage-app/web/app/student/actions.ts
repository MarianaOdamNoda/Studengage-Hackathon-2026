"use server";

/**
 * Student-side mutations. Every action re-reads the student id from the session cookie;
 * a student id is never accepted from the client.
 */
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import {
  addScheduleBlock,
  getUniversity,
  importScheduleIcs,
  markNotificationsRead,
  removeScheduleBlock,
  setAttendance,
  setFeedback,
  updateStudentProfile,
} from "@/lib/services";
import type { ProfileUpdate } from "@/lib/contracts";
import { EQUITY_GROUPS, TAGS, type ScheduleBlock } from "@/lib/engine/types";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function requireStudentId(): Promise<number> {
  const user = await getSessionUser();
  if (!user || user.kind !== "student") throw new Error("Your session has ended. Sign in again from the home page.");
  return user.id;
}

function fail(e: unknown, fallback: string): { ok: false; error: string } {
  const msg = e instanceof Error ? e.message : "";
  console.error("[student action]", e);
  return { ok: false, error: msg.startsWith("Your session") ? msg : fallback };
}

function refresh() {
  revalidatePath("/student", "layout");
}

const isId = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---- feedback / attendance -------------------------------------------------

export async function setFeedbackAction(
  opportunityId: number,
  value: "interested" | "not_interested" | null,
): Promise<ActionResult> {
  try {
    const studentId = await requireStudentId();
    if (!isId(opportunityId)) return { ok: false, error: "Unknown posting." };
    if (value !== null && value !== "interested" && value !== "not_interested") return { ok: false, error: "Invalid choice." };
    setFeedback(studentId, opportunityId, value);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e, "Couldn't save that. Please try again.");
  }
}

export async function setAttendanceAction(
  opportunityId: number,
  value: "attended" | "not_attended",
): Promise<ActionResult> {
  try {
    const studentId = await requireStudentId();
    if (!isId(opportunityId)) return { ok: false, error: "Unknown posting." };
    if (value !== "attended" && value !== "not_attended") return { ok: false, error: "Invalid choice." };
    setAttendance(studentId, opportunityId, value);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e, "Couldn't save your answer. Please try again.");
  }
}

export async function markNotificationsReadAction(): Promise<ActionResult> {
  try {
    const studentId = await requireStudentId();
    markNotificationsRead(studentId);
    return { ok: true };
  } catch (e) {
    return fail(e, "Couldn't mark notifications as read.");
  }
}

// ---- profile -------------------------------------------------------------------

export async function saveProfileAction(input: ProfileUpdate): Promise<ActionResult> {
  try {
    const studentId = await requireStudentId();
    const uni = getUniversity();

    if (input.level !== "undergrad" && input.level !== "grad") return { ok: false, error: "Choose a level of study." };
    const programs = uni.faculties[input.faculty];
    if (!programs) return { ok: false, error: "Choose a faculty." };
    if (!programs.includes(input.program)) return { ok: false, error: "Choose a program in that faculty." };
    if (!uni.campuses.some((c) => c.name === input.campus)) return { ok: false, error: "Choose a campus." };
    const year = Math.round(Number(input.year));
    if (!(year >= 1 && year <= 8)) return { ok: false, error: "Year must be between 1 and 8." };
    if (input.status !== "full" && input.status !== "part") return { ok: false, error: "Choose full- or part-time." };
    if (input.residency !== "domestic" && input.residency !== "international") return { ok: false, error: "Choose domestic or international." };
    const gpa = input.gpa === null || Number.isNaN(Number(input.gpa)) ? null : Number(input.gpa);
    if (gpa !== null && (gpa < 0 || gpa > 4.3)) return { ok: false, error: "GPA must be between 0 and 4.3." };
    const lat = Number(input.lat);
    const lon = Number(input.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180)
      return { ok: false, error: "Choose a location." };
    const weeklyCap = Math.round(Number(input.weeklyCap));
    if (!(weeklyCap >= 1 && weeklyCap <= 20)) return { ok: false, error: "Weekly notifications must be between 1 and 20." };

    const consent = input.equityConsent === true;
    const update: ProfileUpdate = {
      level: input.level,
      faculty: input.faculty,
      program: input.program,
      year,
      status: input.status,
      residency: input.residency,
      campus: input.campus,
      gpa,
      coop: input.coop === true,
      inResidence: input.inResidence === true,
      lat,
      lon,
      locationLabel: input.locationLabel?.toString().trim().slice(0, 80) || null,
      interests: Array.from(new Set(input.interests.filter((t) => (TAGS as readonly string[]).includes(t)))),
      weeklyCap,
      // Equity self-ID is only stored with explicit consent; withdrawing consent clears it.
      equityGroups: consent
        ? Array.from(new Set(input.equityGroups.filter((g) => (EQUITY_GROUPS as readonly string[]).includes(g))))
        : [],
      equityConsent: consent,
    };
    updateStudentProfile(studentId, update);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e, "Couldn't save your profile. Please try again.");
  }
}

// ---- schedule ------------------------------------------------------------------

export async function addScheduleBlockAction(block: ScheduleBlock): Promise<ActionResult> {
  try {
    const studentId = await requireStudentId();
    const day = Number(block.day);
    if (!Number.isInteger(day) || day < 0 || day > 6) return { ok: false, error: "Choose a day." };
    if (!TIME.test(block.start) || !TIME.test(block.end)) return { ok: false, error: "Enter start and end times." };
    if (block.end <= block.start) return { ok: false, error: "End time must be after the start time." };
    const label = block.label?.toString().trim().slice(0, 60);
    if (!label) return { ok: false, error: "Give the block a name, e.g. CHEM 2201." };
    const uni = getUniversity();
    if (!uni.campuses.some((c) => c.name === block.campus)) return { ok: false, error: "Choose a campus." };
    addScheduleBlock(studentId, { day, start: block.start, end: block.end, label, campus: block.campus });
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e, "Couldn't add that block. Please try again.");
  }
}

export async function removeScheduleBlockAction(blockId: number): Promise<ActionResult> {
  try {
    const studentId = await requireStudentId();
    if (!isId(blockId)) return { ok: false, error: "Unknown block." };
    removeScheduleBlock(studentId, blockId);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e, "Couldn't remove that block. Please try again.");
  }
}

export async function importIcsAction(formData: FormData): Promise<ActionResult<{ added: number }>> {
  try {
    const studentId = await requireStudentId();
    const file = formData.get("ics");
    if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an .ics file first." };
    if (file.size > 1_000_000) return { ok: false, error: "That file is too large (max 1 MB)." };
    const text = await file.text();
    if (!text.includes("BEGIN:VCALENDAR")) return { ok: false, error: "That doesn't look like a calendar (.ics) file." };
    const result = importScheduleIcs(studentId, text);
    refresh();
    return { ok: true, data: result };
  } catch (e) {
    return fail(e, "Couldn't read that calendar file.");
  }
}
