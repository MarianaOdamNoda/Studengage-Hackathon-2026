import { listNotifications } from "@/lib/services";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Server-sent events: pushes each new notification (NotificationVM JSON) for the signed-in student. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (user?.kind !== "student") return new Response("Not signed in as a student.", { status: 401 });

  const encoder = new TextEncoder();
  let lastId = listNotifications(user.id)[0]?.id ?? 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let beats = 0;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          clearInterval(timer);
        }
      };
      send("retry: 3000\n\n");
      timer = setInterval(() => {
        try {
          // After a demo reset ids restart from 1: follow the DB back down.
          const newest = listNotifications(user.id)[0]?.id ?? 0;
          if (newest < lastId) lastId = newest;
          const fresh = listNotifications(user.id, lastId).reverse();
          for (const n of fresh) {
            send(`data: ${JSON.stringify(n)}\n\n`);
            lastId = Math.max(lastId, n.id);
          }
        } catch {
          // DB briefly unavailable (e.g. during a demo reset); try again next tick.
        }
        if (++beats % 7 === 0) send(": heartbeat\n\n");
      }, 2000);
      req.signal.addEventListener("abort", () => {
        clearInterval(timer);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
