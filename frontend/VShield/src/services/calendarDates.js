/**
 * calendarDates — pure helpers behind the date & time picker (DateTimeField).
 *
 * Values are the local "YYYY-MM-DDTHH:mm" string a native
 * <input type="datetime-local"> produces, so campaign drafts saved before the
 * picker existed read back unchanged, and the Review step's formatting still
 * applies.
 */

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = MONTH_NAMES.map((m) => m.slice(0, 3));
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Weeks start on Sunday, as in the browser's own picker.
export const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n) => String(n).padStart(2, '0');

/** "2026-10-12T09:05" -> { year, month (0-11), day, hours, minutes }; null if not a real date. */
export function parseDateTimeValue(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(value || ''));
  if (!m) return null;
  const [year, month, day, hours, minutes] = m.slice(1).map(Number);
  const d = new Date(year, month - 1, day, hours, minutes);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  if (hours > 23 || minutes > 59) return null;
  return { year, month: month - 1, day, hours, minutes };
}

export function toDateTimeValue({ year, month, day, hours = 0, minutes = 0 }) {
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}`;
}

/** The picker's value for a Date, in local time. */
export function dateToValue(date) {
  return toDateTimeValue({
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hours: date.getHours(),
    minutes: date.getMinutes(),
  });
}

/** "YYYY-MM-DD" — sortable, so days compare as strings. */
export const dayKey = ({ year, month, day }) => `${year}-${pad(month + 1)}-${pad(day)}`;

/** Six full weeks covering the month, so the grid never changes height. */
export function monthGrid(year, month) {
  const offset = new Date(year, month, 1).getDay();
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(year, month, 1 - offset + i);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
    };
  });
}

export function addMonths({ year, month }, delta) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/** True when `cell`'s day is earlier than the day of `minValue` (no minimum: false). */
export function isBeforeDay(cell, minValue) {
  const min = parseDateTimeValue(minValue);
  return Boolean(min) && dayKey(cell) < dayKey(min);
}

export const to12h = (hours) => ({ hour: hours % 12 || 12, meridiem: hours < 12 ? 'AM' : 'PM' });
export const to24h = (hour, meridiem) => (hour % 12) + (meridiem === 'PM' ? 12 : 0);

/** Every five minutes, plus the saved minute when it is off that grid. */
export function minuteOptions(current) {
  const options = Array.from({ length: 12 }, (_, i) => i * 5);
  if (Number.isInteger(current) && current >= 0 && current < 60 && !options.includes(current)) {
    options.push(current);
    options.sort((a, b) => a - b);
  }
  return options;
}

/**
 * The time a freshly picked day gets: 9:00 AM, or — when that has already
 * passed on the day picked — the next five-minute mark from `now`.
 */
export function defaultTimeFor(cell, now) {
  const nine = new Date(cell.year, cell.month, cell.day, 9, 0);
  if (nine > now) return { hours: 9, minutes: 0 };
  const next = new Date(now.getTime());
  next.setSeconds(0, 0);
  next.setMinutes(Math.ceil((next.getMinutes() + 1) / 5) * 5);
  // Past 11:55 PM the next mark is tomorrow; keep the picked day.
  if (next.getDate() !== cell.day) return { hours: 23, minutes: 55 };
  return { hours: next.getHours(), minutes: next.getMinutes() };
}

/** "Mon, 12 Oct 2026 · 9:05 AM" — '' for an empty or unreadable value. */
export function formatDateTimeLabel(value) {
  const v = parseDateTimeValue(value);
  if (!v) return '';
  const weekday = WEEKDAY_SHORT[new Date(v.year, v.month, v.day).getDay()];
  const { hour, meridiem } = to12h(v.hours);
  return `${weekday}, ${v.day} ${MONTH_SHORT[v.month]} ${v.year} · ${hour}:${pad(v.minutes)} ${meridiem}`;
}

/** Is `end` strictly after `start`? Either missing: true (nothing to compare). */
export function isAfter(end, start) {
  const e = parseDateTimeValue(end);
  const s = parseDateTimeValue(start);
  if (!e || !s) return true;
  return toDateTimeValue(e) > toDateTimeValue(s);
}
