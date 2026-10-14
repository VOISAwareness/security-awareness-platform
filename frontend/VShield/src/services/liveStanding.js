/**
 * The signed-in person's standing from the server (GET /standing), in the
 * same shape as the sample (sampleStanding.js), so the screens take either.
 *
 * Off until VITE_LIVE_LEVELS=true: until real campaigns have produced events,
 * everyone on the server is a New Joiner on 0 points, and the sample makes a
 * better demo. Pure functions, so `node --test` can cover them.
 */
import { LEVEL_BY_ID, higherLevel, levelFor, progressFor } from './levels.js';
import { WHAT } from './sampleStanding.js';

export const LIVE_LEVELS =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_LIVE_LEVELS === 'true';

/**
 * GET /standing's data -> { email, name, department, points, rank, total,
 * level, progress, best, history, known }; null when it carries no points.
 * `profile` fills in what the server doesn't send (name, department, and
 * rank until the leaderboard API exists).
 */
export function standingFromApi(data, profile = {}) {
  const points = Number(data?.points);
  if (!data || !Number.isFinite(points)) return null;
  // The level is worked out here from the points (the server does the same),
  // so a stale id from an older server can't disagree with the total.
  const level = levelFor(points);
  const best = higherLevel(level, LEVEL_BY_ID[data.bestLevelId] || null);
  return {
    email: String(data.email || profile.email || '').trim().toLowerCase(),
    name: profile.name ?? null,
    department: profile.department ?? null,
    points,
    rank: data.rank ?? profile.rank ?? null,
    total: data.total ?? profile.total ?? null,
    level,
    progress: progressFor(points),
    best,
    history: (Array.isArray(data.history) ? data.history : []).map((h, i) => ({
      id: `${h.campaignId || 'entry'}-${h.rule}-${i}`,
      event: h.rule,
      what: WHAT[h.rule] || h.rule || 'Points',
      where: h.campaignName || h.campaignId || '',
      points: Number(h.delta) || 0,
      at: h.at,
    })),
    known: Boolean(data.known),
  };
}
