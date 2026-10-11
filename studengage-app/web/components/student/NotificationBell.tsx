"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { NotificationVM } from "@/lib/contracts";
import { markNotificationsReadAction } from "@/app/student/actions";
import { timeAgo } from "./format";

const MAX_SHOWN = 20;

function merge(a: NotificationVM[], b: NotificationVM[]) {
  const byId = new Map<number, NotificationVM>();
  for (const n of a) byId.set(n.id, n);
  for (const n of b) {
    const prev = byId.get(n.id);
    byId.set(n.id, prev ? { ...n, read: prev.read || n.read } : n);
  }
  return [...byId.values()].sort((x, y) => y.id - x.id);
}

function isNotification(x: unknown): x is NotificationVM {
  const n = x as NotificationVM;
  return !!n && typeof n.id === "number" && typeof n.opportunityId === "number" && typeof n.title === "string";
}

export function NotificationBell({ initial }: { initial: NotificationVM[] }) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationVM[]>(() => merge([], initial));
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<NotificationVM | null>(null);
  const [live, setLive] = useState<"connecting" | "live" | "offline">("connecting");
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const knownIds = useRef<Set<number>>(new Set(initial.map((n) => n.id)));

  // Server-rendered list may change after a revalidation; fold it in.
  useEffect(() => {
    for (const n of initial) knownIds.current.add(n.id);
    setItems((cur) => merge(cur, initial));
  }, [initial]);

  // Live stream of new notifications, with reconnect + backoff.
  useEffect(() => {
    let es: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let delay = 2000;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      setLive("connecting");
      es = new EventSource("/api/notifications/stream");
      es.onopen = () => {
        delay = 2000;
        setLive("live");
      };
      es.onmessage = (ev) => {
        let data: unknown;
        try {
          data = JSON.parse(ev.data);
        } catch {
          return; // heartbeat or non-JSON payload
        }
        const incoming = (Array.isArray(data) ? data : [data]).filter(isNotification);
        if (!incoming.length) return;
        const known = knownIds.current;
        const fresh = incoming.find((n) => !known.has(n.id) && !n.read) ?? null;
        for (const n of incoming) known.add(n.id);
        setItems((cur) => merge(cur, incoming));
        if (fresh) {
          setToast(fresh);
          router.refresh(); // pull the new posting into the feed
        }
      };
      es.onerror = () => {
        if (!es) return;
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          setLive("offline");
          retry = setTimeout(connect, delay);
          delay = Math.min(delay * 2, 30000);
        } else {
          setLive("connecting"); // browser is retrying by itself
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      es?.close();
    };
  }, [router]);

  // Auto-hide toast.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Close the panel on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const unread = items.filter((n) => !n.read).length;

  const markAllRead = () => {
    if (!unread) return;
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    startTransition(async () => {
      await markNotificationsReadAction();
    });
  };

  const toggle = () => {
    setOpen((o) => !o);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="btn btn-ghost relative px-2 py-1.5"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1.15rem] rounded-full bg-rose px-1 text-center text-[0.68rem] font-bold leading-[1.15rem] text-white tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Notifications"
          className="card absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${live === "live" ? "bg-volt" : live === "offline" ? "bg-rose" : "bg-amber"}`}
                />
                {live === "live" ? "Live" : live === "offline" ? "Offline — retrying" : "Connecting…"}
              </p>
            </div>
            <button type="button" className="btn btn-ghost px-2 py-1 text-xs" onClick={markAllRead} disabled={!unread}>
              Mark all read
            </button>
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              Nothing yet. When a new posting matches you, it shows up here.
            </p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.slice(0, MAX_SHOWN).map((n) => (
                <li key={n.id} className="border-b border-hairline last:border-b-0">
                  <Link
                    href={`/student/feed#opp-${n.opportunityId}`}
                    onClick={() => {
                      setOpen(false);
                      markAllRead();
                    }}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-wash"
                  >
                    <span
                      aria-hidden
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-emerald"}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs text-muted">
                        {n.kind === "schedule_clash" ? "Schedule change" : "New match for you"} · {timeAgo(n.createdAt)}
                        {!n.read && <span className="sr-only"> (unread)</span>}
                      </span>
                      <span className="block text-sm font-medium leading-snug">{n.title}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-end sm:inset-x-auto sm:right-6">
        {toast && (
          <div className="card pointer-events-auto flex w-full max-w-sm items-start gap-3 p-4">
            <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-volt" />
            <div className="min-w-0 flex-1">
              <p className="eyebrow">New match</p>
              <p className="mt-0.5 text-sm font-semibold leading-snug">{toast.title}</p>
              <Link
                href={`/student/feed#opp-${toast.opportunityId}`}
                className="mt-1 inline-block text-sm font-medium text-emerald hover:text-emerald-deep"
                onClick={() => setToast(null)}
              >
                See why it matched
              </Link>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              className="btn btn-ghost px-1.5 py-1"
              onClick={() => setToast(null)}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
