/**
 * The people behind a campaign type's figures in one department: everyone
 * its campaigns reached there, each in one group by what they did with the
 * email, the worst of it counting (gave details away, then clicked, then
 * reported, else did nothing). Insights' people dialog lists them and
 * exports them; the groups add up to the emails delivered, as "What people
 * did" does (didParts in Pages/Insights/insightsUi.js).
 *
 * Until the reports API returns people (docs/insights-data.md, section 6),
 * sampleBehind() makes them up from each campaign's department figures: the
 * same counts, its first click and first report at the minutes the figures
 * give, half its reports in by their median, and its training after a click.
 * Names are the sample's (sampleCampaigns.js); seeded, so a campaign shows
 * the same people every time. Nothing here keeps what anyone typed (AGENTS.md
 * rule 5): only that they gave details away.
 *
 * Pure, so `node --test` can cover it.
 */
import { dateOf } from './bigPicture.js';
import { workbook } from './xlsx.js';

/** The groups, in the dialog's order. */
export const GROUPS = Object.freeze(['clicked', 'gave', 'reported', 'nothing']);
const NAMES = 576; // distinct names person() gives before it repeats
const MIDDLE = 'ABCDEFGHJKLMNPRSTW';
const SEND_HOUR = 9; // samples go out at 09:00 UTC
const MINUTE = 60000;
const LATEST = 3 * 24 * 60; // nobody acts more than three days after the send

