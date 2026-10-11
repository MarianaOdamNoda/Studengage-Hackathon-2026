"use server";

import { redirect } from "next/navigation";
import { setSessionUser } from "@/lib/session";

/** Form actions: <form action={loginAsStudent}><input type="hidden" name="id" value=…/></form> */
export async function loginAsStudent(formData: FormData) {
  await setSessionUser({ kind: "student", id: Number(formData.get("id")) });
  redirect("/student/feed");
}

export async function loginAsStaff(formData: FormData) {
  await setSessionUser({ kind: "staff", id: Number(formData.get("id")) });
  redirect("/uni");
}

/** Homepage "Student side" button: enters as the first demo persona (switch persona inside the student panel). */
export async function enterStudentSide() {
  const { listPersonas } = await import("@/lib/services");
  let first: { id: number } | undefined;
  try {
    first = listPersonas()[0];
  } catch {
    first = undefined;
  }
  if (!first) redirect("/?error=no-data");
  await setSessionUser({ kind: "student", id: first.id });
  redirect("/student/feed");
}

/** Homepage "University side" button: enters as the first staff account. */
export async function enterUniversitySide() {
  const { listStaff } = await import("@/lib/services");
  let first: { id: number } | undefined;
  try {
    first = listStaff()[0];
  } catch {
    first = undefined;
  }
  if (!first) redirect("/?error=no-data");
  await setSessionUser({ kind: "staff", id: first.id });
  redirect("/uni");
}

export async function logout() {
  await setSessionUser(null);
  redirect("/");
}
