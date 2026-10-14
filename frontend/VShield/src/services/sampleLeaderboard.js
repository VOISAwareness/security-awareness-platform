/**
 * Sample leaderboard rows, until GET /leaderboard exists (PR 5 of levels and
 * badges).
 *
 * The global board is the bundled user list (MasterUserData.json) ranked by
 * points, the same list My Space reads, so a person's rank, points and badge
 * agree on both screens. Campaign boards are still made up; their people get
 * a made-up overall points total so they have a badge too.
 * Pure functions, so `node --test` can cover them.
 */
import { LEVEL_BY_ID, canSeeBadge, levelFor } from './levels.js';
import { rankUsers } from './sampleStanding.js';

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pct = (v) => `${Math.round(Number(v) || 0)}%`;
const initialsOf = (name) =>
  String(name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Places gained (+) or lost (-) this week: a made-up -3..+5, stable per person. */
const weekMove = (key) => (hash(`move:${key}`) % 9) - 3;

/**
 * The global board from the user list: podium (ranks 1–3), the rest, and
 * the head count. Rows carry points as a number and as text, the level id,
 * report and click rates, and the email (to find the viewer).
 */
export function globalBoard(users) {
  const all = rankUsers(users).map((u) => ({
    rank: u.rank,
    name: u.UserName,
    email: String(u.UserEMailID || '').toLowerCase(),
    dept: u.Department || '',
    initials: initialsOf(u.UserName),
    points: u.points,
    pts: u.points.toLocaleString('en-US'),
    rep: pct(u['ReportRate%']),
    clk: pct(u['HookRate%']),
    move: weekMove(u.UserEMailID || u.UserName),
    levelId: levelFor(u.points)?.id || null,
  }));
  return { podium: { first: all[0], second: all[1], third: all[2] }, rows: all.slice(3), total: all.length };
}

/**
 * A made-up overall points total for a made-up campaign participant: most
 * people low on the ladder, a few high, a few below zero.
 */
export function samplePointsFor(index) {
  const r = (hash(`pts:${index}`) % 10000) / 10000;
  if (r < 0.06) return -40 - Math.round(r * 4000); // below zero
  return Math.round(5000 * r ** 3.2);
}

/**
 * The badge a viewer may see on a row: the row's level, or null when it is
 * hidden from them (a level below zero, unless it is their own row or they
 * are an admin), or when the row has no level.
 */
export function visibleLevel(levelId, { isSelf = false, viewerRole } = {}) {
  const level = (levelId && LEVEL_BY_ID[levelId]) || null;
  return canSeeBadge({ level, isSelf, viewerRole }) ? level : null;
}
