/**
 * The risk tiers and the Risk Score, as Insights and the backend
 * (insights-api) work them out: a person's tier from their last 90 days
 * (critical gave details away, high clicked more than once, moderate clicked
 * once or never reported, low reported and never clicked), and the score as
 * everyone's tier on 0 to 100, averaged.
 */
export const TIERS = Object.freeze(['low', 'moderate', 'high', 'critical']);
export const TIER_WEIGHT = Object.freeze({ low: 0, moderate: 1 / 3, high: 2 / 3, critical: 1 });
export const STEP_DAYS = 30; // the organisation comes in thirty-day steps

/** Everyone's tier averaged on 0-100, from counts by tier. */
export function riskScore(tiers) {
  const n = TIERS.reduce((a, t) => a + (tiers[t] || 0), 0);
  return n ? (TIERS.reduce((a, t) => a + (tiers[t] || 0) * TIER_WEIGHT[t], 0) / n) * 100 : null;
}
