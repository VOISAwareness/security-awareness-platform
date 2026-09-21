import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  RefreshCw,
  Trash2,
  SquarePen,
  X,
  LoaderCircle,
  TriangleAlert,
  Inbox,
  Mail,
  Users,
  Check,
} from 'lucide-react';

import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { useCampaigns } from '../../services/useCampaigns';
import { setActiveCampaignId } from '../../services/useCampaignDraft';
import {
  STATUS,
  STATUS_ORDER,
  campaignLabel,
  derivePhase,
  formatDateTime,
  isEditable,
  relativeTime,
  statusChipClasses,
  statusMeta,
} from '../../services/campaignStatus';

// =========================================================================
// 🎛️ SCALE CONTROL & BRAND CONSTANTS
// =========================================================================
const VarCampaignsScale = 0.96;
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

// The backend answers DELETE with 409 once sending has begun, so the button is
// never offered for those two states rather than failing after the click.
const UNDELETABLE = [STATUS.SENDING, STATUS.SENT];
const canDelete = (status) => !UNDELETABLE.includes(status);

// One grid template shared by the table head and every row so they stay locked.
const ROW_GRID =
  'grid grid-cols-[minmax(0,2.3fr)_150px_minmax(0,1.5fr)_minmax(0,1.5fr)_160px] gap-3 items-center';

/** A labelled value in the detail panel. Renders nothing when there is no value. */
const DetailField = ({ label, value, mono }) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span
        className={`text-[11px] font-medium text-slate-800 dark:text-slate-200 break-words ${
          mono ? 'font-mono-tech' : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
};

/** One entry in the workflow trail (submitted / approved / rejected). */
const TrailEntry = ({ title, actor, at, comments, isDark, tone }) => {
  if (!actor && !at && !comments) return null;
  const toneRing =
    tone === 'green'
      ? 'border-emerald-400/40'
      : tone === 'red'
        ? 'border-rose-400/40'
        : isDark
          ? 'border-white/10'
          : 'border-slate-200';
  return (
    <div
      className={`p-2.5 rounded-xl border flex flex-col gap-1 ${toneRing} ${
        isDark ? 'bg-black/30' : 'bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-voda-exb text-slate-900 dark:text-white">{title}</span>
        <span className="text-[9px] font-mono-tech text-slate-500 dark:text-slate-400">
          {at ? `${formatDateTime(at)} (${relativeTime(at)})` : '—'}
        </span>
      </div>
      <div className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
        by <strong className="font-bold">{actor || 'unknown'}</strong>
      </div>
      {comments ? (
        <div className="text-[10.5px] text-slate-700 dark:text-slate-200 leading-relaxed">
          &ldquo;{comments}&rdquo;
        </div>
      ) : null}
    </div>
  );
};

