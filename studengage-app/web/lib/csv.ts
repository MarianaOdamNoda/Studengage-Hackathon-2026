/**
 * Small RFC 4180 CSV reader/writer + the Studengage postings CSV format.
 * Row numbers in errors are spreadsheet rows: the header is row 1, the first posting is row 2.
 */
import type { OpportunityInput } from "./contracts";
import { EQUITY_GROUPS, OPP_TYPES, TAGS, type Criteria } from "./engine/types";

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  for (; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("The file ends inside a quoted field (a quote \" is missing).");
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const quote = (v: string) => (/[",\r\n]/.test(v) || v !== v.trim() ? `"${v.replace(/"/g, '""')}"` : v);
export const toCsv = (rows: string[][]) => rows.map((r) => r.map(quote).join(",")).join("\r\n") + "\r\n";

export const CRITERIA_KEYS = [
  "levels",
  "faculties",
  "programs",
  "years",
  "status",
  "residency",
  "campuses",
  "min_gpa",
  "coop",
  "in_residence",
  "equity_groups",
] as const;

export const CSV_COLUMNS = [
  "title", "type", "description", "department", "contact", "link", "campus", "building", "mode", "sessions",
  "deadline", "capacity", "cost", "rsvp", "food", "accessibility", "language", "tags",
  ...CRITERIA_KEYS.map((k) => `req_${k}`),
  ...CRITERIA_KEYS.map((k) => `pref_${k}`),
] as const;

export interface CsvContext {
  campuses: string[];
  faculties: Record<string, string[]>;
}

const list = (v: string) => v.split(";").map((s) => s.trim()).filter(Boolean);
const SESSION_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseBool(v: string, col: string, errs: string[]): boolean | undefined {
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  if (["yes", "y", "true", "1"].includes(s)) return true;
  if (["no", "n", "false", "0"].includes(s)) return false;
  errs.push(`${col} must be yes or no (got "${v}")`);
  return undefined;
}

function oneOf(values: string[], allowed: readonly string[], col: string, errs: string[]) {
  const bad = values.filter((v) => !allowed.includes(v));
  if (bad.length) errs.push(`${col}: unknown value${bad.length > 1 ? "s" : ""} ${bad.map((b) => `"${b}"`).join(", ")}`);
  return values.filter((v) => allowed.includes(v));
}

function parseCriteria(get: (c: string) => string, prefix: "req" | "pref", ctx: CsvContext, errs: string[]): Criteria {
  const c: Criteria = {};
  const col = (k: string) => `${prefix}_${k}`;
  const allPrograms = Object.values(ctx.faculties).flat();
  const levels = oneOf(list(get(col("levels"))), ["undergrad", "grad"], col("levels"), errs);
  if (levels.length) c.levels = levels as Criteria["levels"];
  const faculties = oneOf(list(get(col("faculties"))), Object.keys(ctx.faculties), col("faculties"), errs);
  if (faculties.length) c.faculties = faculties;
  const programs = oneOf(list(get(col("programs"))), allPrograms, col("programs"), errs);
  if (programs.length) c.programs = programs;
  const yearsRaw = list(get(col("years")));
  const years = yearsRaw.map(Number);
  if (years.some((y) => !Number.isInteger(y) || y < 1 || y > 6)) errs.push(`${col("years")} must be whole numbers 1–6`);
  else if (years.length) c.years = years;
  const status = oneOf(list(get(col("status"))), ["full", "part"], col("status"), errs);
  if (status.length) c.status = status as Criteria["status"];
  const residency = oneOf(list(get(col("residency"))), ["domestic", "international"], col("residency"), errs);
  if (residency.length) c.residency = residency as Criteria["residency"];
  const campuses = oneOf(list(get(col("campuses"))), ctx.campuses, col("campuses"), errs);
  if (campuses.length) c.campuses = campuses;
  const gpa = get(col("min_gpa")).trim();
  if (gpa) {
    const n = Number(gpa);
    if (!Number.isFinite(n) || n < 0 || n > 4.3) errs.push(`${col("min_gpa")} must be a number 0–4.3`);
    else c.minGpa = n;
  }
  const coop = parseBool(get(col("coop")), col("coop"), errs);
  if (coop != null) c.coop = coop;
  const res = parseBool(get(col("in_residence")), col("in_residence"), errs);
  if (res != null) c.inResidence = res;
  const eq = oneOf(list(get(col("equity_groups"))), EQUITY_GROUPS, col("equity_groups"), errs);
  if (eq.length) c.equityGroups = eq;
  return c;
}

/** Parse + validate postings. Valid rows come back as OpportunityInput; each bad row gives one error line. */
export function parsePostingsCsv(text: string, ctx: CsvContext) {
  const rows: OpportunityInput[] = [];
  const errors: { row: number; message: string }[] = [];
  let table: string[][];
  try {
    table = parseCsv(text);
  } catch (e) {
    return { rows, errors: [{ row: 1, message: (e as Error).message }] };
  }
  if (table.length === 0) return { rows, errors: [{ row: 1, message: "The file is empty." }] };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const missing = ["title", "type", "description", "department", "tags"].filter((c) => !header.includes(c));
  if (missing.length) return { rows, errors: [{ row: 1, message: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}` }] };
  const unknown = header.filter((h) => h && !(CSV_COLUMNS as readonly string[]).includes(h));
  if (unknown.length) errors.push({ row: 1, message: `Ignored unknown column${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}` });
  if (table.length === 1) errors.push({ row: 1, message: "No postings below the header row." });

  table.slice(1).forEach((cells, idx) => {
    const rowNo = idx + 2;
    const get = (c: string) => {
      const i = header.indexOf(c);
      return i >= 0 ? (cells[i] ?? "").trim() : "";
    };
    const errs: string[] = [];
    const title = get("title");
    if (!title) errs.push("title is required");
    const type = get("type").toLowerCase();
    if (!(OPP_TYPES as readonly string[]).includes(type)) errs.push(`type must be one of ${OPP_TYPES.join(", ")}`);
    const description = get("description");
    if (!description) errs.push("description is required");
    const department = get("department");
    if (!department) errs.push("department is required");
    const campus = get("campus") || null;
    if (campus && !ctx.campuses.includes(campus)) errs.push(`campus must be one of ${ctx.campuses.join(", ")}`);
    const mode = (get("mode") || "in_person").toLowerCase().replace(/[- ]/g, "_");
    if (!["in_person", "online", "hybrid"].includes(mode)) errs.push("mode must be in_person, online or hybrid");

    const sessions = list(get("sessions")).flatMap((s) => {
      const [start, end] = s.split("/").map((x) => x.trim());
      if (!SESSION_RE.test(start ?? "") || !SESSION_RE.test(end ?? "")) {
        errs.push(`session "${s}" must look like 2026-10-14T16:00/2026-10-14T18:00`);
        return [];
      }
      if (isNaN(new Date(start).getTime()) || isNaN(new Date(end).getTime())) {
        errs.push(`session "${s}" has an invalid date`);
        return [];
      }
      if (new Date(end) <= new Date(start)) {
        errs.push(`session "${s}" ends before it starts`);
        return [];
      }
      return [{ start, end }];
    });
    let deadline: string | null = get("deadline") || null;
    if (deadline) {
      if (DATE_RE.test(deadline)) deadline = `${deadline}T23:59`;
      if (!SESSION_RE.test(deadline) || isNaN(new Date(deadline).getTime())) {
        errs.push("deadline must look like 2026-10-20 or 2026-10-20T17:00");
        deadline = null;
      }
    }
    if (!sessions.length && !deadline && !errs.some((e) => e.startsWith("session"))) errs.push("needs at least one session or a deadline");
    if (sessions.length && mode !== "online" && !campus) errs.push("in-person sessions need a campus");

    const num = (c: string, int: boolean) => {
      const v = get(c);
      if (!v) return undefined;
      const n = Number(v.replace(/^\$/, ""));
      if (!Number.isFinite(n) || n < 0 || (int && !Number.isInteger(n))) {
        errs.push(`${c} must be a ${int ? "whole " : ""}number`);
        return undefined;
      }
      return n;
    };
    const capacity = num("capacity", true);
    const cost = num("cost", false);
    const rsvp = parseBool(get("rsvp"), "rsvp", errs);
    const food = parseBool(get("food"), "food", errs);
    const tags = oneOf(list(get("tags")).map((t) => t.toLowerCase()), TAGS, "tags", errs);
    if (!list(get("tags")).length) errs.push("tags: at least one tag is required");
    const required = parseCriteria(get, "req", ctx, errs);
    const preferred = parseCriteria(get, "pref", ctx, errs);

    if (errs.length) {
      errors.push({ row: rowNo, message: `${title ? `"${title}": ` : ""}${errs.join("; ")}` });
      return;
    }
    rows.push({
      title,
      type: type as OpportunityInput["type"],
      description,
      department,
      contact: get("contact") || null,
      link: get("link") || null,
      campus,
      building: get("building") || null,
      mode: mode as OpportunityInput["mode"],
      sessions,
      deadline,
      capacity: capacity ?? null,
      cost: cost ?? 0,
      rsvp: rsvp ?? false,
      food: food ?? false,
      accessibility: get("accessibility") || null,
      language: get("language") || "English",
      tags,
      required,
      preferred,
    });
  });
  return { rows, errors };
}

function criteriaCells(c: Criteria): string[] {
  const yn = (b: boolean | undefined) => (b == null ? "" : b ? "yes" : "no");
  return [
    (c.levels ?? []).join(";"),
    (c.faculties ?? []).join(";"),
    (c.programs ?? []).join(";"),
    (c.years ?? []).join(";"),
    (c.status ?? []).join(";"),
    (c.residency ?? []).join(";"),
    (c.campuses ?? []).join(";"),
    c.minGpa == null ? "" : String(c.minGpa),
    yn(c.coop),
    yn(c.inResidence),
    (c.equityGroups ?? []).join(";"),
  ];
}

/** Serialise postings to the CSV format above (used for the demo file). */
export function postingsToCsv(inputs: OpportunityInput[]): string {
  const yn = (b: boolean | undefined) => (b ? "yes" : "no");
  return toCsv([
    [...CSV_COLUMNS],
    ...inputs.map((i) => [
      i.title,
      i.type,
      i.description,
      i.department,
      i.contact ?? "",
      i.link ?? "",
      i.campus ?? "",
      i.building ?? "",
      i.mode,
      i.sessions.map((s) => `${s.start}/${s.end}`).join(";"),
      i.deadline ?? "",
      i.capacity == null ? "" : String(i.capacity),
      String(i.cost ?? 0),
      yn(i.rsvp),
      yn(i.food),
      i.accessibility ?? "",
      i.language ?? "English",
      i.tags.join(";"),
      ...criteriaCells(i.required),
      ...criteriaCells(i.preferred),
    ]),
  ]);
}
