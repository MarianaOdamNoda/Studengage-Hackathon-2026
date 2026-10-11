# Studengage — BUILD STATE (single source of truth for every build agent)

> **If you are an agent picking this up after another agent stopped (rate limit, crash):**
> read this whole file, find your workstream, continue from the first unticked `[ ]` item,
> and keep ticking items + appending to the Log as you go. Never redo ticked items without checking them first.

## Goal
A **local** demo of Studengage (teamStar). A university posts opportunities (form or CSV upload of demo data);
the recommendation engine ranks them for every student (6 hand-made demo personas + ~250 generated students)
and distributes them as an in-app feed + notifications. Students give feedback that changes their ranking.

### We are judged on (build for these)
1. **Problem–solution fit** — make it obvious each student gets *different, relevant* items instead of everything.
2. **Execution & innovation** — it must work flawlessly end to end; schedule-aware ranking with visible reasons.
3. **Impact** — show it with numbers: "broadcast vs Studengage" (relevant reach, notifications per student).
4. Presentation — the team handles it; the UI must be clean enough to present from.

## Locked decisions
- Next.js 15 (App Router, TS, Tailwind v4) in `web/`. SQLite via better-sqlite3, file `data/studengage.db`. Fully offline. System fonts.
- **No LLM calls.** Ranking = transparent weighted formula (`lib/engine`). A `claude` scorer slot exists (`lib/engine/scorer.ts`) but is NOT used; every recommendation stores `scorer = "formula"`. **Never label formula output as Claude/AI-generated in the UI.** Say "Studengage ranking engine".
- Weights: interest .35 · schedule .20 · urgency .15 · distance .10 · preferred .10 · popularity .10.
- Hard rules before scoring: eligibility (`required` criteria), closed/deadline passed. Equity-group data used ONLY in eligibility, never scoring.
- Schedule: notifications may be sent any time; schedule only affects *what* is shown. Full clash → collapsed "Conflicts with your schedule" section. Partial → lower rank + label. 20-min travel buffer between different campuses. No-time items (bursaries, jobs) ranked on deadline/eligibility.
- Recurring events: "3 of 4 sessions fit". If a schedule change makes an already-notified item clash → `now_conflicts` flag shown in feed, no new notification.
- Notifications: in-app only, immediately on publish, score ≥ 0.5, max `weekly_cap` (default 5) `match` notifications per student per rolling 7 days.
- Feedback: interested / not interested (not interested → "Dismissed" section, can undo). Attendance pop-up for ended events the student was notified about or marked interested, until answered.
- Fictional **Bluenose University** (Nova Scotia). Never use a real university's name/branding.
- Honest framing: impact numbers are "on simulated students"; 30% is a pilot *target*.

### Sign-in (user decision, overrides anything below)
MVP, no real auth. Homepage shows **two buttons only: "Student side" and "University side"** (forms posting to `enterStudentSide` / `enterUniversitySide` in `app/actions/auth.ts`). No persona cards / staff list on the homepage. The student panel top bar has a compact **"Viewing as: <persona> ▾" switcher** (uses `listPersonas()` + `loginAsStudent`) so the presenter can show different students' feeds. "Exit" (logout) returns to `/`.

## Architecture / ownership (only edit files you own; shared files → note in Log)
| Path | Owner |
|---|---|
| `web/lib/engine/*` (types, filter, schedule, score, scorer) | DONE (lead). CORE may extend + must test. Keep exported APIs. |
| `web/lib/db.ts` (schema), `web/lib/contracts.ts` (view models), `web/lib/session.ts`, `web/app/actions/auth.ts`, `web/components/ui.tsx`, `web/app/globals.css`, `web/app/layout.tsx` | DONE (lead). Additive changes only, log them. |
| `web/lib/services/**`, `web/lib/csv.ts`, `web/lib/ics.ts`, `web/scripts/**`, `demo-data/**`, `web/app/api/**`, `web/**/*.test.ts`, `start.ps1`, `README.md` | **CORE** |
| `web/app/page.tsx`, `web/components/home/**`, `web/app/not-found.tsx` | **HOME** |
| `web/app/uni/**`, `web/components/uni/**` | **UNI** |
| `web/app/student/**`, `web/components/student/**` | **STUDENT** |

