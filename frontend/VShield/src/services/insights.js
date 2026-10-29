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
import { GLOSSARY } from './glossary.js';
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
  departments: (report.departments || []).map((d) => ({ name: d.name, recipients: d.recipients, clicked: d.clicked, reported: d.reported, clickRate: rate(d.clicked, d.recipients), reportRate: rate(d.reported, d.recipients) })),
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

  // thirty days at a time over the last six, the newest last; each from its
  // first day, as the period is, so the newest thirty days are the 30-day period
  const STEP = STEP_DAYS * DAY;
  const months = Array.from({ length: 6 }, (_, k) => {
    const to = end - (5 - k) * STEP;
    const s = summary(items.filter((x) => at(x) >= to - STEP && (k === 5 ? at(x) <= to : at(x) < to)).map((x) => x.report));
    return { to, ...s, inPeriod: to > from };
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
  // each department's clicks on each kind of lure, and each lure's departments
  const pairs = {};
  shown.forEach((x) => (x.report.departments || []).forEach((d) => {
    const type = x.campaign.type || 'Other';
    const row = (pairs[`${d.name}|${type}`] ||= { name: d.name, type, recipients: 0, clicked: 0, reported: 0 });
    row.recipients += d.recipients; row.clicked += d.clicked; row.reported += d.reported;
  }));
  const crossed = Object.values(pairs).map((x) => ({ ...x, hooked: rate(x.clicked, x.recipients), reportRate: rate(x.reported, x.recipients) }));
  const group = (key) => crossed.reduce((a, x) => { (a[x[key]] ||= []).push(x); return a; }, {});
  const byHook = (a, b) => (b.hooked ?? 0) - (a.hooked ?? 0) || a.name.localeCompare(b.name) || a.type.localeCompare(b.type);
  const deptLures = Object.fromEntries(Object.entries(group('name')).map(([k, v]) => [k, v.sort(byHook)]));
  const lureDepts = Object.fromEntries(Object.entries(group('type')).map(([k, v]) => [k, v.sort(byHook)]));

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
    deptLures,
    lureDepts,
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
 * Who moved between risk tiers from `start` to `end` (counts by tier), as
 * links { from, to, n }: everyone stays, moves one tier up or down, or
 * joined (new people start as moderate: they have not reported yet). The
 * moves are the fewest that turn `start` into `end`, plus as many more each
 * way as make `down` (people who moved to a lower tier) reach `churn`, until
 * the people and risk APIs record each move.
 */
export function movement(start, end, churn = 0) {
  const s = TIERS.map((t) => start[t] || 0);
  const e = TIERS.map((t) => end[t] || 0);
  const joined = Math.max(0, e.reduce((a, b) => a + b, 0) - s.reduce((a, b) => a + b, 0));
  const fit = [...e];
  fit[1] -= joined; // the joiners land in moderate
  // net moves from tier i to tier i + 1 (towards more risk), from the bottom up
  const net = [];
  let carry = 0;
  for (let i = 0; i < TIERS.length - 1; i += 1) { carry = s[i] + carry - fit[i]; net.push(carry); }
  const back = net.reduce((a, x) => a + Math.max(0, -x), 0);
  const extra = Math.max(0, churn - back);
  const room = net.map((_, i) => Math.min(s[i], s[i + 1]));
  const roomAll = room.reduce((a, b) => a + b, 0) || 1;
  const both = room.map((r) => Math.round((extra * r) / roomAll));
  const up = net.map((x, i) => Math.max(0, x) + both[i]); // i -> i + 1
  const down = net.map((x, i) => Math.max(0, -x) + both[i]); // i + 1 -> i
  const links = [];
  TIERS.forEach((t, i) => {
    const stay = s[i] - (up[i] || 0) - (i ? down[i - 1] : 0);
    links.push({ from: t, to: t, n: Math.max(0, stay) });
    if (i < TIERS.length - 1) {
      links.push({ from: t, to: TIERS[i + 1], n: up[i] });
      links.push({ from: TIERS[i + 1], to: t, n: down[i] });
    }
  });
  if (joined) links.push({ from: 'joined', to: 'moderate', n: joined });
  return { links: links.filter((l) => l.n > 0), joined, up: up.reduce((a, b) => a + b, 0), down: down.reduce((a, b) => a + b, 0) };
}

const cohortOf = (c) => c && ({
  trained: c.trained,
  untrained: c.untrained,
  trainedShare: rate(c.trained, c.trained + c.untrained),
  trainedRate: rate(c.trainedClicks, c.trained), // of those who finished their training, clicked in the step's simulations
  untrainedRate: rate(c.untrainedClicks, c.untrained),
  times: c.trained && c.trainedClicks ? (c.untrainedClicks / c.untrained) / (c.trainedClicks / c.trained) : null, // how many times as likely to click untrained
});

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
  const snap = (s) => s && ({ people: s.people, tiers: s.tiers, score: riskScore(s.tiers), highRisk: s.tiers.high + s.tiers.critical, drivers: s.drivers, cohorts: cohortOf(s.cohorts) });
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
      tiersBefore: was ? was.tiers : null,
      score: riskScore(d.tiers),
      scoreBefore: was ? riskScore(was.tiers) : null,
      cohorts: cohortOf(d.cohorts),
      trend: org.map((st) => riskScore(st.departments[d.index].tiers)),
      highRisk: d.tiers.high + d.tiers.critical,
      training: {
        assigned: tr('assigned'), completed, badges: tr('badges'), points: tr('points'),
        completion: rate(completed, tr('assigned')),
        quizScore: completed ? sum(shown, (s) => s.departments[d.index].training.quizScore * s.departments[d.index].training.completed) / completed : null,
      },
    };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const now = { ...snap(last), ...flows(shown) };
  // who moved between tiers over the period: its moves set who improved and who slipped
  const moved = startOf ? movement(startOf.tiers, last.tiers, now.improved) : null;
  if (moved) { now.improved = moved.down; now.slipped = moved.up; }
  return {
    basis: { days, steps: k, end: last.to },
    now,
    before: startOf ? { ...snap(startOf), ...flows(earlier) } : null,
    moved,
    departments,
    trend: org.map((s) => ({ to: s.to, tiers: s.tiers, people: s.people, score: riskScore(s.tiers), highRisk: s.tiers.high + s.tiers.critical, quizScore: s.training.quizScore, completion: rate(s.training.completed, s.training.assigned), repeatClickers: s.drivers?.repeatClickers ?? null, cohorts: cohortOf(s.cohorts), inPeriod: s.to > last.to - k * STEP_DAYS * DAY })),
    tiers: TIERS,
  };
}

