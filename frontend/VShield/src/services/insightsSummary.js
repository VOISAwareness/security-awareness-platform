/**
 * Insights' Summary: the report leadership reads first. Under the band's four
 * measures, the year: the Risk Score, clicks against reports, details given
 * away and the time to the first report, month by month; and what training
 * does to clicks. Pure functions on insights() output `m` and
 * peopleInsights() output `p`, so `node --test` can cover them. They count;
 * they never judge or advise.
 */

const rate = (n, of) => (of > 0 ? n / of : null);

/**
 * The Risk Score on day `t`, from the people's snapshots (`trend`, oldest
 * first, each { to, score }): the snapshot on that day, or between two the
 * straight line from one to the next, until the people API gives the score
 * for any day.
 */
export function scoreAt(trend, t) {
  if (!trend.length) return null;
  if (t <= trend[0].to) return trend[0].score;
  for (let i = 1; i < trend.length; i += 1) {
    const a = trend[i - 1]; const b = trend[i];
    if (t <= b.to) return a.score + ((b.score - a.score) * (t - a.to)) / (b.to - a.to);
  }
  return trend.at(-1).score;
}

/**
 * The Summary's charts, over the last six calendar months (m.period). `risk`: the Risk Score at
 * the end of each step. `months`: the campaigns' measures in each step
 * (a step without a campaign has no figures); `gave` is the Compromise
 * Rate, `avgReport` the average minutes to a report. Each point keeps its
 * axis label and its dates in words. `trained`: each month's Trained rate
 * (trainings completed of those assigned), from the 30-day step of the
 * people's figures ending nearest the month's end, as the Risk Score is.
 */
// the step of `trend` (each { to }) whose end is nearest `t`
const nearest = (trend, t) => trend.reduce((best, s) => (!best || Math.abs(s.to - t) < Math.abs(best.to - t) ? s : best), null);

export function trends(m, p) {
  const steps = m.period || [];
  const label = (s) => ({ to: s.to, axis: s.axis, range: s.range });
  return {
    risk: steps.map((s) => ({ ...label(s), score: scoreAt(p.trend, s.to) })),
    months: steps.map((s) => ({ ...label(s), campaigns: s.campaigns, hooked: s.hooked, reportRate: s.reportRate, gave: rate(s.compromised, s.delivered), avgReport: s.avgReport })),
    // the Trained rate of the 30-day step ending nearest each month's end
    trained: steps.map((s) => {
      const near = nearest(p.trend, s.to);
      return { ...label(s), rate: near?.completion ?? null, assigned: near?.assigned ?? null, completed: near?.completed ?? null };
    }),
  };
}