**Contract:** UI calls only functions exported from `web/lib/services/index.ts` (signatures frozen; CORE implements) and types from `web/lib/contracts.ts`. Mutations go through Server Actions living in the UI owner's folder (e.g. `web/app/student/actions.ts`), which call services then `revalidatePath`. Auth: `getSessionUser()` from `lib/session.ts`; login/logout actions in `app/actions/auth.ts`.

**Build hygiene (parallel agents share one folder):** do NOT run `next build` or `next dev` while other agents are working (they share `.next/`). Verify with `npx tsc --noEmit`, `npx eslint <your paths>`, and `npx vitest run`. The lead runs the full build + dev server at the end. Use `npm i` only if you must, and log any new dependency (pin exact versions).

## Design rules (all UI)
- Use tokens/classes from `globals.css` (`card`, `btn`, `btn-primary`, `input`, `label`, `chip`, `eyebrow`; colours `ink, muted, ground, emerald, emerald-deep, volt, wash, hairline, amber(+wash), rose(+wash)`) and primitives in `components/ui.tsx`. No new colours.
- Clean, calm, generous whitespace; max content width ~1100px; works at 400px wide; real empty states; keyboard accessible; `aria-label`s on icon buttons; no lorem ipsum, no emoji-as-icons.
- Every number shown must come from the services (no hard-coded fake stats).
- Copy: plain, short sentences. Reasons on cards come from `FeedItemVM.reasons`.

## Seed / demo data spec (CORE)
- University "Bluenose University". Campuses: Harbour (44.6366, -63.5917, Halifax), Northshore (44.6710, -63.5772, Dartmouth), Valley (45.0880, -64.3650, Wolfville area).
- Faculties → programs: Science → Chemistry, Biology, Computer Science · Health → Nursing · Business → Commerce · Engineering → Mechanical Engineering · Arts → Psychology, History.
- Staff: 2 fictional (Student Services coordinator; Co-op & Career office).
- **6 demo personas** (is_demo=1, with tagline, realistic weekly timetables 8–14 blocks, interests, location label):
  1. Amara — 3rd-yr Chemistry, Harbour, domestic, opted-in "African Nova Scotian", research/career/culture. Has one ended event she marked interested (→ attendance pop-up).
  2. Wei — 1st-yr Computer Science, Harbour, international, in residence, tech/social/food.
  3. Jordan — part-time Nursing, Northshore, mature student + student parent (opted in), wellness/finance; busy timetable.
  4. Priya — grad MSc Biology, Harbour, research/academic/outdoors.
  5. Liam — 2nd-yr Commerce, co-op enrolled, Northshore, finance/networking/career/sports.
  6. Sofia — 4th-yr Mechanical Engineering, Valley campus, career/tech/leadership/outdoors.
- ~250 generated students (seeded PRNG, deterministic), each with declared `interests` AND `hidden_interests` (mostly overlapping + 1–2 extra), timetables, locations near their campus.
- ~15 baseline postings already published at seed (mix of types; some already ended in the past week for attendance/analytics), with simulated feedback/attendance from generated students driven by hidden interests (noise included).
- **All dates relative to "now"** at seed time so the demo is always fresh.
- `demo-data/bluenose-postings.csv`: ~30 new postings to upload live in the University panel. Regenerated (fresh relative dates) by `npm run seed`; `getDemoCsv()` returns freshly generated text so the panel can offer a download. Must include: equity-targeted bursary, recurring weekly club (4 sessions), online workshop, co-op job w/ deadline, Valley-only event, grad-only seminar, international-students event, events that clash with personas' classes, a career fair, wellness drop-in.
- CSV format (header row, `;` separates list items): `title,type,description,department,contact,link,campus,building,mode,sessions,deadline,capacity,cost,rsvp,food,accessibility,language,tags,req_levels,req_faculties,req_programs,req_years,req_status,req_residency,req_campuses,req_min_gpa,req_coop,req_in_residence,req_equity_groups,pref_levels,pref_faculties,pref_programs,pref_years,pref_status,pref_residency,pref_campuses,pref_min_gpa,pref_coop,pref_in_residence,pref_equity_groups`. `sessions` = `start/end;start/end` local ISO (`2026-10-14T16:00/2026-10-14T18:00`). Booleans `yes/no`. Document in `demo-data/README.md`. Proper CSV quoting (commas/quotes in descriptions). Row-level validation errors with row numbers.

