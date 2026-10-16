/**
 * What could happen next, by formula: no AI, no guessing, only the data the
 * backend keeps (each person's points, emails, clicks, reports and details
 * given away) and the points rules from the Gamification Engine.
 *
 * The question it answers: if everyone gets one more email, how many could
 * move down a level, how many could move up, and how many would be Phish
 * Catcher or above? Each answer comes with a likely range.
 *
 * 1. How often each person clicks and reports. Their own record, pulled
 *    toward everyone's average when it is short (K emails' worth of weight):
 *        click_i  = (clicks_i  + K × C) / (emails_i + K)     C = Σ clicks  / Σ emails
 *        report_i = (reports_i + K × R) / (emails_i + K)     R = Σ reports / Σ emails
 *    and G = Σ details given away / Σ clicks.
 *
 * 2. The chance each person moves, from how far they are from a level's
 *    edge (points rules: a report +80, a click −30, details given −50 more):
 *        P(down)_i = click_i        if a click alone takes them below their level's floor
 *                  = click_i × G    if only a click with details given does
 *                  = 0              otherwise
 *        P(up)_i   = report_i       if a report takes them to the next level, else 0
 *
 * 3. The expected number is the sum of the chances, E = Σ P_i, and the
 *    likely range comes from the spread of that sum, Var = Σ P_i (1 − P_i)
 *    (each person a yes/no outcome): the exact 5th to 95th percentile of
 *    the count for up to 2,000 people in reach, otherwise E ± 1.645 √Var.
 *    "Likely 1–4" means: if people behave as their record says, the real
 *    number lands in that range 9 times out of 10.
 *
 * Pure functions, so `node --test` can check every step.
 */
import { LEVELS, levelFor, progressFor } from './levels.js';

/** Prior weight, in emails: a person with fewer emails than this leans on the average. */
export const K = 10;
const Z90 = 1.645; // the middle 90% of a normal spread
const EXACT_UP_TO = 2000;

/** A rate pulled toward the average: (x + K·avg) / (n + K). */
export function smoothed(x, n, avg, k = K) {
  return (x + k * avg) / (n + k);
}

/** The lowest points of the level number a total is in, or null at the very bottom. */
export function levelFloor(points) {
  const level = levelFor(points);
  if (!level) return null;
  const mins = LEVELS.filter((l) => l.level === level.level).map((l) => l.min);
  return mins.some((m) => m === null) ? null : Math.min(...mins);
}

/** Points to the next level number (a new badge, not a grade), or null at the top. */
export function toNextLevel(points) {
  const pr = progressFor(points);
  if (!pr || pr.isTop) return null;
  const up = LEVELS.find((l) => l.rank > pr.level.rank && l.level > pr.level.level);
  return up ? up.min - pr.points : null;
}

/**
 * The count of yes/no outcomes with chances `ps`: its expected value and
 * the 90% range (5th to 95th percentile). Exact for up to 2,000 chances,
 * the normal approximation beyond.
 */
export function likelyRange(ps) {
  const live = ps.filter((p) => p > 0);
  const expected = live.reduce((a, p) => a + p, 0);
  if (!live.length) return { expected: 0, low: 0, high: 0 };
  if (live.length <= EXACT_UP_TO) {
    let dist = [1];
    for (const p of live) {
      const next = new Array(dist.length + 1).fill(0);
      for (let k = 0; k < dist.length; k += 1) {
        next[k] += dist[k] * (1 - p);
        next[k + 1] += dist[k] * p;
      }
      dist = next;
    }
    let cum = 0;
    let low = null;
    let high = null;
    for (let k = 0; k < dist.length; k += 1) {
      cum += dist[k];
      if (low === null && cum >= 0.05) low = k;
      if (high === null && cum >= 0.95) { high = k; break; }
    }
    return { expected, low, high: high ?? live.length };
  }
  const sd = Math.sqrt(live.reduce((a, p) => a + p * (1 - p), 0));
  return { expected, low: Math.max(0, Math.floor(expected - Z90 * sd)), high: Math.min(live.length, Math.ceil(expected + Z90 * sd)) };
}

/**
 * The forecast for `people` ({ key, points, campaigns, clicked, reported,
 * gave }) under the points rules `pts` ({ Reported, Clicked, Compromised }).
 * Returns each person's chances (by key) and the three answers.
 */
export function forecast(people, pts, { k = K } = {}) {
  const sum = (f) => people.reduce((a, x) => a + f(x), 0);
  const emails = sum((x) => x.campaigns);
  const C = emails ? sum((x) => x.clicked) / emails : 0;
  const R = emails ? sum((x) => x.reported) / emails : 0;
  const clicks = sum((x) => x.clicked);
  const G = clicks ? sum((x) => x.gave) / clicks : 0;
  const click = Math.abs(pts.Clicked);
  const clickAndGive = click + Math.abs(pts.Compromised);

  const chances = new Map();
  const downs = [];
  const ups = [];
  let strongNow = 0;
  const strongIn = [];
  const strongOut = [];
  people.forEach((x) => {
    const clickRate = smoothed(x.clicked, x.campaigns, C, k);
    const reportRate = smoothed(x.reported, x.campaigns, R, k);
    const floor = levelFloor(x.points);
    const gap = floor === null ? Infinity : x.points - floor;
    const down = gap < click ? clickRate : gap < clickAndGive ? clickRate * G : 0;
    const toUp = toNextLevel(x.points);
    const up = toUp !== null && toUp <= pts.Reported ? reportRate : 0;
    chances.set(x.key, { down, up, clickRate, reportRate });
    if (down) downs.push(down);
    if (up) ups.push(up);
    const level = levelFor(x.points)?.level ?? 1;
    if (level >= 4) strongNow += 1;
    if (level === 3 && up) strongIn.push(up); // one report from Phish Catcher
    if (level === 4 && down) strongOut.push(down); // one click from leaving it
  });

  // Phish Catcher or above after one more email: today, plus those likely in, less those likely out.
  const moving = [...strongIn, ...strongOut];
  const shift = strongIn.reduce((a, p) => a + p, 0) - strongOut.reduce((a, p) => a + p, 0);
  const sd = Math.sqrt(moving.reduce((a, p) => a + p * (1 - p), 0));
  const strong = {
    now: strongNow,
    expected: Math.max(0, strongNow + shift),
    low: Math.max(0, Math.floor(strongNow + shift - Z90 * sd)),
    high: Math.ceil(strongNow + shift + Z90 * sd),
  };

  return {
    chances,
    method: { k, clickRate: C, reportRate: R, gaveShare: G, emails },
    down: { ...likelyRange(downs), within: downs.length },
    up: { ...likelyRange(ups), within: ups.length },
    strong,
  };
}
