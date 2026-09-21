import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AtSign,
  CalendarClock,
  CircleCheckBig,
  CircleX,
  Clock,
  Eye,
  FileText,
  Globe,
  GraduationCap,
  Inbox,
  LoaderCircle,
  Mail,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { api } from '../../services/api';
import {
  STATUS,
  campaignLabel,
  formatDateTime,
  parseDate,
  relativeTime,
  statusChipClasses,
  statusMeta,
} from '../../services/campaignStatus';
import { useCampaigns } from '../../services/useCampaigns';

// =========================================================================
// 🎛️ SCALE CONTROL & BRAND CONSTANTS
// =========================================================================
const VarApprovalsScale = 0.96;
const VarOverallRoundednessScale = 0.5;

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap');

  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Montserrat', 'Plus Jakarta Sans', sans-serif;
    font-weight: 900;
  }
  .font-mono-tech {
    font-family: 'JetBrains Mono', monospace;
  }
  .rounded-3xl { border-radius: ${Math.round(24 * VarOverallRoundednessScale)}px !important; }
  .rounded-2xl { border-radius: ${Math.round(18 * VarOverallRoundednessScale)}px !important; }
  .rounded-xl  { border-radius: ${Math.round(14 * VarOverallRoundednessScale)}px !important; }
  .rounded-lg  { border-radius: ${Math.round(10 * VarOverallRoundednessScale)}px !important; }
  .rounded-md  { border-radius: ${Math.round(6 * VarOverallRoundednessScale)}px !important; }
