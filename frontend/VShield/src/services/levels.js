/**
 * Levels, grades and badges: what a points total is worth.
 *
 * Seven levels of three grades each, earned with points, and three levels
 * below zero for people whose points have gone negative. A badge is worked
 * out from the points every time, never stored on its own, so it can't fall
 * out of step with them: points go down, the level goes down too.
 *
 * A total belongs to the band whose lower number it has reached: 0–49 is
 * Level 1 · Grade 1, 50–99 is Grade 2, and so on. A newcomer on 0 points is a
 * New Joiner. The ends are open: 4,450 and up stays Cyber Guardian · Grade 3,
 * anything below -200 is Critical Risk.
 *
 * Pure data and functions, so `node --test` can cover them. The badge
 * pictures live in GlobalComponents/badgeImages.js, keyed by `id`.
 */

// `color` is the badge's own clay colour (light screens); `light` the same
// hue lifted for text and bars on dark screens.
const FAMILIES = {
  L1: { level: 1, name: 'New Joiner', label: 'Beginner', risk: 'Unknown', color: '#7D7F84', light: '#C3C6CC' },
  L2: { level: 2, name: 'Aware User', label: 'Learning', risk: 'Medium Risk', color: '#3D63A1', light: '#8FB0E6' },
  L3: { level: 3, name: 'Safe Handler', label: 'Improving', risk: 'Medium-Low', color: '#4E6726', light: '#A9C97A' },
  L4: { level: 4, name: 'Phish Catcher', label: 'Strong', risk: 'Low Risk', color: '#296B6C', light: '#7FC9C7' },
  L5: { level: 5, name: 'Security Champion', label: 'Expert', risk: 'Very Low', color: '#8D681D', light: '#E8C46A' },
  L6: { level: 6, name: 'Security Defender', label: 'Elite', risk: 'Minimal Risk', color: '#503B6E', light: '#B9A2E0' },
  L7: { level: 7, name: 'Cyber Guardian', label: 'Top Tier', risk: 'Trusted', color: '#8E2A31', light: '#F09AA0' },
  L0: { level: 0, name: 'Awareness Needed', label: 'Novice', risk: 'High Risk', color: '#AA771F', light: '#F2C66B' },
  LN1: { level: -1, name: 'Vulnerable User', label: 'At Risk', risk: 'Very High Risk', color: '#AA4916', light: '#F59A64' },
  LN2: { level: -2, name: 'Critical Risk', label: 'Critical', risk: 'Severe Risk', color: '#721C24', light: '#E7838C' },
};

// Lowest first. `min` counts, `max` doesn't; null means open-ended.
// ids: L<level>G<grade>, L0, and LN1 / LN2 for Level -1 / -2.
const BANDS = [
  ['LN2', null, null, -200],
  ['LN1', null, -200, -100],
  ['L0', null, -100, 0],
  ['L1', 1, 0, 50], ['L1', 2, 50, 100], ['L1', 3, 100, 150],
  ['L2', 1, 150, 200], ['L2', 2, 200, 250], ['L2', 3, 250, 300],
  ['L3', 1, 300, 450], ['L3', 2, 450, 600], ['L3', 3, 600, 750],
  ['L4', 1, 750, 950], ['L4', 2, 950, 1150], ['L4', 3, 1150, 1300],
  ['L5', 1, 1300, 1600], ['L5', 2, 1600, 1900], ['L5', 3, 1900, 2200],
  ['L6', 1, 2200, 2600], ['L6', 2, 2600, 3000], ['L6', 3, 3000, 3400],
  ['L7', 1, 3400, 3900], ['L7', 2, 3900, 4450], ['L7', 3, 4450, null],
];

export const LEVELS = Object.freeze(
  BANDS.map(([family, grade, min, max], rank) =>
    Object.freeze({
      id: grade ? `${family}G${grade}` : family,
      family,
      grade,
      min,
      max,
      rank, // 0 = lowest; compare ranks to tell up from down
      ...FAMILIES[family],
    }),
  ),
);

export const LEVEL_BY_ID = Object.freeze(Object.fromEntries(LEVELS.map((l) => [l.id, l])));

/** The roles that see everyone's level, negative ones and risk included. */
export const ADMIN_ROLES = Object.freeze(['Admin']);

