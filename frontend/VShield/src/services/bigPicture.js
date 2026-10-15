/**
 * The Big Picture: what the leaderboard shows about the programme, for
 * leaders and admins. It reports what happened and what could happen next;
 * it never recommends. Planning is left to the people reading it.
 *
 *   moved     - who climbed a level, who slipped, who fell below zero;
 *   groups    - the same by the level people started at, with how often
 *               they clicked and reported;
 *   lures     - how often each lure got a click, at each level;
 *   teams     - the points each department gained or lost;
 *   messages  - which message style got the most clicks from each team
 *               (for one campaign: how each team took its message);
 *   edge      - who is one step from a change: one report from a new level,
 *               one click from dropping a level or going below zero;
 *   outlook   - where the board is heading if the pace holds;
 *   people    - everyone, one by one, bottom of the board first: points,
 *               change, level then and now, what they did, and which of the
 *               above they are part of (PEOPLE_FILTERS picks them out);
 *   departments - the same, department by department.
 *
 * For the organisation it reads the campaigns of the last `days` days over
 * everyone on the board; for one campaign, its recipients. Sample behaviour
 * for now, worked out from each campaign's results (sampleReports.js) so the
 * same inputs give the same picture; the reports API will feed the same
 * shapes. Pure functions, so `node --test` can cover them.
 */
import { LEVELS, levelFor, progressFor } from './levels.js';
import { lean } from './sampleReports.js';

// The Dashboard's message styles (motivators), so both screens use the same words.
export const MOTIVATORS = Object.freeze(['Urgency', 'Authority', 'Reward', 'Curiosity', 'Fear']);

// Level groups, top first: `from` is the lowest level number in the group.
export const GROUPS = Object.freeze([
  Object.freeze({ id: 'top', label: 'Security Defender, Cyber Guardian', short: 'L6–7', from: 6 }),
  Object.freeze({ id: 'strong', label: 'Phish Catcher, Security Champion', short: 'L4–5', from: 4 }),
  Object.freeze({ id: 'learning', label: 'Aware User, Safe Handler', short: 'L2–3', from: 2 }),
  Object.freeze({ id: 'low', label: 'New Joiner or below zero', short: 'L1 & below', from: -Infinity }),
]);
const groupOf = (level) => GROUPS.find((g) => level >= g.from).id;

// Sample behaviour by level: lower levels click more and report less.
const CLICK_BY_GROUP = { top: 0.3, strong: 0.6, learning: 1.15, low: 1.7 };
const REPORT_BY_GROUP = { top: 1.6, strong: 1.35, learning: 0.95, low: 0.55 };
const POINTS = { Reported: 80, Clicked: -30, Compromised: -50 };
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const DAY = 86400000;

