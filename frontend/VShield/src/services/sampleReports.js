/**
 * Sample reports for the leaderboard's Reports view, until the server has a
 * reports API (GET /reports/org and /reports/campaigns/{id}, built from the
 * recipients and events tables and the points ledger).
 *
 * Everything is worked out from a campaign's seed, so the same campaign shows
 * the same numbers every time. Pure functions, so `node --test` can cover them.
 */
import { LEVEL_BY_ID } from './levels.js';

const POINTS = { Reported: 80, Trained: 30, Clicked: -30, Compromised: -50 };

// Small seeded generator (mulberry32): the same seed, the same numbers.
function random(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pct = (n, of) => (of > 0 ? n / of : 0);
const median = (list) => {
  if (!list.length) return null;
  const s = [...list].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const toNum = (s) => Number(String(s).replace(/,/g, '')) || 0;
const pointsOf = (rules, event) => (Number.isFinite(rules?.[event]) ? rules[event] : POINTS[event]);

/**
 * One campaign's report: how its recipients responded, how fast, by
 * department, and what it did to points and levels.
 *
 * `depts` are the company's departments; `personAt(i)` names a sample person
 * (for the first people to report); `rules` are the live points per event.
 */
export function campaignReport(campaign, { depts = [], personAt = () => ({ name: '', dept: '' }), rules } = {}) {
  const r = random(campaign.seed * 9973 + 17);
  const sent = campaign.total;
  const delivered = sent - Math.round(sent * (0.003 + r() * 0.012));
  const opened = Math.round(delivered * (0.52 + r() * 0.2));
  const clicked = Math.round(delivered * (0.07 + r() * 0.11));
  const compromised = Math.round(clicked * (0.22 + r() * 0.2));
  const reported = Math.round(delivered * (0.18 + r() * 0.24));
  const trained = Math.round(clicked * (0.45 + r() * 0.4));

  const firstReport = 2 + Math.floor(r() * 8); // minutes after the send
  const medianReport = 22 + Math.floor(r() * 45);
  const firstClick = 1 + Math.floor(r() * 5);

  // Departments: eight of the company's, recipients split by weight, each
  // with its own lean towards reporting or clicking.
  const start = campaign.seed % Math.max(1, depts.length);
  const picked = depts.length ? Array.from({ length: Math.min(8, depts.length) }, (_, k) => depts[(start + k * 3) % depts.length]) : [];
  const unique = [...new Set(picked)];
  const weights = unique.map(() => 0.6 + r());
  const wsum = weights.reduce((a, b) => a + b, 0) || 1;
  let left = delivered;
  const departments = unique.map((name, k) => {
    const n = k === unique.length - 1 ? left : Math.round((delivered * weights[k]) / wsum);
    left -= n;
    const rep = Math.min(n, Math.round(n * pct(reported, delivered) * (0.55 + r() * 0.9)));
    const clk = Math.min(n - rep, Math.round(n * pct(clicked, delivered) * (0.55 + r() * 0.9)));
    const comp = Math.round(clk * pct(compromised, clicked || 1));
    const net = rep * pointsOf(rules, 'Reported') + clk * pointsOf(rules, 'Clicked') + comp * pointsOf(rules, 'Compromised');
    return { name, recipients: n, reported: rep, clicked: clk, compromised: comp, reportRate: pct(rep, n), clickRate: pct(clk, n), net };
  }).sort((a, b) => b.reportRate - a.reportRate || a.name.localeCompare(b.name));

  const earned = reported * pointsOf(rules, 'Reported') + trained * pointsOf(rules, 'Trained');
  const lost = clicked * Math.abs(pointsOf(rules, 'Clicked')) + compromised * Math.abs(pointsOf(rules, 'Compromised'));

  const firstReporters = [0, 1, 2].map((k) => {
    const p = personAt(campaign.seed * 31 + k * 7);
    return { name: p.name, dept: p.dept, minutes: firstReport + k * (1 + (campaign.seed % 3)) };
  });

  return {
    id: campaign.id,
    name: campaign.name,
    started: campaign.started,
    sent,
    delivered,
    opened,
    clicked,
    compromised,
    reported,
    trained,
    rates: {
      open: pct(opened, delivered),
      click: pct(clicked, delivered),
      compromise: pct(compromised, delivered),
      report: pct(reported, delivered),
      trainedAfterClick: pct(trained, clicked),
    },
    // reports for every click: above 1, more people report than fall for it
    resilience: clicked ? reported / clicked : null,
    timing: { firstReport, medianReport, firstClick },
    departments,
    points: { earned, lost, net: earned - lost },
    levels: {
      up: Math.round(reported * 0.22),
      down: Math.round(clicked * 0.18 + compromised * 0.3),
      belowZero: Math.round(compromised * 0.12),
    },
    firstReporters,
  };
}

// The level families, top first, for the distribution chart.
export const LEVEL_ORDER = Object.freeze(['L7', 'L6', 'L5', 'L4', 'L3', 'L2', 'L1', 'L0', 'LN1', 'LN2']);

/**
 * The organisation's report: rates across recent campaigns and their trend,
 * where people stand by level, and departments side by side.
 *
 * `campaigns` newest first; the last `recent` of them make the trend.
 * `board` is the global board ({ podium, rows, total }).
 */
export function orgReport(campaigns, board, { depts = [], personAt, rules, recent = 8 } = {}) {
  const reports = campaigns.slice(0, recent).map((c) => campaignReport(c, { depts, personAt, rules }));
  const sum = (key) => reports.reduce((a, x) => a + x[key], 0);
  const delivered = sum('delivered');
  const rates = {
    report: pct(sum('reported'), delivered),
    click: pct(sum('clicked'), delivered),
    compromise: pct(sum('compromised'), delivered),
  };
  // the newer half against the older half, in percentage points
  const half = Math.floor(reports.length / 2);
  const rateOf = (list, key) => pct(list.reduce((a, x) => a + x[key], 0), list.reduce((a, x) => a + x.delivered, 0));
  const newer = reports.slice(0, half);
  const older = reports.slice(half);
  const change = {
    report: rateOf(newer, 'reported') - rateOf(older, 'reported'),
    click: rateOf(newer, 'clicked') - rateOf(older, 'clicked'),
  };

  // Everyone on the board, by level family. A row whose level the viewer may
  // not see (below zero) still counts, as at risk.
  const people = [board?.podium?.first, board?.podium?.second, board?.podium?.third, ...(board?.rows || [])].filter(Boolean);
  const byFamily = Object.fromEntries(LEVEL_ORDER.map((f) => [f, 0]));
  let atRisk = 0;
  let scoreSum = 0;
  let scored = 0;
  const deptStats = {};
  people.forEach((p) => {
    const lvl = p.levelId ? LEVEL_BY_ID[p.levelId] : null;
    const below = p.hidden || (lvl ? lvl.level <= 0 : toNum(p.pts) < 0);
    const family = lvl ? lvl.family : below ? 'LN1' : null;
    if (family) byFamily[family] += 1;
    if (below) atRisk += 1;
    if (!p.hidden) { scoreSum += toNum(p.pts); scored += 1; }
    const d = deptStats[p.dept || 'Unassigned'] || (deptStats[p.dept || 'Unassigned'] = { people: 0, score: 0, scored: 0, atRisk: 0 });
    d.people += 1;
    if (!p.hidden) { d.score += toNum(p.pts); d.scored += 1; }
    if (below) d.atRisk += 1;
  });

  // a department's rates, from the campaigns it took part in
  const deptRates = {};
  reports.forEach((x) => x.departments.forEach((d) => {
    const t = deptRates[d.name] || (deptRates[d.name] = { n: 0, rep: 0, clk: 0 });
    t.n += d.recipients; t.rep += d.reported; t.clk += d.clicked;
  }));
  const departments = Object.entries(deptStats).map(([name, d]) => {
    const t = deptRates[name];
    return {
      name,
      people: d.people,
      avgScore: d.scored ? Math.round(d.score / d.scored) : 0,
      atRisk: d.atRisk,
      reportRate: t ? pct(t.rep, t.n) : null,
      clickRate: t ? pct(t.clk, t.n) : null,
    };
  }).sort((a, b) => b.avgScore - a.avgScore || a.name.localeCompare(b.name));

  return {
    campaigns: reports.length,
    people: board?.total ?? people.length,
    rates,
    change,
    avgScore: scored ? Math.round(scoreSum / scored) : 0,
    atRisk,
    // oldest first, for the trend chart
    trend: reports.slice().reverse().map((x) => ({
      id: x.id, name: x.name, started: x.started, report: x.rates.report, click: x.rates.click,
      firstReport: x.timing.firstReport, firstClick: x.timing.firstClick,
    })),
    // the typical minutes to the first report, and to the first click
    timing: { firstReport: median(reports.map((x) => x.timing.firstReport)), firstClick: median(reports.map((x) => x.timing.firstClick)) },
    resilience: sum('clicked') ? sum('reported') / sum('clicked') : null,
    levels: LEVEL_ORDER.map((family) => ({ family, count: byFamily[family] })),
    departments,
  };
}