## Impact metric spec (CORE → `getImpact`)
Equal attention budget for fairness: each student pays attention to `weekly_cap` items.
- **Broadcast:** student sees `cap` items chosen uniformly from all active postings → expected relevant seen = cap × (relevant active postings for them / active postings).
- **Studengage:** student sees the top `cap` items of their feed.
- **Relevant** = eligible AND not a full clash AND shares ≥1 tag with `hidden_interests` (demo personas: declared interests).
- `relevantShare` = relevant seen / seen. `relevantReach` = relevant seen / all relevant pairs. `reachLift` = studengage relevant seen / broadcast relevant seen − 1. `definition` = one plain sentence of the above, mentioning simulated students.

## Workstreams & checklists (tick `[x]` as you finish; add sub-items if useful)

### CORE
- [x] Repository layer: row ↔ engine/VM mappers (JSON columns), opportunity + sessions loaders
- [x] `recomputeStudent(id)` (uses `getScorer()`, writes `recommendations` incl. `scorer`, `now_conflicts` logic) and `recomputeAll()`
- [x] Peer interest map (same-program share marking interested)
- [x] publishOpportunity + notification rules (threshold, weekly cap, dedupe)
- [x] Student services: profile get/update, schedule add/remove, ICS import (`node-ical`, weekly blocks from VEVENT incl. RRULE weekly), feed, past, pending attendance, feedback, attendance (+ interaction_log), notifications list/read
- [x] University services: CSV parse/validate/preview/import, posting stats, impact metric
- [x] Seed script `npm run seed` (spec above) + `resetDemo()` + `getDemoCsv()` + writes `demo-data/bluenose-postings.csv` + `demo-data/README.md`
- [x] SSE `GET /api/notifications/stream` (student from cookie; sends new NotificationVM JSON events; poll DB every 2s; heartbeat) 
- [x] Vitest: engine (filter, schedule incl. travel buffer + recurring, score weights/reasons, scorer buckets) + services (publish distributes & respects cap, CSV parse errors, feedback changes ranking, schedule change sets now_conflicts, impact numbers sane) using a temp DB (`STUDENGAGE_DB`)
- [x] `start.ps1` at repo root (npm install if needed, seed if DB missing, `npm run dev`) + root `README.md` (run instructions, demo script for the pitch: which persona, what to upload, what to point at)