const pct = (n, of) => (of > 0 ? n / of : null);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function hash01(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

/** "6 Oct" as a UTC time in `year`. */
export function dateOf(started, year = 2026) {
  const [d, m] = String(started).split(' ');
  return Date.UTC(year, MONTHS[m] ?? 0, Number(d) || 1);
}

/** The message style a sample campaign used (the API will record it). */
export const styleOf = (campaign) => MOTIVATORS[Math.floor(hash01(`style|${campaign.id}`) * MOTIVATORS.length)];

const levelOf = (points) => levelFor(points)?.level ?? 1;
// The lowest points of a level number (its Grade 1), or null below zero.
const levelFloor = (level) => LEVELS.find((l) => l.level === level && l.grade === 1)?.min ?? null;
// Points to the next level number, or null at the top.
function toNextLevel(points) {
  const pr = progressFor(points);
  if (!pr || pr.isTop) return null;
  const up = LEVELS.find((l) => l.rank > pr.level.rank && l.level > pr.level.level);
  return up ? up.min - pr.points : null;
}

/**
 * The picture. `items` are { campaign, report } pairs (campaignReport output);
 * `people` are { key, name, email, dept, points } with today's points; `focus` a campaign
 * id for one campaign (its recipients are `people` then); `rules` the live
 * points per event; `now` the end of the window (by default the newest
 * campaign's start).
 */
export function bigPicture(items, people, { focus = null, days = 30, rules = {}, now = null } = {}) {
  const pts = Object.fromEntries(Object.entries(POINTS).map(([k, v]) => [k, Number.isFinite(rules[k]) ? rules[k] : v]));
  const followed = focus ? items.find((x) => x.campaign.id === focus) || null : null;
  const end = now ?? Math.max(...items.map((x) => dateOf(x.campaign.started)));
  const window = followed ? [followed] : items.filter((x) => end - dateOf(x.campaign.started) <= days * DAY);
  const takesPart = (p, c) => Boolean(followed) || hash01(`${p.key}|${c.id}|in`) < 0.55;

  // Each person in each campaign: how likely they were to click or report
  // (by the level they were at), what they did, and what it did to their
  // points. Their starting level comes from the change, so it's worked out
  // twice: first from today's level, then from the level that gives.
  const play = (levelAt) => {
    const seen = people.map(() => ({ delta: 0, took: 0, reported: 0, clicked: 0, gave: 0, events: [] }));
    let earned = 0;
    let lost = 0;
    window.forEach(({ campaign: c, report }) => {
      const style = styleOf(c);
      const gave = report.clicked ? report.compromised / report.clicked : 0;
      people.forEach((p, i) => {
        if (!takesPart(p, c)) return;
        const g = groupOf(levelAt(i));
        const click = clamp(report.rates.click * CLICK_BY_GROUP[g] * lean(p.dept, 0.9) * lean(`${p.dept}|${c.type}`, 0.7) * lean(`${p.dept}|${style}`, 0.8), 0, 0.85);
        const rep = clamp(report.rates.report * REPORT_BY_GROUP[g] * (2 - lean(p.dept, 0.9)), 0, 0.95 - click);
        const u = hash01(`${p.key}|${c.id}|e`);
        let d = 0;
        if (u < rep) {
          d = pts.Reported;
          seen[i].reported += 1;
        } else if (u < rep + click) {
          const gaveAway = hash01(`${p.key}|${c.id}|x`) < gave;
          d = pts.Clicked + (gaveAway ? pts.Compromised : 0);
          seen[i].clicked += 1;
          if (gaveAway) seen[i].gave += 1;
        }
        if (d > 0) earned += d; else lost -= d;
        seen[i].delta += d;
        seen[i].took += 1;
        seen[i].events.push({ type: c.type, style, click, rep });
      });
    });
    return { seen, earned, lost };
  };
  const first = play((i) => levelOf(people[i].points));
  const { seen, earned, lost } = play((i) => levelOf(people[i].points - first.seen[i].delta));

  // Movement: where each person started (today's points less the window's change).
  const moved = { climbed: 0, slipped: 0, belowZero: 0, backAbove: 0 };
  const groups = Object.fromEntries(GROUPS.map((g) => [g.id, { people: 0, climbed: 0, slipped: 0, click: 0, rep: 0, n: 0 }]));
  const lureCells = {};
  const teams = {};
  let strongBefore = 0; // took part, and at Phish Catcher or above before
  let strongAfter = 0; // ...and after
  people.forEach((p, i) => {
    const s = seen[i];
    if (!s.took) return;
    const before = p.points - s.delta;
    const lb = levelOf(before);
    const ln = levelOf(p.points);
    const g = groups[groupOf(lb)];
    g.people += 1;
    if (ln > lb) { moved.climbed += 1; g.climbed += 1; }
    if (ln < lb) { moved.slipped += 1; g.slipped += 1; }
    if (before >= 0 && p.points < 0) moved.belowZero += 1;
    if (before < 0 && p.points >= 0) moved.backAbove += 1;
    if (lb >= 4) strongBefore += 1;
    if (ln >= 4) strongAfter += 1;
    const t = teams[p.dept || 'Unassigned'] || (teams[p.dept || 'Unassigned'] = { net: 0, people: 0, click: 0, n: 0, styles: {} });
    t.net += s.delta;
    t.people += 1;
    s.events.forEach((e) => {
      g.click += e.click; g.rep += e.rep; g.n += 1;
      const cell = (lureCells[e.type] ||= {});
      const k = groupOf(lb);
      cell[k] = cell[k] || { click: 0, n: 0 };
      cell[k].click += e.click; cell[k].n += 1;
      t.click += e.click; t.n += 1;
      const st = (t.styles[e.style] ||= { click: 0, n: 0 });
      st.click += e.click; st.n += 1;
    });
  });

  const lures = Object.entries(lureCells).map(([type, cells]) => {
    const all = Object.values(cells).reduce((a, x) => ({ click: a.click + x.click, n: a.n + x.n }), { click: 0, n: 0 });
    return { type, click: pct(all.click, all.n), cells: Object.fromEntries(GROUPS.map((g) => [g.id, cells[g.id] ? pct(cells[g.id].click, cells[g.id].n) : null])) };
  }).sort((a, b) => b.click - a.click || a.type.localeCompare(b.type));

  const teamList = Object.entries(teams).map(([name, t]) => ({ name, net: t.net, people: t.people, click: pct(t.click, t.n), styles: t.styles }))
    .sort((a, b) => b.net - a.net || a.name.localeCompare(b.name));

  let messages;
  if (followed) {
    const overall = teamList.reduce((a, t) => ({ click: a.click + (t.click ?? 0) * t.people, n: a.n + t.people }), { click: 0, n: 0 });
    messages = {
      style: styleOf(followed.campaign),
      overall: pct(overall.click, overall.n),
      teams: teamList.map((t) => ({ name: t.name, rate: t.click })).sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name)),
    };
  } else {
    const byStyle = Object.fromEntries(MOTIVATORS.map((m) => [m, { click: 0, n: 0 }]));
    const list = teamList.map((t) => {
      const rates = Object.fromEntries(MOTIVATORS.map((m) => [m, t.styles[m] ? pct(t.styles[m].click, t.styles[m].n) : null]));
      MOTIVATORS.forEach((m) => { if (t.styles[m]) { byStyle[m].click += t.styles[m].click; byStyle[m].n += t.styles[m].n; } });
      const best = MOTIVATORS.filter((m) => rates[m] !== null).sort((a, b) => rates[b] - rates[a])[0] || null;
      return { name: t.name, best, rate: best ? rates[best] : null, rates };
    }).sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || a.name.localeCompare(b.name));
    messages = {
      styles: MOTIVATORS.map((m) => ({ style: m, rate: pct(byStyle[m].click, byStyle[m].n) })).filter((x) => x.rate !== null).sort((a, b) => b.rate - a.rate),
      teams: list,
    };
  }

  // Everyone, one by one: where they stand, what changed, what they did, and
  // how close they are to a change (from today's points).
  const click = Math.abs(pts.Clicked);
  const order = people.map((p, i) => i).sort((a, b) => people[b].points - people[a].points || String(people[a].name || people[a].key).localeCompare(String(people[b].name || people[b].key)));
  const rankOf = new Map(order.map((i, k) => [i, k + 1]));
  const persons = people.map((p, i) => {
    const s = seen[i];
    const before = p.points - s.delta;
    const lb = levelOf(before);
    const ln = levelOf(p.points);
    const gap = ln >= 1 ? toNextLevel(p.points) : null;
    return {
      key: p.key,
      name: p.name || '',
      email: p.email || '',
      dept: p.dept || 'Unassigned',
      rank: rankOf.get(i),
      points: p.points,
      change: s.delta,
      levelId: levelFor(p.points)?.id ?? null,
      startLevelId: levelFor(before)?.id ?? null,
      group: groupOf(lb), // the level group they started at
      groupNow: groupOf(ln),
      campaigns: s.took,
      reported: s.reported,
      clicked: s.clicked,
      gave: s.gave,
      moved: !s.took ? null : ln > lb ? 'up' : ln < lb ? 'down' : null,
      belowZero: p.points < 0,
      fellBelowZero: s.took > 0 && before >= 0 && p.points < 0,
      backAbove: s.took > 0 && before < 0 && p.points >= 0,
      nearUp: gap !== null && gap <= pts.Reported,
      nearSlip: ln >= 2 && p.points - levelFloor(ln) < click,
      nearZero: p.points >= 0 && p.points < click,
    };
  }).sort((a, b) => a.rank - b.rank).reverse(); // bottom of the board first

  const edge = {
    nearUp: persons.filter((x) => x.nearUp).length,
    nearSlip: persons.filter((x) => x.nearSlip).length,
    nearZero: persons.filter((x) => x.nearZero).length,
  };
  const strongNow = persons.filter((x) => levelOf(x.points) >= 4).length;

  // Department by department, the least ground gained first.
  const COUNTS = ['climbed', 'slipped', 'belowZero', 'fellBelowZero', 'nearUp', 'nearSlip', 'nearZero'];
  const byDept = {};
  persons.forEach((x) => {
    const d = byDept[x.dept] || (byDept[x.dept] = { name: x.dept, people: 0, tookPart: 0, points: 0, net: 0, reported: 0, clicked: 0, gave: 0, emails: 0, ...Object.fromEntries(COUNTS.map((k) => [k, 0])) });
    d.people += 1;
    d.points += x.points;
    d.net += x.change;
    if (x.campaigns) d.tookPart += 1;
    d.emails += x.campaigns;
    d.reported += x.reported;
    d.clicked += x.clicked;
    d.gave += x.gave;
    if (x.moved === 'up') d.climbed += 1;
    if (x.moved === 'down') d.slipped += 1;
    COUNTS.slice(2).forEach((k) => { if (x[k]) d[k] += 1; });
  });
  const departments = Object.values(byDept).map(({ points, ...d }) => ({
    ...d,
    avgPoints: Math.round(points / d.people),
    reportRate: pct(d.reported, d.emails),
    clickRate: pct(d.clicked, d.emails),
  })).sort((a, b) => a.net - b.net || a.name.localeCompare(b.name));

  const took = seen.filter((s) => s.took).length;
  return {
    basis: { campaigns: window.length, people: took, population: people.length, days: followed ? null : days, style: followed ? styleOf(followed.campaign) : null },
    moved,
    groups: GROUPS.map((g) => ({ id: g.id, label: g.label, short: g.short, people: groups[g.id].people, climbed: groups[g.id].climbed, slipped: groups[g.id].slipped, click: pct(groups[g.id].click, groups[g.id].n), report: pct(groups[g.id].rep, groups[g.id].n) })),
    lures,
    teams: teamList.map((t) => ({ name: t.name, net: t.net, people: t.people, click: t.click })),
    messages,
    edge,
    // if the window's pace holds for another window: people at Phish Catcher or above
    outlook: followed ? null : { strongNow, strongNext: Math.max(0, strongNow + strongAfter - strongBefore) },
    points: { earned, lost },
    people: persons,
    departments,
  };
}