const CampaignsHub = () => {
  const navigate = useNavigate();
  const userContext = useUserType?.() || {};
  const isDark = !!userContext.isDark;
  const actor = userContext.user?.role || 'wizard-user';

  const { campaigns, loading, error, pendingAction, refresh, remove } = useCampaigns({
    status: null,
    actor,
  });

  // null = "All". Clicking the active card clears it again.
  const [statusFilter, setStatusFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  // The open detail panel is held by id, not by row object, so that a refresh
  // (or a delete) updates or closes it instead of showing a stale copy.
  const [detailId, setDetailId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionError, setActionError] = useState('');

  const detail = useMemo(
    () => campaigns.find((c) => c.campaignId === detailId) || null,
    [campaigns, detailId]
  );

  // Counts per workflow status over everything loaded (not the filtered view).
  const counts = useMemo(() => {
    const tally = {};
    STATUS_ORDER.forEach((s) => {
      tally[s] = 0;
    });
    campaigns.forEach((c) => {
      tally[c.status] = (tally[c.status] || 0) + 1;
    });
    return tally;
  }, [campaigns]);

  // The hook re-enters `loading` after every delete (it refetches), so the
  // full-panel spinner is reserved for the first load; a background refresh
  // just dims the rows instead of blanking the table.
  const isFirstLoad = loading && campaigns.length === 0;
  const hasRows = !isFirstLoad && !error && campaigns.length > 0;

  // Status filter + client-side search. The hook already returns newest-first,
  // so the order is left exactly as it arrived.
  const visibleCampaigns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (!q) return true;
      return [campaignLabel(c), c.campaignId, c.emailSubject].some((field) =>
        String(field || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [campaigns, searchQuery, statusFilter]);

  // The wizard reads its active campaign from localStorage, so point it at this
  // row and then open step 1.
  const handleEdit = (campaign) => {
    setActiveCampaignId(campaign.campaignId);
    navigate('/start-campaign');
  };

  const handleDelete = async (campaign) => {
    setActionError('');
    try {
      await remove(campaign.campaignId);
      setConfirmDeleteId(null);
    } catch (e) {
      setConfirmDeleteId(null);
      setActionError(
        e?.status === 409
          ? `"${campaignLabel(campaign)}" can no longer be deleted — it has already started sending. Refresh to see its current state.`
          : e?.message || 'Could not delete that campaign.'
      );
    }
  };

  const openDetail = (campaign) => {
    setConfirmDeleteId(null);
    setDetailId(campaign.campaignId);
  };

  const panelBg = isDark ? 'bg-[#1F2128] border-white/0' : 'bg-[#F1F4F9] border-slate-200/0';
  const surfaceBg = isDark
    ? 'bg-[#15161A] border-white/10 text-white'
    : 'bg-white border-slate-200/90 text-slate-900';

  /** Row action cluster: edit / delete, shown only when they are legal. */
  const renderActions = (campaign, { compact = true } = {}) => {
    const busy = pendingAction === campaign.campaignId;
    const editable = isEditable(campaign.status);
    const deletable = canDelete(campaign.status);

    if (busy) {
      return (
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
          <span className="text-[9.5px] font-bold">Working...</span>
        </div>
      );
    }

    if (confirmDeleteId === campaign.campaignId) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-[9.5px] font-bold text-rose-500">Delete?</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(campaign);
            }}
            className="px-2 py-0.5 rounded-md bg-[#E60000] text-white text-[9.5px] font-bold hover:bg-[#c40000] transition-colors cursor-pointer flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            Yes
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmDeleteId(null);
            }}
            className={`px-2 py-0.5 rounded-md text-[9.5px] font-bold border transition-colors cursor-pointer ${
              isDark
                ? 'border-white/15 text-slate-300 hover:bg-white/10'
                : 'border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            No
          </button>
        </div>
      );
    }

    if (!editable && !deletable) {
      return (
        <span className="text-[9px] italic text-slate-400 dark:text-slate-500">
          {compact ? 'No actions' : 'No actions available for this status'}
        </span>
      );
    }

    return (
      <div className="flex items-center gap-1.5">
        {editable && (
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(campaign);
            }}
            title="Open in the campaign wizard"
            className={`px-2 py-1 rounded-md border text-[9.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'border-white/15 text-slate-200 hover:bg-white/10'
                : 'border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <SquarePen className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
        {deletable && (
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              setActionError('');
              setConfirmDeleteId(campaign.campaignId);
            }}
            title="Delete this campaign"
            className={`px-2 py-1 rounded-md border text-[9.5px] font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'border-rose-400/30 text-rose-300 hover:bg-rose-500/15'
                : 'border-rose-300 text-rose-600 hover:bg-rose-50'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div
        style={{ zoom: VarCampaignsScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 overflow-hidden"
      >
        {/* ========================================================================= */}
        {/* ── 1. TOP HEADER BAR: "Campaigns" ──────────────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full h-10 py-2.5 px-6 -mt-2 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm select-none ${
            isDark
              ? 'bg-[#ffffff] text-black border-white/10'
              : 'bg-[#15171C] text-white border-black/10'
          }`}
        >
          <h1 className="text-[15px] font-voda-exb tracking-normal text-white dark:text-black">
            CAMPAIGNS
          </h1>

          <div className="text-[13px] font-voda-exb text-white/80 dark:text-black/80">
            -- Every campaign and where it stands
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
            Every campaign in the account lives here — drafts still being built, submissions waiting
            on an approver, and everything already approved, sending or sent — with the approver
            decision and reason attached to each one.
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
          {/* ── 3a. SUMMARY COUNT CARDS (these are also the status filter) ── */}
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              title="Show every campaign"
              className={`min-w-[104px] flex-1 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-500/15 text-slate-300 border-slate-400/25'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              } ${statusFilter === null ? 'ring-2 ring-[#E60000]' : 'opacity-75 hover:opacity-100'}`}
            >
              <div className="text-[19px] font-voda-exb leading-none">{campaigns.length}</div>
              <div className="text-[9.5px] font-bold mt-1 truncate">All campaigns</div>
            </button>

            {STATUS_ORDER.map((status) => {
              const meta = statusMeta(status);
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  title={meta.blurb}
                  onClick={() => setStatusFilter(isActive ? null : status)}
                  className={`min-w-[104px] flex-1 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${statusChipClasses(
                    status,
                    isDark
                  )} ${isActive ? 'ring-2 ring-[#E60000]' : 'opacity-75 hover:opacity-100'}`}
                >
                  <div className="text-[19px] font-voda-exb leading-none">{counts[status] || 0}</div>
                  <div className="text-[9.5px] font-bold mt-1 truncate">{meta.label}</div>
                </button>
              );
            })}
          </div>

          {/* ── 3b. LIST PANEL ── */}
          <div className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 flex-1 min-h-0 ${panelBg}`}>
            {/* Panel title + primary actions */}
            <div className="flex items-center justify-between gap-3 pb-0.5 flex-shrink-0">
              <h3 className="text-[14.5px] font-voda-exb text-slate-900 dark:text-white">
                All Campaigns
                <span className="ml-2 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                  {statusFilter
                    ? `${visibleCampaigns.length} ${statusMeta(statusFilter).label}`
                    : `${visibleCampaigns.length} shown`}
                </span>
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refresh()}
                  disabled={loading}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 ${
                    isDark
                      ? 'border-white/15 text-slate-200 hover:bg-white/10'
                      : 'border-slate-300 text-slate-700 hover:bg-white'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/start-campaign')}
                  className="px-3 py-1 rounded-lg bg-[#E60000] text-white text-[10px] font-bold flex items-center gap-1.5 hover:bg-[#c40000] transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Start a campaign
                </button>
              </div>
            </div>

            {/* Search */}
            <div
              className={`w-full px-4 py-2 rounded-xl border flex items-center justify-between flex-shrink-0 shadow-2xs ${surfaceBg}`}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Campaign Name, Campaign ID or Email Subject"
                className="w-full bg-transparent text-[11px] font-medium outline-none pr-3 placeholder-slate-400"
              />
              <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
            </div>

            {/* Action error strip (delete failures / 409 conflicts) */}
            {actionError && (
              <div
                className={`w-full px-3 py-2 rounded-xl border flex items-start gap-2 flex-shrink-0 text-[10.5px] font-medium ${
                  isDark
                    ? 'bg-rose-500/15 text-rose-200 border-rose-400/30'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                <TriangleAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{actionError}</span>
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="font-bold underline cursor-pointer flex-shrink-0"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setActionError('')}
                  className="cursor-pointer flex-shrink-0"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Table head */}
            <div
              className={`px-3 py-1.5 rounded-lg flex-shrink-0 ${ROW_GRID} text-[9px] font-bold uppercase tracking-wide ${
                isDark ? 'text-slate-400 bg-white/5' : 'text-slate-500 bg-slate-200/60'
              }`}
            >
              <span>Campaign</span>
              <span>Status</span>
              <span>Schedule window</span>
              <span>Sender &amp; recipients</span>
              <span className="text-right">Actions</span>
            </div>

            {/* ── 3c. THE FOUR STATES ── */}
            <div
              className={`flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-1 transition-opacity [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full ${
                loading && !isFirstLoad ? 'opacity-50' : ''
              }`}
            >
              {/* STATE 1 — LOADING */}
              {isFirstLoad && (
                <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400">
                  <LoaderCircle className="w-5 h-5 animate-spin" />
                  <span className="text-[11px] font-bold">Loading campaigns...</span>
                </div>
              )}

              {/* STATE 2 — ERROR */}
              {!isFirstLoad && error && (
                <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <TriangleAlert className="w-6 h-6 text-[#E60000]" />
                  <span className="text-[12px] font-voda-exb text-slate-900 dark:text-white">
                    Could not load campaigns
                  </span>
                  <span className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 max-w-[520px]">
                    {error.message || 'The campaigns service did not respond.'}
                    {error.status ? ` (HTTP ${error.status})` : ''}
                  </span>
                  {Array.isArray(error.problems) && error.problems.length > 0 && (
                    <ul className="text-[10px] font-mono-tech text-slate-500 dark:text-slate-400 list-disc pl-4 text-left">
                      {error.problems.map((problem, i) => (
                        <li key={i}>{String(problem)}</li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => refresh()}
                    className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#E60000] text-white text-[10.5px] font-bold flex items-center gap-1.5 hover:bg-[#c40000] transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              )}

              {/* STATE 3 — EMPTY (nothing at all) */}
              {!isFirstLoad && !error && campaigns.length === 0 && (
                <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <Inbox className="w-6 h-6 text-slate-400" />
                  <span className="text-[12px] font-voda-exb text-slate-900 dark:text-white">
                    No campaigns yet
                  </span>
                  <span className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 max-w-[540px]">
                    A campaign appears here the moment the wizard saves its first draft, and stays
                    here for the rest of its life — submitted, approved or rejected, sending and
                    sent. Nothing has been created in this account so far.
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/start-campaign')}
                    className="mt-1 px-3.5 py-1.5 rounded-lg bg-[#E60000] text-white text-[10.5px] font-bold flex items-center gap-1.5 hover:bg-[#c40000] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Start a campaign
                  </button>
                </div>
              )}

              {/* STATE 3b — loaded, but nothing matches this filter/search */}
              {hasRows && visibleCampaigns.length === 0 && (
                <div className="h-full min-h-[180px] flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <Search className="w-5 h-5 text-slate-400" />
                  <span className="text-[11.5px] font-voda-exb text-slate-900 dark:text-white">
                    No campaigns match this view
                  </span>
                  <span className="text-[10.5px] font-medium text-slate-600 dark:text-slate-300 max-w-[480px]">
                    {statusFilter
                      ? statusMeta(statusFilter).blurb
                      : 'Nothing matches that search term.'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter(null);
                      setSearchQuery('');
                    }}
                    className={`mt-1 px-3 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition-colors ${
                      isDark
                        ? 'border-white/15 text-slate-200 hover:bg-white/10'
                        : 'border-slate-300 text-slate-700 hover:bg-white'
                    }`}
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* STATE 4 — CONTENT */}
              {hasRows &&
                visibleCampaigns.map((campaign) => {
                  const meta = statusMeta(campaign.status);
                  const phase = derivePhase(campaign);
                  const isBusy = pendingAction === campaign.campaignId;
                  const recipient = campaign.selectedListName || campaign.selectedListId;
                  const sender =
                    campaign.senderName || campaign.senderEmailId || 'No sender chosen yet';

                  return (
                    <div
                      key={campaign.campaignId}
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetail(campaign)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDetail(campaign);
                        }
                      }}
                      className={`px-3 py-2.5 rounded-xl border flex-shrink-0 cursor-pointer transition-all ${ROW_GRID} ${
                        isBusy ? 'opacity-60' : ''
                      } ${
                        isDark
                          ? 'bg-[#15161A] border-white/10 hover:border-white/25'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Col 1 — name + id */}
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[12px] font-voda-exb text-slate-900 dark:text-white truncate">
                          {campaignLabel(campaign)}
                        </span>
                        <span className="text-[9px] font-mono-tech text-slate-500 dark:text-slate-400 truncate">
                          {campaign.campaignId}
                        </span>
                      </div>

                      {/* Col 2 — workflow status (primary) + lifecycle phase (secondary) */}
                      <div className="flex flex-col items-start gap-1 min-w-0">
                        <span
                          title={meta.blurb}
                          className={`px-2 py-0.5 rounded-full border text-[9.5px] font-bold whitespace-nowrap ${statusChipClasses(
                            campaign.status,
                            isDark
                          )}`}
                        >
                          {meta.label}
                        </span>
                        {phase && (
                          <span className="text-[8.5px] font-medium uppercase tracking-wide text-slate-500 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-slate-400" />
                            {phase}
                          </span>
                        )}
                      </div>

                      {/* Col 3 — schedule window */}
                      <div className="flex flex-col gap-0.5 min-w-0 text-[9.5px] font-mono-tech text-slate-600 dark:text-slate-300">
                        <span className="truncate">
                          <span className="text-slate-400">Start </span>
                          {formatDateTime(campaign.startTime)}
                        </span>
                        <span className="truncate">
                          <span className="text-slate-400">End&nbsp;&nbsp; </span>
                          {formatDateTime(campaign.endTime)}
                        </span>
                      </div>

                      {/* Col 4 — sender + recipients */}
                      <div className="flex flex-col gap-0.5 min-w-0 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0 text-slate-400" />
                          <span className="truncate">{sender}</span>
                        </span>
                        {recipient ? (
                          <span className="flex items-center gap-1.5 truncate">
                            <Users className="w-3 h-3 flex-shrink-0 text-slate-400" />
                            <span className="truncate">
                              {recipient}
                              {campaign.recipientCount ? ` · ${campaign.recipientCount}` : ''}
                            </span>
                          </span>
                        ) : null}
                      </div>

                      {/* Col 5 — actions */}
                      <div className="flex items-center justify-end">{renderActions(campaign)}</div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 4. CAMPAIGN DETAIL MODAL ───────────────────────────────────────────── */}
        {/* ========================================================================= */}
        {detail && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-6">
            <div
              className={`w-full max-w-3xl max-h-[86vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
                isDark ? 'bg-[#15161A] border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              {/* Modal header */}
              <div
                className={`px-5 py-3 flex items-start justify-between gap-3 border-b flex-shrink-0 ${
                  isDark ? 'border-white/10 bg-[#1F2128]' : 'border-slate-200 bg-[#F1F4F9]'
                }`}
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[9.5px] font-bold ${statusChipClasses(
                        detail.status,
                        isDark
                      )}`}
                    >
                      {statusMeta(detail.status).label}
                    </span>
                    {derivePhase(detail) && (
                      <span className="text-[8.5px] font-medium uppercase tracking-wide text-slate-500">
                        · {derivePhase(detail)}
                      </span>
                    )}
                  </div>
                  <h3 className="text-[15px] font-voda-exb text-slate-900 dark:text-white truncate">
                    {campaignLabel(detail)}
                  </h3>
                  <span className="text-[9.5px] font-mono-tech text-slate-500 dark:text-slate-400">
                    {detail.campaignId}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailId(null)}
                  className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer flex-shrink-0"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-5 flex flex-col gap-4 overflow-y-auto">
                {/* The rejection reason is what the owner opened this to read. */}
                {(detail.status === STATUS.REJECTED || detail.rejectionComments) && (
                  <div
                    className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                      isDark ? 'bg-rose-500/15 border-rose-400/30' : 'bg-rose-50 border-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <TriangleAlert className="w-4 h-4 text-rose-500 flex-shrink-0" />
                      <span className="text-[12px] font-voda-exb text-rose-700 dark:text-rose-200">
                        Sent back by the approver
                      </span>
                    </div>
                    <p className="text-[12.5px] font-medium leading-relaxed text-rose-800 dark:text-rose-100">
                      {detail.rejectionComments || 'No reason was recorded.'}
                    </p>
                    <span className="text-[9.5px] font-mono-tech text-rose-600/80 dark:text-rose-300/80">
                      {detail.rejectedBy || 'unknown approver'}
                      {detail.rejectedAt ? ` · ${formatDateTime(detail.rejectedAt)}` : ''}
                    </span>
                    {isEditable(detail.status) && (
                      <span className="text-[10px] font-medium text-rose-700 dark:text-rose-200">
                        This campaign is editable again — fix it and resubmit.
                      </span>
                    )}
                  </div>
                )}

                {detail.campaignDescription ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Description
                    </span>
                    <p className="text-[11.5px] font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                      {detail.campaignDescription}
                    </p>
                  </div>
                ) : null}

                <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-3">
                  <DetailField label="Email subject" value={detail.emailSubject} />
                  <DetailField label="Sender name" value={detail.senderName} />
                  <DetailField label="Sender address" value={detail.senderEmailId} mono />
                  <DetailField label="Starts" value={formatDateTime(detail.startTime)} mono />
                  <DetailField label="Ends" value={formatDateTime(detail.endTime)} mono />
                  <DetailField label="Created" value={formatDateTime(detail.createdAt)} mono />
                  <DetailField label="Last updated" value={formatDateTime(detail.updatedAt)} mono />
                  <DetailField
                    label="Recipient list"
                    value={detail.selectedListName || detail.selectedListId}
                  />
                  <DetailField label="Recipients" value={detail.recipientCount} />
                  <DetailField label="Scenario ID" value={detail.scenarioId} mono />
                  <DetailField label="Landing page ID" value={detail.landingPageId} mono />
                  <DetailField label="Training ID" value={detail.trainingId} mono />
                </div>

                {/* Workflow trail */}
                {(detail.submittedBy ||
                  detail.submittedAt ||
                  detail.submissionComments ||
                  detail.approvedBy ||
                  detail.approvedAt ||
                  detail.approvalComments ||
                  detail.rejectedBy ||
                  detail.rejectedAt ||
                  detail.rejectionComments) && (
                  <>
                    <div className={`h-px w-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`} />
                    <div className="flex flex-col gap-2">
                      <span className="text-[11px] font-voda-exb text-slate-900 dark:text-white">
                        Approval trail
                      </span>
                      <TrailEntry
                        title="Submitted for approval"
                        actor={detail.submittedBy}
                        at={detail.submittedAt}
                        comments={detail.submissionComments}
                        isDark={isDark}
                      />
                      <TrailEntry
                        title="Approved"
                        actor={detail.approvedBy}
                        at={detail.approvedAt}
                        comments={detail.approvalComments}
                        isDark={isDark}
                        tone="green"
                      />
                      <TrailEntry
                        title="Rejected"
                        actor={detail.rejectedBy}
                        at={detail.rejectedAt}
                        comments={detail.rejectionComments}
                        isDark={isDark}
                        tone="red"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Modal footer */}
              <div
                className={`px-5 py-3 flex items-center justify-between gap-3 border-t flex-shrink-0 ${
                  isDark ? 'border-white/10 bg-[#1F2128]' : 'border-slate-200 bg-[#F1F4F9]'
                }`}
              >
                {renderActions(detail, { compact: false })}

                <button
                  type="button"
                  onClick={() => setDetailId(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-500/80 hover:bg-slate-600 text-white font-bold text-[10.5px] uppercase cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CampaignsHub;
