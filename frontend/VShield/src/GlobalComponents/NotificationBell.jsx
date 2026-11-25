import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  Ban,
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  CirclePause,
  CirclePlay,
  CircleX,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Hourglass,
  MailCheck,
  Medal,
  Megaphone,
  PencilLine,
  Send,
  TrendingUp,
  TriangleAlert,
  Users,
} from 'lucide-react';

import { useUserType } from '../UserTypeContext/UserTypeContext';
import { api } from '../services/api';
import { actorFor } from '../services/identity';
import { openCampaignDraft } from '../services/useCampaignDraft';
import { IN_WIZARD, routeForStep } from '../services/campaignWizard';
import { markNoticesSeen, noticesFor, seenNotices } from '../services/campaignNotices';
import { fromApi, fromCampaignNotices, groupByDay, shortTime, typeOf, unreadCount } from '../services/notifications';
import { formatDateTime } from '../shared/dateTime';

// The bell in the top bar and its panel: the person's recent activity across
// the app (approvals, campaigns, training, announcements, badges) in one list,
// newest first and grouped by day; each item's icon and colour say what it is. Read from
// GET /notifications; until that is deployed, the campaign notices it has
// always shown. Checked when the app opens, on each page change, every minute
// and when the tab comes back into view.

const POLL_MS = 60 * 1000;

const ICONS = {
  Award, Ban, Bell, CalendarClock, CircleAlert, CircleCheck, CirclePause, CirclePlay, CircleX,
  ClipboardCheck, Clock, GraduationCap, Hourglass, MailCheck, Medal, Megaphone, PencilLine, Send,
  TrendingUp, TriangleAlert, Users,
};

// the app's pastel capsule colours, with a matching ink
const TONES = {
  amber: 'bg-[#FFF1D6] text-[#B7791F] dark:bg-amber-400/10 dark:text-amber-300',
  mint: 'bg-[#E5F7EB] text-[#2F9E57] dark:bg-emerald-400/10 dark:text-emerald-300',
  rose: 'bg-[#FFE5EC] text-[#E60000] dark:bg-rose-400/10 dark:text-rose-300',
  lilac: 'bg-[#E5E6FF] text-[#5B5BD6] dark:bg-indigo-400/10 dark:text-indigo-300',
  sky: 'bg-[#E3F1FF] text-[#2563EB] dark:bg-sky-400/10 dark:text-sky-300',
  teal: 'bg-[#E5F5F7] text-[#0E8C9B] dark:bg-teal-400/10 dark:text-teal-300',
  slate: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300',
};

// How the bell shows there is something new:
//   'count': a red number on a neutral bell (none when all is read)
//   'color': the whole bell red while anything is unread, a soft green when not
export const BELL_STYLE = 'count';

