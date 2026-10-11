import { redirect } from "next/navigation";
import { Brand } from "@/components/ui";
import { getSessionUser } from "@/lib/session";
import { getPendingAttendance, getStudentProfile, listNotifications, listPersonas } from "@/lib/services";
import { logout } from "@/app/actions/auth";
import { NavLinks } from "@/components/student/NavLinks";
import { NotificationBell } from "@/components/student/NotificationBell";
import { PersonaSwitcher } from "@/components/student/PersonaSwitcher";
import { AttendanceModal } from "@/components/student/AttendanceModal";
import { attempt } from "@/components/student/ServiceError";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user || user.kind !== "student") redirect("/");

  const profile = attempt(() => getStudentProfile(user.id), "getStudentProfile");
  // The student no longer exists (e.g. after a demo reset): back to the start.
  if (profile.ok && profile.value === null) redirect("/");

  const personas = attempt(() => listPersonas(), "listPersonas");
  const notifications = attempt(() => listNotifications(user.id), "listNotifications");
  const pending = attempt(() => getPendingAttendance(user.id), "getPendingAttendance");

  const me = profile.ok ? profile.value : null;
  const name = me?.name ?? "Student";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-hairline bg-ground/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Brand href="/student/feed" />
          <div className="order-3 w-full sm:order-none sm:w-auto">
            <NavLinks />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <PersonaSwitcher currentId={user.id} currentName={name} personas={personas.ok ? personas.value : []} />
            <NotificationBell initial={notifications.ok ? notifications.value : []} />
            <form action={logout}>
              <button type="submit" className="btn btn-ghost px-2.5 py-1.5">
                Exit
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-10">
        {me?.persona && (
          <p className="mb-4 text-sm text-muted">
            <span className="font-medium text-ink-soft">{me.name}</span> · {me.persona}
          </p>
        )}
        {children}
      </main>
      <AttendanceModal pending={pending.ok ? pending.value : []} />
    </div>
  );
}