### HOME (`/`)
- [x] Hero: what Studengage does in two sentences (from the pitch script), primary CTAs "Try as a student" / "Open university panel"
- [x] Problem → insight → solution section (8 channels, everyone gets everything; we sort, we don't write)
- [x] How it works: 3–5 step flow (post → filter → rank → deliver → feedback) incl. the transparent weights
- [x] Live impact strip from `getImpact(1)` (labelled "on simulated students")
- [x] Privacy & trust: what we store, equity data opt-in + eligibility-only, no scraping (university pushes postings), no LLM
- [x] Demo login: persona cards (`listPersonas()`) + staff accounts (`listStaff()`) using `loginAsStudent/loginAsStaff`; "Reset demo data" button (server action → `resetDemo()`)
- [x] Team: David, Emmanuel, Mariana — teamStar; footer
- [x] `not-found.tsx`; handles DB/services errors gracefully

### UNI (`/uni/**`, staff session required → else redirect `/`)
- [x] Layout: top bar (Brand, uni name, nav: Dashboard · New posting · Upload CSV, staff name, logout)
- [x] Dashboard: impact panel (broadcast vs Studengage, reachLift as "+X% relevant reach") + postings table (`listPostingStats`) with matched/notified/interested/attended, sortable or at least newest first
- [x] New posting form — every field from the schema: basics, when (multiple sessions add/remove), where (campus select → coords from campuses, mode), who: required vs preferred criteria (levels, faculties/programs from `getUniversity().faculties`, years, status, residency, campuses, min GPA, co-op, residence, equity groups w/ explanation), logistics, tags (TAGS). Validation + clear errors. On submit → `publishOpportunity` → result screen "Matched N · Notified N · Conflicts N · Not eligible N"
- [x] Upload CSV: file input + "Download demo CSV" (`getDemoCsv`) → preview table w/ row errors (`previewCsv`) → Publish all (`importCsv`) → distribution results per posting + totals
- [x] Posting detail `/uni/postings/[id]`: all fields, funnel (eligible → matched → notified → interested → attended), aggregate only (no individual student data)

### STUDENT (`/student/**`, student session required → else redirect `/`)
- [x] Layout: top bar (Brand, nav: Feed · Past · Profile, notification bell, student name + persona, logout)
- [x] Notification bell: client component, EventSource `/api/notifications/stream`, unread count, dropdown list linking to the item, mark read; toast on new arrival
- [x] Feed: ranked cards (type, title, when/sessions, where/online, deadline, reasons list, score as subtle "match" meter, FitBadge, now_conflicts warning), Interested / Not interested buttons (optimistic), details expand (description, logistics, link); filters by type; collapsed "Conflicts with your schedule (N)"; "Dismissed (N)" with undo; "N postings hidden because you're not eligible" note; empty state
- [x] Attendance pop-up: modal for `getPendingAttendance` items, one at a time, Attended / Didn't attend / Later
- [x] Past: ended items with attendance state, change answer
- [x] Profile: program/year/etc, campus, location (preset neighbourhood list near each campus + label), interests (TAGS toggles), weekly cap, equity self-ID with explicit consent checkbox + plain explanation (eligibility only, removable), save → recompute; Schedule: weekly grid view + add/remove block + .ics upload

## Log (append: `YYYY-MM-DD HH:MM [AGENT] message`)
- 2026-10-10 [LEAD] Scaffolded Next.js app, engine (filter/schedule/score/scorer), schema, contracts, services API stubs, session, auth actions, design system. `tsc` clean.
- 2026-10-10 14:00 [HOME] Done: app/page.tsx (force-dynamic), app/not-found.tsx, components/home/{data,actions,ResetDemoButton,EnterButtons,DataNotice,Hero,Problem,HowItWorks,Impact,Trust,DemoEntry,SiteChrome}. Per Sign-in decision: no persona/staff lists, just "Student side"/"University side" forms -> enterStudentSide/enterUniversitySide (buttons disabled + "run npm run seed" notice when listPersonas/listStaff fail). All service calls wrapped in safe() (components/home/data.ts). Hero shows live top match of first persona via getFeed (hidden if unavailable). Impact band from getImpact(staff[0].universityId) labelled simulated students; 30% shown as pilot target. Weights imported from lib/engine/score WEIGHTS. Reset = components/home/actions.ts resetDemoAction (inline confirm, revalidatePath("/","layout")). Note for LEAD/CORE: enterStudentSide/enterUniversitySide throw (not redirect) if services throw; homepage reads ?error=no-data. tsc + eslint clean.
- 2026-10-10 14:30 [UNI] Built /uni (layout+staff guard via app/uni/_lib/staff.ts, dashboard w/ ImpactPanel + sortable PostingsTable), /uni/new (PostingForm: client+server validation in components/uni/validatePosting.ts, sessions add/remove, required vs preferred criteria; equity groups offered as REQUIRED only since equity data is eligibility-only), /uni/upload (CsvUpload: preview → publish → per-posting + totals results), /uni/demo-csv route (text/csv attachment), /uni/postings/[id] (aggregate funnel). Actions in app/uni/actions.ts. Note for CORE: OpportunityInput has no lat/lon, so publishOpportunity must derive coords from the campus name. tsc + eslint clean.
- 2026-10-10 15:30 [STUDENT] Built /student (redirect→feed), layout (guard, nav, "Viewing as" persona switcher via loginAsStudent, bell, "Exit"), feed (reasons panel, match meter, FitBadge, now_conflicts, optimistic Interested/Not interested, type chips, Conflicts + Dismissed w/ undo, ineligible note), attendance <dialog> (Esc/Later → sessionStorage), past, profile (all fields, neighbourhood presets in components/student/locations.ts, equity consent) + schedule grid/add/remove/.ics. Actions in app/student/actions.ts (session-derived id, validation, revalidatePath("/student","layout")). tsc + eslint clean. Not runtime-tested (services were stubs). Bell expects SSE `message` data = NotificationVM JSON (array also accepted); calls router.refresh() on new arrival.
- 2026-10-10 14:55 [CORE] WARNING: two agents appear to be writing web/lib/services/* concurrently (seed.ts, index.ts, scripts/seed.ts, demo-data.ts were overwritten under me ~14:52). Agent writing repo/recompute/publish/student/university/csv/ics/clock (CORE-A) pausing edits to seed/demo-data; whoever else is CORE please log here before editing.
- 2026-10-10 14:56 [CORE-A] Split to avoid clobbering: CORE-A now takes ONLY Vitest tests (web/lib/**/*.test.ts, vitest config) + start.ps1 + root README.md. Other CORE agent: keep seed.ts / scripts/seed.ts / demo-data.ts / SSE route / index.ts. Note for seed owner: personas get attendance pop-ups for every ended baseline event they were notified about -- consider deleting persona notifications on ended postings except Amara's story beat (my earlier version did this).
- 2026-10-10 15:00 [CORE] Coordinator confirmed the other writer was an outside session (now stopped). Kept its SSE route (app/api/notifications/stream/route.ts; added id-reset handling for demo resets) and its slimmer services/index.ts (pure re-exports). Replaced its lib/services/seed.ts + scripts/seed.ts with mine (persona pop-up cleanup, demo-data/README.md, per-persona summary).
- 2026-10-10 15:00 [CORE] Services implemented in lib/services/{clock,repo,recompute,publish,student,university,seed,demo-data}.ts + lib/csv.ts + lib/ics.ts. Notes for UI: listNotifications is newest-first; previewCsv returns only VALID rows in `rows` (errors carry spreadsheet row numbers, header=row 1; unknown columns are reported as a row-1 message but don't block import). getFeed recomputes the student on every call (cheap). A notified item that later fully clashes stays in `feed` with nowConflicts=true. Recommendation rows for closed postings are kept as history. publishMany() ranks a CSV batch once and gives each student their best new items first within the weekly cap. Seed baseline notifications are dated 8-13 days ago and marked read, so personas have full weekly caps free for the live CSV upload. `npm run seed` works (prints per-persona summary). Gotcha: next.config may need serverExternalPackages ["node-ical"] if the bundler chokes on it at build (better-sqlite3 is auto-externalised).
- 2026-10-10 15:10 [CORE] Vitest: web/vitest.config.ts (+ '@' alias), test/setup.ts (per-file temp DB via STUDENGAGE_DB), test/db.ts resetTestDb() (closes + clears globalThis.__studengageDb). lib/engine/engine.test.ts (17) + lib/services/services.test.ts (15) = 32 passing (~25s; services suite seeds once). Covers filter/equity/deadline, travel buffer, partial/conflict labels, "3 of 4 sessions fit", weights/reasons, scorer buckets, seed persona stories, CSV quoting + row errors, CSV import distribution (1,188 notifications to 150+ students after demo upload, all within caps, no dupes), campus coords, feedback → dismissed + lower sibling score + interaction_log, now_conflicts without new notification, ICS RRULE import, equity opt-out, impact sanity. NOTE: resetDemo() in tests also rewrites ../demo-data (harmless, fresh dates).
- 2026-10-10 15:10 [CORE] start.ps1 (repo root; -Reseed switch) + root README.md with run instructions and the pitch demo script. Seed summary: Amara top = Research Showcase / Research Award, 2 conflicts, 1 attendance pop-up; Wei = Hackathon / Intl Welcome Dinner; Jordan = Student Parent Bursary (only persona eligible); Priya = Research Showcase / Grad Writing Retreat; Liam = Finance Networking Night / Co-op Resume Clinic (partial overlap); Sofia = Engineering Leadership Panel / Valley hike. Impact at seed: relevant share 34% broadcast vs 79% Studengage, reach lift +134%. ALL CORE ITEMS DONE. tsc (whole project) clean, eslint clean on CORE paths. No new dependencies.
