import { PageHeader } from "@/components/ui";
import { CsvUpload } from "@/components/uni/CsvUpload";
import { requireStaff } from "../_lib/staff";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  await requireStaff();
  return (
    <>
      <PageHeader
        eyebrow="Bulk upload"
        title="Upload postings from a CSV"
        subtitle="Check the preview, then publish every valid row at once. Each posting is ranked for every student and lands only in the feeds it fits."
      />
      <CsvUpload />
    </>
  );
}
