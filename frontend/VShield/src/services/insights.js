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
 *               last 26 weeks, with which fortnights fall in the period;
 *   months    - opened, clicked and reported, thirty days at a time over
 *               the last six;
 *   motivators- what each campaign leaned on (urgency, authority...), and
 *               how often it hooked;
 *   departments - each department's clicks and reports in the period;
 *   arrival   - how fast the reports came in: the share of them in by each
 *               minute of the first two hours, now and the period before.
 *
 * peopleInsights() does the same for people (sampleOrganisation.js shapes,
 * which the people and risk APIs will return): risk tiers and the risk
 * score, who moved, what drives the risk, each department, and the
 * training, for the period and the one before.
 *
 * For the last `days` days (30, 60 or 90) of campaigns, by when they
 * started, up to the newest. Pure functions on campaign reports
 * (sampleReports.js shapes, which the reports API will return too), so
 * `node --test` can cover them.
 */
import { dateOf } from './bigPicture.js';
import { health } from './bigPictureViews.js';
import { STEP_DAYS, TIERS, riskScore } from './sampleOrganisation.js';

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

const COUNTS = ['sent', 'delivered', 'opened', 'clicked', 'compromised', 'reported', 'trained', 'complained'];
const add = (rows) => Object.fromEntries(COUNTS.map((k) => [k, rows.reduce((a, r) => a + (r[k] || 0), 0)]));

