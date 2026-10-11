/**
 * Demo content for fictional Bluenose University: personas, generated students, baseline postings
 * and the live-upload CSV postings. All dates are relative to the moment of seeding.
 */
import type { Campus, OpportunityInput, SessionVM } from "../contracts";
import type { ScheduleBlock } from "../engine/types";
import { localIso } from "./clock";
import { FACULTIES } from "./repo";

export const UNIVERSITY_NAME = "Bluenose University";
export const CAMPUSES: Campus[] = [
  { name: "Harbour", lat: 44.6366, lon: -63.5917 },
  { name: "Northshore", lat: 44.671, lon: -63.5772 },
  { name: "Valley", lat: 45.088, lon: -64.365 },
];
export const STAFF = [
  { name: "Dana MacLeod", role: "Student Services coordinator" },
  { name: "Ravi Banerjee", role: "Co-op & Career office" },
];

// ---- date helpers ---------------------------------------------------------------------

export function dateHelpers(base: Date) {
  const at = (d: Date, hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    const x = new Date(d);
    x.setHours(h, m, 0, 0);
    return x;
  };
  /** Next weekday `dow` at least 2 days from now (so it's clearly upcoming), plus `week` weeks. */
  const day = (dow: number, week = 0) => {
    const d = new Date(base);
    d.setDate(d.getDate() + 2);
    while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
    d.setDate(d.getDate() + week * 7);
    return d;
  };
  const sess = (dow: number, from: string, to: string, week = 0): SessionVM => ({
    start: localIso(at(day(dow, week), from)),
    end: localIso(at(day(dow, week), to)),
  });
  const weekly = (dow: number, from: string, to: string, n: number) => Array.from({ length: n }, (_, w) => sess(dow, from, to, w));
  const inDays = (n: number, hhmm = "23:59") => {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return localIso(at(d, hhmm));
  };
  const ago = (n: number, from: string, to: string): SessionVM => {
    const d = new Date(base);
    d.setDate(d.getDate() - n);
    return { start: localIso(at(d, from)), end: localIso(at(d, to)) };
  };
  return { sess, weekly, inDays, ago };
}

// ---- personas -------------------------------------------------------------------------

export interface PersonaSeed {
  key: string;
  name: string;
  persona: string;
  level: "undergrad" | "grad";
  faculty: string;
  program: string;
  year: number;
  status: "full" | "part";
  residency: "domestic" | "international";
  campus: string;
  gpa: number | null;
  coop: boolean;
  inResidence: boolean;
  lat: number;
  lon: number;
  locationLabel: string;
  interests: string[];
  equityGroups: string[];
  schedule: ScheduleBlock[];
}

const b = (day: number, start: string, end: string, label: string, campus: string): ScheduleBlock => ({ day, start, end, label, campus });

