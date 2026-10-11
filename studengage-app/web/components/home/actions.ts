"use server";

import { revalidatePath } from "next/cache";
import { resetDemo } from "@/lib/services";

export interface ResetState {
  status: "idle" | "done" | "error";
  message: string;
}

/** Wipes and reseeds the demo database, then refreshes every page. */
export async function resetDemoAction(prev: ResetState, formData: FormData): Promise<ResetState> {
  void prev;
  void formData;
  try {
    resetDemo();
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    return { status: "error", message: `Reset failed: ${detail}. Try running "npm run seed" in the web folder.` };
  }
  revalidatePath("/", "layout");
  return { status: "done", message: "Demo data reset. Students, postings and feedback are back to the starting state." };
}
