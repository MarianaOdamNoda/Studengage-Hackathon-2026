import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getSessionUser } from "@/lib/session";
import { getFeed } from "@/lib/services";
import { FeedList } from "@/components/student/FeedList";
import { ServiceError, attempt } from "@/components/student/ServiceError";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const user = await getSessionUser();
  if (!user || user.kind !== "student") redirect("/");
  const feed = attempt(() => getFeed(user.id), "getFeed");

  return (
    <>
      <PageHeader
        eyebrow="Your feed"
        title="Picked for you"
        subtitle="Ranked by the Studengage ranking engine from your interests, your timetable, deadlines and distance. Each card says why."
      />
      {feed.ok ? <FeedList data={feed.value} /> : <ServiceError what="your feed" />}
    </>
  );
}
