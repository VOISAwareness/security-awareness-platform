/**
 * Achievements: the badges a person earns for what they do (report a
 * phishing email, finish training, reach the top 10), as opposed to the level
 * badges, which only follow the points total (services/levels.js).
 *
 * Each achievement has a clay picture in assets/clay/achievements/, shown with
 * <ClayImage name={achievement.image} />. Add a new one by drawing its picture
 * under that folder and adding a row to ACHIEVEMENTS with its `earned` rule.
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

export const ACHIEVEMENTS = Object.freeze(
  [
    {
      id: 'first-report',
      name: 'First Report',
      how: 'Report a simulated phishing email.',
      earned: ({ history }) => count(history, 'Reported') >= 1,
    },
    {
      id: 'sharp-eye',
      name: 'Sharp Eye',
      how: 'Report 3 simulated phishing emails.',
      earned: ({ history }) => count(history, 'Reported') >= 3,
    },
    {
      id: 'quick-reporter',
      name: 'Quick Reporter',
      how: 'Report 5 simulated phishing emails.',
      earned: ({ history }) => count(history, 'Reported') >= 5,
    },
    {
      id: 'safe-handler',
      name: 'Safe Handler',
      how: 'Take part in 3 campaigns without clicking or giving details.',
      earned: ({ history }) =>
        new Set(history.map((h) => h.campaignId).filter(Boolean)).size >= 3 && !history.some((h) => FELL_FOR.has(h.rule)),
    },
    {
      id: 'trained',
      name: 'Trained',
      how: 'Finish a training path.',
      earned: ({ history }) => count(history, 'Trained') >= 1,
    },
    {
      id: 'quiz-ace',
      name: 'Quiz Ace',
      how: 'Pass a training evaluation.',
      earned: ({ history }) => count(history, 'Evaluated') >= 1,
    },
    {
      id: 'top-10',
      name: 'Top 10',
      how: 'Reach the top 10 of the leaderboard.',
      earned: ({ rank }) => Number.isInteger(rank) && rank >= 1 && rank <= 10,
    },
    {
      id: 'point-collector',
      name: 'Point Collector',
      how: 'Reach 500 points.',
      earned: ({ points }) => points >= 500,
    },
    {
      id: 'comeback',
      name: 'Comeback',
      how: 'Report a phishing email after having clicked one before.',
      earned: ({ history }) => {
        const byTime = [...history].sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
        const firstSlip = byTime.findIndex((h) => FELL_FOR.has(h.rule));
        return firstSlip !== -1 && byTime.slice(firstSlip + 1).some((h) => h.rule === 'Reported');
      },
    },
    {
      id: 'lifelong-learner',
      name: 'Lifelong Learner',
      how: 'Finish 3 training paths.',
      earned: ({ history }) => count(history, 'Trained') >= 3,
    },
  ].map((a) => Object.freeze({ ...a, image: a.id }))
);

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
      .map((h) => ({ rule: h.rule ?? h.event, campaignId: h.campaignId ?? h.where, at: h.at })),
  };
  return ACHIEVEMENTS.map(({ earned, ...a }) => ({ ...a, earned: Boolean(earned(s)) }));
}