export default function NotificationBell() {
  const { user } = useUserType();
  const actor = useMemo(() => (user ? actorFor(user) : ''), [user]);
  const role = user?.role || '';
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [source, setSource] = useState('api'); // 'api' or 'local' (the fallback)
  const [open, setOpen] = useState(false);
  const [ring, setRing] = useState(false);
  const lastUnread = useRef(0);
  const boxRef = useRef(null);
  const signedIn = Boolean(actor && actor.includes('@'));

  const load = useCallback(() => {
    if (!signedIn) return;
    api.notifications
      .list(actor, role)
      .then((data) => {
        setItems(fromApi(data));
        setSource('api');
      })
      .catch(() =>
        // not deployed yet (or down): the campaign notices, read per browser
        api.campaigns
          .summary()
          .then((rows) => {
            setItems(fromCampaignNotices(noticesFor(rows, actor), seenNotices(actor)));
            setSource('local');
          })
          .catch(() => {}), // the bell stays as it was; the pages show the error
      );
  }, [signedIn, actor, role]);

  useEffect(() => {
    load();
  }, [load, location.pathname]);

  useEffect(() => {
    const t = setInterval(load, POLL_MS);
    const onShow = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onShow);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onShow);
    };
  }, [load]);

  const unread = useMemo(() => unreadCount(items), [items]);

  // a short ring of the bell when something new arrives
  useEffect(() => {
    if (unread > lastUnread.current) {
      setRing(true);
      const t = setTimeout(() => setRing(false), 900);
      lastUnread.current = unread;
      return () => clearTimeout(t);
    }
    lastUnread.current = unread;
    return undefined;
  }, [unread]);

  // close on a click elsewhere or Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!signedIn) return null;

  const markRead = (ids) => {
    if (!ids.length) return;
    setItems((list) => list.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    if (source === 'api') api.notifications.read(actor, ids).catch(() => {});
    else markNoticesSeen(actor, ids);
  };

  const follow = (n) => {
    markRead([n.id]);
    setOpen(false);
    const link = n.link;
    if (!link) return;
    if (link.to === 'draft') {
      openCampaignDraft(link.campaignId);
      navigate(routeForStep(link.wizardStep, 2), IN_WIZARD);
    } else {
      navigate(link.to, link.state ? { state: link.state } : undefined);
    }
  };

  const groups = groupByDay(items);
  const byColor = BELL_STYLE === 'color';
  const bellTone = open
    ? 'bg-[#181A20] text-white dark:bg-white dark:text-black'
    : byColor
      ? unread
        ? 'bg-[#E60000] text-white hover:bg-[#C70000] shadow-[0_4px_12px_rgba(230,0,0,0.35)]'
        : 'bg-[#E5F7EB] text-[#2F9E57] hover:bg-[#D3F0DD] dark:bg-emerald-400/10 dark:text-emerald-300'
      : 'bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-black/10 dark:hover:bg-white/10';

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        data-notice-bell={unread}
        data-bell-style={BELL_STYLE}
        className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${bellTone}`}
      >
        <Bell className={`w-4 h-4 ${ring ? 'vs-bell-ring' : ''}`} />
        {!byColor && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#E60000] text-white text-[9px] font-bold leading-4 text-center ring-2 ring-white dark:ring-[#030403]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          data-notice-panel
          className="vs-pop-in absolute right-0 top-11 w-[380px] max-w-[calc(100vw-24px)] rounded-2xl border overflow-hidden z-50 bg-white border-slate-200 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] dark:bg-[#15161A] dark:border-white/10 dark:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)]"
        >
          {/* header */}
          <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[14px] font-voda font-bold text-slate-900 dark:text-white">Notifications</h2>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#E60000]/10 text-[#E60000] dark:text-[#FF8A8A] text-[9.5px] font-bold">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead(items.filter((n) => !n.read).map((n) => n.id))}
                className="flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* list */}
          <div className="max-h-[420px] overflow-y-auto vs-scroll py-1.5">
            {groups.length === 0 ? (
              <div className="flex flex-col items-center text-center px-8 py-10">
                <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-400 flex items-center justify-center mb-3">
                  <BellOff className="w-[18px] h-[18px]" />
                </span>
                <p className="text-[12px] font-semibold text-slate-900 dark:text-white">You&apos;re all caught up</p>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Approvals, campaign updates, training and badges show here as they happen.
                </p>
              </div>
            ) : (
              groups.map((g) => (
                <section key={g.id} aria-label={g.label}>
                  <h3 className="px-4 pt-2 pb-1 text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{g.label}</h3>
                  <ul className="px-1.5 flex flex-col gap-0.5">
                    {g.items.map((n) => {
                      const t = typeOf(n);
                      const Icon = ICONS[t.icon] || Bell;
                      return (
                        <li key={n.id}>
                          <button
                            type="button"
                            onClick={() => follow(n)}
                            data-notice={n.type}
                            title={formatDateTime(n.at)}
                            className={`w-full flex items-start gap-3 px-2.5 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                              n.read
                                ? 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                                : 'bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]'
                            }`}
                          >
                            <span className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 ${TONES[t.tone] || TONES.slate}`}>
                              <Icon className="w-4 h-4" strokeWidth={2} />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span
                                className={`block text-[11.5px] leading-snug line-clamp-2 ${
                                  n.read ? 'font-medium text-slate-600 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-white'
                                }`}
                              >
                                {n.title}
                              </span>
                              {n.detail && (
                                <span className="block mt-0.5 text-[10.5px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">{n.detail}</span>
                              )}
                            </span>
                            <span className="flex-shrink-0 pt-0.5 text-[9.5px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                              {shortTime(n.at)}
                              {!n.read && <span className="sr-only">, unread</span>}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
