/**
 * Next Move: the brief for the next campaign, written from the leaderboard.
 *
 * Four choices, each ranked with its evidence so an admin can take the
 * suggestion or pick another:
 *   who  - the department that needs it most (clicks more, reports less,
 *          more people below zero); after a campaign, also the people who
 *          clicked in it;
 *   what - the lure they fall for most, and how long since it was last sent;
 *   how  - the message style (motivator) that works best on them;
 *   hard - the difficulty their levels can take.
 * Plus what running it could do on the board: the audience, how many are one
 * report away from a new level, the points on offer, and a goal.
 *
 * Every option carries `value` and `avg` (click rates), so a card can draw the
 * option against its comparison. Pure functions over sample data for now
 * (services/sampleReports.js), so `node --test` can cover them; the reports
 * API will feed the same shapes.
 */
import { LEVELS, LEVEL_BY_ID, levelFor, progressFor } from './levels.js';

// The Dashboard's motivators, so both screens use the same words.
export const MOTIVATORS = Object.freeze(['Urgency', 'Authority', 'Reward', 'Curiosity', 'Fear']);
const TONE = {
  Urgency: 'Act now, or lose access',
  Authority: 'A request from someone senior',
  Reward: 'A bonus, refund or prize',
  Curiosity: 'Something they want to open',
  Fear: 'A warning that something is wrong',
};

export const DIFFICULTY = Object.freeze({
  Easy: 'Clear signs to spot. Builds confidence where people are struggling.',
  Medium: 'A few signs to spot. Stretches people who are learning.',
  Hard: 'Looks real. Tests people who already report well.',
});

// Why each choice matters, shown on the back of its card.
// How each list of options is ranked, shown above it.
export const RANKED = Object.freeze({
  who: 'Ranked by clicks, reports and people below zero',
  what: 'Ranked by clicks, and time since it was last sent',
  how: 'Ranked by clicks',
  hard: 'Suggested from where their people stand',
});

export const WHY = Object.freeze({
  who: 'Practice where people click most lowers the company’s risk fastest.',
  what: 'People learn to spot the tricks they actually fall for, not the ones they already know.',
  how: 'Attackers use the pressure that works. Practising against it is what protects people.',
  hard: 'Too hard puts people off; too easy teaches nothing. Pitch it at their level.',
});

const REPORT_POINTS = 80;
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const DAY = 86400000;

const pct = (n, of) => (of > 0 ? n / of : 0);
const toNum = (s) => Number(String(s).replace(/,/g, '')) || 0;
const whole = (v) => `${Math.round(v * 100)}%`;

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** "6 Oct" -> days before `now` (same year). */
export function daysSince(started, now) {
  const [d, m] = String(started).split(' ');
  const t = Date.UTC(new Date(now).getUTCFullYear(), MONTHS[m] ?? 0, Number(d) || 1);
  return Math.max(0, Math.round((now - t) / DAY));
}

// A person's level number (-2 to 7): from their level id, else their points.
function levelOf(p) {
  if (p.hidden) return -1;
  const lvl = (p.levelId && LEVEL_BY_ID[p.levelId]) || levelFor(toNum(p.pts));
  return lvl ? lvl.level : 1;
}

// Points to the next level (a new badge, not just a grade), or null at the top.
function toNextLevel(points) {
  const pr = progressFor(points);
  if (!pr || pr.isTop) return null;
  const up = LEVELS.find((l) => l.rank > pr.level.rank && l.level > pr.level.level);
  return up ? up.min - pr.points : null;
}

/**
 * The brief. `items` are { campaign, report } pairs (campaignReport output),
 * newest first; `board` the global board; `focus` an optional campaign id to
 * plan a follow-up to; `pick` the admin's own choices ({ who, what, how, hard }).
 */
