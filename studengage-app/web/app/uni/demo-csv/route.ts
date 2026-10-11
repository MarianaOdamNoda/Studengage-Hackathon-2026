import { getSessionUser } from "@/lib/session";
import { getDemoCsv } from "@/lib/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.kind !== "staff") {
    return new Response("Sign in as university staff to download the demo CSV.", { status: 401 });
  }
  try {
    const csv = getDemoCsv();
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bluenose-postings.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(`Couldn't generate the demo CSV: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
  }
}
