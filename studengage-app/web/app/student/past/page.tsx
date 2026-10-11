import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/session";
import { getPast } from "@/lib/services";
import { PastList } from "@/components/student/PastList";
import { ServiceError, attempt } from "@/components/student/ServiceError";

export const dynamic = "force-dynamic";

export default async function PastPage() {
  const user = await getSessionUser();
  if (!user || user.kind !== "student") redirect("/");
  const past = attempt(() => getPast(user.id), "getPast");

  return (
    <>
      <PageHeader
        eyebrow="Past"
        title="Things that already happened"
        subtitle="Tell us whether you went. It helps your future ranking, and you can change your answer any time."
      />
      {past.ok ? <PastList items={past.value} /> : <ServiceError what="your past events" />}
    </>
  );
}