export function nextMove(items, board, { now = Date.UTC(2026, 9, 14), focus = null, pick = {}, recent = 12 } = {}) {
  const followed = focus ? items.find((x) => x.campaign.id === focus) || null : null;
  const base = followed ? [followed] : items.slice(0, recent);

  // who: departments by need, across the campaigns in scope
  const dept = {};
  base.forEach(({ report }) => report.departments.forEach((d) => {
    const t = dept[d.name] || (dept[d.name] = { n: 0, rep: 0, clk: 0, seen: 0 });
    t.n += d.recipients; t.rep += d.reported; t.clk += d.clicked; t.seen += 1;
  }));
  const all = Object.values(dept).reduce((a, t) => ({ n: a.n + t.n, rep: a.rep + t.rep, clk: a.clk + t.clk }), { n: 0, rep: 0, clk: 0 });
  const avgClick = pct(all.clk, all.n);
  const avgReport = pct(all.rep, all.n);

  const people = [board?.podium?.first, board?.podium?.second, board?.podium?.third, ...(board?.rows || [])].filter(Boolean);
  const onBoard = (name) => people.filter((p) => p.dept === name);

  const who = Object.entries(dept).map(([name, t]) => {
    const click = pct(t.clk, t.n);
    const report = pct(t.rep, t.n);
    const members = onBoard(name);
    const risk = members.filter((p) => levelOf(p) <= 0).length;
    const times = avgClick ? click / avgClick : 1;
    const score = times + (avgReport ? (avgReport - report) / avgReport : 0) + (members.length ? (risk / members.length) * 2 : 0);
    return {
      id: name,
      label: name,
      kind: 'dept',
      score,
      value: click,
      avg: avgClick,
      click,
      report,
      audience: Math.round(t.n / t.seen),
      hero: { value: `${times.toFixed(1)}×`, caption: 'the average click rate' },
      note: `Reports ${whole(report)}${risk ? ` · ${risk} below zero` : ''}`,
      facts: [
        `Clicks ${whole(click)}, ${times.toFixed(1)}× the average`,
        `Reports ${whole(report)}${risk ? ` · ${risk} below zero` : ''}`,
      ],
    };
  }).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));

  // after a campaign: the people who clicked in it, a second chance while it is fresh
  if (followed && followed.report.clicked) {
    const r = followed.report;
    who.unshift({
      id: `clicked:${followed.campaign.id}`,
      label: 'Everyone who clicked',
      kind: 'cohort',
      score: Infinity,
      value: 1,
      avg: avgClick,
      click: 1,
      report: 0,
      gave: pct(r.compromised, r.clicked), // of them, how many gave details away
      audience: r.clicked,
      hero: { value: whole(pct(r.compromised, r.clicked)), caption: 'of them gave their details away' },
      note: `${r.clicked.toLocaleString('en-US')} people clicked in this campaign`,
      facts: [`${r.clicked.toLocaleString('en-US')} people clicked in this campaign`, `${r.compromised.toLocaleString('en-US')} of them gave details away`],
    });
  }
  const target = who.find((w) => w.id === pick.who) || who[0] || null;
  const inTarget = (report) => (target && target.kind === 'dept' ? report.departments.find((x) => x.name === target.id) : null);

  // what: lures by how often the target falls for them, and how long since the last
  const lure = {};
  const byDept = target && target.kind === 'dept';
  items.forEach(({ campaign, report }) => {
    const t = lure[campaign.type] || (lure[campaign.type] = { n: 0, clk: 0, last: Infinity });
    t.last = Math.min(t.last, daysSince(campaign.started, now));
    const d = inTarget(report);
    if (byDept && !d) return; // the department wasn't sent this one
    t.n += d ? d.recipients : report.delivered;
    t.clk += d ? d.clicked : report.clicked;
  });
  const lureAll = Object.values(lure).reduce((a, t) => ({ n: a.n + t.n, clk: a.clk + t.clk }), { n: 0, clk: 0 });
  const lureAvg = pct(lureAll.clk, lureAll.n);
  const sameType = followed ? followed.campaign.type : null;
  const what = Object.entries(lure).map(([type, t]) => {
    const click = pct(t.clk, t.n);
    const stale = Math.min(1, t.last / 60);
    const score = (lureAvg ? click / lureAvg : 1) + stale * 0.5 + (type === sameType ? 0.4 : 0);
    return {
      id: type,
      label: type,
      score,
      value: click,
      avg: lureAvg,
      days: t.last,
      hero: { value: whole(click), caption: t.n ? `of these got a click${byDept ? ` from ${target.label}` : ''}` : 'never sent to them' },
      note: type === sameType ? 'The same trick again: a second chance' : `Last sent ${t.last} day${t.last === 1 ? '' : 's'} ago`,
      facts: [
        t.n ? (byDept ? `${target.label} clicked ${whole(click)} of these` : `${whole(click)} of everyone clicked these`) : `Never sent to ${target.label}`,
        type === sameType ? 'The same trick again: a second chance' : `Last sent ${t.last} day${t.last === 1 ? '' : 's'} ago`,
      ],
    };
  }).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  const lureChoice = what.find((w) => w.id === pick.what) || what[0] || null;

  // how: the message style the target falls for most (sample, per audience)
  const how = MOTIVATORS.map((m) => {
    const click = 0.07 + (hash(`${target?.id}|${m}`) % 190) / 1000;
    return {
      id: m, label: m, score: click, value: click, tone: TONE[m], note: TONE[m],
      hero: { value: whole(click), caption: `clicked when the email used ${m.toLowerCase()}` },
      facts: [`Clicked ${whole(click)} when the email used ${m.toLowerCase()}`],
    };
  }).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  const howAvg = how.reduce((a, h) => a + h.value, 0) / how.length;
  how.forEach((h) => { h.avg = howAvg; h.facts.push(h.tone); });
  const howChoice = how.find((h) => h.id === pick.how) || how[0];

  // hard: from where the target's people stand
  const members = target && target.kind === 'dept' ? onBoard(target.id) : [];
  const low = members.filter((p) => levelOf(p) <= 1).length; // New Joiner or below zero
  const high = members.filter((p) => levelOf(p) >= 4).length; // Phish Catcher and up
  const lowShare = pct(low, members.length);
  const highShare = pct(high, members.length);
  const midShare = members.length ? 1 - lowShare - highShare : 0; // Aware User, Safe Handler
  let recommended = 'Medium';
  if (!target || target.kind === 'cohort' || lowShare >= 0.4 || target.click > avgClick * 1.3) recommended = 'Easy';
  else if (highShare >= 0.5 && target.report > avgReport) recommended = 'Hard';
  const mix = target && target.kind === 'cohort'
    ? 'They clicked last time: start with signs they can spot'
    : `${whole(highShare)} are Phish Catchers or above, ${whole(lowShare)} new or below zero`;
  const cohort = target && target.kind === 'cohort';
  // the number that makes the case for a level
  const hardHero = (level) => {
    if (cohort) return { value: '0%', caption: 'of them reported it last time' };
    if (level === 'Easy') {
      return lowShare >= 0.4
        ? { value: whole(lowShare), caption: 'are new or below zero' }
        : { value: whole(lowShare + midShare), caption: 'have not reached Phish Catcher yet' };
    }
    if (level === 'Medium') return { value: whole(midShare), caption: 'are Aware Users or Safe Handlers' };
    return { value: whole(highShare), caption: 'are Phish Catchers or above' };
  };
  const hard = ['Easy', 'Medium', 'Hard'].map((level) => ({
    id: level,
    label: level,
    score: level === recommended ? 1 : 0,
    hero: hardHero(level),
    note: DIFFICULTY[level],
    facts: level === recommended ? [DIFFICULTY[level], mix] : [DIFFICULTY[level]],
    mix: cohort ? null : { low: lowShare, mid: midShare, high: highShare, people: members.length },
  })).sort((a, b) => b.score - a.score);
  const hardChoice = hard.find((h) => h.id === pick.hard) || hard[0];

  // what running it could do on the board
  const audience = target ? target.audience : 0;
  const nearOf = (list) => pct(list.filter((p) => levelOf(p) > 0).filter((p) => {
    const gap = toNextLevel(toNum(p.pts));
    return gap !== null && gap <= REPORT_POINTS;
  }).length, list.length);
  const nearShare = target && target.kind === 'cohort' ? nearOf(people) : nearOf(members);
  const goal = target ? Math.min(0.9, Math.max(avgReport, target.report + 0.1)) : avgReport;

  return {
    who, what, how, hard,
    choice: { who: target, what: lureChoice, how: howChoice, hard: hardChoice },
    outcome: {
      audience,
      oneReportAway: Math.round(audience * nearShare), // one report from a new level
      pointsOnOffer: audience * REPORT_POINTS,
      goal,
      lastReport: target ? target.report : null,
    },
    basis: { campaigns: base.length, people: people.length, average: { click: avgClick, report: avgReport } },
  };
}

/** The brief as plain text, for "Copy brief". */
export function briefText(m, title) {
  const c = m.choice;
  return [
    title,
    `Who: ${c.who?.label} (${c.who?.facts.join('; ')})`,
    `What: ${c.what?.label} (${c.what?.facts.join('; ')})`,
    `How: ${c.how?.label} (${c.how?.facts.join('; ')})`,
    `Difficulty: ${c.hard?.label} (${DIFFICULTY[c.hard?.id] || ''})`,
    `About ${m.outcome.audience.toLocaleString('en-US')} people; ${m.outcome.oneReportAway} are one report from a new level. Goal: ${whole(m.outcome.goal)} report it.`,
  ].join('\n');
}
