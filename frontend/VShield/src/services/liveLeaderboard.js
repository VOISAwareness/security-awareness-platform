/**
 * The global leaderboard from the server (GET /leaderboard), in the shape of
 * the sample board (sampleLeaderboard.js globalBoard), so the screen takes
 * either. Read only when VITE_LIVE_LEVELS=true (see liveStanding.js).
 *
 * The server never sends emails; it marks the viewer's row `you`, and for a
 * level below zero the viewer may not see it sends neither the level nor the
 * points (`points: null`): such a row comes back `hidden`, with no points to
 * show. Report and click rates
 * and the week's movement aren't on the server yet: they come back empty
 * (the screen shows a dash). Pure functions, so `node --test` can cover them.
 */
const initialsOf = (name) =>
  String(name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

/** GET /leaderboard's data -> { podium, rows, total, youRank }; null if unusable. */
export function boardFromApi(data) {
  if (!data || !Array.isArray(data.rows)) return null;
  const all = data.rows
    .filter((r) => r?.points === null || Number.isFinite(Number(r?.points)))
    .map((r, i) => {
      const hidden = r.points === null;
      const points = hidden ? null : Number(r.points);
      return {
        rank: Number(r.rank) || i + 1,
        name: r.name || 'Unknown',
        email: '',
        dept: r.department || '',
        initials: initialsOf(r.name),
        points,
        pts: hidden ? '' : points.toLocaleString('en-US'),
        hidden,
        rep: null,
        clk: null,
        move: 0,
        levelId: r.levelId || null,
        you: Boolean(r.you),
      };
    });
  const you = all.find((r) => r.you);
  return {
    podium: { first: all[0] || null, second: all[1] || null, third: all[2] || null },
    rows: all.slice(3),
    total: Number(data.total) || all.length,
    youRank: data.you?.rank ?? you?.rank ?? null,
  };
}
