/**
 * The programme's targets: where each measure on Insights should be. An
 * admin will set them; until then these defaults stand. Each target has:
 *   better - the direction that is better ('down' or 'up');
 *   target - on track up to it ('down') or from it ('up');
 *   atRisk - at risk up to (or from) it; off track beyond;
 *   max    - where the band's scale ends.
 * Rates are fractions; the Risk Score is out of 100; times are minutes.
 */
export const TARGETS = Object.freeze({
  riskScore: { better: 'down', target: 20, atRisk: 35, max: 50 },
  highRiskShare: { better: 'down', target: 0.1, atRisk: 0.15, max: 0.25 },
  hookRate: { better: 'down', target: 0.05, atRisk: 0.1, max: 0.2 },
  reportRate: { better: 'up', target: 0.5, atRisk: 0.3, max: 0.8 },
  gaveDetails: { better: 'down', target: 0.01, atRisk: 0.03, max: 0.1 },
  firstReport: { better: 'down', target: 15, atRisk: 30, max: 40 },
  trainingCompletion: { better: 'up', target: 0.9, atRisk: 0.8, max: 1 },
});

/** Where a value stands against its target: 'on' (on track), 'risk' (at risk) or 'off' (off track); null without a value. */
export function standing(value, t) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (t.better === 'down') return value <= t.target ? 'on' : value <= t.atRisk ? 'risk' : 'off';
  return value >= t.target ? 'on' : value >= t.atRisk ? 'risk' : 'off';
}

/** The scale from 0 to `max` in its three stretches, left to right: { from, to, standing }. */
export function zones(t) {
  const [a, b] = t.better === 'down' ? [t.target, t.atRisk] : [t.atRisk, t.target];
  const order = t.better === 'down' ? ['on', 'risk', 'off'] : ['off', 'risk', 'on'];
  return [[0, a], [a, b], [b, t.max]].map(([from, to], i) => ({ from, to, standing: order[i] }));
}

/** "≤ 20", "≥ 50%", "≤ 15 min": the target as it reads. */
export function targetText(t, unit = '') {
  const v = unit === '%' ? `${Math.round(t.target * 100)}%` : `${t.target}${unit ? ` ${unit}` : ''}`;
  return `${t.better === 'down' ? '≤' : '≥'} ${v}`;
}
