import { enterStudentSide, enterUniversitySide } from "@/app/actions/auth";

/**
 * The two ways into the demo (MVP: no real auth). Each is a form posting to a server action
 * that signs in as the first demo persona / first staff account and redirects.
 */
export function EnterButtons({ ready, size = "md" }: { ready: boolean; size?: "md" | "lg" }) {
  const pad = size === "lg" ? "px-5 py-3 text-base" : "";
  return (
    <div className="flex flex-wrap gap-3">
      <form action={enterStudentSide}>
        <button type="submit" className={`btn btn-primary ${pad}`} disabled={!ready}>
          Student side
          <Arrow />
        </button>
      </form>
      <form action={enterUniversitySide}>
        <button type="submit" className={`btn ${pad}`} disabled={!ready}>
          University side
          <Arrow />
        </button>
      </form>
    </div>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
