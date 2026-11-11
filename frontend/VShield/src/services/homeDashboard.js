/**
 * The Home screen's numbers, worked out from real campaigns and their results
 * (GET /campaigns and GET /campaigns/{id}/results). Pure functions: the hook
 * that fetches is in useHomeDashboard.js.
 *
 * Definitions, so the screen and the tests agree:
 *  - A campaign "ran" in a period when it was sent (SENDING or SENT), is not a
 *    test campaign, and its start time falls inside the period. Active = still
 *    inside its run window (phase Live); Closed = finished (phase Completed).
 *    So Active + Closed always equals Total.
 *  - Reached = the email actually went out (not PENDING or FAILED).
 *  - Opened = opened, clicked or reported. Hooked = clicked. Reported = reported.
 *  - Report / Hook / No interaction split the reached people into three groups
 *    that add up to 100%: a person who reported is Reported even if they also
 *    clicked; a person who clicked and did not report is Hooked; the rest
 *    (did not click and did not report, whether or not they opened it) are No
 *    interaction.
 *  - Rates with nobody to divide by are null (the screen shows a dash), never 0
 *    or 100.
 *
 * Periods follow the financial year, April to March. Its quarters are the
 * calendar quarters (Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar).
 */
import { derivePhase, parseDate, PHASE, STATUS } from './campaignStatus.js';

export const PERIODS = [
  'Current Quarter',
  'Previous Quarter',
  'Current Financial Year',
  'Previous Financial Year',
];

/** [start, end) of a period, in local time. Unknown label -> Current Quarter. */
export function periodRange(label, now = new Date()) {
  const year = now.getFullYear();
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
  // The financial year starts on 1 April; January to March belong to the one
  // that began the year before.
  const fyStartYear = now.getMonth() >= 3 ? year : year - 1;
  switch (label) {
    case 'Previous Quarter':
      return { start: new Date(year, quarterStartMonth - 3, 1), end: new Date(year, quarterStartMonth, 1) };
    case 'Current Financial Year':
      return { start: new Date(fyStartYear, 3, 1), end: new Date(fyStartYear + 1, 3, 1) };
    case 'Previous Financial Year':
      return { start: new Date(fyStartYear - 1, 3, 1), end: new Date(fyStartYear, 3, 1) };
    default:
      return { start: new Date(year, quarterStartMonth, 1), end: new Date(year, quarterStartMonth + 3, 1) };
  }
}

const isSent = (c) => c && (c.status === STATUS.SENDING || c.status === STATUS.SENT);

/** When a sent campaign counts as having started: its start time, else when it was made. */
export function startedAt(campaign) {
  return parseDate(campaign?.startTime) || parseDate(campaign?.createdAt);
}

/** The sent, non-test campaigns whose start falls in the period, newest first. */
export function campaignsInPeriod(campaigns, range) {
  return (Array.isArray(campaigns) ? campaigns : [])
    .filter((c) => isSent(c) && c.isTestCampaign !== true)
    .filter((c) => {
      const at = startedAt(c);
      return at && at >= range.start && at < range.end;
    })
    .sort((a, b) => startedAt(b) - startedAt(a));
}

const percent = (part, whole, digits = 0) =>
  whole > 0 ? Number(((part * 100) / whole).toFixed(digits)) : null;

/** One result row as the facts the formulas use. */
export function readRow(row) {
  const opened = Boolean(row.opened || row.clicked || row.reported);
  const reached = Boolean(
    row.sentAt || row.deliveredAt || row.sendStatus === 'SENT' || opened
  ) && row.sendStatus !== 'FAILED';
  return {
    reached,
    opened,
    clicked: Boolean(row.clicked),
    compromised: Boolean(row.compromised),
    reported: Boolean(row.reported),
    trained: Boolean(row.trained),
    country: row.country || 'Unknown',
  };
}

/** The counts for a set of result rows (each campaign's rows separately keyed). */
export function tally(rowSets) {
  const t = { targeted: 0, reached: 0, opened: 0, clicked: 0, compromised: 0, reported: 0, hooked: 0, trained: 0 };
  rowSets.forEach((rows) => {
    const seen = new Set();
    (rows || []).forEach((raw) => {
      const email = String(raw.recipientEmail || '').trim().toLowerCase();
      if (email) {
        if (seen.has(email)) return;
        seen.add(email);
      }
      const r = readRow(raw);
      t.targeted += 1;
      if (!r.reached) return;
      t.reached += 1;
      if (r.opened) t.opened += 1;
      if (r.clicked) t.clicked += 1;
      if (r.compromised) t.compromised += 1;
      if (r.reported) t.reported += 1;
      else if (r.clicked) t.hooked += 1;
      if (r.clicked && r.trained) t.trained += 1;
    });
  });
  return t;
}

