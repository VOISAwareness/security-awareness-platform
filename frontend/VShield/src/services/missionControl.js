/**
 * Mission Control: how the phishing programme itself is doing. The Big
 * Picture is about people (who, where, which level); this is about the
 * programme: which lures fool people, how fast the organisation spots them,
 * and whether the learning sticks.
 *
 *   pulse    - the programme in four numbers: emails delivered, reports for
 *              every click, minutes to the first report, and how many who
 *              clicked finished the training that followed; with its health
 *              (health() in bigPictureViews.js: reports against clicks);
 *   lures    - each kind of lure: how often it hooked, how often a click
 *              became details given away, how often it was reported,
 *              reports for every click, and the learning moments after a
 *              click; the most convincing first;
 *   response - each campaign as a race: minutes to the first click, to the
 *              first report and to half the reports; did a report beat the
 *              first click (so the email could be pulled before harm)? With
 *              its own rates and health, for a lure's campaigns;
 *   learning - each campaign's learning moments: of those who clicked, how
 *              many finished the training that followed.
 *
 * For the last `days` days (30, 60 or 90) of campaigns, by when they
 * started, up to the newest. Pure functions on campaign reports
 * (sampleReports.js shapes, which the reports API will return too), so
 * `node --test` can cover them.
 */
import { dateOf } from './bigPicture.js';
import { health } from './bigPictureViews.js';

const DAY = 86400000;
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

/**
 * The programme over the last `days` days. `items` are { campaign, report }
 * pairs (campaignReport output); `now` the end of the window (by default
 * the newest campaign's start).
 */
export function missionControl(items, { days = 30, now = null } = {}) {
  const end = now ?? Math.max(...items.map((x) => dateOf(x.campaign.started)));
  const shown = items
    .filter((x) => end - dateOf(x.campaign.started) <= days * DAY && dateOf(x.campaign.started) <= end)
    .sort((a, b) => dateOf(b.campaign.started) - dateOf(a.campaign.started) || a.campaign.name.localeCompare(b.campaign.name));
  const reports = shown.map((x) => x.report);
  const totals = add(reports);

  const response = shown.map(({ campaign, report }) => ({
    id: campaign.id,
    name: campaign.name,
    type: campaign.type || 'Other',
    started: campaign.started,
    delivered: report.delivered,
    firstClick: report.timing.firstClick,
    firstReport: report.timing.firstReport,
    medianReport: report.timing.medianReport,
    beatClick: report.timing.firstReport < report.timing.firstClick,
    perClick: rate(report.reported, report.clicked),
    clicked: report.clicked,
    reported: report.reported,
    compromised: report.compromised,
    hooked: rate(report.clicked, report.delivered),
    gaveOfClicks: rate(report.compromised, report.clicked),
    reportRate: rate(report.reported, report.delivered),
    health: health({ reported: report.reported, clicked: report.clicked, emails: report.delivered }),
  }));

  const pulse = {
    campaigns: shown.length,
    sent: totals.sent,
    delivered: totals.delivered,
    deliveryRate: rate(totals.delivered, totals.sent),
    perClick: rate(totals.reported, totals.clicked), // reports for every click
    firstReport: median(response.map((c) => c.firstReport)),
    halfReported: median(response.map((c) => c.medianReport)),
    beatClick: response.filter((c) => c.beatClick).length,
    learned: rate(totals.trained, totals.clicked), // of those who clicked, finished the training
    health: health({ reported: totals.reported, clicked: totals.clicked, emails: totals.delivered }),
  };

  const byType = {};
  shown.forEach(({ campaign, report }) => {
    const t = campaign.type || 'Other';
    (byType[t] ||= { type: t, campaigns: 0, rows: [] }).campaigns += 1;
    byType[t].rows.push(report);
  });
  const lures = Object.values(byType).map(({ type, campaigns, rows }) => {
    const s = add(rows);
    return {
      type,
      campaigns,
      delivered: s.delivered,
      clicked: s.clicked,
      reported: s.reported,
      compromised: s.compromised,
      trained: s.trained,
      hooked: rate(s.clicked, s.delivered), // the Hook Rate
      gaveOfClicks: rate(s.compromised, s.clicked), // of those hooked, gave details away
      reportRate: rate(s.reported, s.delivered),
      perClick: rate(s.reported, s.clicked),
      learned: rate(s.trained, s.clicked), // learning moments after a click
      health: health({ reported: s.reported, clicked: s.clicked, emails: s.delivered }),
    };
  }).sort((a, b) => (b.hooked ?? 0) - (a.hooked ?? 0) || a.type.localeCompare(b.type));

  const learning = shown.map(({ campaign, report }) => ({
    id: campaign.id,
    name: campaign.name,
    type: campaign.type || 'Other',
    clicked: report.clicked,
    trained: report.trained,
    learned: rate(report.trained, report.clicked),
  }));

  return { basis: { days, end, campaigns: shown.length }, totals, pulse, lures, response, learning };
}