// "Click" -> "Click campaigns" (an older "Business lure" -> "Business lures")
export const lureName = (type) => (/ lure$/i.test(type) ? `${type}s` : `${type} campaigns`);

// How each measure is shown, as on the measure tiles: its precision, how a
// value reads, and the unit its change takes ("pts" for the Risk Score, "pp"
// for a rate, "people" for a count, "×" for a ratio).
const SHOWN = {
  score: { digits: 1, scale: 1, value: (v) => v.toFixed(1), unit: ' pts' },
  people: { digits: 0, scale: 1, value: (v) => v.toLocaleString('en-US'), unit: ' people' },
  rate: { digits: 1, scale: 100, value: (v) => `${v.toFixed(1)}%`, unit: ' pp' },
  ratio: { digits: 1, scale: 1, value: (v) => `${v.toFixed(1)}×`, unit: '×' },
};
const roundTo = (v, digits) => Math.round(v * 10 ** digits) / 10 ** digits;

/**
 * One change: a measure's value before and after, each as the tiles show it,
 * and the difference of the two as shown, signed and with its unit. `tone`
 * is 'good' when it moved the way that is safer (`better`: 'up' or 'down'),
 * 'bad' the other way; null when either value is missing or the two read the
 * same.
 */
function changeOf({ id, title, where, before, after, kind, better, view, focus }) {
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  const s = SHOWN[kind];
  const b = roundTo(before * s.scale, s.digits); const a = roundTo(after * s.scale, s.digits);
  const by = roundTo(a - b, s.digits);
  if (by === 0) return null;
  const sign = by > 0 ? '+' : '−';
  const chip = `${sign}${s.value(Math.abs(by)).replace(/[%×]$/, '')}${s.unit}`;
  const shown = { before: s.value(b), after: s.value(a) };
  return { id, title, where, ...shown, chip, by, tone: (by < 0) === (better === 'down') ? 'good' : 'bad', sub: `${where} · ${shown.before} → ${shown.after}`, view, focus };
}

