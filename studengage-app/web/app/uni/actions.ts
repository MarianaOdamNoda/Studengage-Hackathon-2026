"use server";

import { revalidatePath } from "next/cache";
import type { ImportResult, OpportunityInput, PublishResult } from "@/lib/contracts";
import type { OppType } from "@/lib/engine/types";
import { getPostingStats, getUniversity, importCsv, previewCsv, publishOpportunity } from "@/lib/services";
import { parsePostingForm, type FieldErrors } from "@/components/uni/validatePosting";
import { requireStaff } from "./_lib/staff";

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function revalidateAll() {
  revalidatePath("/uni", "layout");
  revalidatePath("/student", "layout");
  revalidatePath("/");
}

// ---- New posting --------------------------------------------------------

export type PublishState =
  | { status: "ok"; title: string; result: PublishResult }
  | { status: "invalid"; errors: FieldErrors }
  | { status: "error"; error: string };

export async function publishPosting(formData: FormData): Promise<PublishState> {
  const staff = await requireStaff();
  let campuses: string[];
  try {
    campuses = getUniversity().campuses.map((c) => c.name);
  } catch (e) {
    return { status: "error", error: `Couldn't load the university's campuses: ${message(e)}` };
  }
  const { input, errors } = parsePostingForm(formData, campuses);
  if (!input) return { status: "invalid", errors };
  try {
    const result = publishOpportunity(staff.universityId, input, "form");
    revalidateAll();
    return { status: "ok", title: input.title, result };
  } catch (e) {
    return { status: "error", error: `Publishing failed: ${message(e)}` };
  }
}

// ---- CSV upload ---------------------------------------------------------

const MAX_CSV_BYTES = 1_000_000;

export type PreviewState =
  | { status: "ok"; rows: OpportunityInput[]; errors: { row: number; message: string }[] }
  | { status: "error"; error: string };

export async function previewCsvAction(csvText: string): Promise<PreviewState> {
  await requireStaff();
  if (!csvText.trim()) return { status: "error", error: "The file is empty." };
  if (csvText.length > MAX_CSV_BYTES) return { status: "error", error: "The file is larger than 1 MB." };
  try {
    const { rows, errors } = previewCsv(csvText);
    return { status: "ok", rows, errors };
  } catch (e) {
    return { status: "error", error: `Couldn't read the CSV: ${message(e)}` };
  }
}

export type ImportedPosting = PublishResult & { title: string; type: OppType | null };

export type ImportState =
  | { status: "ok"; result: ImportResult; postings: ImportedPosting[] }
  | { status: "error"; error: string };

export async function importCsvAction(filename: string, csvText: string): Promise<ImportState> {
  const staff = await requireStaff();
  if (!csvText.trim()) return { status: "error", error: "The file is empty." };
  if (csvText.length > MAX_CSV_BYTES) return { status: "error", error: "The file is larger than 1 MB." };
  try {
    const result = importCsv(staff.universityId, filename.slice(0, 200) || "upload.csv", csvText);
    const postings = result.published.map((p): ImportedPosting => {
      let title = `Posting #${p.opportunityId}`;
      let type: OppType | null = null;
      try {
        const s = getPostingStats(p.opportunityId);
        if (s) {
          title = s.opportunity.title;
          type = s.opportunity.type;
        }
      } catch {
        // keep the fallback label
      }
      return { ...p, title, type };
    });
    revalidateAll();
    return { status: "ok", result, postings };
  } catch (e) {
    return { status: "error", error: `Import failed: ${message(e)}` };
  }
}
