# Demo data

`bluenose-postings.csv` holds ~30 new postings for fictional Bluenose University. Upload it in the
University panel (Upload CSV) to watch Studengage rank and distribute them live. `npm run seed`
regenerates it with dates relative to today, and the panel's "Download demo CSV" always gives a fresh copy.

## Format

- First row is the header. Row numbers in error messages count the header as row 1.
- Standard CSV quoting: wrap a field in double quotes if it contains a comma, quote or line break; write a quote as `""`.
- Lists use `;` between items (e.g. `tags` = `career;networking`).
- Booleans: `yes` / `no` (blank = not set).
- `sessions`: `start/end;start/end` in local time, e.g. `2026-10-14T16:00/2026-10-14T18:00`.
- `deadline`: `2026-10-20` (end of day) or `2026-10-20T17:00`.
- Every posting needs at least one session or a deadline, at least one tag, and a campus if it meets in person.

| Column | Values |
|---|---|
| title, description, department | required text |
| type | event, workshop, bursary, coop, career_fair, club, wellness, deadline |
| contact, link, building, accessibility | optional text |
| campus | Harbour, Northshore, Valley |
| mode | in_person (default), online, hybrid |
| capacity | whole number; cost: number (0 = free) |
| rsvp, food | yes / no |
| language | default English |
| tags | career, research, social, sports, arts, volunteering, wellness, tech, finance, networking, leadership, culture, food, outdoors, academic |
| req_* | hard eligibility: students who don't match never see the posting |
| pref_* | ranking boost only |

Criteria suffixes (for both `req_` and `pref_`): `levels` (undergrad;grad), `faculties` (Science;Health;Business;Engineering;Arts),
`programs` (Chemistry;Biology;Computer Science;Nursing;Commerce;Mechanical Engineering;Psychology;History), `years` (1–6),
`status` (full;part), `residency` (domestic;international), `campuses`, `min_gpa` (0–4.3), `coop` (yes/no),
`in_residence` (yes/no), `equity_groups` (opt-in self-identification; only ever used for eligibility, never for ranking):
African Nova Scotian; Indigenous / Mi'kmaq; 2SLGBTQIA+; Students with disabilities; First-generation; Mature students; Student parents.