/**
 * The Home screen's period numbers. `resultsById` maps a campaign id to its
 * result rows; a campaign whose rows have not arrived yet is left out of the
 * rates and listed in `waiting`.
 */
export function summarisePeriod(campaigns, resultsById) {
  const active = campaigns.filter((c) => derivePhase(c) === PHASE.LIVE).length;
  const closed = campaigns.filter((c) => derivePhase(c) === PHASE.COMPLETED).length;
  const loaded = campaigns.filter((c) => Array.isArray(resultsById[c.campaignId]));
  const t = tally(loaded.map((c) => resultsById[c.campaignId]));
  const hookedOrReported = t.hooked + t.reported;
  return {
    total: campaigns.length,
    active,
    closed,
    evaluated: loaded.length,
    waiting: campaigns.length - loaded.length,
    reached: t.reached,
    // Of everyone the campaigns were meant for, including failed sends.
    reachRate: percent(t.reached, t.targeted),
    openRate: percent(t.opened, t.reached),
    compromisedRate: percent(t.compromised, t.reached),
    trainedRate: percent(t.trained, t.clicked),
    reportRate: percent(t.reported, t.reached, 1),
    hookRate: percent(t.hooked, t.reached, 1),
    noInteractRate: percent(t.reached - hookedOrReported, t.reached, 1),
  };
}

/** The newest sent campaign in the list (of any period), or null. */
export function latestCampaign(campaigns) {
  const sent = (Array.isArray(campaigns) ? campaigns : []).filter(
    (c) => isSent(c) && c.isTestCampaign !== true
  );
  sent.sort((a, b) => (startedAt(b) || 0) - (startedAt(a) || 0));
  return sent[0] || null;
}

/** The latest campaign's card: counts, percentages and hook rate per country. */
export function summariseCampaign(campaign, rows) {
  if (!campaign) return null;
  const facts = Array.isArray(rows) ? rows.map((r) => ({ ...readRow(r), email: r.recipientEmail })) : null;
  const reachedRows = facts ? facts.filter((f) => f.reached) : [];
  const count = (key) => reachedRows.filter((f) => f[key]).length;
  const countries = {};
  reachedRows.forEach((f) => {
    const c = (countries[f.country] ||= { name: f.country, reached: 0, clicked: 0 });
    c.reached += 1;
    if (f.clicked) c.clicked += 1;
  });
  const sent = reachedRows.length;
  const opened = count('opened');
  const clicked = count('clicked');
  const reported = count('reported');
  return {
    id: campaign.campaignId,
    name: campaign.campaignTitle || campaign.campaignId,
    type: campaign.campaignType || '',
    startedAt: startedAt(campaign),
    endTime: parseDate(campaign.endTime),
    live: derivePhase(campaign) === PHASE.LIVE,
    loaded: facts !== null,
    sent,
    opened,
    openPercent: percent(opened, sent, 1),
    clicked,
    clickedPercent: percent(clicked, opened, 1),
    reported,
    reportedPercent: percent(reported, opened, 1),
    hookRate: percent(clicked, sent, 1),
    locations: Object.values(countries)
      .filter((c) => c.name !== 'Unknown')
      .map((c) => ({ name: c.name, hookRate: percent(c.clicked, c.reached, 1) }))
      .sort((a, b) => b.hookRate - a.hookRate || a.name.localeCompare(b.name))
      .slice(0, 4),
  };
}

/** "—" for a rate nobody can be measured on, else "12%" / "12.5%". */
export function showRate(value, digits = 0) {
  return value === null || value === undefined ? '—' : `${digits ? Number(value).toFixed(digits) : value}%`;
}

/** "21st April 2026, Monday". */
export function longDate(date) {
  if (!date) return '—';
  const day = date.getDate();
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][day % 10] || 'th';
  return `${day}${suffix} ${date.toLocaleString('en-GB', { month: 'long' })} ${date.getFullYear()}, ${date.toLocaleString('en-GB', { weekday: 'long' })}`;
}
