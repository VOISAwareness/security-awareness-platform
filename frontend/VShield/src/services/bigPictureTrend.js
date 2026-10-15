/**
 * How the board is doing over time, by formula: the average points per
 * person at each step (a day or a week) of a range, worked back from
 * today's points through every dated points change:
 *
 *     average(t) = (Σ points now − Σ changes after t) / people
 *
 * The verdict compares the range's last average with its first: up by at
 * least STEADY points per person is improving, down by as much is slipping,
 * anything between is holding steady. `history` is { total, n, end, ledger }
 * (bigPicture's), the ledger being { at, points } changes.
 *
 * progress() is the answer the Big Picture leads with: for the
 * organisation, the last six months; for one campaign, what it did for its
 * recipients. Per person: the change, the average before and after, and
 * the points earned by reporting and lost to clicks behind the change.
 * Pure functions, so `node --test` can check every step.
 */
export const DAY = 86400000;
/** Points per person within which the board is holding steady. */
export const STEADY = 5;

export const RANGES = Object.freeze([
  Object.freeze({ id: '30d', label: '30 days', days: 30, step: 1 }),
  Object.freeze({ id: '3m', label: '3 months', days: 91, step: 7 }),
  Object.freeze({ id: '6m', label: '6 months', days: 182, step: 7 }),
]);

const wordFor = (change) => (change >= STEADY ? 'improving' : change <= -STEADY ? 'slipping' : 'steady');

/** The trend over `range` ({ days, step }): { series: [{ at, avg }], from, to, change, word }. */
export function trend({ total, n, end, ledger }, { days, step }) {
  const people = Math.max(1, n);
  const changes = [...ledger].sort((a, b) => a.at - b.at);
  const after = (t) => changes.reduce((a, c) => (c.at > t ? a + c.points : a), 0);
  const start = end - days * DAY;
  const times = [];
  for (let t = start; t < end; t += step * DAY) times.push(t);
  times.push(end);
  const series = times.map((at) => ({ at, avg: (total - after(at)) / people }));
  const from = series[0].avg;
  const to = series[series.length - 1].avg;
  const change = to - from;
  return { series, from, to, change, word: wordFor(change) };
}

/**
 * Is everyone gaining points? Per person: { word, change, from, to, earned,
 * lost }, over the last six months, or from one campaign.
 */
export function progress(r, { campaign = false } = {}) {
  const n = Math.max(1, r.history.n);
  const to = r.history.total / n;
  if (campaign) {
    const change = r.people.reduce((a, x) => a + x.change, 0) / Math.max(1, r.people.length);
    return { word: wordFor(change), change, from: to - change, to, earned: r.points.earned / n, lost: r.points.lost / n };
  }
  const six = RANGES.find((x) => x.id === '6m');
  const t = trend(r.history, six);
  const since = r.history.end - six.days * DAY;
  const inRange = r.history.ledger.filter((c) => c.at > since);
  const sum = (k) => inRange.reduce((a, c) => a + (c[k] || 0), 0) / n;
  return { word: t.word, change: t.change, from: t.from, to: t.to, earned: sum('earned'), lost: sum('lost') };
}