const pc = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);
// "Business lure" -> "business lures"; "Credential theft" -> "credential theft emails" (as the Big Picture says it)
const lureName = (type) => (/ lure$/i.test(type) ? `${type.toLowerCase()}s` : `${type.toLowerCase()} emails`).replace(/^(it|hr) /, (m) => m.toUpperCase());
const mins = (m) => `${Math.round(m)} min`;

/**
 * The overview: three chapters of at most three findings each, one number
 * and one line, as the Big Picture tells its story. `training` is the
 * training programme's own figures ({ completion, needsWork }), or null.
 * A finding is { id, value, unit, headline, sub, view, focus } (`view` the
 * lens it opens, `focus` the lure it is about). It reports; it never says
 * what to do.
 */
export function missionStory(m, training = null) {
  const lures = [];
  const top = m.lures[0];
  if (top) lures.push({ id: 'topLure', value: pc(top.hooked), headline: `of ${lureName(top.type)} were clicked`, sub: m.lures.length > 1 ? 'The highest Hook Rate of any lure' : `${top.campaigns} ${top.campaigns === 1 ? 'campaign' : 'campaigns'}`, view: 'lures', focus: top.type });
  const gave = [...m.lures].filter((l) => l.gaveOfClicks !== null).sort((a, b) => b.gaveOfClicks - a.gaveOfClicks)[0];
  if (gave && gave.compromised > 0) lures.push({ id: 'gaveLure', value: pc(gave.gaveOfClicks), headline: `of those hooked by ${lureName(gave.type)} gave details away`, sub: 'The most given away after a click', view: 'lures', focus: gave.type });
  const caught = [...m.lures].filter((l) => l.perClick !== null).sort((a, b) => b.perClick - a.perClick)[0];
  if (caught) lures.push({ id: 'caughtLure', value: `${caught.perClick.toFixed(1)}×`, headline: `reports for every click on ${lureName(caught.type)}`, sub: 'The most spotted lure', view: 'lures', focus: caught.type });

  const response = [];
  const p = m.pulse;
  if (p.firstReport !== null) response.push({ id: 'firstReport', value: mins(p.firstReport), headline: 'to the first report', sub: 'In the middle campaign', view: 'response' });
  if (p.campaigns) response.push({ id: 'beatClick', value: `${p.beatClick} of ${p.campaigns}`, headline: 'campaigns were reported before anyone clicked', sub: 'Early enough to pull the email', view: 'response' });
  if (p.halfReported !== null) response.push({ id: 'halfReported', value: mins(p.halfReported), headline: 'until half the reports were in', sub: 'The middle campaign', view: 'response' });

  const learning = [];
  if (p.learned !== null) learning.push({ id: 'learned', value: pc(p.learned), headline: 'of those who clicked finished the training', sub: 'The learning moment after a click', view: 'learning' });
  if (training) {
    learning.push({ id: 'completion', value: pc(training.completion), headline: 'of assigned training completed', sub: 'Across every programme', view: 'learning' });
    if (training.needsWork) learning.push({ id: 'needsWork', value: String(training.needsWork), headline: training.needsWork === 1 ? 'programme needs work' : 'programmes need work', sub: 'Low completion or pass rates', view: 'learning' });
  }

  return { lures, response, learning };
}
