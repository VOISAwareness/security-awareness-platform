import { workbook } from './xlsx.js';

// The people behind every number on Insights: one table, one row per
// person (GET /insights' `people`, services/insightsData.js), that the
// charts count from and the people list filters.
//
// A person's risk level comes from their phishing record:
//   Low       reported, and never clicked
//   Moderate  clicked once, or never reported
//   High      clicked more than once
//   Critical  gave details away
// and the Risk Score is everyone's level averaged on 0 to 100:
//   (0 × Low + 33.3 × Moderate + 66.7 × High + 100 × Critical) ÷ people

export const LEVELS = ['Low', 'Moderate', 'High', 'Critical'];
export const STEPS = ['Not started', 'Started', 'Completed', 'Passed'];
// what puts people at risk, as flags on each person
export const DRIVERS = [
  { key: 'neverReported', label: 'Never reported', rule: 'Received phishing emails and reported none' },
  { key: 'repeatClicker', label: 'Clicked 2+ times', rule: 'Clicked two or more phishing emails' },
  { key: 'overdue', label: 'Training overdue', rule: 'Assigned training past its due date, not completed' },
  { key: 'quizFailedTwice', label: 'Failed quiz twice', rule: 'Failed the training quiz two times' },
];
// how a training step reads as "got at least this far"
const reached = (step, want) => STEPS.indexOf(step) >= STEPS.indexOf(want);
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

/**
 * The rows matching `f`, one person each, with their level and counts as
 * the filters see them:
 *   department, level, campaign   one value or a list ("any of")
 *   levels                        a list of levels
 *   campaignType                  campaigns of that type (`types` maps a
 *                                 campaign's name to its type)
 *   month                         the month (an index into `months`) the
 *                                 level is read at; people who had not
 *                                 joined then are left out
 *   did                           'clicked' | 'reported' | 'gave' | 'twice',
 *                                 counted over the chosen campaigns
 *   step, programme               training ('Not started' only those who did
 *                                 not start; any other, got at least that far)
 *   driver                        one of DRIVERS' keys
 *   trained                       'Assigned' | 'Voluntary' | 'None': how they
 *                                 came to the training they passed
 * Each row comes back with `level` at the month and emails, clicked,
 * reported and gave over the chosen campaigns. Most clicks first.
 */
export function peopleFor(rows, f = {}, { types = {} } = {}) {
  const depts = asList(f.department);
  const levels = [...asList(f.level), ...asList(f.levels)];
  const camps = asList(f.campaign);
  const out = [];
  for (const x of rows) {
    if (depts.length && !depts.includes(x.department)) continue;
    const level = f.month == null ? x.level : x.levels[f.month];
    if (level == null) continue;
    if (levels.length && !levels.includes(level)) continue;
    if (f.programme && x.programme !== f.programme) continue;
    if (f.step && !(f.step === 'Not started' ? x.step === 'Not started' : reached(x.step, f.step))) continue;
    if (f.driver && !x.drivers[f.driver]) continue;
    if (f.trained && x.trained !== f.trained) continue;
    const recs = x.records.filter((r) => (!camps.length || camps.includes(r.campaign)) && (!f.campaignType || (types[r.campaign] ?? r.type) === f.campaignType));
    if ((camps.length || f.campaignType) && !recs.length) continue;
    const sum = (key) => recs.reduce((a, r) => a + r[key], 0);
    const seen = { ...x, level, emails: recs.length, clicked: sum('clicked'), reported: sum('reported'), gave: sum('gave') };
    if (f.did && !(f.did === 'twice' ? seen.clicked > 1 : seen[f.did] > 0)) continue;
    out.push(seen);
  }
  return out.sort((a, b) => b.clicked - a.clicked || b.gave - a.gave || a.name.localeCompare(b.name));
}

/** How many of `rows` fall under each value of `key` ('department', 'level' or 'campaign'), most first. */
export function countsBy(rows, key) {
  const n = new Map();
  rows.forEach((x) => (key === 'campaign' ? x.records.map((r) => r.campaign) : [x[key]]).forEach((v) => { if (v) n.set(v, (n.get(v) || 0) + 1); }));
  return [...n.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
}

/** Find by name or department, ignoring case. */
export const findPeople = (rows, q) => {
  const s = String(q || '').trim().toLowerCase();
  return s ? rows.filter((x) => x.name.toLowerCase().includes(s) || x.department.toLowerCase().includes(s)) : rows;
};

/** How many people of `rows` are at each level, by month, in a department or all. */
export function levelsByMonth(rows, months, department = null) {
  return months.map((m, k) => {
    const c = { Low: 0, Moderate: 0, High: 0, Critical: 0 };
    rows.forEach((x) => { if ((!department || x.department === department) && x.levels[k]) c[x.levels[k]] += 1; });
    return { to: m.to, ...c, people: c.Low + c.Moderate + c.High + c.Critical, high: c.High + c.Critical };
  });
}

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
              { label: 'Compromised', value: (x) => x.gave, width: 13 },
              { label: 'Risk level', value: (x) => x.level, width: 12 },
              { label: 'Training', value: (x) => x.step, width: 14 },
            ],
            rows,
            filter: true,
          },
        },
      ],
    }],
  });
}
