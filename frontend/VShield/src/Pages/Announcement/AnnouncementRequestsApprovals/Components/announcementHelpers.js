// Pure helper functions (no server or data access).
export const ROLE_MANAGER = 'Campaign Manager';
export const APPROVER_KEY = 'AnnouncementApproved/RejectedBy'; // field name contains a slash

export const norm = (e) => (e || '').trim().toLowerCase();

// "10/12/2026 09:00 AM" -> Date
export const parseDate = (s) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{1,2}):(\d{2})(?::\d{2})? (AM|PM)$/i.exec(s || '');
  if (!m) return new Date(0);
  let h = Number(m[4]) % 12;
  if (m[6].toUpperCase() === 'PM') h += 12;
  return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]), h, Number(m[5]));
};

export const fmtDate = (s) =>
  parseDate(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');

export const SORTS = {
  newest: ['Latest request date', (a, b) => parseDate(b.AnnouncementCreationDate) - parseDate(a.AnnouncementCreationDate)],
  oldest: ['Oldest request date', (a, b) => parseDate(a.AnnouncementCreationDate) - parseDate(b.AnnouncementCreationDate)],
  title: ['Title A to Z', (a, b) => a.AnnouncementTitle.localeCompare(b.AnnouncementTitle)],
};
