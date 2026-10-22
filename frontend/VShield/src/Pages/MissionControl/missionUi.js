// Mission Control's shared look: type styles, number formats, the health
// colours and an icon for each kind of lure. Plain module (no JSX), so the
// page and its lenses share it without breaking fast refresh.
import { Banknote, Briefcase, CalendarDays, KeyRound, Mail, Monitor, Package, Users } from 'lucide-react';

export const eyebrow = { fontSize: 8.5, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' };
export const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };
export const heads = { ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' };

const none = (v) => v === null || v === undefined || !Number.isFinite(v);
export const num = (n) => (none(n) ? '—' : Math.round(n).toLocaleString('en-US'));
export const pc = (v) => (none(v) ? '—' : `${Math.round(v * 100)}%`);
export const pc1 = (v) => (none(v) ? '—' : `${(v * 100).toFixed(1)}%`);
export const times = (v) => (none(v) ? '—' : `${v.toFixed(1)}×`);
export const mins = (v) => (none(v) ? '—' : `${Math.round(v)} min`);

// Health (health() in bigPictureViews.js): teal for Protected, red for
// Exposed, slate for Holding; always with its word beside it.
export const STEADY_INK = '#94A3B8';
export const healthInk = (word, ink) => (word === 'Protected' ? ink.good : word === 'Exposed' ? ink.bad : STEADY_INK);
export const HEALTH_RULE = 'Protected: 2 or more reports for every click · Holding: at least 1 · Exposed: fewer reports than clicks';

const LURE_ICON = { 'Credential theft': KeyRound, 'Finance lure': Banknote, 'HR lure': Users, 'IT lure': Monitor, 'Event lure': CalendarDays, 'Delivery lure': Package, 'Business lure': Briefcase };
export const lureIcon = (type) => LURE_ICON[type] || Mail;

// Moving between lenses and views: a short slide in the direction of travel,
// a fade alone for reduced motion.
export const EASE = [0.16, 1, 0.3, 1];
export const slide = (reduce, dir = 1) => ({
  initial: { opacity: 0, x: reduce ? 0 : 26 * dir },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: reduce ? 0 : -26 * dir },
  transition: { duration: reduce ? 0.12 : 0.26, ease: EASE },
});