export const PERSONAS: PersonaSeed[] = [
  {
    key: "amara",
    name: "Amara Downey",
    persona: "3rd-year Chemistry, wants research experience and community",
    level: "undergrad", faculty: "Science", program: "Chemistry", year: 3, status: "full", residency: "domestic",
    campus: "Harbour", gpa: 3.6, coop: false, inResidence: false, lat: 44.656, lon: -63.596, locationLabel: "North End, Halifax",
    interests: ["research", "career", "culture"], equityGroups: ["African Nova Scotian"],
    schedule: [
      b(1, "09:30", "10:20", "CHEM 3201 Physical Chemistry", "Harbour"),
      b(1, "13:00", "16:00", "CHEM 3202 Lab", "Harbour"),
      b(2, "10:00", "11:20", "CHEM 3401 Organic Chemistry", "Harbour"),
      b(2, "14:30", "15:50", "BIOC 3300 Biochemistry", "Harbour"),
      b(3, "09:30", "10:20", "CHEM 3201 Physical Chemistry", "Harbour"),
      b(4, "10:00", "11:20", "CHEM 3401 Organic Chemistry", "Harbour"),
      b(4, "14:30", "15:50", "BIOC 3300 Biochemistry", "Harbour"),
      b(5, "09:30", "10:20", "CHEM 3201 Physical Chemistry", "Harbour"),
      b(5, "13:00", "15:00", "Lab assistant shift", "Harbour"),
    ],
  },
  {
    key: "wei",
    name: "Wei Zhang",
    persona: "1st-year Computer Science, international student living in residence",
    level: "undergrad", faculty: "Science", program: "Computer Science", year: 1, status: "full", residency: "international",
    campus: "Harbour", gpa: null, coop: false, inResidence: true, lat: 44.6372, lon: -63.5905, locationLabel: "Harbour campus residence",
    interests: ["tech", "social", "food"], equityGroups: [],
    schedule: [
      b(1, "10:30", "11:20", "CSCI 1100 Intro to Programming", "Harbour"),
      b(3, "10:30", "11:20", "CSCI 1100 Intro to Programming", "Harbour"),
      b(5, "10:30", "11:20", "CSCI 1100 Intro to Programming", "Harbour"),
      b(1, "14:30", "15:50", "MATH 1000 Calculus", "Harbour"),
      b(3, "14:30", "15:50", "MATH 1000 Calculus", "Harbour"),
      b(2, "11:30", "12:50", "CSCI 1110 Discrete Structures", "Harbour"),
      b(4, "11:30", "12:50", "CSCI 1110 Discrete Structures", "Harbour"),
      b(2, "16:00", "18:00", "CSCI 1100 Lab", "Harbour"),
      b(4, "13:00", "14:20", "ENGL 1050 Academic Writing", "Harbour"),
    ],
  },
  {
    key: "jordan",
    name: "Jordan Ellis",
    persona: "Part-time Nursing, mature student and parent of two",
    level: "undergrad", faculty: "Health", program: "Nursing", year: 2, status: "part", residency: "domestic",
    campus: "Northshore", gpa: 3.4, coop: false, inResidence: false, lat: 44.672, lon: -63.499, locationLabel: "Cole Harbour, Dartmouth",
    interests: ["wellness", "finance"], equityGroups: ["Mature students", "Student parents"],
    schedule: [
      b(1, "08:30", "12:00", "NURS 2200 Clinical placement", "Northshore"),
      b(1, "13:00", "14:20", "NURS 2010 Health Assessment", "Northshore"),
      b(2, "09:00", "10:20", "NURS 2100 Pharmacology", "Northshore"),
      b(3, "08:30", "12:00", "NURS 2200 Clinical placement", "Northshore"),
      b(3, "13:00", "14:20", "NURS 2010 Health Assessment", "Northshore"),
      b(4, "09:00", "10:20", "NURS 2100 Pharmacology", "Northshore"),
      b(5, "09:00", "11:50", "NURS 2300 Skills lab", "Northshore"),
      b(1, "15:00", "15:45", "School pickup", "Northshore"),
      b(2, "15:00", "15:45", "School pickup", "Northshore"),
      b(3, "15:00", "15:45", "School pickup", "Northshore"),
      b(4, "15:00", "15:45", "School pickup", "Northshore"),
      b(5, "15:00", "15:45", "School pickup", "Northshore"),
    ],
  },
  {
    key: "priya",
    name: "Priya Raman",
    persona: "MSc Biology researcher who loves fieldwork",
    level: "grad", faculty: "Science", program: "Biology", year: 1, status: "full", residency: "domestic",
    campus: "Harbour", gpa: 3.9, coop: false, inResidence: false, lat: 44.629, lon: -63.58, locationLabel: "South End, Halifax",
    interests: ["research", "academic", "outdoors"], equityGroups: [],
    schedule: [
      b(1, "09:00", "12:00", "Thesis lab work", "Harbour"),
      b(2, "13:00", "14:30", "BIOL 5010 Graduate Seminar", "Harbour"),
      b(3, "09:00", "12:00", "Thesis lab work", "Harbour"),
      b(4, "10:00", "11:30", "STAT 5100 Biostatistics", "Harbour"),
      b(4, "14:00", "17:00", "TA: BIOL 1010 Lab", "Harbour"),
      b(5, "09:00", "12:00", "Thesis lab work", "Harbour"),
      b(2, "09:00", "11:00", "Supervisor meeting", "Harbour"),
      b(3, "13:30", "15:00", "Lab group meeting", "Harbour"),
    ],
  },
  {
    key: "liam",
    name: "Liam MacDonald",
    persona: "2nd-year Commerce co-op student and rugby player",
    level: "undergrad", faculty: "Business", program: "Commerce", year: 2, status: "full", residency: "domestic",
    campus: "Northshore", gpa: 3.2, coop: true, inResidence: false, lat: 44.6658, lon: -63.5669, locationLabel: "Downtown Dartmouth",
    interests: ["finance", "networking", "career", "sports"], equityGroups: [],
    schedule: [
      b(1, "10:00", "11:20", "COMM 2101 Marketing", "Northshore"),
      b(3, "10:00", "11:20", "COMM 2101 Marketing", "Northshore"),
      b(1, "13:00", "14:20", "COMM 2201 Accounting", "Northshore"),
      b(3, "13:00", "14:20", "COMM 2201 Accounting", "Northshore"),
      b(2, "11:30", "12:50", "ECON 2200 Microeconomics", "Northshore"),
      b(4, "11:30", "12:50", "ECON 2200 Microeconomics", "Northshore"),
      b(2, "17:00", "19:00", "Rugby practice", "Northshore"),
      b(4, "17:00", "19:00", "Rugby practice", "Northshore"),
      b(5, "10:00", "11:20", "COMM 2301 Business Law", "Northshore"),
    ],
  },
  {
    key: "sofia",
    name: "Sofia Martins",
    persona: "4th-year Mechanical Engineering on the Valley campus",
    level: "undergrad", faculty: "Engineering", program: "Mechanical Engineering", year: 4, status: "full", residency: "domestic",
    campus: "Valley", gpa: 3.5, coop: true, inResidence: false, lat: 45.091, lon: -64.36, locationLabel: "Wolfville",
    interests: ["career", "tech", "leadership", "outdoors"], equityGroups: [],
    schedule: [
      b(1, "08:30", "09:20", "MECH 4010 Heat Transfer", "Valley"),
      b(3, "08:30", "09:20", "MECH 4010 Heat Transfer", "Valley"),
      b(5, "08:30", "09:20", "MECH 4010 Heat Transfer", "Valley"),
      b(2, "10:00", "11:20", "MECH 4200 Machine Design", "Valley"),
      b(4, "10:00", "11:20", "MECH 4200 Machine Design", "Valley"),
      b(3, "13:00", "16:00", "Capstone design lab", "Valley"),
      b(5, "13:00", "16:00", "Capstone design lab", "Valley"),
      b(2, "14:00", "15:20", "MECH 4300 Thermodynamics II", "Valley"),
    ],
  },
];

