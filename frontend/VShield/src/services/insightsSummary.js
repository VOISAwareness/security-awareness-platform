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
 * The Summary's charts. `risk`: the Risk Score thirty days at a time over
 * twelve steps. `months`: the campaigns' measures thirty days at a time,
 * from the first step with a campaign (a step without one has no figures);
 * `gave` is details given away, of the emails delivered. `training`: the
 * click rates of people not yet trained and of people trained.
 */
export function trends(m, p) {
  const first = m.year.findIndex((s) => s.campaigns > 0);
  const year = first < 0 ? [] : m.year.slice(first);
  return {
    risk: p.trend.slice(-12).map((s) => ({ to: s.to, score: s.score })),
    months: year.map((s) => ({ to: s.to, campaigns: s.campaigns, hooked: s.hooked, reportRate: s.reportRate, gave: rate(s.compromised, s.delivered), firstReport: s.firstReport })),
    training: { untrained: p.now.cohorts?.untrainedRate ?? null, trained: p.now.cohorts?.trainedRate ?? null },
  };
}
