import type { FeedItemVM, ImpactVM, PersonaVM } from "@/lib/contracts";
import { getFeed, getImpact, listPersonas, listStaff } from "@/lib/services";

/** Result of a service call that may fail (DB not seeded, CORE still implementing, …). */
export type Loaded<T> = { ok: true; value: T } | { ok: false; error: string };

export function safe<T>(fn: () => T): Loaded<T> {
  try {
    return { ok: true, value: fn() };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[home] service call failed:", error);
    return { ok: false, error };
  }
}

export interface HomePreview {
  persona: PersonaVM;
  item: FeedItemVM;
  shown: number;
  hidden: number;
  conflicts: number;
}

export interface HomeData {
  /** True when the demo database answers (personas and staff exist). */
  ready: boolean;
  impact: Loaded<ImpactVM>;
  /** Live top recommendation for the first demo persona (hero preview). */
  preview: HomePreview | null;
}

/** Server-only: every service call is wrapped so the homepage never crashes. */
export function loadHomeData(): HomeData {
  const personas = safe(listPersonas);
  const staff = safe(listStaff);
  const ready = personas.ok && personas.value.length > 0 && staff.ok && staff.value.length > 0;
  const universityId = staff.ok && staff.value[0] ? staff.value[0].universityId : 1;
  const impact = safe(() => getImpact(universityId));

  let preview: HomePreview | null = null;
  if (personas.ok && personas.value.length > 0) {
    const persona = personas.value[0];
    const feed = safe(() => getFeed(persona.id));
    if (feed.ok && feed.value.feed.length > 0) {
      preview = {
        persona,
        item: feed.value.feed[0],
        shown: feed.value.feed.length,
        hidden: feed.value.excluded,
        conflicts: feed.value.conflicts.length,
      };
    }
  }
  return { ready, impact, preview };
}
