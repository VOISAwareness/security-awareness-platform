// Insights' shared look: type styles, number formats, the health colours,
// an icon for each kind of lure, and how things move. Plain module (no JSX),
// so the page, its charts and its tabs share it without breaking fast
// refresh.
import { Banknote, Briefcase, CalendarDays, KeyRound, Mail, Monitor, Package, Users } from 'lucide-react';

export const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };
export const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };
export const heads = { ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' };
export const cardTitle = { display: 'block', fontSize: 12.5, fontWeight: 800, letterSpacing: '-0.005em', color: 'var(--text)' };

const none = (v) => v === null || v === undefined || !Number.isFinite(v);
export const num = (n) => (none(n) ? '—' : Math.round(n).toLocaleString('en-US'));
export const pc = (v) => (none(v) ? '—' : `${Math.round(v * 100)}%`);
export const pc1 = (v) => (none(v) ? '—' : `${(v * 100).toFixed(1)}%`);
export const times = (v) => (none(v) ? '—' : `${v.toFixed(1)}×`);
export const mins = (v) => (none(v) ? '—' : `${Math.round(v)} min`);
export const day = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// Health (health() in bigPictureViews.js): teal for Protected, red for
// Exposed, slate for Holding; always with its word beside it.
export const STEADY_INK = '#94A3B8';
export const healthInk = (word, ink) => (word === 'Protected' ? ink.good : word === 'Exposed' ? ink.bad : STEADY_INK);
export const HEALTH_RULE = 'Protected: 2 or more reports for every click · Holding: at least 1 · Exposed: fewer reports than clicks';

/**
 * A change against the period before, as a chip says it: the arrow, the
 * size ("2.1 pts", "0.3×", "4 min") and whether it is better or worse.
 * `kind` is 'pct' (a fraction; points), 'times' or 'min'; `better` is
 * 'up' or 'down'. Null when there is nothing to set it against.
 */
export function change(now, before, { kind, better }) {
  if (none(now) || none(before)) return null;
  const d = now - before;
  const size = kind === 'pct' ? Math.abs(d * 100) : Math.abs(d);
  const shown = kind === 'pct' ? `${size.toFixed(1)} pts` : kind === 'times' ? `${size.toFixed(1)}×` : `${Math.round(size)} min`;
  const flat = kind === 'pct' ? size < 0.05 : kind === 'times' ? size < 0.05 : Math.round(size) === 0;
  if (flat) return { dir: 'flat', shown: 'No change', good: null };
  const dir = d > 0 ? 'up' : 'down';
  return { dir, shown, good: dir === better };
}

// Risk tiers: low risk stays quiet; the three risk tiers run light to dark
// indigo (checked as an ordered ramp on both themes). Always with their words.
export const TIER_WORD = { low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical' };
export const TIER_RULE = {
  low: 'Reported, and never clicked',
  moderate: 'Clicked once, or never reported',
  high: 'Clicked more than once',
  critical: 'Gave details away',
};
export const tierInk = (isDark) => (isDark
  ? { low: 'rgba(255,255,255,0.16)', moderate: '#4347A8', high: '#7A7FE2', critical: '#C3C6F7' }
  : { low: '#D5DBE3', moderate: '#A5ABEF', high: '#5257CC', critical: '#20216B' });
// The risk score in a word: under 20 low, under 35 moderate, under 60
// high, critical from there (the tiers' own weights: 0, 33, 67, 100).
export const riskWord = (score) => (!Number.isFinite(score) ? '—' : score < 20 ? 'Low risk' : score < 35 ? 'Moderate risk' : score < 60 ? 'High risk' : 'Critical risk');

// The department map's five steps of indigo, lighter for less risk, and
// the ink that reads on each; on the dark theme, brighter for more risk.
const RAMP = {
  light: ['#A5ABEF', '#7B81E3', '#5257CC', '#34369F', '#20216B'],
  dark: ['#4347A8', '#5A5FCF', '#7A7FE2', '#9EA2EE', '#C3C6F7'],
};
export function riskRamp(isDark, lo, hi) {
  const steps = RAMP[isDark ? 'dark' : 'light'];
  const at = (v) => Math.max(0, Math.min(steps.length - 1, Math.round(((v - lo) / (hi - lo || 1)) * (steps.length - 1))));
  return {
    steps,
    fill: (v) => steps[at(v)],
    ink: (v) => (isDark ? (at(v) >= 3 ? '#1C1E24' : '#F8FAFC') : (at(v) <= 0 ? '#1E1B4B' : '#FFFFFF')),
  };
}

// Opened, beside clicked (red) and reported (teal) on one chart.
export const openInk = (isDark) => (isDark ? '#7C7FF2' : '#6366F1');

const LURE_ICON = { 'Credential theft': KeyRound, 'Finance lure': Banknote, 'HR lure': Users, 'IT lure': Monitor, 'Event lure': CalendarDays, 'Delivery lure': Package, 'Business lure': Briefcase };
export const lureIcon = (type) => LURE_ICON[type] || Mail;
// "Finance lure" -> "Finance", "Credential theft" -> "Credentials", for tight labels
export const lureShort = (type) => (type === 'Credential theft' ? 'Credentials' : type.replace(/ lure$/i, ''));

// How things move: one easing for everything, a spring for things that
// slide between places, and a short blur-and-rise for what comes in.
export const EASE = [0.22, 1, 0.36, 1];
export const SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 };
// A card pops in: it rises a little, grows to size and comes into focus,
// one after another.
export const rise = (reduce, i = 0) => ({
  initial: { opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.96, filter: reduce ? 'none' : 'blur(8px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' },
  transition: { duration: reduce ? 0.01 : 0.6, delay: reduce ? 0 : 0.07 * i, ease: EASE },
});
export const swap = (reduce) => ({
  initial: { opacity: 0, y: reduce ? 0 : 10, filter: reduce ? 'none' : 'blur(8px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: reduce ? 0 : -8, filter: reduce ? 'none' : 'blur(6px)' },
  transition: { duration: reduce ? 0.12 : 0.38, ease: EASE },
});

// What people did with the emails: reported, ignored, clicked, gave details away.
export function didParts({ delivered, reported, clicked, compromised }, ink, isDark) {
  return [
    { key: 'reported', label: 'Reported it', value: reported, color: ink.good, text: num(reported) },
    { key: 'ignored', label: 'Ignored it', value: Math.max(0, delivered - reported - clicked), color: isDark ? '#5B6474' : '#C9D1DC', text: num(Math.max(0, delivered - reported - clicked)) },
    { key: 'clicked', label: 'Clicked, no more', value: Math.max(0, clicked - compromised), color: isDark ? '#C26A26' : '#F0A35E', text: num(clicked - compromised) },
    { key: 'gave', label: 'Gave details away', value: compromised, color: isDark ? '#F5B47A' : '#B45309', text: num(compromised) },
  ];
}

// Insights' colours, checked for colour-blind separation and contrast on
// both themes: indigo for risk (darker for more on the light theme,
// brighter on the dark), teal for better and for reporting, a soft orange
// for worse and for clicking. No red.
export const INK = {
  light: { good: '#0E9F8E', bad: '#E07B2E', risk: '#5257CC' },
  dark: { good: '#119485', bad: '#D47530', risk: '#9EA2EE' },
};

// The washes behind a profile's band and a finding's clay piece, by tone:
// orange for worse, teal for better, indigo for risk to watch.
export const TINT = {
  light: {
    bad: { wash: 'linear-gradient(135deg,#FFF3E8 0%,#FFF9F4 60%,#FFFFFF 100%)', edge: '#F7DCC4' },
    good: { wash: 'linear-gradient(135deg,#E9FAF6 0%,#F4FCFA 60%,#FFFFFF 100%)', edge: '#C9EEE7' },
    watch: { wash: 'linear-gradient(135deg,#EEEFFD 0%,#F6F6FE 60%,#FFFFFF 100%)', edge: '#DADCF7' },
  },
  dark: {
    bad: { wash: 'linear-gradient(135deg,rgba(224,123,46,0.16) 0%,rgba(224,123,46,0.05) 70%,rgba(224,123,46,0.02) 100%)', edge: 'rgba(224,123,46,0.30)' },
    good: { wash: 'linear-gradient(135deg,rgba(22,163,148,0.18) 0%,rgba(22,163,148,0.06) 70%,rgba(22,163,148,0.02) 100%)', edge: 'rgba(22,163,148,0.30)' },
    watch: { wash: 'linear-gradient(135deg,rgba(122,127,226,0.20) 0%,rgba(122,127,226,0.07) 70%,rgba(122,127,226,0.02) 100%)', edge: 'rgba(122,127,226,0.32)' },
  },
};