function toPoints(points) {
  if (points === null || points === undefined || points === '') return null;
  const n = typeof points === 'number' ? points : Number(String(points).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** The level a points total earns; null when the total is unknown. */
export function levelFor(points) {
  const p = toPoints(points);
  if (p === null) return null;
  return LEVELS.find((l) => (l.min === null || p >= l.min) && (l.max === null || p < l.max)) || null;
}

/** A level by id, or the level of a points total. */
export function resolveLevel({ levelId, points } = {}) {
  if (levelId && LEVEL_BY_ID[levelId]) return LEVEL_BY_ID[levelId];
  return levelFor(points);
}

export const isNegative = (level) => Boolean(level) && level.level <= 0;

/** "Level 3 · Grade 2", or "Level -1" for the levels without grades. */
export function levelTitle(level) {
  if (!level) return '';
  return level.grade ? `Level ${level.level} · Grade ${level.grade}` : `Level ${level.level}`;
}

/** Screen-reader name: "Level 3, Grade 2: Safe Handler". */
export function levelAltText(level) {
  if (!level) return '';
  return `${levelTitle(level).replace(' · ', ', ')}: ${level.name}`;
}

const fmt = (n) => n.toLocaleString('en-US');

/** The points a level covers: "300–449 pts", "-100 to -1 pts", "4,450+ pts", "below -200 pts". */
export function rangeText(level) {
  if (!level) return '';
  return spanText(level.min, level.max);
}

function spanText(min, max) {
  if (min === null) return `below ${fmt(max)} pts`;
  if (max === null) return `${fmt(min)}+ pts`;
  const sep = min < 0 ? ' to ' : '–'; // "-100 to -1" reads better than "-100–-1"
  return `${fmt(min)}${sep}${fmt(max - 1)} pts`;
}

/** Grades as players read them: I, II, III. */
export const ROMAN = Object.freeze(['', 'I', 'II', 'III']);

/** "Phish Catcher · III", or just "Critical Risk" for the levels without grades. */
export function gradeName(level) {
  if (!level) return '';
  return level.grade ? `${level.name} · ${ROMAN[level.grade]}` : level.name;
}

/** Levels 1 to 7, each as its three grades, lowest first. */
export const LEVEL_FAMILIES = Object.freeze(
  [1, 2, 3, 4, 5, 6, 7].map((n) => Object.freeze(LEVELS.filter((l) => l.level === n))),
);

/** The levels below Level 1, highest first: 0, -1, -2. */
export const BELOW_LEVELS = Object.freeze(LEVELS.filter((l) => l.level <= 0).reverse());

/** The points a whole level covers, its grades together: "750–1,299 pts", "3,400+ pts". */
export function familyRangeText(grades) {
  if (!grades || !grades.length) return '';
  return spanText(grades[0].min, grades.at(-1).max);
}

/**
 * The steps My Space shows around a level: its three grades, then the next
 * level's first grade. At Cyber Guardian there is no next level, so just the
 * three grades. Below zero, the way back: Level -2, -1, 0, then New Joiner.
 *
 * Each step is { level, state }: 'done' (a grade already passed), 'current',
 * 'ahead' (not reached yet) or 'below' (a level under yours below zero, which
 * is nothing to tick off).
 */
export function stepsAround(level) {
  if (!level) return [];
  const steps = level.grade
    ? [...LEVEL_FAMILIES[level.level - 1], LEVELS[LEVEL_FAMILIES[level.level - 1].at(-1).rank + 1]].filter(Boolean)
    : [...BELOW_LEVELS].reverse().concat(LEVEL_BY_ID.L1G1);
  return steps.map((l) => {
    let state = 'ahead';
    if (l.rank === level.rank) state = 'current';
    else if (l.rank < level.rank) state = l.level > 0 ? 'done' : 'below';
    return { level: l, state };
  });
}

// Level -2 has no floor; its bar is drawn as if it started here.
const DISPLAY_FLOOR = -400;

/**
 * Where a total stands: its level, the next one up, the points still needed
 * and how far along the current band it is (0–100). At the top, `next` is
 * null and the bar is full.
 */
export function progressFor(points) {
  const p = toPoints(points);
  const level = levelFor(p);
  if (!level) return null;
  const next = LEVELS[level.rank + 1] || null;
  if (!next) return { points: p, level, next: null, toNext: 0, pct: 100, isTop: true };
  const lo = level.min === null ? Math.min(DISPLAY_FLOOR, p) : level.min;
  const pct = Math.round(Math.min(100, Math.max(0, ((p - lo) / (level.max - lo)) * 100)));
  return { points: p, level, next, toNext: level.max - p, pct, isTop: false };
}

/** 'up', 'down' or null, between two level ids (or levels). */
export function levelChange(from, to) {
  const a = typeof from === 'string' ? LEVEL_BY_ID[from] : from;
  const b = typeof to === 'string' ? LEVEL_BY_ID[to] : to;
  if (!a || !b || a.rank === b.rank) return null;
  return b.rank > a.rank ? 'up' : 'down';
}

/** The higher of two levels (for "best level reached"). */
export function higherLevel(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return b.rank > a.rank ? b : a;
}

// Where each risk category sits on a green-to-red scale (0-100). "Unknown"
// (New Joiner) has no place on it yet.
const RISK_SCALE = {
  Trusted: 4,
  'Minimal Risk': 12,
  'Very Low': 22,
  'Low Risk': 34,
  'Medium-Low': 46,
  'Medium Risk': 58,
  'High Risk': 74,
  'Very High Risk': 86,
  'Severe Risk': 96,
};

/** A level's risk on the 0 (safe) to 100 (severe) scale; null when unknown. */
export function riskPosition(level) {
  const v = level ? RISK_SCALE[level.risk] : undefined;
  return v === undefined ? null : v;
}

const mix = (a, b, t) => Math.round(a + (b - a) * t);
const hex = (n) => n.toString(16).padStart(2, '0');

/** The colour at a point of the green (0) - amber (50) - red (100) scale. */
export function riskColor(position) {
  if (position === null || position === undefined) return '#64748B';
  const p = Math.min(100, Math.max(0, position));
  const [from, to, t] = p <= 50 ? [[34, 197, 94], [234, 179, 8], p / 50] : [[234, 179, 8], [239, 68, 68], (p - 50) / 50];
  return `#${from.map((c, i) => hex(mix(c, to[i], t))).join('')}`.toUpperCase();
}

const isAdmin = (role) => ADMIN_ROLES.includes(role);

/**
 * Whether a viewer may see someone's badge. Everyone sees the levels from 1
 * up; the levels at 0 and below are seen only by the person themselves and
 * by admins (the badges say "Critical Risk" on them).
 */
export function canSeeBadge({ level, isSelf = false, viewerRole } = {}) {
  if (!level) return false;
  return isSelf || isAdmin(viewerRole) || !isNegative(level);
}

/** Whether a viewer may see someone's risk category: themselves and admins. */
export function canSeeRisk({ isSelf = false, viewerRole } = {}) {
  return isSelf || isAdmin(viewerRole);
}
