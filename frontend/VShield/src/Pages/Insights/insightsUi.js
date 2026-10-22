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
// red (checked as an ordered ramp on both themes). Always with their words.
export const TIER_WORD = { low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical' };
export const TIER_RULE = {
  low: 'Reported, and never clicked',
  moderate: 'Clicked once, or never reported',
  high: 'Clicked more than once',
  critical: 'Gave details away',
};
export const tierInk = (isDark) => (isDark
  ? { low: 'rgba(255,255,255,0.16)', moderate: '#963A3B', high: '#E2625C', critical: '#F7B0A9' }
  : { low: '#D5DBE3', moderate: '#EBA09A', high: '#D9534F', critical: '#8E1C24' });
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