// ---- generated students --------------------------------------------------------------

/** Deterministic PRNG (mulberry32). */
export function prng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(next() * arr.length)];
  const chance = (p: number) => next() < p;
  return { next, pick, chance };
}

const FIRST = ["Ava", "Noah", "Olivia", "Ethan", "Maya", "Lucas", "Chloe", "Owen", "Zoe", "Ben", "Leah", "Ryan", "Nora", "Isaac", "Hannah", "Kai", "Sara", "Omar", "Grace", "Jacob", "Aisha", "Daniel", "Emma", "Mohammed", "Lily", "Caleb", "Fatima", "Nathan", "Mei", "Elijah", "Rosa", "Tariq", "Julia", "Dylan", "Ana", "Kiran", "Abby", "Malik", "Sophie", "Arjun"];
const LAST = ["Smith", "MacDonald", "Campbell", "Nguyen", "Fraser", "Singh", "Chen", "Murphy", "Paul", "Francis", "Boudreau", "Cormier", "Ahmed", "Li", "Kim", "Downey", "Gallant", "MacNeil", "Patel", "Wright", "Johnson", "Bernard", "Dupuis", "Wilson", "Sylliboy", "Marshall", "Hassan", "Clarke", "Brown", "Martin"];

const FACULTY_TAGS: Record<string, string[]> = {
  Science: ["research", "tech", "academic", "outdoors"],
  Health: ["wellness", "volunteering", "career"],
  Business: ["finance", "networking", "career", "leadership"],
  Engineering: ["tech", "career", "leadership"],
  Arts: ["arts", "culture", "social", "academic"],
};
const GENERAL_TAGS = ["social", "sports", "food", "wellness", "volunteering", "culture", "outdoors", "career", "arts"];
const PROGRAM_WEIGHTS: [string, number][] = [
  ["Chemistry", 25], ["Biology", 35], ["Computer Science", 40], ["Nursing", 35], ["Commerce", 45],
  ["Mechanical Engineering", 30], ["Psychology", 25], ["History", 15],
];
const PROGRAM_CAMPUS: Record<string, string> = {
  Chemistry: "Harbour", Biology: "Harbour", "Computer Science": "Harbour", Nursing: "Northshore", Commerce: "Northshore",
  "Mechanical Engineering": "Valley", Psychology: "Harbour", History: "Harbour",
};
const CODES: Record<string, string> = {
  Chemistry: "CHEM", Biology: "BIOL", "Computer Science": "CSCI", Nursing: "NURS", Commerce: "COMM",
  "Mechanical Engineering": "MECH", Psychology: "PSYC", History: "HIST",
};
const SLOTS: [string, string][] = [["08:30", "09:20"], ["10:00", "11:20"], ["11:30", "12:50"], ["13:00", "14:20"], ["14:30", "15:50"], ["16:00", "17:20"], ["13:00", "16:00"]];

