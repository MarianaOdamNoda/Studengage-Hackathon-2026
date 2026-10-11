import { Brand } from "@/components/ui";
import { UniNav } from "@/components/uni/UniNav";
import { logout } from "@/app/actions/auth";
import { getUniversity } from "@/lib/services";
import { requireStaff, safe } from "./_lib/staff";

export const dynamic = "force-dynamic";

export default async function UniLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const uni = safe(() => getUniversity());

  return (
    <div className="min-h-screen">
      <header className="border-b border-hairline bg-card">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Brand href="/uni" />
            <span className="hidden h-5 w-px bg-hairline sm:block" aria-hidden />
            <span className="text-sm font-medium text-ink-soft">
              {uni.ok ? uni.value.name : "University panel"}
            </span>
          </div>
          <UniNav />
          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold">{staff.name}</p>
              {staff.role && <p className="text-xs text-muted">{staff.role}</p>}
            </div>
            <form action={logout}>
              <button type="submit" className="btn btn-ghost px-3 py-1.5">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
