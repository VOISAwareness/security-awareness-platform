/**
 * Achievements: the badges a person earns for what they do (report a
 * phishing email, finish training, reach the top 10), as opposed to the level
 * badges, which only follow the points total (services/levels.js).
 *
 * Each achievement has a clay picture in assets/clay/achievements/, shown with
 * <ClayImage name={achievement.image} />. Add a new one by drawing its picture
 * under that folder and adding a row to ACHIEVEMENTS with its `earned` rule:
 * the My Space ID card (the hardest one earned) and the dialog with every
 * one pick it up with no other change.
 *
 * The API decides who has earned what: GET /standing returns `achievements`,
 * the ids earned, worked out over the person's whole history (reference-api
 * achievements_for). The rules below are the same ones, kept as a fallback
 * for an API that doesn't send the list yet; they read the standing
 * (useMyStanding): points, rank and
 * `history`, their latest point changes, each with the rule that scored it
 * (Opened, Clicked, Compromised, Reported, Trained, Evaluated) and the
 * campaign. Both shapes are read: the API's ({ rule, campaignId, at }) and
 * liveStanding's ({ event, where, at }). The API returns the latest 10 changes, so counts are over
 * those. Pure: no React or fetch, so `node --test` covers it.
 */

const count = (history, rule) => history.filter((h) => h.rule === rule).length;
const FELL_FOR = new Set(['Clicked', 'Compromised']);
const SCORED = new Set(['Reported', 'Trained', 'Evaluated', 'Clicked', 'Compromised']);

/** The most reports in a row with no click or given details between them. */
function longestReportRun(entries) {
  let best = 0;
  let run = 0;
  for (const e of entries) {
    if (e.rule === 'Reported') best = Math.max(best, (run += 1));
    else if (FELL_FOR.has(e.rule)) run = 0;
  }
  return best;
}

// Easiest first: the last one earned is the person's hardest, shown on the
// ID card. The same rules as reference-api achievements_for; they are meant
// to be hard to get.
export const ACHIEVEMENTS = Object.freeze(
  [
    {
      id: 'first-report',
      name: 'First Report',
      how: 'Make your very first action a report: spot and report a simulated phishing email before ever clicking one.',
      earned: ({ scored }) => scored.length > 0 && scored[0].rule === 'Reported',
    },
    {
      id: 'sharp-eye',
      name: 'Sharp Eye',
      how: 'Report 10 simulated phishing emails.',
      earned: ({ history }) => count(history, 'Reported') >= 10,
    },
    {
      id: 'quick-reporter',
      name: 'Quick Reporter',
      how: 'Report 25 simulated phishing emails.',
      earned: ({ history }) => count(history, 'Reported') >= 25,
    },
    {
      id: 'safe-handler',
      name: 'Safe Handler',
      how: 'Report 10 simulated phishing emails without ever clicking a link or giving your details.',
      earned: ({ history }) => count(history, 'Reported') >= 10 && !history.some((h) => FELL_FOR.has(h.rule)),
    },
    {
      id: 'trained',
      name: 'Trained',
      how: 'Finish 3 training paths.',
      earned: ({ history }) => count(history, 'Trained') >= 3,
    },
    {
      id: 'quiz-ace',
      name: 'Quiz Ace',
      how: 'Pass 5 training evaluations.',
      earned: ({ history }) => count(history, 'Evaluated') >= 5,
    },
    {
      id: 'top-10',
      name: 'Top 10',
      how: 'Reach the top 10 of the leaderboard with at least 1,000 points.',
      earned: ({ rank, points }) => Number.isInteger(rank) && rank >= 1 && rank <= 10 && points >= 1000,
    },
    {
      id: 'point-collector',
      name: 'Point Collector',
      how: 'Reach 2,000 points.',
      earned: ({ points }) => points >= 2000,
    },
    {
      id: 'comeback',
      name: 'Comeback',
      how: 'After clicking a simulated phishing link, report the next 5 in a row without clicking again.',
      earned: ({ scored }) => {
        const slip = scored.findIndex((h) => FELL_FOR.has(h.rule));
        return slip !== -1 && longestReportRun(scored.slice(slip + 1)) >= 5;
      },
    },
    {
      id: 'lifelong-learner',
      name: 'Lifelong Learner',
      how: 'Finish 10 training paths.',
      earned: ({ history }) => count(history, 'Trained') >= 10,
    },
  ].map((a) => Object.freeze({ ...a, image: a.id }))
);

/**
 * The achievement shown on the My Space ID card: the hardest one earned
 * (the last earned in catalogue order), or null when none is.
 */
export function latestEarned(list) {
  const earned = (Array.isArray(list) ? list : []).filter((a) => a.earned);
  return earned.length ? earned[earned.length - 1] : null;
}

/** How many achievements the My Space card shows; the rest are behind "View all". */
export const PREVIEW_COUNT = 4;

/**
 * The few to show on the card: the ones earned first (in catalogue order),
 * then the next ones still to earn, up to `limit`. The full list is the
 * "View all" dialog's.
 */
export function previewOf(list, limit = PREVIEW_COUNT) {
  const all = Array.isArray(list) ? list : [];
  return [...all.filter((a) => a.earned), ...all.filter((a) => !a.earned)].slice(0, Math.max(0, limit));
}

/**
 * Every achievement for this standing, in catalogue order, with `earned`
 * set: [{ id, name, how, image, earned }]. From the API's list when the
 * standing has one, else from the rules here. A missing or partial standing
 * earns nothing rather than failing.
 */
export function achievementsFor(standing) {
  if (Array.isArray(standing?.achievements)) {
    const earned = new Set(standing.achievements);
    return ACHIEVEMENTS.map((a) => ({ id: a.id, name: a.name, how: a.how, image: a.image, earned: earned.has(a.id) }));
  }
  const s = {
    points: Number(standing?.points) || 0,
    rank: standing?.rank ?? null,
    history: (Array.isArray(standing?.history) ? standing.history : [])
      .filter((h) => h && typeof h === 'object')
      .map((h) => ({ rule: h.rule ?? h.event, campaignId: h.campaignId ?? h.where, at: h.at }))
      .sort((a, b) => String(a.at || '').localeCompare(String(b.at || ''))),
  };
  s.scored = s.history.filter((h) => SCORED.has(h.rule));
  return ACHIEVEMENTS.map(({ earned, ...a }) => ({ ...a, earned: Boolean(earned(s)) }));
}
