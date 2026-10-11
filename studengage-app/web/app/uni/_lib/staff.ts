import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { listStaff } from "@/lib/services";
import type { StaffVM } from "@/lib/contracts";

/** Returns the signed-in staff member, or redirects to "/" when there is none. */
export async function requireStaff(): Promise<StaffVM> {
  const user = await getSessionUser();
  if (!user || user.kind !== "staff") redirect("/");
  let staff: StaffVM | undefined;
  try {
    staff = listStaff().find((s) => s.id === user.id);
  } catch {
    // Services unavailable: keep the panel usable with a placeholder identity.
    return { id: user.id, name: "University staff", role: "", universityId: 1 };
  }
  if (!staff) redirect("/");
  return staff;
}

/** Runs a service call, turning a thrown error into a readable message instead of crashing the page. */
export function safe<T>(fn: () => T): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