/** A set of campaign reports as one: its counts, rates, timings and health. */
export function summary(reports) {
  const s = add(reports);
  return {
    campaigns: reports.length,
    ...s,
    deliveryRate: rate(s.delivered, s.sent),
    openRate: rate(s.opened, s.delivered),
    complaintRate: rate(s.complained, s.delivered),
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
  motivator: campaign.motivator || null,
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

  // thirty days at a time over the last six, the newest last
  const STEP = STEP_DAYS * DAY;
  const months = Array.from({ length: 6 }, (_, k) => {
    const to = end - (5 - k) * STEP;
    const s = summary(items.filter((x) => at(x) > to - STEP && at(x) <= to).map((x) => x.report));
    return { to, campaigns: s.campaigns, openRate: s.openRate, hooked: s.hooked, reportRate: s.reportRate, inPeriod: to > from };
  });

  const byMotivator = {};
  shown.forEach((x) => { if (x.campaign.motivator) (byMotivator[x.campaign.motivator] ||= []).push(x.report); });
  const motivators = Object.entries(byMotivator)
    .map(([motivator, reports]) => ({ motivator, ...summary(reports) }))
    .sort((a, b) => (b.hooked ?? 0) - (a.hooked ?? 0) || a.motivator.localeCompare(b.motivator));

  const byDept = {};
  shown.forEach((x) => (x.report.departments || []).forEach((d) => {
    const row = (byDept[d.name] ||= { name: d.name, recipients: 0, clicked: 0, reported: 0, compromised: 0 });
    row.recipients += d.recipients; row.clicked += d.clicked; row.reported += d.reported; row.compromised += d.compromised;
  }));
  const departments = Object.values(byDept)
    .map((d) => ({ ...d, clickRate: rate(d.clicked, d.recipients), reportRate: rate(d.reported, d.recipients) }))
    .sort((a, b) => (b.clickRate ?? 0) - (a.clickRate ?? 0) || a.name.localeCompare(b.name));

  return {
    basis: { days, end, from, campaigns: shown.length },
    now: summary(shown.map((x) => x.report)),
    before: earlier.length ? summary(earlier.map((x) => x.report)) : null,
    lures,
    campaigns: shown.map(campaignRow),
    trend,
    months,
    motivators,
    departments,
    arrival: { now: arrival(shown.map((x) => x.report)), before: earlier.length ? arrival(earlier.map((x) => x.report)) : null },
  };
}

// The normal curve's cumulative share below z (Abramowitz and Stegun 7.1.26).
function phi(z) {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/**
 * How fast reports came in: the share of all the reports in by each minute
 * of the first `minutes`, the campaigns together (each counted by its
 * reports). Until the reports API gives each report's time, a campaign's
 * reports are taken to arrive on a log-normal curve from its first report,
 * with half in at its middle report time. Also the minute half were in, and
 * the share in by 15 and by 60 minutes.
 */
export function arrival(reports, { minutes = 120 } = {}) {
  const total = reports.reduce((a, r) => a + (r.reported || 0), 0);
  const curve = Array.from({ length: minutes + 1 }, (_, t) => {
    const share = total ? reports.reduce((a, r) => {
      const { firstReport: f, medianReport: m } = r.timing;
      const inBy = t < f ? 0 : phi((Math.log(t - f + 1) - Math.log(Math.max(1, m - f + 1))) / 0.85);
      return a + (r.reported || 0) * inBy;
    }, 0) / total : 0;
    return { t, share };
  });
  const by = (t) => curve[Math.min(t, minutes)].share;
  const half = curve.find((p) => p.share >= 0.5)?.t ?? null;
  return { curve, half, by15: by(15), by60: by(60), first: median(reports.map((r) => r.timing.firstReport)) };
}

/**
 * People over the last `days` days: `org` is organisation() output (thirty
 * days a step, oldest first). Tiers, the risk score, the high-risk count and
 * the drivers are as they stand at the end of the period (and at its start,
 * for `before`); who moved and the training are what happened during it
 * (and during the period before).
 */
export function peopleInsights(org, { days = 30 } = {}) {
  const k = Math.max(1, Math.round(days / STEP_DAYS));
  const last = org.at(-1);
  const startOf = org.length > k ? org[org.length - 1 - k] : null;
  const shown = org.slice(-k);
  const earlier = org.slice(Math.max(0, org.length - 2 * k), org.length - k);
  const sum = (steps, f) => steps.reduce((a, s) => a + f(s), 0);
  const snap = (s) => s && ({ people: s.people, tiers: s.tiers, score: riskScore(s.tiers), highRisk: s.tiers.high + s.tiers.critical, drivers: s.drivers });
  const flows = (steps) => {
    if (!steps.length) return null;
    const tr = (key) => sum(steps, (s) => s.training[key]);
    const completed = tr('completed');
    return {
      improved: sum(steps, (s) => s.improved),
      slipped: sum(steps, (s) => s.slipped),
      training: {
        assigned: tr('assigned'), started: tr('started'), completed, passed: tr('passed'), badges: tr('badges'), points: tr('points'),
        quizScore: completed ? sum(steps, (s) => s.training.quizScore * s.training.completed) / completed : null,
        completion: rate(completed, tr('assigned')),
        passRate: rate(tr('passed'), tr('assigned')),
      },
    };
  };
  const departments = last.departments.map((d) => {
    const was = startOf?.departments[d.index];
    const tr = (key) => sum(shown, (s) => s.departments[d.index].training[key]);
    const completed = tr('completed');
    return {
      name: d.name,
      people: d.people,
      tiers: d.tiers,
      score: riskScore(d.tiers),
      scoreBefore: was ? riskScore(was.tiers) : null,
      highRisk: d.tiers.high + d.tiers.critical,
      training: {
        assigned: tr('assigned'), completed, badges: tr('badges'), points: tr('points'),
        completion: rate(completed, tr('assigned')),
        quizScore: completed ? sum(shown, (s) => s.departments[d.index].training.quizScore * s.departments[d.index].training.completed) / completed : null,
      },
    };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return {
    basis: { days, steps: k, end: last.to },
    now: { ...snap(last), ...flows(shown) },
    before: startOf ? { ...snap(startOf), ...flows(earlier) } : null,
    departments,
    trend: org.map((s) => ({ to: s.to, score: riskScore(s.tiers), highRisk: s.tiers.high + s.tiers.critical, quizScore: s.training.quizScore, inPeriod: s.to > last.to - k * STEP_DAYS * DAY })),
    tiers: TIERS,
  };
}

const pc = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);
// "Business lure" -> "Business lures"; "Credential theft" -> "Credential theft emails"
export const lureName = (type) => (/ lure$/i.test(type) ? `${type}s` : `${type} emails`);

/**
 * What stands out, as a short list, the most telling first: each a
 * sentence, its number on a chip, the tab it opens (`view`) and what to show
 * there (`focus`): a department, a lure or a campaign. `p` is
 * peopleInsights() output, for the departments (left out without it). `tone` is 'bad', 'good' or 'watch' (the Big Picture's clay art).
 * It reports; it never says what to do.
 */
export function standsOut(m, p = null) {
  const out = [];
  const riskiest = p?.departments[0];
  if (riskiest) out.push({ id: 'riskiestDept', tone: 'bad', chip: `${Math.round(riskiest.score)} / 100`, title: 'The highest risk score', sub: `${riskiest.name} · ${riskiest.highRisk.toLocaleString('en-US')} people at high risk`, view: 'people', focus: riskiest.name });
  const top = m.lures[0];
  if (top && m.lures.length > 1) out.push({ id: 'topLure', tone: 'bad', chip: `${pc(top.hooked)} clicked`, title: 'Fooled the most people', sub: `${lureName(top.type)} · the highest Hook Rate`, view: 'lures', focus: top.type });
  const better = p ? [...p.departments].filter((d) => d.scoreBefore !== null).sort((a, b) => (a.score - a.scoreBefore) - (b.score - b.scoreBefore))[0] : null;
  if (better && better.score < better.scoreBefore) out.push({ id: 'improvedDept', tone: 'good', chip: `−${(better.scoreBefore - better.score).toFixed(1)} pts`, title: 'The most improved', sub: `${better.name} · risk score down to ${Math.round(better.score)}`, view: 'people', focus: better.name });
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
