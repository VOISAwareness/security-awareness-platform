/**
 * TEST FIXTURE (never imported by the app): a seeded people table in GET
 * /insights' `people.rows` shape, built to agree with the sample
 * organisation: in every department, the number of people at each risk
 * level each month is exactly the organisation's.
 */
import { person } from './sampleCampaigns.js';

const TIER_LEVEL = { low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical' };
const MONTHS = 6; // the months each person's level is kept for

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
const INITIALS = 'ABCDEFGHJKLMNPRSTW';
const nameOf = (i) => {
  const who = person(i % 576);
  const [first, ...rest] = who.name.split(' ');
  return { name: `${first} ${INITIALS[Math.floor(i / 576) % INITIALS.length]}. ${rest.join(' ')}`, initials: who.initials };
};

// a phishing record that gives `level`: one entry per campaign received
function recordFor(level, sent, r) {
  const rec = sent.map((c) => ({ campaign: c.name, type: c.type, clicked: 0, reported: 0, gave: 0 }));
  const k = rec.length;
  const clickN = level === 'Critical' ? 1 + Math.floor(r() * Math.min(3, k))
    : level === 'High' ? 2 + Math.floor(r() * Math.max(1, Math.min(3, k - 1)))
      : level === 'Moderate' && r() < 0.55 ? 1 : 0;
  for (let i = 0; i < Math.min(clickN, k); i += 1) rec[i].clicked = 1;
  if (level === 'Critical') rec[0].gave = 1;
  const reportOdds = level === 'Low' ? 0.65 : level === 'Moderate' && clickN === 0 ? 0 : 0.3;
  rec.forEach((x) => { if (!x.clicked && r() < reportOdds) x.reported = 1; });
  if (level === 'Low' && !rec.some((x) => x.reported)) rec[k - 1].reported = 1;
  // shuffle, so the clicks are not always the first campaigns
  for (let i = k - 1; i > 0; i -= 1) { const j = Math.floor(r() * (i + 1)); [rec[i], rec[j]] = [rec[j], rec[i]]; }
  return rec;
}

/**
 * The people table. `org` is the sample organisation (sampleOrganisation.js,
 * oldest step first), `campaigns` [{ name, type }] the campaigns they may
 * have been sent, `programmes` the trainings they may be assigned.
 * Each row: { id, name, initials, department, joined, levels (one per
 * month, null before they joined, the newest last), level, records
 * [{ campaign, type, clicked, reported, gave }], emails, clicked, reported,
 * gave, step, programme, overdue, quizFails, drivers { …DRIVERS keys } }.
 * `months` are the steps the levels are for: [{ to }], the newest last.
 */
export function peopleTable({ org, campaigns = [], programmes = [] }) {
  const steps = org.slice(-MONTHS);
  const last = steps.at(-1);
  const rows = [];
  let id = 0;
  last.departments.forEach((dept, d) => {
    const r = seeded(7919 * (d + 1) + 13);
    const n = dept.people;
    const lean = Array.from({ length: n }, () => r());
    const levels = Array.from({ length: n }, () => Array(steps.length).fill(null));
    steps.forEach((s, k) => {
      const at = s.departments[d];
      const here = Math.min(n, at.people);
      // the riskiest by their lean (and a little drift month to month) take
      // the highest levels, as many as the organisation has at each
      const order = Array.from({ length: here }, (_, i) => i)
        .map((i) => [i, lean[i] + 0.22 * (seeded(i * 31 + k * 977 + d)() - 0.5)])
        .sort((a, b) => b[1] - a[1]);
      let p = 0;
      ['critical', 'high', 'moderate', 'low'].forEach((t) => {
        const count = t === 'low' ? here - p : Math.min(at.tiers[t] || 0, here - p);
        for (let c = 0; c < count; c += 1, p += 1) levels[order[p][0]][k] = TIER_LEVEL[t];
      });
    });
    const done = dept.training?.assigned ? dept.training.completed / dept.training.assigned : 0.8;
    for (let i = 0; i < n; i += 1) {
      const level = levels[i].at(-1);
      const pool = campaigns.length ? campaigns : [{ name: 'Phishing simulation', type: 'Other' }];
      const k = Math.min(pool.length, 3 + Math.floor(r() * 4));
      const start = Math.floor(r() * pool.length);
      const sent = Array.from({ length: k }, (_, j) => pool[(start + j * 7) % pool.length]);
      const records = recordFor(level, sent, r);
      const t = r();
      const step = t < done * 0.9 ? 'Passed' : t < done ? 'Completed' : t < done + 0.07 ? 'Started' : 'Not started';
      const overdue = (step === 'Not started' || step === 'Started') && r() < 0.55;
      const quizFails = step === 'Completed' ? (r() < 0.6 ? 2 : 1) : step === 'Passed' && r() < 0.1 ? 1 : 0;
      const sum = (key) => records.reduce((a, x) => a + x[key], 0);
      const who = nameOf(id);
      const row = {
        id,
        name: who.name,
        initials: who.initials,
        department: dept.name,
        joined: levels[i].findIndex((v) => v !== null),
        levels: levels[i],
        level,
        records,
        emails: records.length,
        clicked: sum('clicked'),
        reported: sum('reported'),
        gave: sum('gave'),
        step,
        programme: programmes.length ? programmes[id % programmes.length] : null,
        overdue,
        quizFails,
      };
      row.drivers = { neverReported: row.emails > 0 && row.reported === 0, repeatClicker: row.clicked >= 2, overdue, quizFailedTwice: quizFails >= 2 };
      rows.push(row);
      id += 1;
    }
  });
  return { rows, months: steps.map((s) => ({ to: s.to })) };
}