`;

const SCROLLBAR =
  '[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full';

// Sort keys only — dates are parsed with the shared parser, never re-derived.
const NO_DATE = Number.MAX_SAFE_INTEGER;

const submittedAtMs = (campaign) => {
  const d = parseDate(campaign?.submittedAt);
  return d ? d.getTime() : NO_DATE;
};

const actionedAtMs = (campaign) => {
  const d = parseDate(campaign?.approvedAt || campaign?.rejectedAt || campaign?.updatedAt);
  return d ? d.getTime() : 0;
};

// =========================================================================
// SMALL PRESENTATIONAL HELPERS
// =========================================================================
const DetailField = ({ icon: Icon, label, isDark, children }) => (
  <div className="flex items-start gap-2 min-w-0">
    <Icon
      className={`w-3.5 h-3.5 mt-[2px] flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
    />
    <div className="min-w-0 flex-1">
      <div
        className={`text-[9px] font-bold uppercase tracking-wider ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        {label}
      </div>
      <div
        className={`text-[11px] font-medium leading-snug break-words ${
          isDark ? 'text-slate-200' : 'text-slate-800'
        }`}
      >
        {children}
      </div>
    </div>
  </div>
);

const StatusChip = ({ status, isDark }) => (
  <span
    className={`px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wide flex-shrink-0 ${statusChipClasses(
      status,
      isDark
    )}`}
    title={statusMeta(status).blurb}
  >
    {statusMeta(status).label}
  </span>
);

const EmptyHint = ({ icon: Icon, title, body, isDark, children }) => (
  <div className="h-full w-full flex flex-col items-center justify-center gap-2 text-center px-6 py-8">
    <Icon className={`w-7 h-7 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
    <div className={`text-[13px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>
      {title}
    </div>
    <div className={`text-[10.5px] max-w-[380px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
      {body}
    </div>
    {children}
  </div>
);

// =========================================================================
// REQUESTS & APPROVALS — the approver's queue
// =========================================================================
const RequestsAndApprovals = () => {
  const userContext = useUserType?.() || {};
  const isDark = !!userContext.isDark;
  const actor = userContext.user?.role || 'wizard-user';

  // The queue itself.
  const { campaigns, loading, error, pendingAction, refresh, approve, reject } = useCampaigns({
    status: STATUS.PENDING_APPROVAL,
    actor,
  });

  // Secondary, read-only: what has been actioned recently.
  const { campaigns: approvedRows, refresh: refreshApproved } = useCampaigns({
    status: STATUS.APPROVED,
    actor,
  });
  const { campaigns: rejectedRows, refresh: refreshRejected } = useCampaigns({
    status: STATUS.REJECTED,
    actor,
  });

  const [selectedId, setSelectedId] = useState(null);
  const [notice, setNotice] = useState(null); // { tone: 'success' | 'error', text }
  const [dialog, setDialog] = useState(null); // { mode: 'approve' | 'reject', campaign }
  const [comment, setComment] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [userLists, setUserLists] = useState([]);

  // Recipient lists are reference data: an approver has to know WHO receives
  // the simulated phish, and a campaign row only carries the list id.
  useEffect(() => {
    let active = true;
    api.userLists
      .list()
      .then((rows) => {
        if (active) setUserLists(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        // Non-fatal: the detail panel falls back to the raw list id.
        console.error('Could not load user lists for recipient names', err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Success toasts fade on their own; errors stay until dismissed.
  useEffect(() => {
    if (!notice || notice.tone !== 'success') return undefined;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  // Oldest-waiting first: the top of this list is the most urgent thing.
  const queue = useMemo(
    () => [...campaigns].sort((a, b) => submittedAtMs(a) - submittedAtMs(b)),
    [campaigns]
  );

  // Derived rather than stored: when the selected row leaves the queue the
  // panel falls back to the oldest request still waiting.
  const selected = useMemo(
    () => queue.find((c) => c.campaignId === selectedId) || queue[0] || null,
    [queue, selectedId]
  );

  const recipientList = useMemo(() => {
    if (!selected?.selectedListId) return null;
    return (
      userLists.find((l) => (l.userListId || l.id || l.dlId) === selected.selectedListId) || null
    );
  }, [selected, userLists]);

  const history = useMemo(
    () =>
      [...approvedRows, ...rejectedRows]
        .sort((a, b) => actionedAtMs(b) - actionedAtMs(a))
        .slice(0, 6),
    [approvedRows, rejectedRows]
  );

  // ── Workflow transitions ────────────────────────────────────────────────
  const runTransition = useCallback(
    async (mode, campaign, text) => {
      const id = campaign.campaignId;
      const name = campaignLabel(campaign);
      try {
        if (mode === 'approve') {
          await approve(id, String(text || '').trim());
        } else {
          await reject(id, String(text || '').trim());
        }
        setNotice({
          tone: 'success',
          text:
            mode === 'approve'
              ? `Approved "${name}". It has left the queue and is cleared to run.`
              : `Rejected "${name}". The owner can edit it and resubmit.`,
        });
        refreshApproved();
        refreshRejected();
      } catch (e) {
        if (e?.status === 409) {
          // Someone else got there first — the row we were looking at is stale.
          setNotice({ tone: 'error', text: 'This campaign was already actioned — refreshing' });
          refresh();
          refreshApproved();
          refreshRejected();
          return;
        }
        const problems =
          Array.isArray(e?.problems) && e.problems.length ? ` (${e.problems.join('; ')})` : '';
        setNotice({
          tone: 'error',
          text: `${e?.message || 'The action could not be completed.'}${problems}`,
        });
      }
    },
    [approve, reject, refresh, refreshApproved, refreshRejected]
  );

  const openDialog = (mode, campaign) => {
    setNotice(null);
    setComment('');
    setDialog({ mode, campaign });
  };

  const closeDialog = () => {
    setDialog(null);
    setComment('');
  };

  const submitDialog = () => {
    if (!dialog) return;
    // The hook refuses an empty reason and the backend returns 400, so a
    // rejection can never leave this dialog without one.
    if (dialog.mode === 'reject' && !comment.trim()) return;
    const { mode, campaign } = dialog;
    const text = comment;
    closeDialog();
    runTransition(mode, campaign, text);
  };

  const busyFor = (campaign) => pendingAction === campaign?.campaignId;
  const waitingCount = queue.length;

  // ── Queue row ───────────────────────────────────────────────────────────
  const renderRow = (campaign, index) => {
    const id = campaign.campaignId;
    const isSelected = selected?.campaignId === id;
    const busy = busyFor(campaign);
    const isOldest = index === 0 && waitingCount > 1 && submittedAtMs(campaign) !== NO_DATE;

    return (
      <div
        key={id}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedId(id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setSelectedId(id);
          }
        }}
        className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all shadow-2xs ${
          isDark ? 'bg-[#15161A] text-white hover:border-white/25' : 'bg-white text-slate-900 hover:border-slate-300'
        } ${
          isSelected
            ? 'border-[#E60000] ring-1 ring-[#E60000]'
            : isDark
              ? 'border-white/10'
              : 'border-slate-200/90'
        }`}
      >
        {/* Name + status */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[12px] font-voda-exb leading-tight line-clamp-1 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {campaignLabel(campaign)}
              </span>
              {isOldest && (
                <span className="px-1.5 py-0.5 rounded-md text-[8.5px] font-bold text-white bg-[#E60000] flex-shrink-0">
                  OLDEST WAITING
                </span>
              )}
            </div>
            <div
              className={`text-[9.5px] font-mono-tech truncate ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {id}
            </div>
          </div>
          <StatusChip status={campaign.status} isDark={isDark} />
        </div>

        {/* Who submitted it, and how long it has been waiting */}
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] ${
            isDark ? 'text-slate-300' : 'text-slate-600'
          }`}
        >
          <span className="flex items-center gap-1 min-w-0">
            <UserCheck className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{campaign.submittedBy || 'Unknown submitter'}</span>
          </span>
          <span
            className="flex items-center gap-1 font-bold"
            title={`Submitted ${formatDateTime(campaign.submittedAt)}`}
          >
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            Waiting {relativeTime(campaign.submittedAt)}
          </span>
        </div>

        {/* The submitter's note */}
        {campaign.submissionComments && (
          <div
            className={`text-[10px] italic leading-snug line-clamp-2 px-2 py-1 rounded-md ${
              isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-100 text-slate-600'
            }`}
          >
            &ldquo;{campaign.submissionComments}&rdquo;
          </div>
        )}

        {/* Planned send window */}
        <div
          className={`text-[9.5px] font-mono-tech flex items-center gap-1.5 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
          {formatDateTime(campaign.startTime)} &rarr; {formatDateTime(campaign.endTime)}
        </div>

        {/* Row actions */}
        <div className="flex items-center gap-2 pt-1.5 border-t border-dashed border-slate-300/40">
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              openDialog('approve', campaign);
            }}
            className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
              busy
                ? 'bg-slate-400/40 text-slate-500 cursor-not-allowed'
                : 'bg-[#2E7D32] text-white hover:bg-[#256628] cursor-pointer'
            }`}
          >
            {busy ? (
              <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CircleCheckBig className="w-3.5 h-3.5" />
            )}
            {busy ? 'Working...' : 'Approve'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              openDialog('reject', campaign);
            }}
            className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 border transition-all ${
              busy
                ? 'border-slate-400/40 text-slate-500 cursor-not-allowed'
                : isDark
                  ? 'border-rose-400/40 text-rose-300 hover:bg-rose-500/10 cursor-pointer'
                  : 'border-rose-300 text-rose-700 hover:bg-rose-50 cursor-pointer'
            }`}
          >
            <CircleX className="w-3.5 h-3.5" />
            Reject
          </button>
        </div>
      </div>
    );
  };

  // ── Review panel ────────────────────────────────────────────────────────
  const renderReviewPanel = () => {
    if (!selected) {
      return (
        <EmptyHint
          icon={Eye}
          isDark={isDark}
          title="Nothing selected"
          body="Pick a request from the queue to read what you are being asked to approve."
        />
      );
    }

    const busy = busyFor(selected);
    const recipientName =
      recipientList?.name || recipientList?.dlName || selected.selectedListName || '';

    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Panel header */}
        <div className="flex items-start justify-between gap-3 pb-2.5 flex-shrink-0">
          <div className="min-w-0">
            <div
              className={`text-[14px] font-voda-exb leading-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {campaignLabel(selected)}
            </div>
            <div
              className={`text-[9.5px] font-mono-tech ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
            >
              {selected.campaignId}
            </div>
          </div>
          <StatusChip status={selected.status} isDark={isDark} />
        </div>

        {/* Scrollable detail */}
        <div className={`flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-3 ${SCROLLBAR}`}>
          {/* Submission */}
          <div
            className={`p-2.5 rounded-xl border flex flex-col gap-2 ${
              isDark ? 'bg-[#15161A] border-white/10' : 'bg-white border-slate-200/90'
            }`}
          >
            <DetailField icon={UserCheck} label="Submitted by" isDark={isDark}>
              {selected.submittedBy || 'Unknown submitter'}
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                {' '}
                &middot; {relativeTime(selected.submittedAt)}
              </span>
              <span
                className={`block text-[9.5px] font-mono-tech ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {formatDateTime(selected.submittedAt)}
              </span>
            </DetailField>
            {selected.submissionComments && (
              <DetailField icon={MessageSquare} label="Submitter's note" isDark={isDark}>
                <span className="italic">&ldquo;{selected.submissionComments}&rdquo;</span>
              </DetailField>
            )}
          </div>

          {/* What is actually being approved */}
          <div
            className={`p-2.5 rounded-xl border grid grid-cols-1 md:grid-cols-2 gap-2.5 ${
              isDark ? 'bg-[#15161A] border-white/10' : 'bg-white border-slate-200/90'
            }`}
          >
            <div className="md:col-span-2">
              <DetailField icon={FileText} label="Description" isDark={isDark}>
                {selected.campaignDescription || 'No description was provided.'}
              </DetailField>
            </div>
            <DetailField icon={Mail} label="Email subject" isDark={isDark}>
              {selected.emailSubject || '—'}
            </DetailField>
            <DetailField icon={AtSign} label="Sender" isDark={isDark}>
              {selected.senderName || '—'}
              {selected.senderEmailId && (
                <span
                  className={`block text-[9.5px] font-mono-tech ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {selected.senderEmailId}
                </span>
              )}
            </DetailField>
            <DetailField icon={Users} label="Recipients" isDark={isDark}>
              {recipientName || (selected.selectedListId ? 'Unnamed list' : 'No list selected')}
              {selected.selectedListId && (
                <span
                  className={`block text-[9.5px] font-mono-tech ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {selected.selectedListId}
                  {recipientList?.totalUsers != null
                    ? ` · ${recipientList.totalUsers} users`
                    : selected.recipientCount != null
                      ? ` · ${selected.recipientCount} users`
                      : ''}
                </span>
              )}
            </DetailField>
            <DetailField icon={CalendarClock} label="Send window" isDark={isDark}>
              <span className="font-mono-tech text-[10px]">
                {formatDateTime(selected.startTime)} &rarr; {formatDateTime(selected.endTime)}
              </span>
            </DetailField>
            <DetailField icon={ShieldAlert} label="Scenario" isDark={isDark}>
              <span className="font-mono-tech text-[10px]">{selected.scenarioId || '—'}</span>
            </DetailField>
            <DetailField icon={Globe} label="Landing page" isDark={isDark}>
              <span className="font-mono-tech text-[10px]">{selected.landingPageId || '—'}</span>
            </DetailField>
            <DetailField icon={GraduationCap} label="Training path" isDark={isDark}>
              <span className="font-mono-tech text-[10px]">{selected.trainingId || '—'}</span>
            </DetailField>
          </div>

          {/* Email preview. This is untrusted author-supplied HTML: it renders
              inside a fully sandboxed iframe (no allow-scripts), never via
              dangerouslySetInnerHTML. */}
          {selected.emailBody ? (
            <div
              className={`rounded-xl border overflow-hidden ${
                isDark ? 'bg-[#15161A] border-white/10' : 'bg-white border-slate-200/90'
              }`}
            >
              <div
                className={`px-2.5 py-1.5 flex items-center justify-between gap-2 border-b text-[9px] font-bold uppercase tracking-wider ${
                  isDark ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Email preview
                </span>
                <span className="font-medium normal-case tracking-normal">
                  Sandboxed &middot; scripts and navigation disabled
                </span>
              </div>
              <iframe
                title={`Email preview for ${selected.campaignId}`}
                srcDoc={selected.emailBody}
                sandbox=""
                referrerPolicy="no-referrer"
                className="w-full h-[260px] bg-white border-0 block"
              />
            </div>
          ) : (
            <div
              className={`p-2.5 rounded-xl border text-[10.5px] ${
                isDark
                  ? 'bg-[#15161A] border-white/10 text-slate-400'
                  : 'bg-white border-slate-200/90 text-slate-500'
              }`}
            >
              This campaign has no email body saved, so there is nothing to preview.
            </div>
          )}
        </div>

        {/* Panel actions */}
        <div className="flex items-center gap-2 pt-2.5 flex-shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={() => openDialog('approve', selected)}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
              busy
                ? 'bg-slate-400/40 text-slate-500 cursor-not-allowed'
                : 'bg-[#2E7D32] text-white hover:bg-[#256628] cursor-pointer'
            }`}
          >
            {busy ? (
              <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CircleCheckBig className="w-3.5 h-3.5" />
            )}
            {busy ? 'Working...' : 'Approve campaign'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => openDialog('reject', selected)}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-all ${
              busy
                ? 'border-slate-400/40 text-slate-500 cursor-not-allowed'
                : isDark
                  ? 'border-rose-400/40 text-rose-300 hover:bg-rose-500/10 cursor-pointer'
                  : 'border-rose-300 text-rose-700 hover:bg-rose-50 cursor-pointer'
            }`}
          >
            <CircleX className="w-3.5 h-3.5" />
            Reject with a reason
          </button>
          <span className={`text-[9.5px] ml-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Acting as <span className="font-mono-tech">{actor}</span>
          </span>
        </div>
      </div>
    );
  };

  // ── Queue body: loading / error / empty / content ────────────────────────
  const renderQueueBody = () => {
    if (loading) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-2 py-10">
          <LoaderCircle className="w-6 h-6 animate-spin text-slate-400" />
          <span className={`text-[10.5px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Loading the approval queue...
          </span>
        </div>
      );
    }

    if (error) {
      return (
        <EmptyHint
          icon={TriangleAlert}
          isDark={isDark}
          title="Could not load the queue"
          body={error.message || 'The campaigns service did not respond.'}
        >
          <button
            type="button"
            onClick={() => refresh()}
            className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#E60000] text-white text-[10px] font-bold flex items-center gap-1.5 hover:bg-[#c50000] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </EmptyHint>
      );
    }

    if (queue.length === 0) {
      return (
        <EmptyHint
          icon={Inbox}
          isDark={isDark}
          title="Nothing is waiting for approval"
          body="Campaigns submitted for review from the campaign wizard arrive here. Until someone submits one, this queue stays empty."
        >
          <button
            type="button"
            onClick={() => refresh()}
            className={`mt-1 px-3.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border cursor-pointer ${
              isDark
                ? 'border-white/15 text-slate-300 hover:bg-white/5'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check again
          </button>
        </EmptyHint>
      );
    }

    return (
      <div className={`flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1 ${SCROLLBAR}`}>
        {queue.map(renderRow)}
      </div>
    );
  };

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div
        style={{ zoom: VarApprovalsScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 overflow-hidden"
      >
        {/* ========================================================================= */}
        {/* ── 1. TOP HEADER BAR: "Requests & Approvals" ──────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full h-10 py-2.5 px-6 -mt-2 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm select-none ${
            isDark
              ? 'bg-[#ffffff] text-black border-white/10'
              : 'bg-[#15171C] text-white border-black/10'
          }`}
        >
          <h1 className="text-[15px] font-voda-exb tracking-normal text-white dark:text-black">
            REQUESTS &amp; APPROVALS
          </h1>

          <div className="text-[13px] font-voda-exb text-white/80 dark:text-black/80">
            -- Review, approve or reject submitted campaigns
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 2. INFO NOTICE STRIP ────────────────────────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full py-2 px-4 rounded-xl border flex items-center gap-2.5 flex-shrink-0 text-[11px] font-medium shadow-2xs ${
            isDark
              ? 'bg-[#15161A] text-slate-300 border-white/10'
              : 'bg-white text-slate-700 border-slate-200'
          }`}
        >
          <div className="w-3.5 h-3.5 rounded-full border border-black dark:border-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
            i
          </div>
          <span>
            Campaigns submitted for review from the campaign wizard land here &mdash; read what is
            being asked for, then approve it to clear it to run, or reject it with a reason the
            campaign&apos;s owner will see.
          </span>
        </div>

        {/* ========================================================================= */}
        {/* ── 3. BIG WHITE CONTAINER DIV ─────────────────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full flex-1 min-h-0 rounded-2xl border p-3.5 flex flex-col gap-3 overflow-hidden shadow-xs ${
            isDark ? 'bg-[#15161A] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          {/* ── 3a. RESULT BANNER for a transition ── */}
          {notice && (
            <div
              className={`w-full px-3 py-2 rounded-xl border flex items-start gap-2 flex-shrink-0 text-[11px] font-medium ${
                notice.tone === 'success'
                  ? isDark
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/30'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : isDark
                    ? 'bg-rose-500/10 text-rose-300 border-rose-400/30'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {notice.tone === 'success' ? (
                <CircleCheckBig className="w-4 h-4 flex-shrink-0 mt-[1px]" />
              ) : (
                <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-[1px]" />
              )}
              <span className="flex-1">{notice.text}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="flex-shrink-0 hover:opacity-70 cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── 3b. QUEUE (left) + REVIEW PANEL (right) ── */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
            {/* QUEUE */}
            <div
              className={`w-full lg:w-[40%] lg:min-w-[340px] p-3 rounded-2xl border flex flex-col gap-2.5 min-h-0 ${
                isDark ? 'bg-[#1F2128] border-white/0' : 'bg-[#F1F4F9] border-slate-200/0'
              }`}
            >
              <div className="flex items-center justify-between flex-shrink-0">
                <h3
                  className={`text-[14.5px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}
                >
                  Waiting for approval
                  {!loading && !error && (
                    <span className="ml-1.5 text-[11px] font-mono-tech opacity-70">
                      ({waitingCount})
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => refresh()}
                  disabled={loading}
                  title="Refresh the queue"
                  className={`p-1 rounded ${
                    isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-black'
                  } ${loading ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {!loading && !error && queue.length > 0 && (
                <div
                  className={`text-[9.5px] flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  Oldest first &mdash; the top request has been waiting the longest.
                </div>
              )}

              {renderQueueBody()}
            </div>

            {/* REVIEW PANEL */}
            <div
              className={`flex-1 min-h-0 p-3 rounded-2xl border flex flex-col ${
                isDark ? 'bg-[#1F2128] border-white/0' : 'bg-[#F1F4F9] border-slate-200/0'
              }`}
            >
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2">
                  <LoaderCircle className="w-6 h-6 animate-spin text-slate-400" />
                  <span className={`text-[10.5px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Loading request details...
                  </span>
                </div>
              ) : error ? (
                <EmptyHint
                  icon={TriangleAlert}
                  isDark={isDark}
                  title="No request to review"
                  body="The queue could not be loaded, so there is nothing to show here. Retry from the queue panel."
                />
              ) : (
                renderReviewPanel()
              )}
            </div>
          </div>

          {/* ── 3c. RECENTLY ACTIONED (secondary, collapsible) ── */}
          <div
            className={`flex-shrink-0 rounded-xl border px-3 py-2 ${
              isDark ? 'bg-[#1F2128] border-white/5' : 'bg-[#F1F4F9] border-slate-200/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className={`text-[11.5px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Recently actioned
                <span className="ml-1.5 text-[10px] font-mono-tech opacity-70">
                  ({history.length})
                </span>
              </h4>
              <button
                type="button"
                onClick={() => setHistoryOpen(!historyOpen)}
                className="p-1 rounded text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white cursor-pointer"
                title={historyOpen ? 'Collapse' : 'Expand'}
              >
                <svg
                  width="20"
                  height="14"
                  viewBox="0 0 24 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${historyOpen ? '' : 'rotate-180'}`}
                >
                  <path d="M4 14L12 6L20 14" />
                  <path d="M4 8L12 0L20 8" />
                </svg>
              </button>
            </div>

            {historyOpen && (
              <div
                className={`mt-1.5 max-h-[132px] overflow-y-auto flex flex-col gap-1.5 pr-1 ${SCROLLBAR}`}
              >
                {history.length === 0 ? (
                  <div className={`text-[10px] py-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Nothing has been approved or rejected yet.
                  </div>
                ) : (
                  history.map((c) => {
                    const isApproved = c.status === STATUS.APPROVED;
                    const who = isApproved ? c.approvedBy : c.rejectedBy;
                    const when = isApproved ? c.approvedAt : c.rejectedAt;
                    const why = isApproved ? c.approvalComments : c.rejectionComments;
                    return (
                      <div
                        key={c.campaignId}
                        className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-2 text-[10px] ${
                          isDark
                            ? 'bg-[#15161A] border-white/10 text-slate-300'
                            : 'bg-white border-slate-200/90 text-slate-700'
                        }`}
                      >
                        <StatusChip status={c.status} isDark={isDark} />
                        <span
                          className={`font-bold truncate max-w-[260px] ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {campaignLabel(c)}
                        </span>
                        <span className="font-mono-tech text-[9px] opacity-70 flex-shrink-0">
                          {c.campaignId}
                        </span>
                        <span className="truncate flex-1 min-w-0">
                          {who ? `by ${who}` : ''}
                          {when ? ` · ${relativeTime(when)}` : ''}
                          {why ? ` · "${why}"` : ''}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── 4. APPROVE / REJECT DIALOG ─────────────────────────────────────────── */}
      {/* ========================================================================= */}
      {dialog && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={closeDialog}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-[440px] rounded-2xl border p-4 flex flex-col gap-2.5 shadow-xl ${
              isDark ? 'bg-[#15161A] border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className={`text-[14px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {dialog.mode === 'approve' ? 'Approve campaign' : 'Reject campaign'}
                </div>
                <div className={`text-[10.5px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {campaignLabel(dialog.campaign)}
                  <span className="font-mono-tech"> &middot; {dialog.campaign.campaignId}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className={`p-1 rounded cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-black'
                }`}
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`text-[10.5px] leading-snug px-2.5 py-2 rounded-lg ${
                dialog.mode === 'approve'
                  ? isDark
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-emerald-50 text-emerald-800'
                  : isDark
                    ? 'bg-rose-500/10 text-rose-300'
                    : 'bg-rose-50 text-rose-800'
              }`}
            >
              {dialog.mode === 'approve'
                ? 'Approving clears this campaign to run in its planned send window. A note is optional and is kept on the record.'
                : 'A reason is required. The campaign goes back to its owner, who sees exactly what you write here before editing and resubmitting it.'}
            </div>

            <label
              className={`text-[9.5px] font-bold uppercase tracking-wider ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
              htmlFor="approval-comment"
            >
              {dialog.mode === 'approve' ? 'Note (optional)' : 'Reason for rejection (required)'}
            </label>
            <textarea
              id="approval-comment"
              autoFocus
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                dialog.mode === 'approve'
                  ? 'e.g. Checked the sender domain and the recipient list.'
                  : 'e.g. The send window overlaps the quarter-end freeze - move it to the week of the 14th.'
              }
              className={`w-full px-3 py-2 rounded-xl border text-[11px] font-medium outline-none resize-none ${
                isDark
                  ? 'bg-[#1F2128] border-white/10 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />

            {dialog.mode === 'reject' && !comment.trim() && (
              <div className={`text-[10px] ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
                Write a reason to enable the Reject button.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-0.5">
              <button
                type="button"
                onClick={closeDialog}
                className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer ${
                  isDark
                    ? 'border-white/15 text-slate-300 hover:bg-white/5'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Cancel
              </button>
              {dialog.mode === 'approve' ? (
                <button
                  type="button"
                  onClick={submitDialog}
                  className="px-4 py-1.5 rounded-lg text-[11px] font-bold text-white bg-[#2E7D32] hover:bg-[#256628] flex items-center gap-1.5 cursor-pointer"
                >
                  <CircleCheckBig className="w-3.5 h-3.5" />
                  Approve
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submitDialog}
                  disabled={!comment.trim()}
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-bold text-white flex items-center gap-1.5 ${
                    comment.trim()
                      ? 'bg-[#E60000] hover:bg-[#c50000] cursor-pointer'
                      : 'bg-slate-400/50 cursor-not-allowed'
                  }`}
                >
                  <CircleX className="w-3.5 h-3.5" />
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RequestsAndApprovals;
