import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';

import { useUserType } from '../UserTypeContext/UserTypeContext';
import { api } from '../services/api';
import { actorFor } from '../services/identity';
import { openCampaignDraft } from '../services/useCampaignDraft';
import { IN_WIZARD, routeForStep } from '../services/campaignWizard';
import { NOTICE_KIND, markNoticesSeen, noticeText, noticesFor, seenNotices } from '../services/campaignNotices';

// A simple notification bell for campaign creators: their campaigns an
// approver sent back for changes or rejected, with the approver's message.
// "Open draft" opens a sent-back campaign in the wizard to fix and resubmit.
// Checked when the app opens, on every page change and every minute.

const POLL_MS = 60 * 1000;
const SHOWN = 20;

const when = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function CampaignNoticesBell() {
  const { user } = useUserType();
  const actor = useMemo(() => (user ? actorFor(user) : ''), [user]);
  const navigate = useNavigate();
  const location = useLocation();
  const [notices, setNotices] = useState([]);
  // what this person has already opened (per browser); re-read on a new login
  const [seenFor, setSeenFor] = useState(() => ({ actor, keys: seenNotices(actor) }));
  if (seenFor.actor !== actor) setSeenFor({ actor, keys: seenNotices(actor) });
  const seen = seenFor.keys;
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const load = useCallback(() => {
    if (!actor || !actor.includes('@')) return;
    api.campaigns
      .list()
      .then((rows) => setNotices(noticesFor(rows, actor)))
      .catch(() => {}); // the bell stays as it was; the pages show the error
  }, [actor]);

  useEffect(() => {
    load();
  }, [load, location.pathname]);

  useEffect(() => {
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // close when clicking elsewhere
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!actor || !actor.includes('@')) return null;

  const unread = notices.filter((n) => !seen.has(n.key));
  const markSeen = (keys) => {
    markNoticesSeen(actor, keys);
    setSeenFor({ actor, keys: seenNotices(actor) });
  };

  const openNotice = (n) => {
    markSeen([n.key]);
    setOpen(false);
    if (n.kind === NOTICE_KIND.CHANGES) {
      openCampaignDraft(n.campaignId);
      navigate(routeForStep(n.wizardStep, 2), IN_WIZARD);
    } else {
      navigate('/requests-approvals', { state: { tab: 'rejected' } });
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread.length ? `${unread.length} new campaign notifications` : 'Campaign notifications'}
        data-notice-bell={unread.length}
        className="relative w-8 h-8 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#E60000] text-white text-[9px] font-bold leading-4 text-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Campaign notifications"
          data-notice-panel
          className="absolute right-0 top-10 w-[340px] max-h-[420px] overflow-y-auto rounded-xl border shadow-xl bg-white border-slate-200 dark:bg-[#15161A] dark:border-white/10 z-50"
        >
          <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 dark:border-white/10">
            <span className="text-[12px] font-bold text-slate-900 dark:text-white">Notifications</span>
            <div className="flex items-center gap-2">
              {unread.length > 0 && (
                <button
                  type="button"
                  onClick={() => markSeen(unread.map((n) => n.key))}
                  className="text-[10px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  Mark all read
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {notices.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-[11px] text-slate-500 dark:text-slate-400">
              Nothing new. When an approver asks for changes to one of your campaigns, or rejects it, it shows here.
            </p>
          ) : (
            <ul>
              {notices.slice(0, SHOWN).map((n) => {
                const t = noticeText(n);
                const isNew = !seen.has(n.key);
                return (
                  <li
                    key={n.key}
                    data-notice={n.kind}
                    className={`px-3.5 py-2.5 border-b last:border-b-0 border-slate-100 dark:border-white/5 ${isNew ? 'bg-red-50/60 dark:bg-white/[0.03]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                          {isNew && <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />}
                          <span className={n.kind === NOTICE_KIND.CHANGES ? 'text-amber-700 dark:text-amber-300' : 'text-red-600 dark:text-red-400'}>
                            {t.headline}
                          </span>
                        </p>
                        <p className="text-[12px] font-semibold text-slate-900 dark:text-white truncate" title={n.title}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-3">
                            &ldquo;{n.message}&rdquo;
                          </p>
                        )}
                        <p className="text-[9.5px] text-slate-400 mt-1">
                          {n.by ? `${n.by} · ` : ''}{when(n.at)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openNotice(n)}
                        data-notice-open={n.campaignId}
                        className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                          n.kind === NOTICE_KIND.CHANGES
                            ? 'bg-black text-white hover:bg-slate-800 dark:bg-white dark:text-black'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200'
                        }`}
                      >
                        {t.action}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
