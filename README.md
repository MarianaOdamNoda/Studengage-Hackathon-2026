# Studengage (teamStar)

Universities post opportunities once; Studengage ranks them for every student and delivers only the
ones that fit each person's interests, eligibility and timetable. Students tell us what they think,
and their feed adapts.

This is a fully local demo for fictional **Bluenose University** (Nova Scotia). No internet, no accounts,
no AI/LLM calls: ranking is a transparent weighted formula (the "Studengage ranking engine").

## Run it

Requirements: Node.js 20+ on Windows, macOS or Linux.

```powershell
.\start.ps1            # installs dependencies, seeds the DB if missing, starts http://localhost:3000
.\start.ps1 -Reseed    # same, but wipes and reseeds the demo data first
```

Or by hand:

```bash
cd web
npm install
npm run seed     # creates ../data/studengage.db and ../demo-data/bluenose-postings.csv
npm run dev
```

Other commands (in `web/`): `npm test` (Vitest), `npm run typecheck`, `npm run lint`.
The home page also has a **Reset demo data** button, so you can rerun the demo as many times as you like.
All dates are relative to the moment you seed, so the demo always looks current.

## How ranking works

1. **Hard rules first.** Students who aren't eligible (level, program, year, campus, co-op, residence, opt-in equity group…)
   or postings that have closed never reach the feed. Equity self-identification is opt-in and used *only* here.
2. **Score** = interest .35 · schedule .20 · urgency .15 · distance .10 · preferred-criteria match .10 · popularity in your program .10.
3. **Schedule-aware.** A full clash goes to a collapsed "Conflicts with your schedule" section; partial overlaps rank lower
   with a label; 20 minutes of travel is allowed between campuses; recurring events say "3 of 4 sessions fit".
4. **Notifications** go out immediately on publish for items scoring ≥ 0.5, at most the student's weekly limit (default 5)
   in any 7 days, best matches first.
5. **Feedback** (Interested / Not interested / attended) shifts tag weights, so the feed learns.

## Pitch demo script (about 4 minutes)

1. **Home page** — read the two-sentence pitch. Point at the impact strip: "on 256 simulated students, the same
   attention budget finds far more relevant items than broadcasting everything". (The 30% is a pilot *target*.)
2. **Student side → Amara** (3rd-year Chemistry).
   - The attendance pop-up appears: she marked the *Black Student Networking Mixer* as interested and it has ended. Answer "Attended".
   - Her top items are research-related, each with plain reasons ("Matches your interest in research and career",
     "Fits your free time Thu 5:30 PM–7:30 PM").
   - Open **Conflicts with your schedule**: two items clash with her Organic Chemistry and lab blocks, so they're tucked away, not deleted.
   - Click **Not interested** on one item and show it move to Dismissed (undo is one click).
3. **Switch persona → Jordan** (part-time Nursing, student parent). Top of her feed is the **Student Parent Bursary**,
   which no other persona sees: it's restricted to students who opted in to that group. Her busy timetable
   (clinicals + school pickup) drives what fits.
4. **Switch → Liam** (Commerce co-op): the *Co-op Resume Clinic* shows "Overlaps COMM 2201 Accounting until 2:20 PM"
   — a partial overlap is ranked lower but still shown. Wei, Priya and Sofia each have a completely different top three.
5. **University side** (Dana MacLeod, Student Services) → **Upload CSV** → *Download demo CSV* → upload it.
   The preview validates all ~30 postings; **Publish all** shows, per posting, how many students it matched,
   how many were notified, how many had a clash, and how many weren't eligible.
6. Go back to a student tab (e.g. Amara): the **bell** lights up live with at most 5 new notifications — her best new
   matches (e.g. the *Black Student Success Bursary*, *Summer Research Assistant*), not all 30.
7. **Dashboard** — broadcast vs Studengage numbers and the postings table (matched → notified → interested → attended).
   Open a posting for the aggregate funnel (no individual student data is shown to staff).

## Project layout

- `web/` — Next.js 15 app (App Router, TypeScript, Tailwind v4), SQLite via better-sqlite3.
  - `lib/engine/` — eligibility filter, schedule fit, scoring formula, scorer interface.
  - `lib/services/` — the only server API the UI uses (feed, publishing, CSV import, impact, seed).
  - `scripts/seed.ts` — `npm run seed`.
- `data/studengage.db` — the local database (created by the seed).
- `demo-data/` — the demo CSV to upload live, plus its format documentation.

Bluenose University and every person in the demo are fictional.