/**
 * What changed over the period: each row a measure, where it was measured,
 * its value before and after (`before`, `after`, at the precision the tiles
 * use) and the signed difference (`chip`), whether that is safer or riskier
 * (`tone`: 'good' or 'bad'), and what it opens (`view`: 'department',
 * 'risk', 'training' or the 'campaigns' tab; `focus`: which one). In a fixed
 * order: the departments whose Risk Score rose and fell the most, then the
 * company's People at high risk, Gave details away, Resilience Ratio and
 * Training Lift; a measure that reads the same before and after is left out.
 * `p` is peopleInsights() output; without it, only the campaigns' measures.
 * Snapshots (the Risk Score, people, training) are set against the start of
 * the period; the campaigns' measures against the period before. It lists
 * changes; it never ranks, judges or advises.
 */
export function standsOut(m, p = null) {
  const out = [];
  const moved = p ? p.departments.filter((d) => Number.isFinite(d.scoreBefore)).map((d) => ({ d, by: d.score - d.scoreBefore })) : [];
  const rose = [...moved].sort((a, b) => b.by - a.by || a.d.name.localeCompare(b.d.name))[0];
  if (rose && rose.by > 0) out.push(changeOf({ id: 'riskRose', title: `Largest ${GLOSSARY.riskScore.name} rise`, where: rose.d.name, before: rose.d.scoreBefore, after: rose.d.score, kind: 'score', better: 'down', view: 'department', focus: rose.d.name }));
  const fell = [...moved].sort((a, b) => a.by - b.by || a.d.name.localeCompare(b.d.name))[0];
  if (fell && fell.by < 0) out.push(changeOf({ id: 'riskFell', title: `Largest ${GLOSSARY.riskScore.name} fall`, where: fell.d.name, before: fell.d.scoreBefore, after: fell.d.score, kind: 'score', better: 'down', view: 'department', focus: fell.d.name }));
  if (p?.before) out.push(changeOf({ id: 'highRisk', title: GLOSSARY.highRisk.name, where: 'Company', before: p.before.highRisk, after: p.now.highRisk, kind: 'people', better: 'down', view: 'risk', focus: 'highRisk' }));
  const gave = (s) => (s?.delivered ? s.compromised / s.delivered : null);
  if (m.before) {
    out.push(changeOf({ id: 'gave', title: GLOSSARY.gaveDetails.name, where: 'Company', before: gave(m.before), after: gave(m.now), kind: 'rate', better: 'down', view: 'campaigns', focus: 'gave' }));
    out.push(changeOf({ id: 'perClick', title: GLOSSARY.perClick.name, where: 'Company', before: m.before.perClick, after: m.now.perClick, kind: 'ratio', better: 'up', view: 'campaigns', focus: 'perClick' }));
  }
  if (p?.before) out.push(changeOf({ id: 'lift', title: GLOSSARY.trainingImpact.name, where: 'Company', before: p.before.cohorts?.times, after: p.now.cohorts?.times, kind: 'ratio', better: 'up', view: 'training', focus: 'cohorts' }));
  return out.filter(Boolean);
}
