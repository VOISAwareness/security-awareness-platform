// Pure helper functions (no server or data access). Dates are UK time (shared/dateTime.js).
import { formatShortDate, wallClockOf, zonedTimeToUtc } from '../../../../shared/dateTime';
export const ROLE_MANAGER = 'Campaign Manager';
export const APPROVER_KEY = 'AnnouncementApproved/RejectedBy'; // field name contains a slash

export const norm = (e) => (e || '').trim().toLowerCase();

// "10/12/2026 09:00 AM" (UK time) -> Date; Date(0) when unreadable
export const parseDate = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}):(\d{2})(?::\d{2})? (AM|PM)$/i.exec(s || '');
  if (!m) return new Date(0);
  let h = Number(m[4]) % 12;
  if (m[6].toUpperCase() === 'PM') h += 12;
  return zonedTimeToUtc({ year: Number(m[3]), month: Number(m[1]) - 1, day: Number(m[2]), hours: h, minutes: Number(m[5]) });
};

// The stored "MM/DD/YYYY hh:mm:ss AM" form, in UK time, for an instant (now by default)
export const storedDateTime = (date = new Date()) => {
  const w = wallClockOf(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(w.month + 1)}/${pad(w.day)}/${w.year} ${pad(w.hours % 12 || 12)}:${pad(w.minutes)}:${pad(w.seconds)} ${w.hours < 12 ? 'AM' : 'PM'}`;
};

export const fmtDate = (s) => {
  const d = parseDate(s);
  return d.getTime() ? formatShortDate(d) : '';
};

export const SORTS = {
  newest: ['Latest request date', (a, b) => parseDate(b.AnnouncementCreationDate) - parseDate(a.AnnouncementCreationDate)],
  oldest: ['Oldest request date', (a, b) => parseDate(a.AnnouncementCreationDate) - parseDate(b.AnnouncementCreationDate)],
  title: ['Title A to Z', (a, b) => a.AnnouncementTitle.localeCompare(b.AnnouncementTitle)],
};
