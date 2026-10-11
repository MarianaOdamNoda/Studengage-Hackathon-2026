import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { PostingForm } from "@/components/uni/PostingForm";
import { ServiceError } from "@/components/uni/ServiceError";
import { getUniversity } from "@/lib/services";
import { requireStaff, safe } from "../_lib/staff";

export const dynamic = "force-dynamic";

export default async function NewPostingPage() {
  await requireStaff();
  const uni = safe(() => getUniversity());

  return (
    <>
      <PageHeader
        eyebrow="New posting"
        title="Post an opportunity"
        subtitle="Fill it in once. On publish, the Studengage ranking engine filters by your criteria, checks every student's timetable and delivers it only where it fits."
        actions={
          <Link href="/uni/upload" className="btn">
            Have many? Upload CSV
          </Link>
        }
      />
      {uni.ok ? (
        <PostingForm campuses={uni.value.campuses} faculties={uni.value.faculties} />
      ) : (
        <ServiceError what="the university's campuses and programs" error={uni.error} />
      )}
    </>
  );
}
