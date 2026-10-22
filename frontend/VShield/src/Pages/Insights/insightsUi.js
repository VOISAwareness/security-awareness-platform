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

// Health (health() in bigPictureViews.js): emerald for Protected, amber for
// Holding, red for Exposed (an alert); always with its word beside it.
// Slate is the quiet neutral: averages, things that are only a measure.
export const STEADY_INK = '#94A3B8';
export const healthInk = (word, ink) => (word === 'Protected' ? ink.good : word === 'Exposed' ? ink.alert : ink.bad);
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

// Risk tiers: teal for low, amber for moderate, crimson for high and
// Vodafone red for critical. Crimson is a deep one so it never passes for
// the red beside it (checked for colour-blind and full-colour readers on
// both themes). Always with their words.
export const TIER_WORD = { low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical' };
export const TIER_RULE = {
  low: 'Reported, and never clicked',
  moderate: 'Clicked once, or never reported',
  high: 'Clicked more than once',
  critical: 'Gave details away',
};
export const tierInk = (isDark) => (isDark
  ? { low: '#0D9488', moderate: '#D97706', high: '#BE123C', critical: '#FF4545' }
  : { low: '#0D9488', moderate: '#F59E0B', high: '#9F1239', critical: '#E60000' });
// The ink that reads on each tier's colour.
export const TIER_TEXT = { low: '#FFFFFF', moderate: '#1C1917', high: '#FFFFFF', critical: '#FFFFFF' };
// The risk score in a word, and its tier: under 20 low, under 35 moderate,
// under 60 high, critical from there (the tiers' own weights: 0, 33, 67, 100).
export const tierOf = (score) => (score < 20 ? 'low' : score < 35 ? 'moderate' : score < 60 ? 'high' : 'critical');
export const riskWord = (score) => (!Number.isFinite(score) ? '—' : `${TIER_WORD[tierOf(score)]} risk`);
export const riskInk = (score, isDark) => tierInk(isDark)[tierOf(score)];

// A risk score as a colour and the ink on it, by the tier it falls in, so a
// department's tile says what its number means.
export function riskBands(isDark) {
  const c = tierInk(isDark);
  return {
    tiers: ['low', 'moderate', 'high', 'critical'].map((k) => ({ key: k, color: c[k] })),
    fill: (v) => c[tierOf(v)],
    ink: (v) => TIER_TEXT[tierOf(v)],
  };
}

// A soft glow behind a few headline numbers on the dark theme only: the
// risk score, the Report Rate and the programme's health. Small, so it
// reads as finish rather than as a game.
export const glow = (hex, isDark, a = 0.3) => {
  if (!isDark || !/^#[0-9a-f]{6}$/i.test(hex)) return 'none';
  const [r, g, b] = hex.slice(1).match(/../g).map((x) => parseInt(x, 16));
  return `0 0 20px rgba(${r},${g},${b},${a})`;
};

const LURE_ICON = { 'Credential theft': KeyRound, 'Finance lure': Banknote, 'HR lure': Users, 'IT lure': Monitor, 'Event lure': CalendarDays, 'Delivery lure': Package, 'Business lure': Briefcase };
export const lureIcon = (type) => LURE_ICON[type] || Mail;
// "Finance lure" -> "Finance", "Credential theft" -> "Credentials", for tight labels
export const lureShort = (type) => (type === 'Credential theft' ? 'Credentials' : type.replace(/ lure$/i, ''));

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

// What people did with the emails: reported, ignored, clicked, gave details away.
export function didParts({ delivered, reported, clicked, compromised }, ink, isDark) {
  return [
    { key: 'reported', label: 'Reported it', value: reported, color: ink.good, text: num(reported) },
    { key: 'ignored', label: 'Ignored it', value: Math.max(0, delivered - reported - clicked), color: isDark ? '#3A4150' : '#CBD5E1', text: num(Math.max(0, delivered - reported - clicked)) },
    { key: 'clicked', label: 'Clicked, no more', value: Math.max(0, clicked - compromised), color: ink.bad, text: num(clicked - compromised) },
    { key: 'gave', label: 'Gave details away', value: compromised, color: ink.danger, text: num(compromised) },
  ];
}

// Insights' colours: these families and nothing else, checked for
// colour-blind separation and contrast on both themes.
//   brand   Vodafone red: the tabs and period chosen, the key buttons, alerts
//   good    emerald: protected, reported, better
//   bad     amber: clicked, worse, moderate risk
//   danger  crimson: high risk, details given away; alert: red, for Exposed
//   neutral slate: anything that is only a measure
export const INK = {
  light: { brand: '#E60000', good: '#10B981', bad: '#F59E0B', danger: '#9F1239', alert: '#DC2626', neutral: '#64748B' },
  dark: { brand: '#FF4545', good: '#059669', bad: '#D97706', danger: '#BE123C', alert: '#EF4444', neutral: '#94A3B8' },
};

// The washes behind a profile's band and a finding's clay piece, by tone:
// amber for worse, emerald for better, slate for what is only to watch.
export const TINT = {
  light: {
    bad: { wash: 'linear-gradient(135deg,#FFFBEB 0%,#FFFDF6 60%,#FFFFFF 100%)', edge: '#FCE7B2' },
    good: { wash: 'linear-gradient(135deg,#ECFDF5 0%,#F5FEFA 60%,#FFFFFF 100%)', edge: '#C6EFDC' },
    watch: { wash: 'linear-gradient(135deg,#F1F5F9 0%,#F8FAFC 60%,#FFFFFF 100%)', edge: '#E2E8F0' },
  },
  dark: {
    bad: { wash: 'linear-gradient(135deg,rgba(217,119,6,0.14) 0%,rgba(217,119,6,0.04) 70%,rgba(255,255,255,0.01) 100%)', edge: 'rgba(217,119,6,0.26)' },
    good: { wash: 'linear-gradient(135deg,rgba(16,185,129,0.14) 0%,rgba(16,185,129,0.04) 70%,rgba(255,255,255,0.01) 100%)', edge: 'rgba(16,185,129,0.26)' },
    watch: { wash: 'linear-gradient(135deg,rgba(148,163,184,0.10) 0%,rgba(148,163,184,0.03) 70%,rgba(255,255,255,0.01) 100%)', edge: 'rgba(148,163,184,0.18)' },
  },
};