/** The ways to pick people out of the picture, as the list's "Show" menu offers them. */
export const PEOPLE_FILTERS = Object.freeze([
  { id: 'all', label: 'Everyone, bottom of the board first', test: () => true },
  { id: 'belowZero', label: 'Below zero now', test: (x) => x.belowZero },
  { id: 'fellBelowZero', label: 'Fell below zero', test: (x) => x.fellBelowZero },
  { id: 'slipped', label: 'Slipped a level', test: (x) => x.moved === 'down' },
  { id: 'nearZero', label: 'One click from below zero', test: (x) => x.nearZero },
  { id: 'nearSlip', label: 'One click from a level down', test: (x) => x.nearSlip },
  { id: 'gave', label: 'Gave details away', test: (x) => x.gave > 0 },
  { id: 'clicked', label: 'Clicked at least once', test: (x) => x.clicked > 0 },
  { id: 'neverReported', label: 'Took part, never reported', test: (x) => x.campaigns > 0 && x.reported === 0 },
  { id: 'nearUp', label: 'One report from a level up', test: (x) => x.nearUp },
  { id: 'climbed', label: 'Climbed a level', test: (x) => x.moved === 'up' },
  { id: 'backAbove', label: 'Came back above zero', test: (x) => x.backAbove },
]);