export type GeneratedStudent = Omit<PersonaSeed, "key" | "persona"> & { hiddenInterests: string[]; weeklyCap: number };

export function generateStudents(n: number, seed = 20261010): GeneratedStudent[] {
  const r = prng(seed);
  const totalW = PROGRAM_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  const out: GeneratedStudent[] = [];
  for (let i = 0; i < n; i++) {
    let x = r.next() * totalW;
    const program = PROGRAM_WEIGHTS.find(([, w]) => (x -= w) < 0)?.[0] ?? "Biology";
    const faculty = Object.keys(FACULTIES).find((f) => FACULTIES[f].includes(program))!;
    const level = r.chance(0.12) ? "grad" : "undergrad";
    const year = level === "grad" ? 1 + Math.floor(r.next() * 2) : 1 + Math.floor(r.next() * 4);
    const campusName = r.chance(0.85) ? PROGRAM_CAMPUS[program] : r.pick(CAMPUSES).name;
    const campus = CAMPUSES.find((c) => c.name === campusName)!;
    const pool = [...new Set([...FACULTY_TAGS[faculty], ...FACULTY_TAGS[faculty], ...GENERAL_TAGS])];
    const interests = new Set<string>();
    const k = 2 + Math.floor(r.next() * 3);
    while (interests.size < k) interests.add(r.chance(0.6) ? r.pick(FACULTY_TAGS[faculty]) : r.pick(pool));
    // Ground truth for the simulation: mostly what they declared, maybe minus one, plus 1–2 they never said.
    const hidden = new Set(interests);
    if (hidden.size > 2 && r.chance(0.25)) hidden.delete([...hidden][0]);
    const extra = 1 + Math.floor(r.next() * 2);
    for (let e = 0; e < extra; e++) hidden.add(r.pick(GENERAL_TAGS));

    const blocks: ScheduleBlock[] = [];
    const target = 8 + Math.floor(r.next() * 7);
    const code = CODES[program];
    let guard = 0;
    while (blocks.length < target && guard++ < 200) {
      const day = 1 + Math.floor(r.next() * 5);
      const [start, end] = r.pick(SLOTS);
      if (blocks.some((bl) => bl.day === day && bl.start < end && start < bl.end)) continue;
      blocks.push({ day, start, end, label: `${code} ${level === "grad" ? 5 : year}${100 + Math.floor(r.next() * 9) * 100}`.slice(0, 9), campus: campus.name });
    }
    const equity = r.chance(0.1) ? [r.pick(["African Nova Scotian", "Indigenous / Mi'kmaq", "2SLGBTQIA+", "Students with disabilities", "First-generation", "Mature students", "Student parents"])] : [];
    const intl = r.chance(0.18);
    out.push({
      name: `${r.pick(FIRST)} ${r.pick(LAST)}`,
      level,
      faculty,
      program,
      year,
      status: r.chance(0.12) ? "part" : "full",
      residency: intl ? "international" : "domestic",
      campus: campus.name,
      gpa: year === 1 && level === "undergrad" && r.chance(0.5) ? null : Math.round(Math.min(4.3, Math.max(2, 3.1 + (r.next() + r.next() - 1) * 0.9)) * 100) / 100,
      coop: ["Commerce", "Mechanical Engineering", "Computer Science"].includes(program) ? r.chance(0.35) : r.chance(0.05),
      inResidence: year === 1 ? r.chance(0.6) : r.chance(0.08),
      lat: campus.lat + (r.next() - 0.5) * 0.06,
      lon: campus.lon + (r.next() - 0.5) * 0.08,
      locationLabel: `Near ${campus.name} campus`,
      interests: [...interests],
      hiddenInterests: [...hidden],
      equityGroups: equity,
      schedule: blocks,
      weeklyCap: r.chance(0.15) ? 3 : 5,
    });
  }
  return out;
}

// ---- baseline postings (published at seed) ---------------------------------------------

export interface BaselinePosting {
  input: OpportunityInput;
  /** Days before seeding that it was published. */
  publishedDaysAgo: number;
  /** Persona keys that marked it interested (story beats). */
  personaInterested?: string[];
}

const base = (p: Partial<OpportunityInput> & Pick<OpportunityInput, "title" | "type" | "description" | "department" | "tags">): OpportunityInput => ({
  mode: "in_person",
  sessions: [],
  required: {},
  preferred: {},
  language: "English",
  cost: 0,
  ...p,
});

