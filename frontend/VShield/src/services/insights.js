/**
 * Insights: how the phishing programme itself is doing. The Big Picture is
 * about people (who, where, which level); Insights is about the programme:
 * which lures fool people, how fast the organisation spots them, and whether
 * the learning sticks.
 *
 *   now       - the programme over the period: emails, Hook Rate, Report
 *               Rate, reports for every click, minutes to the first report
 *               and to half the reports, campaigns reported before anyone
 *               clicked, learning moments after a click, and its health
 *               (health() in bigPictureViews.js: reports against clicks);
 *   before    - the same for the period before it, for the changes (null
 *               when no campaign ran then);
 *   lures     - each kind of lure, the most convincing first;
 *   campaigns - each campaign in the period, newest first: its rates, its
 *               race (first click against first report), its learning;
 *   trend     - reports for every click, a fortnight at a time over the
 *               last 26 weeks, with which fortnights fall in the period.
 *
 * For the last `days` days (30, 60 or 90) of campaigns, by when they
 * started, up to the newest. Pure functions on campaign reports
 * (sampleReports.js shapes, which the reports API will return too), so
 * `node --test` can cover them.
 */
import { dateOf } from './bigPicture.js';
import { health } from './bigPictureViews.js';

const DAY = 86400000;
const FORTNIGHT = 14 * DAY;
const rate = (n, of) => (of > 0 ? n / of : null);

/** The middle value (the mean of the two middle ones for an even count), or null. */
export function median(xs) {
  const v = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const COUNTS = ['sent', 'delivered', 'opened', 'clicked', 'compromised', 'reported', 'trained'];
const add = (rows) => Object.fromEntries(COUNTS.map((k) => [k, rows.reduce((a, r) => a + (r[k] || 0), 0)]));

/** A set of campaign reports as one: its counts, rates, timings and health. */
export function summary(reports) {
  const s = add(reports);
  return {
    campaigns: reports.length,
    ...s,
    deliveryRate: rate(s.delivered, s.sent),
    hooked: rate(s.clicked, s.delivered), // the Hook Rate
    reportRate: rate(s.reported, s.delivered),
    perClick: rate(s.reported, s.clicked), // reports for every click
    gaveOfClicks: rate(s.compromised, s.clicked), // of those hooked, gave details away
    learned: rate(s.trained, s.clicked), // learning moments: of those who clicked, finished the training
    firstReport: median(reports.map((r) => r.timing.firstReport)),
    halfReported: median(reports.map((r) => r.timing.medianReport)),
    beatClick: reports.filter((r) => r.timing.firstReport < r.timing.firstClick).length,
    health: health({ reported: s.reported, clicked: s.clicked, emails: s.delivered }),
  };
}

const campaignRow = ({ campaign, report }) => ({
  id: campaign.id,
  name: campaign.name,
  type: campaign.type || 'Other',
  started: campaign.started,
  ...summary([report]),
  firstClick: report.timing.firstClick,
  firstReport: report.timing.firstReport,
  medianReport: report.timing.medianReport,
  beatClick: report.timing.firstReport < report.timing.firstClick,
});

/**
 * The programme over the last `days` days. `items` are { campaign, report }
 * pairs (campaignReport output), past campaigns included so the period
 * before and the trend have something to show; `now` the end of the period
 * (by default the newest campaign's start).
 */
export function insights(items, { days = 30, now = null, steps = 13 } = {}) {
  const at = (x) => dateOf(x.campaign.started);
  const end = now ?? Math.max(...items.map(at));
  const from = end - days * DAY;
  const newestFirst = (a, b) => at(b) - at(a) || a.campaign.name.localeCompare(b.campaign.name);
  const shown = items.filter((x) => at(x) >= from && at(x) <= end).sort(newestFirst);
  const earlier = items.filter((x) => at(x) >= from - days * DAY && at(x) < from);

  const byType = {};
  shown.forEach((x) => { (byType[x.campaign.type || 'Other'] ||= []).push(x.report); });
  const lures = Object.entries(byType)
    .map(([type, reports]) => ({ type, ...summary(reports) }))
    .sort((a, b) => (b.hooked ?? 0) - (a.hooked ?? 0) || a.type.localeCompare(b.type));

  // fortnight k covers (end - (steps - k) fortnights, end - (steps - k - 1) fortnights]
  const trend = Array.from({ length: steps }, (_, k) => {
    const to = end - (steps - k - 1) * FORTNIGHT;
    const inStep = items.filter((x) => at(x) > to - FORTNIGHT && at(x) <= to).map((x) => x.report);
    const s = add(inStep);
    return { to, campaigns: inStep.length, perClick: rate(s.reported, s.clicked), inPeriod: to > from };
  });

  return {
    basis: { days, end, from, campaigns: shown.length },
    now: summary(shown.map((x) => x.report)),
    before: earlier.length ? summary(earlier.map((x) => x.report)) : null,
    lures,
    campaigns: shown.map(campaignRow),
    trend,
  };
}

const pc = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);
// "Business lure" -> "Business lures"; "Credential theft" -> "Credential theft emails"
export const lureName = (type) => (/ lure$/i.test(type) ? `${type}s` : `${type} emails`);

/**
 * What stands out, as a short list: each a sentence, its number on a chip,
 * the lens it opens (`view`) and what to show there (`focus`): a lure or a
 * campaign. `tone` is 'bad', 'good' or 'watch' (the Big Picture's clay art).
 * It reports; it never says what to do.
 */
export function standsOut(m) {
  const out = [];
  const top = m.lures[0];
  if (top && m.lures.length > 1) out.push({ id: 'topLure', tone: 'bad', chip: `${pc(top.hooked)} clicked`, title: 'Fooled the most people', sub: `${lureName(top.type)} · the highest Hook Rate`, view: 'lures', focus: top.type });
  const gave = [...m.lures].filter((l) => l.gaveOfClicks !== null && l.compromised > 0).sort((a, b) => b.gaveOfClicks - a.gaveOfClicks)[0];
  if (gave) out.push({ id: 'gaveLure', tone: 'bad', chip: `${pc(gave.gaveOfClicks)} of clicks`, title: 'The most details given away', sub: `${lureName(gave.type)} · of those who clicked`, view: 'lures', focus: gave.type });
  const caught = [...m.lures].filter((l) => l.perClick !== null).sort((a, b) => b.perClick - a.perClick)[0];
  if (caught && m.lures.length > 1) out.push({ id: 'caughtLure', tone: 'good', chip: `${caught.perClick.toFixed(1)}× per click`, title: 'The most reported', sub: `${lureName(caught.type)} · reports for every click`, view: 'lures', focus: caught.type });
  const slow = [...m.campaigns].sort((a, b) => b.medianReport - a.medianReport)[0];
  if (slow) out.push({ id: 'slowest', tone: 'watch', chip: `${slow.medianReport} min`, title: 'The slowest to be reported', sub: `${slow.name} · until half the reports were in`, view: 'response', focus: slow.id });
  const fast = m.campaigns.filter((c) => c.beatClick).sort((a, b) => a.firstReport - b.firstReport)[0];
  if (fast) out.push({ id: 'fastest', tone: 'good', chip: `${fast.firstReport} min`, title: 'Reported before anyone clicked', sub: `${fast.name} · the first report`, view: 'response', focus: fast.id });
  return out;
}