// FNV-1a of the text into a mulberry32 generator: the same text, the same draws.
function seeded(text) {
  let h = 2166136261;
  for (const ch of String(text)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(n, rand) {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// The k-th of n, spread from `first` so the middle one lands on `half`
// minutes, the rest trailing off as replies to an email do.
function spread(k, n, first, half) {
  if (!Number.isFinite(first)) return null;
  const mid = Number.isFinite(half) && half > first ? half : first + 30;
  const q = n > 1 ? k / n : 0;
  return Math.min(LATEST, Math.round(first + ((mid - first) * -Math.log(1 - q)) / Math.LN2));
}

// A department's sample people, past the 576 distinct names with a middle initial.
function nameAt(i, personAt) {
  const p = personAt(i % NAMES);
  if (i < NAMES) return { name: p.name, initials: p.initials };
  const [first, ...rest] = p.name.split(' ');
  return { name: `${first} ${MIDDLE[Math.floor(i / NAMES - 1) % MIDDLE.length]}. ${rest.join(' ')}`, initials: p.initials };
}

/**
 * Everyone `campaigns` reached in `department`, made up from the
 * department's part of each campaign (Insights' scoped campaign rows:
 * { id, name, started, delivered, opened, clicked, compromised, reported,
 * trained, firstClick, firstReport, medianReport }). `personAt(i)` names a
 * sample person; `extraClicks(name)` the clicks they made on other campaign
 * types in the period (none by default).
 *
 * Each person: { key, name, initials, department, did, campaign: { id, name,
 * started }, sentAt, at (when they did it; the send for 'nothing'), minutes
 * (after the send; null for 'nothing'), training ('completed' | 'started' |
 * 'not yet', after a click; else null), opened (for 'nothing'), clicks (in
 * the period, every campaign type) }.
 */
export function sampleBehind(campaigns, { department, personAt, extraClicks = () => 0 }) {
  const pool = Math.max(NAMES, ...campaigns.map((c) => c.delivered || 0));
  const people = campaigns.flatMap((c) => {
    const rand = seeded(`${c.id}|${department}|people`);
    const n = Math.max(0, c.delivered || 0);
    const gave = Math.min(n, c.compromised || 0);
    const clicked = Math.min(n, Math.max(gave, c.clicked || 0));
    const reported = Math.min(n - clicked, c.reported || 0);
    const opened = Math.min(n - clicked - reported, Math.max(0, (c.opened || 0) - clicked - reported));
    const trained = Math.min(clicked, c.trained || 0);
    const sentAt = dateOf(c.started) + SEND_HOUR * 60 * MINUTE;
    const names = shuffled(pool, seeded(`${department}|${c.id}`)).slice(0, n);
    // who did what: the first `clicked` names clicked (the first `gave` of
    // them gave details away), the next `reported` reported
    const clickOrder = shuffled(clicked, rand); // the order the clicks came in
    const trainedSet = new Set(shuffled(clicked, rand).slice(0, trained));
    const reportOrder = shuffled(reported, rand);
    return names.map((idx, k) => {
      const who = nameAt(idx, personAt);
      const base = { key: `${c.id}|${idx}`, ...who, department, campaign: { id: c.id, name: c.name, started: c.started }, sentAt, opened: null, training: null };
      if (k < clicked) {
        const minutes = spread(clickOrder[k], clicked, c.firstClick, (c.firstClick ?? 0) + 45);
        const training = trainedSet.has(k) ? 'completed' : rand() < 0.35 ? 'started' : 'not yet';
        return { ...base, did: k < gave ? 'gave' : 'clicked', minutes, at: sentAt + (minutes ?? 0) * MINUTE, training };
      }
      if (k < clicked + reported) {
        const minutes = spread(reportOrder[k - clicked], reported, c.firstReport, c.medianReport ?? c.halfReported);
        return { ...base, did: 'reported', minutes, at: sentAt + (minutes ?? 0) * MINUTE };
      }
      return { ...base, did: 'nothing', minutes: null, at: sentAt, opened: k < clicked + reported + opened };
    });
  });
  // everyone's clicks over the period: these campaigns' and any other type's
  const clicks = {};
  people.forEach((x) => { if (x.did === 'clicked' || x.did === 'gave') clicks[x.name] = (clicks[x.name] || 0) + 1; });
  return people.map((x) => ({ ...x, clicks: (clicks[x.name] || 0) + extraClicks(x.name) }));
}

/** A sample's clicks on other campaign types: none for most, one or two for some. */
export function sampleExtraClicks(department, hookRate = 0.1) {
  return (name) => {
    const r = seeded(`${department}|${name}|elsewhere`)();
    return r < hookRate * 0.25 ? 2 : r < hookRate ? 1 : 0;
  };
}

/** People by group, the newest first in each: { clicked, gave, reported, nothing }. */
export function groupsOf(people) {
  const out = Object.fromEntries(GROUPS.map((g) => [g, []]));
  people.forEach((x) => out[x.did]?.push(x));
  GROUPS.forEach((g) => out[g].sort((a, b) => b.at - a.at || a.name.localeCompare(b.name)));
  return out;
}

/** The people whose name or campaign holds `q` (any case). */
export function findIn(people, q) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return people;
  return people.filter((x) => x.name.toLowerCase().includes(s) || x.campaign.name.toLowerCase().includes(s));
}

/** What each group is called, and what its people did with a `type` email. */
export function groupText(group, type) {
  return {
    clicked: { name: 'Clicked', what: `Clicked the link in a ${type} email, and gave no details away.` },
    gave: { name: 'Gave details away', what: `Clicked the link in a ${type} email and entered details on the practice page.` },
    reported: { name: 'Reported', what: `Reported a ${type} email without clicking it.` },
    nothing: { name: 'Did nothing', what: `Got a ${type} email and neither clicked nor reported it.` },
  }[group];
}

export const TRAINING_WORD = Object.freeze({ completed: 'Completed', started: 'Started', 'not yet': 'Not yet' });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (n) => String(n).padStart(2, '0');
/** "8 Sep, 09:31" (UTC, as the samples are; the same in every browser). */
export function when(t) {
  const d = new Date(t);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`;
}

/** "12 min", "2 h 5 min", "1 d 3 h". */
export function after(minutes) {
  if (!Number.isFinite(minutes)) return '—';
  const m = Math.round(minutes);
  if (m < 60) return `${m} min`;
  if (m < 24 * 60) return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
  const h = Math.floor(m / 60);
  return `${Math.floor(h / 24)} d${h % 24 ? ` ${h % 24} h` : ''}`;
}

const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const COMMON = [
  { label: 'Name', value: (x) => x.name, width: 24 },
  { label: 'Department', value: (x) => x.department, width: 24 },
  { label: 'Campaign', value: (x) => x.campaign.name, width: 34 },
  { label: 'Campaign started', value: (x) => x.campaign.started, width: 14 },
];
const LAST = {
  clicked: [{ label: 'Clicked at (UTC)', value: (x) => when(x.at), width: 16 }, { label: 'Clicks in the period, every type', value: (x) => x.clicks, kind: 'int', width: 14 }, { label: 'Training after', value: (x) => TRAINING_WORD[x.training] || '', width: 14 }],
  gave: [{ label: 'Clicked at (UTC)', value: (x) => when(x.at), width: 16 }, { label: 'Clicks in the period, every type', value: (x) => x.clicks, kind: 'int', width: 14 }, { label: 'Training after', value: (x) => TRAINING_WORD[x.training] || '', width: 14 }],
  reported: [{ label: 'Reported at (UTC)', value: (x) => when(x.at), width: 16 }, { label: 'Minutes to report', value: (x) => x.minutes, kind: 'int', width: 12 }, { label: 'Clicks in the period, every type', value: (x) => x.clicks, kind: 'int', width: 14 }],
  nothing: [{ label: 'Sent at (UTC)', value: (x) => when(x.at), width: 16 }, { label: 'Opened it', value: (x) => (x.opened ? 'Yes' : 'No'), width: 10 }, { label: 'Clicks in the period, every type', value: (x) => x.clicks, kind: 'int', width: 14 }],
};

/**
 * The workbook Export downloads: one sheet per group, each with a title, a
 * line on what it shows, and its people, the newest first.
 */
export function peopleBehindBook(groups, { type, department, days }) {
  const title = `${type} · ${department}`;
  return workbook({
    title: `People · ${title}`,
    sheets: GROUPS.map((g) => {
      const t = groupText(g, type);
      const list = groups[g] || [];
      return {
        name: t.name,
        blocks: [
          { title: `${t.name} · ${title}` },
          { note: `${t.what} ${list.length} ${list.length === 1 ? 'person' : 'people'}, the last ${days} days · generated ${today()}` },
          { gap: true },
          { table: { columns: [...COMMON, ...LAST[g]], rows: list, filter: true } },
        ],
      };
    }),
  });
}