export function baselinePostings(t: Date): BaselinePosting[] {
  const { sess, weekly, inDays, ago } = dateHelpers(t);
  return [
    { publishedDaysAgo: 10, input: base({ title: "Undergraduate Research Showcase: Chemistry & Biology", type: "event", department: "Faculty of Science", description: "Senior students present their summer research. Meet supervisors who are recruiting for next term's research projects.", campus: "Harbour", building: "Life Sciences Atrium", sessions: [sess(4, "17:30", "19:30")], tags: ["research", "academic", "career"], preferred: { faculties: ["Science"], years: [2, 3] }, food: true, rsvp: true }) },
    { publishedDaysAgo: 9, input: base({ title: "Bluenose Undergraduate Research Award", type: "bursary", department: "Office of Research", description: "A $6,000 award to spend 16 weeks next summer in a Bluenose research lab. Includes a mentoring stipend.", deadline: inDays(9), tags: ["research", "career", "academic"], required: { levels: ["undergrad"], minGpa: 3.3 }, preferred: { faculties: ["Science", "Engineering"] }, link: "https://example.org/bluenose/research-award" }) },
    { publishedDaysAgo: 9, input: base({ title: "Career Services: Grad School Info Session", type: "event", department: "Co-op & Career office", description: "How to choose a graduate program, ask for reference letters, and write a statement of intent.", campus: "Harbour", building: "Student Union Building, Room 224", sessions: [sess(2, "10:00", "11:00")], tags: ["career", "academic", "research"] }) },
    { publishedDaysAgo: 11, input: base({ title: "Chemistry Society: Lab Safety Refresher", type: "workshop", department: "Chemistry Society", description: "Hands-on refresher on fume hoods, spill kits and waste. Counts toward lab TA eligibility.", campus: "Harbour", building: "Chemistry Building 110", sessions: [sess(1, "13:00", "14:00")], tags: ["research", "academic"], required: { programs: ["Chemistry"] } }) },
    { publishedDaysAgo: 8, input: base({ title: "Graduate Writing Retreat", type: "workshop", department: "Faculty of Graduate Studies", description: "A quiet day of focused thesis writing with coffee, lunch and writing coaches on hand.", campus: "Harbour", building: "Killam Room 3", sessions: [sess(6, "09:30", "15:30")], tags: ["academic", "research"], required: { levels: ["grad"] }, food: true, rsvp: true, capacity: 40 }) },
    { publishedDaysAgo: 10, input: base({ title: "Student Parent Bursary", type: "bursary", department: "Student Services", description: "Up to $1,500 toward childcare costs this term for students who are parents or guardians. Short online form, no essay.", deadline: inDays(12), tags: ["finance", "wellness"], required: { equityGroups: ["Student parents"] }, contact: "studentservices@bluenose.example" }) },
    { publishedDaysAgo: 9, input: base({ title: "Student Parent Coffee & Connect", type: "wellness", department: "Student Services", description: "Meet other student parents between classes. Coffee, snacks, and a quiet corner for kids.", campus: "Northshore", building: "Wellness Centre", sessions: [sess(3, "12:15", "12:50")], tags: ["wellness", "social"], food: true }) },
    { publishedDaysAgo: 8, input: base({ title: "Hack the Harbour: Beginner Hackathon", type: "event", department: "Computer Science Society", description: "A 12-hour beginner-friendly hackathon. Teams formed on the day, mentors all day, meals included.", campus: "Harbour", building: "Computer Science Building", sessions: [sess(6, "09:00", "21:00")], tags: ["tech", "social", "food"], food: true, rsvp: true, capacity: 120, preferred: { years: [1, 2] } }) },
    { publishedDaysAgo: 9, input: base({ title: "International Students Welcome Dinner", type: "event", department: "International Centre", description: "A free dinner to meet other international students, staff from the International Centre, and student mentors.", campus: "Harbour", building: "Great Hall", sessions: [sess(5, "18:00", "20:00")], tags: ["social", "food", "culture"], required: { residency: ["international"] }, food: true, rsvp: true }) },
    { publishedDaysAgo: 10, input: base({ title: "Co-op Resume Clinic", type: "workshop", department: "Co-op & Career office", description: "Bring your resume and get it reviewed one-on-one before co-op applications open.", campus: "Northshore", building: "Business Building 201", sessions: [sess(1, "14:00", "15:00")], tags: ["career", "networking"], required: { coop: true }, preferred: { faculties: ["Business"] } }) },
    { publishedDaysAgo: 8, input: base({ title: "Finance Networking Night with Halifax Firms", type: "event", department: "Commerce Society", description: "Meet analysts and recruiters from local banks, credit unions and accounting firms. Business casual.", campus: "Northshore", building: "Business Building Atrium", sessions: [sess(4, "19:30", "21:00")], tags: ["finance", "networking", "career"], preferred: { faculties: ["Business"] }, food: true, rsvp: true }) },
    { publishedDaysAgo: 9, input: base({ title: "Varsity Rugby: Bluenose vs Valley Rams", type: "event", department: "Athletics", description: "Home game on the Northshore field. Free for students with ID.", campus: "Northshore", building: "Northshore Field", sessions: [sess(6, "14:00", "16:00")], tags: ["sports", "social"] }) },
    { publishedDaysAgo: 10, input: base({ title: "Engineering Leadership Panel", type: "event", department: "Faculty of Engineering", description: "Four alumni engineers talk about leading teams, getting a P.Eng., and their first five years after graduation.", campus: "Valley", building: "Engineering Hall 101", sessions: [sess(2, "12:00", "13:00")], tags: ["leadership", "career", "tech"], preferred: { faculties: ["Engineering"], years: [3, 4] }, food: true }) },
    { publishedDaysAgo: 9, input: base({ title: "Valley Trails Hike & Clean-up", type: "event", department: "Outdoors Club", description: "A 6 km hike on the Valley campus trails, picking up litter on the way. Gloves and bags provided.", campus: "Valley", building: "Valley campus trailhead", sessions: [sess(0, "10:00", "13:00")], tags: ["outdoors", "volunteering"] }) },
    { publishedDaysAgo: 8, input: base({ title: "Campus Food Bank Volunteer Shift", type: "event", department: "Student Union", description: "Help sort donations and pack grocery hampers for students.", campus: "Harbour", building: "Student Union Building, lower level", sessions: weekly(5, "15:30", "17:00", 3), tags: ["volunteering", "food"] }) },
    // Ended in the past week: attendance + analytics.
    { publishedDaysAgo: 12, personaInterested: ["amara"], input: base({ title: "Black Student Networking Mixer", type: "event", department: "Black Student Advising Centre", description: "An evening with Black alumni and employers from across Nova Scotia. Open to all students.", campus: "Harbour", building: "Student Union Building, Room 303", sessions: [ago(3, "17:30", "19:30")], tags: ["networking", "culture", "career"], food: true }) },
    { publishedDaysAgo: 13, input: base({ title: "Intro to Python Workshop", type: "workshop", department: "Computer Science Society", description: "Two hours, zero experience needed. Bring a laptop.", campus: "Harbour", building: "Computer Science Building 127", sessions: [ago(5, "18:00", "20:00")], tags: ["tech", "academic"] }) },
    { publishedDaysAgo: 12, input: base({ title: "Fall Wellness Fair", type: "wellness", department: "Student Health & Wellness", description: "Flu shots, counselling services, therapy dogs and free healthy snacks.", campus: "Northshore", building: "Gymnasium", sessions: [ago(2, "11:00", "14:00")], tags: ["wellness", "food"], food: true }) },
    { publishedDaysAgo: 13, input: base({ title: "Commerce Case Competition Info Night", type: "event", department: "Commerce Society", description: "Learn how the winter case competition works and find a team.", campus: "Northshore", building: "Business Building 105", sessions: [ago(4, "18:00", "19:00")], tags: ["finance", "leadership", "networking"] }) },
  ];
}

