/**
 * notifications: what the bell in the top bar shows, and how.
 *
 * A notification is { id, type, title, detail, at, read, link }:
 *   type   one of TYPES below (it decides the tab, icon and tint)
 *   title  one line ("Payroll update approved")
 *   detail optional, a short second line (an approver's message, a due date)
 *   at     when it happened (ISO string or epoch ms)
 *   link   where clicking it goes: { to, state }
 *
 * GET /notifications (backend) works these out for a person from the tables
 * the app already has. Until it is deployed, the bell falls back to the
 * campaign notices it has always shown (fromCampaignNotices). Pure, so
 * `node --test` covers it.
 */
import { NOTICE_KIND } from './campaignNotices.js';
import { wallClockOf } from '../shared/dateTime.js';

// category: what area it is about (approvals, campaigns, training,
//   achievements, general); the panel shows one list, so this only groups
//   the types and picks sensible tones
// tone: the pastel tile behind the icon (the app's capsule colours)
// icon: a lucide icon name (the bell maps it)
export const TYPES = {
  'campaign.pending_approval': { category: 'approvals', tone: 'amber', icon: 'ClipboardCheck' },
  'campaign.approved': { category: 'campaigns', tone: 'mint', icon: 'CircleCheck' },
  'campaign.changes_requested': { category: 'campaigns', tone: 'amber', icon: 'PencilLine' },
  'campaign.rejected': { category: 'campaigns', tone: 'rose', icon: 'CircleX' },
  'campaign.sending': { category: 'campaigns', tone: 'sky', icon: 'Send' },
  'campaign.sent': { category: 'campaigns', tone: 'mint', icon: 'MailCheck' },
  'campaign.failed': { category: 'campaigns', tone: 'rose', icon: 'TriangleAlert' },
  'campaign.starts_soon': { category: 'campaigns', tone: 'lilac', icon: 'CalendarClock' },
  'campaign.ends_soon': { category: 'campaigns', tone: 'lilac', icon: 'Hourglass' },
  'campaign.on_hold': { category: 'campaigns', tone: 'slate', icon: 'CirclePause' },
  'campaign.resumed': { category: 'campaigns', tone: 'mint', icon: 'CirclePlay' },
  'campaign.cancelled': { category: 'campaigns', tone: 'slate', icon: 'Ban' },
  'training.assigned': { category: 'training', tone: 'lilac', icon: 'GraduationCap' },
  'training.due_soon': { category: 'training', tone: 'amber', icon: 'Clock' },
  'training.overdue': { category: 'training', tone: 'rose', icon: 'CircleAlert' },
  'training.certificate': { category: 'achievements', tone: 'lilac', icon: 'Award' },
  'training_path.pending_approval': { category: 'approvals', tone: 'amber', icon: 'ClipboardCheck' },
  'training_path.approved': { category: 'training', tone: 'mint', icon: 'CircleCheck' },
  'training_path.rejected': { category: 'training', tone: 'rose', icon: 'CircleX' },
  'announcement.published': { category: 'general', tone: 'teal', icon: 'Megaphone' },
  'announcement.pending_approval': { category: 'approvals', tone: 'amber', icon: 'ClipboardCheck' },
  'announcement.approved': { category: 'general', tone: 'mint', icon: 'CircleCheck' },
  'announcement.rejected': { category: 'general', tone: 'rose', icon: 'CircleX' },
  'achievement.badge': { category: 'achievements', tone: 'amber', icon: 'Medal' },
  'achievement.level_up': { category: 'achievements', tone: 'mint', icon: 'TrendingUp' },
  'setup.sender_verified': { category: 'general', tone: 'teal', icon: 'MailCheck' },
  'setup.list_ready': { category: 'general', tone: 'teal', icon: 'Users' },
  'setup.list_failed': { category: 'general', tone: 'rose', icon: 'TriangleAlert' },
};
const FALLBACK = { category: 'general', tone: 'slate', icon: 'Bell' };

export const typeOf = (n) => TYPES[n?.type] || FALLBACK;

const ms = (at) => {
  if (typeof at === 'number') return at;
  const t = Date.parse(at || '');
  return Number.isFinite(t) ? t : 0;
};

/** The list from GET /notifications, cleaned and newest first. */
export function fromApi(data) {
  const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return rows
    .filter((n) => n && n.id && n.title)
    .map((n) => ({ id: String(n.id), type: String(n.type || ''), title: String(n.title), detail: n.detail ? String(n.detail) : '', at: n.at, read: n.read === true, link: n.link && n.link.to ? n.link : null }))
    .sort((a, b) => ms(b.at) - ms(a.at));
}

/** The campaign notices (campaignNotices.js) as notifications: the fallback. */
export function fromCampaignNotices(notices, seen = new Set()) {
  return (notices || []).map((n) => {
    const changes = n.kind === NOTICE_KIND.CHANGES;
    return {
      id: n.key,
      type: changes ? 'campaign.changes_requested' : 'campaign.rejected',
      title: `${n.title} ${changes ? 'needs changes' : 'was rejected'}`,
      detail: n.message ? `“${n.message}”${n.by ? ` · ${n.by}` : ''}` : n.by,
      at: n.at,
      read: seen.has(n.key),
      link: changes
        ? { to: 'draft', campaignId: n.campaignId, wizardStep: n.wizardStep }
        : { to: '/requests-approvals', state: { category: 'rejected' } },
    };
  });
}

/** How many are unread. */
export const unreadCount = (items) => items.reduce((n, x) => n + (x.read ? 0 : 1), 0);

const dayKey = (t) => {
  const w = wallClockOf(new Date(t));
  return Date.UTC(w.year, w.month, w.day);
};

/** Today / Yesterday / Earlier (UK days), each newest first; empty groups left out. */
export function groupByDay(items, now = Date.now()) {
  const today = dayKey(now);
  const groups = [
    { id: 'today', label: 'Today', items: [] },
    { id: 'yesterday', label: 'Yesterday', items: [] },
    { id: 'earlier', label: 'Earlier', items: [] },
  ];
  for (const n of items) {
    const days = Math.round((today - dayKey(ms(n.at) || now)) / 86400000);
    groups[days <= 0 ? 0 : days === 1 ? 1 : 2].items.push(n);
  }
  return groups.filter((g) => g.items.length);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A short time: "Just now", "5m", "3h", then "14:05" yesterday, "12 Nov" before. */
export function shortTime(at, now = Date.now()) {
  const t = ms(at);
  if (!t) return '';
  const mins = Math.floor((now - t) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const days = Math.round((dayKey(now) - dayKey(t)) / 86400000);
  if (days <= 0) return `${Math.floor(mins / 60)}h`;
  const w = wallClockOf(new Date(t));
  if (days === 1) return `${String(w.hours).padStart(2, '0')}:${String(w.minutes).padStart(2, '0')}`;
  return `${w.day} ${MONTHS[w.month]}`;
}
