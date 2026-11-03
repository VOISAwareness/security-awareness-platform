import { DEPTS, person } from './sampleCampaigns.js';
import { workbook } from './xlsx.js';

// The people behind a number on Insights, one row per person, until the
// people API answers GET /people?department=…&campaign=…&level=…&step=…
// with the same rows. Every bar, row and figure on the page opens this list
// with what was clicked as its filters (`peopleFor`); the list's own
// filters (department, campaign, risk level) narrow it further. A sample
// person is the same person every time: the rows are seeded by index.

export const LEVELS = ['Low', 'Moderate', 'High', 'Critical'];
export const STEPS = ['Not started', 'Started', 'Completed', 'Passed'];
const SAMPLE = 2400;

// a small seeded generator (mulberry32), so the sample never changes
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The sample people: `campaigns` names the campaigns they may have been
 * sent, `programmes` the trainings they may have been assigned.
 * Each row: { id, name, initials, department, campaigns, emails, clicked,
 * reported, gave, level, step, programme }.
 */
export function samplePeople({ campaigns = [], programmes = [], size = SAMPLE } = {}) {
  const r = seeded(20261103);
  return Array.from({ length: size }, (_, i) => {
    const who = person(i);
    const got = campaigns.length ? campaigns.filter(() => r() < 0.22).slice(0, 4) : [];
    const sent = got.length ? got : campaigns.slice(i % Math.max(1, campaigns.length), (i % Math.max(1, campaigns.length)) + 1);
    const emails = sent.length;
    const risky = r();
    const clicked = Math.min(emails, Math.floor(risky * risky * (emails + 1.6)));
    const reported = Math.min(emails - clicked, Math.floor(r() * (emails - clicked + 0.9)));
    const gave = Math.min(clicked, r() < 0.3 ? 1 : 0);
    const level = gave || clicked > 2 ? (clicked > 3 ? 'Critical' : 'High') : clicked > 0 ? 'Moderate' : 'Low';
    const t = r();
    const step = t < 0.12 ? 'Not started' : t < 0.2 ? 'Started' : t < 0.26 ? 'Completed' : 'Passed';
    return {
      id: i,
      name: who.name,
      initials: who.initials,
      department: who.dept,
      campaigns: sent,
      emails,
      clicked,
      reported,
      gave,
      level,
      step,
      programme: programmes.length ? programmes[i % programmes.length] : null,
    };
  });
}

// how a training step reads as "got at least this far"
const reached = (step, want) => STEPS.indexOf(step) >= STEPS.indexOf(want);

/**
 * The rows matching `filters`: { department, campaign, campaignType, level,
 * levels, step, programme, did } where `did` is 'clicked', 'reported',
 * 'gave' or 'twice' (clicked more than once), and `step` matches people who
 * got at least that far ('Not started' only those who did not start).
 * `types` maps a campaign's name to its type, for `campaignType`.
 * Most clicks first, then by name.
 */
export function peopleFor(rows, filters = {}, { types = {} } = {}) {
  const f = filters;
  return rows.filter((x) => (
    (!f.department || x.department === f.department)
    && (!f.campaign || x.campaigns.includes(f.campaign))
    && (!f.campaignType || x.campaigns.some((c) => types[c] === f.campaignType))
    && (!f.level || x.level === f.level)
    && (!f.levels || f.levels.includes(x.level))
    && (!f.programme || x.programme === f.programme)
    && (!f.step || (f.step === 'Not started' ? x.step === 'Not started' : reached(x.step, f.step)))
    && (!f.did || (f.did === 'twice' ? x.clicked > 1 : x[f.did] > 0))
  )).sort((a, b) => b.clicked - a.clicked || b.gave - a.gave || a.name.localeCompare(b.name));
}

/** How many of `rows` fall under each value of `key` ('department', 'level' or 'campaign'), most first. */
export function countsBy(rows, key) {
  const n = new Map();
  rows.forEach((x) => (key === 'campaign' ? x.campaigns : [x[key]]).forEach((v) => { if (v) n.set(v, (n.get(v) || 0) + 1); }));
  return [...n.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
}

/** Find by name or department, ignoring case. */
export const findPeople = (rows, q) => {
  const s = String(q || '').trim().toLowerCase();
  return s ? rows.filter((x) => x.name.toLowerCase().includes(s) || x.department.toLowerCase().includes(s)) : rows;
};

/** The list as an Excel workbook, one sheet. */
export function peopleBook(rows, { title }) {
  return workbook({
    title: `People · ${title}`,
    sheets: [{
      name: 'People',
      blocks: [
        { title: `People · ${title}` },
        { note: `${rows.length} ${rows.length === 1 ? 'person' : 'people'}` },
        { gap: true },
        {
          table: {
            columns: [
              { label: 'Person', value: (x) => x.name, width: 26 },
              { label: 'Department', value: (x) => x.department, width: 28 },
              { label: 'Emails', value: (x) => x.emails, width: 10 },
              { label: 'Clicked', value: (x) => x.clicked, width: 10 },
              { label: 'Reported', value: (x) => x.reported, width: 10 },
              { label: 'Gave details', value: (x) => x.gave, width: 13 },
              { label: 'Risk level', value: (x) => x.level, width: 12 },
            ],
            rows,
            filter: true,
          },
        },
      ],
    }],
  });
}

export const DEPARTMENTS = DEPTS;