// ---- live-upload CSV postings ------------------------------------------------------------

export function demoCsvPostings(t: Date): OpportunityInput[] {
  const { sess, weekly, inDays } = dateHelpers(t);
  return [
    base({ title: "Black Student Success Bursary", type: "bursary", department: "Black Student Advising Centre", description: "Two $2,500 bursaries for African Nova Scotian and Black students. Apply with a short statement, \"what success looks like for you\".", deadline: inDays(14), tags: ["finance", "culture", "career"], required: { equityGroups: ["African Nova Scotian"] }, contact: "bsac@bluenose.example" }),
    base({ title: "Summer Research Assistant, Department of Chemistry", type: "deadline", department: "Department of Chemistry", description: "Paid 16-week research assistant positions in synthesis, materials and green chemistry labs.", deadline: inDays(8), tags: ["research", "career"], required: { programs: ["Chemistry"], years: [2, 3, 4] } }),
    base({ title: "Fall Career Fair 2026", type: "career_fair", department: "Co-op & Career office", description: "60+ employers from Atlantic Canada, from tech and finance to health and government. Bring printed resumes.", campus: "Harbour", building: "Great Hall", sessions: [sess(4, "10:00", "15:00")], tags: ["career", "networking"], rsvp: false, food: false, accessibility: "Step-free access, quiet room available" }),
    base({ title: "Organic Chemistry Peer Tutoring", type: "workshop", department: "Chemistry Society", description: "Drop-in tutoring for CHEM 3401 with upper-year students.", campus: "Harbour", building: "Chemistry Building 210", sessions: [sess(2, "10:00", "11:00")], tags: ["academic", "research"], required: { programs: ["Chemistry"] } }),
    base({ title: "Game Dev Club: Weekly Build Nights", type: "club", department: "Computer Science Society", description: "Build a small game over four weeks with a team. Pizza every week.", campus: "Harbour", building: "Computer Science Building 233", sessions: weekly(3, "16:00", "17:30", 4), tags: ["tech", "social", "food"], food: true }),
    base({ title: "Intro to Machine Learning Workshop", type: "workshop", department: "Computer Science Society", description: "Train your first model in Python. Laptops required.", campus: "Harbour", building: "Computer Science Building 127", sessions: [sess(2, "11:30", "12:30")], tags: ["tech", "academic"] }),
    base({ title: "International Students: Winter Driving & Tax Basics", type: "workshop", department: "International Centre", description: "What you need to know about your first Canadian winter, and how to file your first tax return.", campus: "Harbour", building: "International Centre", sessions: [sess(3, "18:00", "19:00")], tags: ["finance", "social"], required: { residency: ["international"] }, food: true }),
    base({ title: "Residence Movie Night", type: "event", department: "Residence Life", description: "Popcorn, blankets and a vote on the film.", campus: "Harbour", building: "Howe Hall common room", sessions: [sess(5, "20:00", "22:30")], tags: ["social", "food"], required: { inResidence: true }, food: true }),
    base({ title: "Online Workshop: Budgeting on a Student Income", type: "workshop", department: "Student Services", description: "Build a simple monthly budget, learn about bursaries and emergency funds. Online, camera optional.", mode: "online", sessions: [sess(4, "19:30", "20:30")], tags: ["finance", "wellness"] }),
    base({ title: "Mature Student Study Skills Evening", type: "workshop", department: "Student Services", description: "Time management and study strategies for students balancing school, work and family.", mode: "online", sessions: [sess(2, "20:00", "21:00")], tags: ["academic", "wellness"], required: { equityGroups: ["Mature students"] } }),
    base({ title: "Wellness Drop-in: Talk to a Counsellor", type: "wellness", department: "Student Health & Wellness", description: "No appointment needed. Twenty-minute conversations with a counsellor, in confidence.", campus: "Northshore", building: "Wellness Centre", sessions: [sess(2, "12:00", "13:30")], tags: ["wellness"], accessibility: "Private rooms, step-free access" }),
    base({ title: "Nursing Clinical Skills Refresher", type: "workshop", department: "School of Nursing", description: "Practice IV starts and assessments in the simulation lab before mid-term evaluations.", campus: "Northshore", building: "Simulation Lab", sessions: [sess(6, "09:00", "11:00")], tags: ["career", "wellness", "academic"], required: { programs: ["Nursing"] } }),
    base({ title: "Co-op Placement: Junior Financial Analyst (Winter)", type: "coop", department: "Co-op & Career office", description: "Four-month paid co-op with a Halifax credit union. Excel skills, curiosity, and clear writing.", deadline: inDays(10), tags: ["finance", "career"], required: { coop: true }, preferred: { faculties: ["Business"], years: [2, 3] }, link: "https://example.org/bluenose/coop/analyst" }),
    base({ title: "Accounting Firms Meet & Greet", type: "event", department: "Commerce Society", description: "Informal meet and greet with recruiters from four accounting firms.", campus: "Northshore", building: "Business Building Atrium", sessions: [sess(2, "19:30", "21:00")], tags: ["finance", "networking", "career"], preferred: { faculties: ["Business"] }, food: true }),
    base({ title: "Pitch Competition Info Session", type: "event", department: "Entrepreneurship Hub", description: "How the spring pitch competition works and what the judges look for.", campus: "Northshore", building: "Business Building 105", sessions: [sess(1, "10:00", "11:00")], tags: ["leadership", "finance", "networking"] }),
    base({ title: "Intramural Ball Hockey League", type: "club", department: "Athletics", description: "Weekly co-ed ball hockey. Sign up as a team or on your own.", campus: "Northshore", building: "Gymnasium", sessions: weekly(5, "18:00", "19:30", 4), tags: ["sports", "social"] }),
    base({ title: "Valley Campus Robotics Open Lab", type: "event", department: "Faculty of Engineering", description: "Open lab night for Valley campus students to try the robot arms and 3D printers.", campus: "Valley", building: "Engineering Hall makerspace", sessions: [sess(4, "18:00", "20:00")], tags: ["tech", "leadership"], required: { campuses: ["Valley"] } }),
    base({ title: "Capstone Showcase Prep", type: "workshop", department: "Faculty of Engineering", description: "Poster and pitch coaching for capstone teams.", campus: "Valley", building: "Engineering Hall 101", sessions: [sess(3, "13:00", "14:00")], tags: ["career", "leadership"], required: { faculties: ["Engineering"], years: [4] } }),
    base({ title: "Women in Engineering Leadership Breakfast", type: "event", department: "Faculty of Engineering", description: "Breakfast and a panel with women engineering leaders from across the province.", campus: "Valley", building: "Valley Dining Hall", sessions: [sess(4, "07:30", "08:45")], tags: ["leadership", "career", "networking"], required: { faculties: ["Engineering"] }, food: true }),
    base({ title: "Engineering Co-op Info Session", type: "event", department: "Co-op & Career office", description: "How engineering co-op terms work, and which employers are hiring this winter.", campus: "Valley", building: "Engineering Hall 202", sessions: [sess(1, "12:00", "12:50")], tags: ["career", "tech"], required: { faculties: ["Engineering"] } }),
    base({ title: "Hike Cape Split with the Outdoors Club", type: "event", department: "Outdoors Club", description: "A 13 km return hike to the Cape Split lookout. Bus leaves from the Valley campus.", campus: "Valley", building: "Valley campus bus loop", sessions: [sess(6, "08:30", "15:00")], tags: ["outdoors", "social"], cost: 10 }),
    base({ title: "Graduate Seminar: Marine Microbial Ecology", type: "event", department: "Department of Biology", description: "Visiting researcher talk on microbial communities in the Bay of Fundy.", campus: "Harbour", building: "Life Sciences 2022", sessions: [sess(2, "15:00", "16:00")], tags: ["research", "academic", "outdoors"], required: { levels: ["grad"] } }),
    base({ title: "Biology Field Course Scholarship", type: "bursary", department: "Department of Biology", description: "Covers fees for the spring coastal field course on Brier Island.", deadline: inDays(20), tags: ["research", "outdoors", "finance"], required: { programs: ["Biology"] } }),
    base({ title: "Climate Research Talk Series", type: "event", department: "Office of Research", description: "Short talks from Bluenose researchers working on coastal climate change.", campus: "Harbour", building: "Life Sciences Auditorium", sessions: [sess(5, "15:30", "16:30")], tags: ["research", "outdoors", "academic"] }),
    base({ title: "Python for Data Analysis (online, 2 evenings)", type: "workshop", department: "Library", description: "Pandas and plotting in two evenings. Online.", mode: "online", sessions: [sess(1, "19:00", "20:30"), sess(3, "19:00", "20:30")], tags: ["tech", "research"] }),
    base({ title: "Mi'kmaq Culture Night: Storytelling & Feast", type: "event", department: "Indigenous Student Centre", description: "Storytelling, drumming and a shared meal. Everyone welcome.", campus: "Harbour", building: "Indigenous Student Centre", sessions: [sess(4, "18:00", "20:00")], tags: ["culture", "food", "social"], food: true }),
    base({ title: "Entrepreneurship Speaker: Building in Atlantic Canada", type: "event", department: "Entrepreneurship Hub", description: "A founder talk about starting a company in the region, followed by Q&A.", campus: "Harbour", building: "Great Hall", sessions: [sess(3, "18:30", "19:30")], tags: ["leadership", "career", "networking"] }),
    base({ title: "Volunteer: Harbour Clean-up Day", type: "event", department: "Student Union", description: "Clean up the Halifax waterfront with other students. Gloves, bags and lunch provided.", campus: "Harbour", building: "Meet at the Student Union Building", sessions: [sess(0, "10:00", "13:00")], tags: ["volunteering", "outdoors"], food: true }),
    base({ title: "Peer Mentor Applications, Faculty of Science", type: "deadline", department: "Faculty of Science", description: "Mentor a group of first-year students next term. Paid, five hours a month.", deadline: inDays(11), tags: ["leadership", "volunteering"], required: { faculties: ["Science"], years: [2, 3, 4] } }),
    base({ title: "Cooking on a Budget", type: "wellness", department: "Student Health & Wellness", description: "Cook three cheap, healthy meals and take the leftovers home.", campus: "Northshore", building: "Community Kitchen", sessions: [sess(3, "17:30", "19:00")], tags: ["food", "wellness", "finance"], food: true, capacity: 24, rsvp: true }),
  ];
}
