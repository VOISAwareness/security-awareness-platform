/**
 * Sample standings, until the points ledger is on the server (GET
 * /me/standing, PR 4 of levels and badges).
 *
 * Points come from the bundled user list (MasterUserData.json,
 * `GamificationPoint`); the rank is the place in that list by points. The
 * recent point changes and the best level reached are made up, but always
 * the same for the same person, so the screens can be laid out and checked.
 * Pure functions, so `node --test` can cover them.
 */
import { higherLevel, levelFor, progressFor } from './levels.js';

const POINTS = { Reported: 80, Trained: 30, Evaluated: 30, Opened: 0, Clicked: -30, Compromised: -50 };

/** What each rule's change means, for the history list. */
export const WHAT = {
  Reported: 'Reported a phishing email',
  Trained: 'Completed a training',
  Evaluated: 'Passed an evaluation',
  Clicked: 'Clicked a simulated link',
  Compromised: 'Entered details on a fake page',
};

const CAMPAIGNS = [
  'Payroll Update Notice', 'Mailbox Quota Exceeded', 'Q4 Credential Harvest Drill', 'Teams Voicemail Alert',
  'Vendor Invoice Overdue', 'VPN Re-authentication', 'HR Policy Acknowledgement', 'Benefits Enrolment Closing',
];
const TRAININGS = ['Spotting phishing', 'Password hygiene', 'Safe links and attachments', 'Reporting in Outlook'];

const DAY = 24 * 60 * 60 * 1000;
const SAMPLE_NOW = Date.UTC(2026, 9, 12, 9, 0); // fixed, so the sample never drifts

const norm = (email) => String(email || '').trim().toLowerCase();

// Small stable hash, so each person gets the same sample every time.
function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pointsOf = (u) => {
  const n = Number(u?.GamificationPoint);
  return Number.isFinite(n) ? n : 0;
};

/** Everyone, highest points first, with their rank (1 = top). */
export function rankUsers(users) {
  return (Array.isArray(users) ? users : [])
    .map((u) => ({ ...u, points: pointsOf(u) }))
    .sort((a, b) => b.points - a.points || String(a.UserName).localeCompare(String(b.UserName)))
    .map((u, i) => ({ ...u, rank: i + 1 }));
}

/** The last few point changes for a person (sample), newest first. */
export function sampleHistory(email, points, rules = POINTS) {
  const h = hash(norm(email));
  const negative = points < 0;
  const order = negative
    ? ['Clicked', 'Compromised', 'Reported', 'Clicked', 'Trained']
    : ['Reported', 'Trained', 'Evaluated', 'Clicked', 'Reported'];
  return order.map((event, i) => {
    const pick = (list) => list[(h >>> (i * 3)) % list.length];
    const value = Number.isFinite(rules?.[event]) ? rules[event] : POINTS[event];
    return {
      id: `${event}-${i}`,
      event,
      what: WHAT[event],
      where: event === 'Trained' || event === 'Evaluated' ? pick(TRAININGS) : pick(CAMPAIGNS),
      points: value,
      at: new Date(SAMPLE_NOW - (i * 4 + ((h >>> i) % 3)) * DAY).toISOString(),
    };
  });
}

/**
 * One person's standing: points, rank, level, progress to the next grade,
 * best level reached and recent changes. Someone missing from the list has
 * 0 points (a New Joiner).
 */
export function sampleStanding(users, email, rules) {
  const ranked = rankUsers(users);
  const key = norm(email);
  const me = ranked.find((u) => norm(u.UserEMailID) === key) || null;
  const points = me ? me.points : 0;
  const level = levelFor(points);
  const h = hash(key);
  // Some people were higher before (always those below zero): their best stays.
  const earlier = points < 0 ? points + 220 : h % 4 === 0 ? points + 160 : points;
  return {
    email: key,
    name: me?.UserName || null,
    department: me?.Department || null,
    points,
    rank: me ? me.rank : null,
    total: ranked.length,
    level,
    progress: progressFor(points),
    best: higherLevel(level, levelFor(earlier)),
    history: sampleHistory(key, points, rules),
  };
}
