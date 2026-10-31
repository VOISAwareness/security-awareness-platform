/**
 * The programme's targets: where each measure on Insights should be. These
 * are the defaults; an admin may set others (GET/PUT /insights-targets), and
 * targetsWith() puts theirs in place. Each target has:
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

/** How each measure's values read: '%' for a rate (kept as a fraction), '' for the Risk Score (out of 100), 'min' for minutes. */
export const UNITS = Object.freeze({ riskScore: '', highRiskShare: '%', hookRate: '%', reportRate: '%', gaveDetails: '%', firstReport: 'min', trainingCompletion: '%' });
// the most a value can be: a whole rate, the top of the Risk Score, a day
const LIMIT = { '': 100, '%': 1, min: 1440 };
const limitText = { '': '100', '%': '100%', min: '1,440 min' };

/** Why `target` and `atRisk` (as stored: rates as fractions) cannot stand for measure `key`, or null if they can. */
export function checkTargets(key, target, atRisk) {
  const d = TARGETS[key];
  if (!d) return 'There is no such measure';
  const hi = LIMIT[UNITS[key]];
  const fits = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= hi;
  if (!fits(target) || !fits(atRisk)) return `Use numbers from 0 to ${limitText[UNITS[key]]}`;
  if (d.better === 'down' && target >= atRisk) return 'The target must be below where off track starts';
  if (d.better === 'up' && target <= atRisk) return 'The target must be above where off track starts';
  return null;
}

/**
 * The targets in force: the defaults, with what an admin has set in place of
 * theirs (`set`: GET /insights-targets' { measure: { target, atRisk } }).
 * A set measure's scale grows to show its edges; anything unknown or that
 * cannot stand is left at its default.
 */
export function targetsWith(set) {
  const out = {};
  for (const [key, d] of Object.entries(TARGETS)) {
    const s = set && typeof set === 'object' ? set[key] : null;
    if (!s || checkTargets(key, s.target, s.atRisk) !== null) { out[key] = d; continue; }
    const edge = d.better === 'down' ? s.atRisk : s.target;
    out[key] = Object.freeze({ ...d, target: s.target, atRisk: s.atRisk, max: Math.min(LIMIT[UNITS[key]], Math.max(d.max, edge * 1.25)) });
  }
  return Object.freeze(out);
}

// a value kept to the precision its measure shows: rates to 0.1%, the Risk
// Score to 0.1, minutes to the minute
const tidy = (key, v) => {
  const u = UNITS[key];
  return u === '%' ? Math.round(v * 1000) / 1000 : u === 'min' ? Math.round(v) : Math.round(v * 10) / 10;
};

/**
 * A target with its at-risk edge, for the dialog that asks only for the
 * target: the edge keeps the default's proportion to its target (Hook Rate:
 * 5% and 10%, so a target of 4% is at risk up to 8%), within the measure's
 * range.
 */
export function pairFor(key, target) {
  const d = TARGETS[key];
  const atRisk = Math.min(LIMIT[UNITS[key]], tidy(key, target * (d.atRisk / d.target)));
  return { target, atRisk };
}

/** Why `target` (as stored: a rate as a fraction) cannot be measure `key`'s target in the one-number dialog, or null if it can. */
export function checkTarget(key, target) {
  const u = UNITS[key];
  const hi = LIMIT[u];
  if (typeof target !== 'number' || !Number.isFinite(target) || target < 0 || target > hi) return `Use a number from 0 to ${limitText[u]}`;
  const { atRisk } = pairFor(key, target);
  if (checkTargets(key, target, atRisk) !== null) return TARGETS[key].better === 'down' ? `Use a number below ${limitText[u]}` : 'Use a number above 0';
  return null;
}
