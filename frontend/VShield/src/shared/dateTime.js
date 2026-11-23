/**
 * dateTime: the one place the app decides how dates and times are shown.
 *
 * Every date and time is shown in UK time (Europe/London), with its label:
 * BST in summer, GMT in winter, as the UK changes its clocks. Change
 * APP_TIME_ZONE here and every screen follows. Campaign schedules picked in
 * the date & time picker are UK wall-clock times too (calendarDates.js turns
 * them into instants with zonedTimeToUtc).
 *
 * Values may be a Date, an ISO string ("2026-11-20T09:30:00Z"), a number
 * (epoch ms) or a stored wall-clock string ("2026-11-20T09:30", read as UK
 * time), or the older "10/05/2026 09:00 AM" form (also UK time). Anything
 * unreadable formats as ''. Pure, so `node --test` covers it.
 */
export const APP_TIME_ZONE = 'Europe/London';
export const APP_LOCALE = 'en-GB';

const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
// The older stored form, "10/05/2026 09:00 AM" (month first), also UK time.
const US_STAMP = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),?(?:\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?)?$/i;

const formatters = new Map();
function partsOf(date, options) {
  const key = JSON.stringify(options);
  if (!formatters.has(key)) formatters.set(key, new Intl.DateTimeFormat('en-US', { timeZone: APP_TIME_ZONE, hourCycle: 'h23', ...options }));
  return Object.fromEntries(formatters.get(key).formatToParts(date).map((p) => [p.type, p.value]));
}

/** UK wall clock of an instant: { year, month (0-11), day, hours, minutes, seconds, weekday (0-6) }. */
export function wallClockOf(date) {
  const p = partsOf(date, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' });
  return {
    year: Number(p.year),
    month: Number(p.month) - 1,
    day: Number(p.day),
    hours: Number(p.hour) % 24,
    minutes: Number(p.minute),
    seconds: Number(p.second),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

/** Minutes UK time is ahead of UTC at an instant: 60 in BST, 0 in GMT. */
function offsetMinutes(date) {
  const w = wallClockOf(date);
  return Math.round((Date.UTC(w.year, w.month, w.day, w.hours, w.minutes, w.seconds) - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** The instant a UK wall-clock time stands for ({ year, month 0-11, day, hours, minutes }). */
export function zonedTimeToUtc({ year, month, day, hours = 0, minutes = 0 }) {
  const asUtc = Date.UTC(year, month, day, hours, minutes);
  let instant = new Date(asUtc - offsetMinutes(new Date(asUtc)) * 60000);
  // Once more, for a time near the clock change.
  instant = new Date(asUtc - offsetMinutes(instant) * 60000);
  return instant;
}

/** A Date for any value the app stores, or null. Bare wall-clock strings are UK time. */
export function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') return Number.isFinite(value) ? new Date(value) : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const s = value.trim();
  const m = WALL_CLOCK.exec(s);
  if (m) {
    const [year, month, day, hours = 0, minutes = 0] = m.slice(1, 6).map((x) => Number(x || 0));
    if (month < 1 || month > 12 || day < 1 || day > 31 || hours > 23 || minutes > 59) return null;
    return zonedTimeToUtc({ year, month: month - 1, day, hours, minutes });
  }
  const us = US_STAMP.exec(s);
  if (us) {
    const [mm, dd, yyyy, hh = 0, min = 0] = us.slice(1, 6).map((x) => Number(x || 0));
    let hours = hh;
    if (us[6]) hours = (hh % 12) + (us[6].toUpperCase() === 'PM' ? 12 : 0);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || hours > 23 || min > 59) return null;
    return zonedTimeToUtc({ year: yyyy, month: mm - 1, day: dd, hours, minutes: min });
  }
  // Anything else must say its zone (ISO "…Z" / "…+05:30"); a zoneless string
  // the browser would read in its own zone is not guessed at.
  if (!/(?:[zZ]|[+-]\d{2}:?\d{2}|\b(?:GMT|UTC))$/.test(s)) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "BST" or "GMT": the UK zone's label at that moment (now by default). */
export function zoneLabel(value = new Date()) {
  const d = toDate(value);
  if (!d) return '';
  return offsetMinutes(d) === 60 ? 'BST' : 'GMT';
}

const time12 = (w) => `${w.hours % 12 || 12}:${pad(w.minutes)} ${w.hours < 12 ? 'AM' : 'PM'}`;

/** "20 Nov 2026" */
export function formatDate(value) {
  const d = toDate(value);
  if (!d) return '';
  const w = wallClockOf(d);
  return `${w.day} ${MONTHS[w.month]} ${w.year}`;
}

/** "20-Nov-26", the app's short card date. */
export function formatShortDate(value) {
  const d = toDate(value);
  if (!d) return '';
  const w = wallClockOf(d);
  return `${w.day}-${MONTHS[w.month]}-${String(w.year).slice(-2)}`;
}

/** "9:05 AM GMT" */
export function formatTime(value) {
  const d = toDate(value);
  if (!d) return '';
  return `${time12(wallClockOf(d))} ${zoneLabel(d)}`;
}

/** "20 Nov 2026, 9:05 AM GMT" */
export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return '';
  const w = wallClockOf(d);
  return `${w.day} ${MONTHS[w.month]} ${w.year}, ${time12(w)} ${zoneLabel(d)}`;
}

/** "Fri, 20 Nov 2026 · 9:05 AM GMT", for a schedule. */
export function formatDayDateTime(value) {
  const d = toDate(value);
  if (!d) return '';
  const w = wallClockOf(d);
  return `${WEEKDAYS[w.weekday]}, ${w.day} ${MONTHS[w.month]} ${w.year} · ${time12(w)} ${zoneLabel(d)}`;
}

/**
 * Now, as a Date whose local fields (getHours, getDate…) read UK time. For
 * pickers that work on local Date fields, so "now" and "today" are the UK's.
 */
export function nowInAppZone(now = new Date()) {
  const w = wallClockOf(now);
  return new Date(w.year, w.month, w.day, w.hours, w.minutes, w.seconds);
}
