import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/session";
import { getStudentProfile, getUniversity } from "@/lib/services";
import { ProfileForm } from "@/components/student/ProfileForm";
import { ScheduleEditor } from "@/components/student/ScheduleEditor";
import { ServiceError, attempt } from "@/components/student/ServiceError";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user || user.kind !== "student") redirect("/");
  const profile = attempt(() => getStudentProfile(user.id), "getStudentProfile");
  const uni = attempt(() => getUniversity(), "getUniversity");

  return (
    <>
      <PageHeader
        eyebrow="Profile"
        title="What the ranking knows about you"
        subtitle="Change anything here and your feed is re-ranked straight away."
      />
      {profile.ok && profile.value && uni.ok ? (
        <div className="space-y-6">
          <ProfileForm profile={profile.value} university={uni.value} />
          <ScheduleEditor
            blocks={profile.value.schedule}
            campuses={uni.value.campuses.map((c) => c.name)}
            defaultCampus={profile.value.campus}
          />
        </div>
      ) : (
        <ServiceError what="your profile" />
      )}
    </>
  );
}
