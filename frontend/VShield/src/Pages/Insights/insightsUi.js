// Insights' shared look: type styles (on the one scale in insightsType.js),
// number formats, the health colours, an icon for each kind of lure, and how
// things move. Plain module (no JSX), so the page, its charts and its tabs
// share it without breaking fast refresh.
import { FormInput, Gift, Headset, KeyRound, Mail, MousePointerClick, Plane } from 'lucide-react';

import { typeShort } from '../../services/campaignTypes';

import { INK, tierInk, tierText } from './insightsColours';
import { TYPE } from './insightsType';

export { TYPE, onScale } from './insightsType';
export const eyebrow = { fontSize: TYPE.label, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };
export const small = { fontSize: TYPE.small, fontWeight: 600, color: 'var(--muted)' };
export const heads = { ...small, fontSize: TYPE.label, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' };
export const cardTitle = { display: 'block', fontSize: TYPE.title, fontWeight: 800, letterSpacing: '-0.005em', color: 'var(--text)' };
// A card's title line is as tall as the buttons and switches beside it, so
// they all sit on one centre line, in every card alike.
export const HEAD_H = 26;

const none = (v) => v === null || v === undefined || !Number.isFinite(v);
export const num = (n) => (none(n) ? '—' : Math.round(n).toLocaleString('en-US'));
export const pc = (v) => (none(v) ? '—' : `${Math.round(v * 100)}%`);
export const pc1 = (v) => (none(v) ? '—' : `${(v * 100).toFixed(1)}%`);
export const times = (v) => (none(v) ? '—' : `${v.toFixed(1)}×`);
export const mins = (v) => (none(v) ? '—' : `${Math.round(v)} min`);
export const day = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// The colours (roles, health, risk levels, washes, theme variables) live in
// insightsColours.js, a plain module the tests load; they are shared from here.
export { INK, ROLES, STEADY_INK, TIER_TEXT, TINT, alpha, healthInk, healthTone, mixHex, themeVars, tierInk, tierText } from './insightsColours';
// The words people read for health come from the app's glossary.
export { HEALTH_RULE, HEALTH_WORD } from '../../services/glossary';

/**
 * A change against the period before, as a chip says it: the arrow, the
 * size ("2.1 pts", "0.3×", "4 min", "1,204") and whether it is better or
 * worse. `kind` is 'pct' (a fraction; points), 'times', 'min', 'count' or
 * 'pts' (a score); `better` is 'up', 'down', or null for a measure that is
 * neither (its `good` is then null). Null when there is nothing to set it
 * against.
 */
export function change(now, before, { kind, better }) {
  if (none(now) || none(before)) return null;
  const d = now - before;
  const size = kind === 'pct' ? Math.abs(d * 100) : Math.abs(d);
  const fine = kind === 'pct' || kind === 'times' || kind === 'pts';
  const shown = kind === 'pct' || kind === 'pts' ? `${size.toFixed(1)} pts` : kind === 'times' ? `${size.toFixed(1)}×` : kind === 'count' ? num(size) : `${Math.round(size)} min`;
  const flat = fine ? size < 0.05 : Math.round(size) === 0;
  if (flat) return { dir: 'flat', shown: 'No change', good: null };
  const dir = d > 0 ? 'up' : 'down';
  return { dir, shown, good: better ? dir === better : null };
}

// Risk tiers: green for low, amber for moderate, red for high and deep red
// for critical (insightsColours.js). Always with their words.
export const TIER_WORD = { low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical' };
export const TIER_RULE = {
  low: 'Reported, and never clicked',
  moderate: 'Clicked once, or never reported',
  high: 'Clicked more than once',
  critical: 'Gave details away',
};
// The risk score in a word, and its tier: under 20 low, under 35 moderate,
// under 60 high, critical from there (the tiers' own weights: 0, 33, 67, 100).
export const tierOf = (score) => (score < 20 ? 'low' : score < 35 ? 'moderate' : score < 60 ? 'high' : 'critical');
export const riskWord = (score) => (!Number.isFinite(score) ? '—' : `${TIER_WORD[tierOf(score)]} risk`);
export const riskInk = (score, isDark) => tierInk(isDark)[tierOf(score)];

// A risk score as a colour and the ink on it, by the tier it falls in, so a
// department's tile says what its number means.
export function riskBands(isDark) {
  const c = tierInk(isDark);
  const t = tierText(isDark);
  return {
    tiers: ['low', 'moderate', 'high', 'critical'].map((k) => ({ key: k, color: c[k] })),
    fill: (v) => c[tierOf(v)],
    ink: (v) => t[tierOf(v)],
  };
}

// A soft glow behind a few headline numbers on the dark theme only: the
// risk score, the Report Rate and the programme's health. Small, so it
// reads as finish rather than as a game. Takes a hex or a role ('good').
export const glow = (color, isDark, a = 0.3) => {
  const hex = INK.dark[color] || color;
  if (!isDark || !/^#[0-9a-f]{6}$/i.test(hex)) return 'none';
  const [r, g, b] = hex.slice(1).match(/../g).map((x) => parseInt(x, 16));
  return `0 0 20px rgba(${r},${g},${b},${a})`;
};

// An icon for each campaign type (services/campaignTypes.js); a plain
// envelope for any other ("Custom", or an older scenario's type).
const TYPE_ICON = { 'Data Entry': FormInput, Click: MousePointerClick, 'Credential theft': KeyRound, 'Helpdesk impersonation': Headset, 'Reward scam': Gift, 'Travel scam': Plane };
export const lureIcon = (type) => TYPE_ICON[type] || Mail;
// "Credential theft" -> "Credentials", for tight labels
export const lureShort = typeShort;

// How far back the risk score is drawn: a year or two.
export const SPANS = [{ id: 12, label: '1Y', title: 'The last year' }, { id: 24, label: '2Y', title: 'The last two years' }];

// How things move: one easing for everything, a spring for things that
// slide between places, and a short blur-and-rise for what comes in.
export const EASE = [0.22, 1, 0.36, 1];
export const SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 };
// A card pops in: it rises a little, grows to size and comes into focus,
// one after another.
// Only opacity and transforms move: the browser hands those to the GPU,
// where a blur or a size would repaint or re-lay the page every frame.
export const rise = (reduce, i = 0) => ({
  initial: { opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: reduce ? 0.01 : 0.4, delay: reduce ? 0 : 0.035 * i, ease: EASE },
});
export const swap = (reduce) => ({
  initial: { opacity: 0, y: reduce ? 0 : 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: reduce ? 0 : -6, transition: { duration: reduce ? 0.08 : 0.18, ease: EASE } },
  transition: { duration: reduce ? 0.12 : 0.34, ease: EASE },
});

// What people did with the emails: reported (good), ignored (context, no
// verdict), clicked and no more (bad), gave details away (severe). `ink` is
// the theme's INK; callers may still pass isDark after it.
export function didParts({ delivered, reported, clicked, compromised }, ink) {
  return [
    { key: 'reported', label: 'Reported it', value: reported, color: ink.good, text: num(reported) },
    { key: 'ignored', label: 'Ignored it', value: Math.max(0, delivered - reported - clicked), color: ink.context, text: num(Math.max(0, delivered - reported - clicked)) },
    { key: 'clicked', label: 'Clicked, no more', value: Math.max(0, clicked - compromised), color: ink.bad, text: num(clicked - compromised) },
    { key: 'gave', label: 'Gave details away', value: compromised, color: ink.severe, text: num(compromised) },
  ];
}
