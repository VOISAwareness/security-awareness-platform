/**
 * The story the sample data tells until real data arrives, so that Insights'
 * three periods differ the way real ones do:
 *
 *   a strong spring, a slip two to three months before the newest campaign,
 *   and a recovery in the last month.
 *
 * Each period is set against the one before it, so:
 *   30 days - getting better: Protected, the risk score falling
 *   60 days - steady:         Holding, the risk score about the same
 *   90 days - getting worse:  Not protected, the risk score rising
 *
 * Ages are days before the newest campaign. Pure, so `node --test` can
 * cover it.
 */

// How exposed people are: 0 at the best it got, about 1.3 two years back.
// The sample organisation turns it into risk tiers.
const EXPOSURE = [[0, 0.3], [30, 0.66], [60, 0.3], [90, 0], [120, 0.08], [720, 1.3]];

/** How exposed people were `age` days before the newest campaign (straight lines between the points above). */
export function exposure(age) {
  if (age <= EXPOSURE[0][0]) return EXPOSURE[0][1];
  for (let i = 1; i < EXPOSURE.length; i += 1) {
    const [a1, v1] = EXPOSURE[i];
    if (age <= a1) {
      const [a0, v0] = EXPOSURE[i - 1];
      return v0 + ((v1 - v0) * (age - a0)) / (a1 - a0);
    }
  }
  return EXPOSURE.at(-1)[1];
}

// What a campaign of each age got, thirty days at a time, newest first: the
// share of its emails clicked and the share reported.
const MONTHS = [
  { click: 0.1, report: 0.25 }, // the last 30 days: recovered
  { click: 0.2, report: 0.11 }, // 30 to 60 days back: still slipping
  { click: 0.25, report: 0.09 }, // 60 to 90 days back: the slip
  { click: 0.05, report: 0.27 }, // 90 to 120 days back: the strong spring
  { click: 0.09, report: 0.26 }, // before that
];

/** The click and report rates a campaign started `age` days before the newest one is drawn around. */
export function climate(age) {
  const month = age <= 30 ? 0 : Math.ceil(age / 30) - 1;
  return MONTHS[Math.min(Math.max(0, month), MONTHS.length - 1)];
}
