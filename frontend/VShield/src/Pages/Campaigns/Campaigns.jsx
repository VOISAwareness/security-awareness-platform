import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ChevronDown, 
  ExternalLink, 
  User, 
  ArrowUp,
  ArrowDown,
  Eye,
  X,
  FilePenLine,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Send
} from 'lucide-react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { useCampaigns } from '../../services/useCampaigns';
import { setActiveCampaignId } from '../../services/useCampaignDraft';
import { DESIGN_STATUS, toDesignCampaign } from '../../services/campaignDesign';
import { PHASE } from '../../services/campaignStatus';
import { actorFor } from '../../services/identity';

// Assets imported strictly from src/assets/CampaignsAssets
import OnGoingImg from '../../assets/CampaignsAssets/OnGoingCampaignsImage.png';
import ScheduledImg from '../../assets/CampaignsAssets/ScheduledCampaignsImage.png';
import HistoricalImg from '../../assets/CampaignsAssets/HistoricalCampaignsImage.png';
import CalendarWhiteIcon from '../../assets/CampaignsAssets/CalenderWhiteIconCampaignsImage.png';
import CalendarBlackIcon from '../../assets/CampaignsAssets/CalenderBlackIconCampaignsImage.png';
import { DEMO_USER } from '../../appConfig';

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS
// =========================================================================
export const VarCampaignsScale = 0.90;
export const VarOverallCornerRoundednessAdjuster = 0.7;
export const VarLeftSectionWidth = '22%';
export const VarRightSectionWidth = '78%';
export const VarSectionGap = 10; // in px
export const VarRightGalleryBaseHeight = 490; // in px
export const VarThreeButtonsHeightAdjuster = 80; // Height of the top three category capsules in px

// =========================================================================
// 🔤 VODAFONE TYPOGRAPHY & CORNER STYLES
// =========================================================================
const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
  
  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Montserrat', sans-serif;
    font-weight: 900;
  }
  .font-mono-tech {
    font-family: 'JetBrains Mono', monospace;
  }
  .rounded-3xl { border-radius: ${Math.round(28 * VarOverallCornerRoundednessAdjuster)}px !important; }
  .rounded-2xl { border-radius: ${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px !important; }
  .rounded-xl  { border-radius: ${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px !important; }
  .rounded-lg  { border-radius: ${Math.round(10 * VarOverallCornerRoundednessAdjuster)}px !important; }
  .rounded-md  { border-radius: ${Math.round(6 * VarOverallCornerRoundednessAdjuster)}px !important; }
`;

// Global modulo-3 color series rule with Dark Mode Inversion Support
const getCardBgColor = (index, isDark) => {
  const remainder = index % 3;
  if (isDark) {
    if (remainder === 0) return '#2E200C'; // Dark Warm Peach / Amber
    if (remainder === 1) return '#22193E'; // Dark Lavender / Purple
    return '#0D271E';                      // Dark Mint / Emerald
  }
  if (remainder === 0) return '#FFEFCE';   // Warm Peach
  if (remainder === 1) return '#ECE8FF';   // Lavender
  return '#CEFBEA';                        // Soft Mint
};

// Pure white in light mode, dark tone in dark mode
const getLCardBg = (isDark) => (isDark ? '#1C1E24' : '#FFFFFF');

const TAB_CONFIG = {
  ongoing: {
    id: 'ongoing',
    title: 'On Going Campaigns',
    subtitle: 'Campaigns that currently started and haven\'t end yet',
    counterColor: '#818CF8', // Soft Indigo
    img: OnGoingImg
  },
  scheduled: {
    id: 'scheduled',
    title: 'Scheduled Campaigns',
    subtitle: 'Campaigns that are successfully scheduled to run in coming days',
    counterColor: '#8ED973', // Green
    img: ScheduledImg
  },
  historical: {
    id: 'historical',
    title: 'Historical Campaigns',
    subtitle: 'Campaigns that were successfully ended over time',
    counterColor: '#E57A44', // Orange
    img: HistoricalImg
  },
  drafts: {
    id: 'drafts',
    title: 'Drafts',
    subtitle: 'Your unfinished campaigns, and sends that failed',
    counterColor: '#94A3B8', // Slate
    img: null
  }
};

const Campaigns = ({ isDark: propIsDark }) => {
  const userContext = useUserType?.() || {};
  const navigate = useNavigate();
  const actor = actorFor(userContext.user);
  const { campaigns, loading, error, pendingAction, refresh, remove, send } = useCampaigns({ actor });

  // Theme check: Reactive Pipeline with HTML class and MutationObserver
  const [isDark, setIsDark] = useState(() => {
    if (typeof propIsDark === 'boolean') return propIsDark;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || !!userContext.isDark;
    }
    return !!userContext.isDark;
  });

  useEffect(() => {
    if (typeof propIsDark === 'boolean') {
      setIsDark(propIsDark);
    } else if (typeof userContext.isDark === 'boolean') {
      setIsDark(userContext.isDark);
    }
  }, [propIsDark, userContext.isDark]);

  useEffect(() => {
    const checkDark = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(hasDarkClass || !!userContext.isDark);
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [userContext.isDark]);

  // Active selected view: 'ongoing' | 'scheduled' | 'historical'
  const [activeTab, setActiveTab] = useState('ongoing');

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Shortest Expiring Date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Modals
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [previewEmailHtml, setPreviewEmailHtml] = useState(null);

  // Calendar month state
  const [calendarDate, setCalendarDate] = useState(new Date());

  const lCardBg = getLCardBg(isDark);

  // Drafts tab: which card is asking "delete?", and the last action failure.
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [actionError, setActionError] = useState('');
  // Send-test flow: which card is awaiting confirmation, and the success note.
  const [confirmSendId, setConfirmSendId] = useState(null);
  const [sendNotice, setSendNotice] = useState('');

  // Live campaigns from the API, in the field names this screen was drawn with.
  const campaignsList = useMemo(() => campaigns.map((c) => toDesignCampaign(c)), [campaigns]);

  // Standardized Date Formatters: mm/dd/yyyy
  const formatDisplayDate = (dateStr, includeTime = false) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();

      if (!includeTime) {
        return `${month}/${day}/${year}`;
      }

      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  // Compute days left until end date
  const getDaysLeft = (endTimeStr) => {
    if (!endTimeStr) return null;
    try {
      const end = new Date(endTimeStr);
      const diffMs = end - new Date();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `(${diffDays} days left)` : '(Ending today)';
    } catch {
      return null;
    }
  };

  // Published campaigns split on their schedule (the derived phase); drafts
  // and failed sends go to the Drafts tab. Pending, rejected and expired
  // requests live on Requests & Approvals instead.
  const categorizedCampaigns = useMemo(() => {
    const ongoing = [];
    const scheduled = [];
    const historical = [];
    const drafts = [];

    campaignsList.forEach((c) => {
      if (c.CampaignStatus === DESIGN_STATUS.PUBLISHED) {
        if (c.phase === PHASE.COMPLETED) historical.push(c);
        else if (c.phase === PHASE.LIVE) ongoing.push(c);
        else scheduled.push(c);
      } else if (
        c.CampaignStatus === DESIGN_STATUS.DRAFTED ||
        c.CampaignStatus === DESIGN_STATUS.FAILED
      ) {
        // Drafts are personal work in progress. Rows created before createdBy
        // was recorded have no owner, so everyone still sees those.
        const owner = String(c.CreatedBy || '').toLowerCase();
        if (!owner || owner === actor) drafts.push(c);
      }
    });

    return { ongoing, scheduled, historical, drafts };
  }, [campaignsList, actor]);

  // Reopen the draft on its details step (not step 1, which reads as starting
  // over); "Go back" from there still reaches the scenario choice.
  const handleResume = (camp) => {
    setActiveCampaignId(camp.campaignId);
    navigate('/start-campaign/details');
  };

  const handleDelete = async (camp) => {
    setActionError('');
    try {
      await remove(camp.campaignId);
    } catch (e) {
      setActionError(e?.message || 'Could not delete that campaign.');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Trigger the real send for an APPROVED campaign. In the SES sandbox the
  // backend delivers only to its configured verified recipient, so this is a
  // safe end-to-end pipeline test, not a send to the campaign's real audience.
  const handleSend = async (camp) => {
    setActionError('');
    setSendNotice('');
    try {
      await send(camp.campaignId);
      setSendNotice(
        `Send triggered for ${camp.campaignId}. The test email goes to the verified recipient configured in AWS — check that inbox.`
      );
    } catch (e) {
      setActionError(e?.message || 'Could not send that campaign.');
    } finally {
      setConfirmSendId(null);
    }
  };

  // Active Category List Filtered by Search & Sort
  const currentCategoryList = useMemo(() => {
    let list = categorizedCampaigns[activeTab] || [];
    const q = searchTerm.trim().toLowerCase();

    if (q) {
      list = list.filter((c) => 
        (c.campaignId && c.campaignId.toLowerCase().includes(q)) ||
        (c.CampaignTitle && c.CampaignTitle.toLowerCase().includes(q)) ||
        (c.campaignTitle && c.campaignTitle.toLowerCase().includes(q)) ||
        (c.CreatedBy && c.CreatedBy.toLowerCase().includes(q))
      );
    }

    list = [...list].sort((a, b) => {
      const dateA = new Date(a.EndTime || a.StartTime || a.CreationDate || 0).getTime();
      const dateB = new Date(b.EndTime || b.StartTime || b.CreationDate || 0).getTime();
      const createdA = new Date(a.CreationDate || 0).getTime();
      const createdB = new Date(b.CreationDate || 0).getTime();

      if (sortBy === 'Shortest Expiring Date') return dateA - dateB;
      if (sortBy === 'Latest Created Date') return createdB - createdA;
      if (sortBy === 'Oldest Created Date') return createdA - createdB;
      return 0;
    });

    return list;
  }, [categorizedCampaigns, activeTab, searchTerm, sortBy]);

  // Calendar Day Click Matrix
  const calendarMonthDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }
    const remaining = 35 - days.length;
    for (let i = 1; i <= (remaining > 0 ? remaining : 42 - days.length); i++) {
      days.push({ day: i, isCurrentMonth: false });
    }
    return days;
  }, [calendarDate]);

  const activeTabConfig = TAB_CONFIG[activeTab];
  const today = new Date();

  // Helper for Top Three Buttons styling
  const getTabButtonClasses = (tabId) => {
    const isSelected = activeTab === tabId;
    if (isSelected) {
      return isDark
        ? 'bg-white text-black shadow-md border-transparent'
        : 'bg-black text-white shadow-md border-transparent';
    }
    return isDark
      ? 'bg-[#1C1E24] text-white hover:bg-[#252830] border-white/10 shadow-xs'
      : 'bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs';
  };

  // Send-test control for an APPROVED campaign card. Confirms first, then calls
  // the backend; the Lambda delivers only to the configured verified recipient.
  const renderSendAction = (camp) => {
    const busy = pendingAction === camp.campaignId;
    if (busy) return <span className="text-slate-500 font-bold">Sending…</span>;
    if (confirmSendId === camp.campaignId) {
      return (
        <span className="flex items-center gap-1.5 font-bold">
          <span className="text-slate-700 dark:text-slate-300">Send test email?</span>
          <button
            type="button"
            onClick={() => handleSend(camp)}
            className="px-2 py-0.5 rounded-md bg-[#E60000] text-white cursor-pointer"
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setConfirmSendId(null)}
            className="px-2 py-0.5 rounded-md bg-white dark:bg-black/40 border border-black/10 dark:border-white/15 cursor-pointer"
          >
            No
          </button>
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setConfirmSendId(camp.campaignId)}
        className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black text-white dark:bg-white dark:text-black font-bold cursor-pointer"
        title="Send the real email to the AWS-verified test recipient"
      >
        <Send className="w-3 h-3" /> Send test
      </button>
    );
  };

  // Drafts tab card footer: a draft can be resumed or deleted; a failed send
  // can only be deleted (the sender will not retry it).
  const renderDraftActions = (camp) => {
    const failed = camp.CampaignStatus === DESIGN_STATUS.FAILED;
    const chip = failed
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
      : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300';
    const busy = pendingAction === camp.campaignId;

    return (
      <span className="flex items-center gap-1.5 font-bold">
        <span className={`px-2 py-0.5 rounded-full text-[8.5px] uppercase tracking-wide ${chip}`}>
          {failed ? 'Send failed' : 'Draft'}
        </span>
        {busy ? (
          <span className="text-slate-500">Working…</span>
        ) : confirmDeleteId === camp.campaignId ? (
          <>
            <span className="text-slate-700 dark:text-slate-300">Delete?</span>
            <button
              type="button"
              onClick={() => handleDelete(camp)}
              className="px-2 py-0.5 rounded-md bg-[#E60000] text-white cursor-pointer"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteId(null)}
              className="px-2 py-0.5 rounded-md bg-white dark:bg-black/40 border border-black/10 dark:border-white/15 cursor-pointer"
            >
              No
            </button>
          </>
        ) : (
          <>
            {!failed && (
              <button
                type="button"
                onClick={() => handleResume(camp)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black text-white dark:bg-white dark:text-black cursor-pointer"
              >
                <FilePenLine className="w-3 h-3" /> Resume
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirmDeleteId(camp.campaignId)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-black/40 border border-black/10 dark:border-white/15 text-[#E60000] cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </>
        )}
      </span>
    );
  };

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* 🌟 ROOT CONTAINER */}
      <div 
        style={{ zoom: VarCampaignsScale }}
        className="w-full max-w-[1780px] mx-auto p-3.5 -mt-2 select-none font-sans flex flex-col gap-3 min-h-[calc(108vh-0px)]"
      >
        {/* ── TOP HEADER BAR: "Campaigns" ── */}
        <div
          className={`w-full h-[40px] py-2.5 px-6 -mt-2 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${
            isDark ? 'bg-white text-black border-white/10' : 'bg-[#000000] text-white border-black/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] font-bold tracking-tight uppercase">
              Campaigns
            </h1>
          </div>
        </div>

        {/* ── 2-COLUMN MAIN WORKSPACE ── */}
        <div 
          style={{ gap: `${VarSectionGap}px` }}
          className="w-full flex flex-col lg:flex-row items-start"
        >
          {/* ========================================================================= */}
          {/* 👈 LEFT COLUMN: 3 SWITCHER CAPSULES + MINI CALENDAR CARD                 */}
          {/* ========================================================================= */}
          <div 
            style={{ width: VarLeftSectionWidth, flex: `0 0 ${VarLeftSectionWidth}` }}
            className="flex flex-col gap-3.5 min-w-[280px]"
          >
            {/* 1. ON GOING CAMPAIGNS CAPSULE */}
            <div
              onClick={() => setActiveTab('ongoing')}
              style={{
                height: `${VarThreeButtonsHeightAdjuster}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${getTabButtonClasses('ongoing')}`}
            >
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-[14px] font-voda font-bold tracking-tight leading-tight">
                  On Going Campaigns
                </h3>
              </div>
              <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                activeTab === 'ongoing' 
                  ? (isDark ? 'text-slate-700' : 'text-slate-300')
                  : (isDark ? 'text-slate-400' : 'text-slate-500')
              }`}>
                {TAB_CONFIG.ongoing.subtitle}
              </p>
              <div className="absolute -bottom-1 -right-1 w-14 h-14 pointer-events-none select-none z-0">
                <img 
                  src={TAB_CONFIG.ongoing.img} 
                  alt="On Going" 
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* 2. SCHEDULED CAMPAIGNS CAPSULE */}
            <div
              onClick={() => setActiveTab('scheduled')}
              style={{
                height: `${VarThreeButtonsHeightAdjuster}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${getTabButtonClasses('scheduled')}`}
            >
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-[14px] font-voda font-bold tracking-tight leading-tight">
                  Scheduled Campaigns
                </h3>
              </div>
              <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                activeTab === 'scheduled' 
                  ? (isDark ? 'text-slate-700' : 'text-slate-300')
                  : (isDark ? 'text-slate-400' : 'text-slate-500')
              }`}>
                {TAB_CONFIG.scheduled.subtitle}
              </p>
              <div className="absolute -bottom-1 -right-1 w-14 h-14 pointer-events-none select-none z-0">
                <img 
                  src={TAB_CONFIG.scheduled.img} 
                  alt="Scheduled" 
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* 3. HISTORICAL CAMPAIGNS CAPSULE */}
            <div
              onClick={() => setActiveTab('historical')}
              style={{
                height: `${VarThreeButtonsHeightAdjuster}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${getTabButtonClasses('historical')}`}
            >
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-[14px] font-voda font-bold tracking-tight leading-tight">
                  Historical Campaigns
                </h3>
              </div>
              <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                activeTab === 'historical' 
                  ? (isDark ? 'text-slate-700' : 'text-slate-300')
                  : (isDark ? 'text-slate-400' : 'text-slate-500')
              }`}>
                {TAB_CONFIG.historical.subtitle}
              </p>
              <div className="absolute -bottom-1 -right-1 w-14 h-14 pointer-events-none select-none z-0">
                <img 
                  src={TAB_CONFIG.historical.img} 
                  alt="Historical" 
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* 4. DRAFTS CAPSULE (resume or delete unfinished work; failed sends) */}
            <div
              onClick={() => setActiveTab('drafts')}
              style={{
                height: `${VarThreeButtonsHeightAdjuster}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${getTabButtonClasses('drafts')}`}
            >
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-[14px] font-voda font-bold tracking-tight leading-tight">
                  Drafts
                </h3>
              </div>
              <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                activeTab === 'drafts' 
                  ? (isDark ? 'text-slate-700' : 'text-slate-300')
                  : (isDark ? 'text-slate-400' : 'text-slate-500')
              }`}>
                {TAB_CONFIG.drafts.subtitle}
              </p>
              <div className="absolute bottom-2 right-3 pointer-events-none select-none z-0">
                <FilePenLine className="w-9 h-9 text-[#94A3B8]" strokeWidth={1.6} />
              </div>
            </div>

            {/* 4. DOCKED CALENDAR CARD */}
            <div
              style={{
                borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full bg-[#0B0C10] text-white p-4 shadow-md border border-white/10 flex flex-col gap-3 select-none"
            >
              {/* Header with Title and Month Navigation */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <img 
                    src={CalendarWhiteIcon} 
                    alt="Calendar Icon" 
                    className="w-4 h-4 object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <span className="text-[11.5px] font-voda font-bold tracking-tight">
                    {activeTabConfig.title}
                  </span>
                </div>
              </div>

              {/* Month Navigator */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[12px] font-bold text-white">
                  {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <ArrowUp className="w-3 h-3 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                    className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                  >
                    <ArrowDown className="w-3 h-3 text-white" />
                  </button>
                </div>
              </div>

              {/* Weekday Names */}
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={i}>{d}</span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-y-1.5 text-center text-[10.5px]">
                {calendarMonthDays.map((item, idx) => {
                  const isCurrentDay =
                    item.isCurrentMonth &&
                    item.day === today.getDate() &&
                    calendarDate.getMonth() === today.getMonth() &&
                    calendarDate.getFullYear() === today.getFullYear();
                  return (
                    <div key={idx} className="flex items-center justify-center h-6">
                      <span 
                        className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${
                          isCurrentDay
                            ? 'bg-[#3730A3] text-white shadow-xs' 
                            : item.isCurrentMonth 
                              ? 'text-white' 
                              : 'text-slate-600'
                        }`}
                      >
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 👉 RIGHT COLUMN: DYNAMIC GALLERY (CARDS AND L-BASE VIEW)                  */}
          {/* ========================================================================= */}
          <div 
            style={{ width: VarRightSectionWidth, flex: `0 0 ${VarRightSectionWidth}` }}
            className="flex flex-col min-w-0"
          >
            {/* 🌟 1. TOP-RIGHT ARM: CONTROLS & DYNAMIC BIG COUNTER (ELEVATED Z-INDEX) */}
            <div
              style={{ 
                backgroundColor: lCardBg,
                borderTopRightRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
                borderTopLeftRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full h-[100px] px-6 py-3 flex items-center justify-between border-t border-l border-r border-black/5 dark:border-white/5 transition-colors relative z-30"
            >
              {/* Left Side: Dynamic Big Counter + Category Headline */}
              <div className="flex items-center gap-4">
                <span 
                  style={{ color: activeTabConfig.counterColor }}
                  className="text-5xl font-black leading-none tracking-tight font-voda-exb"
                >
                  {String(currentCategoryList.length).padStart(2, '0')}
                </span>
                <span className="text-[15px] font-voda font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                  Total <br /> {activeTabConfig.title}
                </span>
              </div>

              {/* Right Side: Search Input & Sort Dropdown */}
              <div className="flex flex-col gap-2 max-w-[340px] w-full">
                {/* Search by Campaign ID or Name */}
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Search by Campaign ID or Campaign Name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-7 pl-3 pr-8 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] font-bold text-slate-800 dark:text-slate-200 text-[9px] placeholder-slate-400 outline-none border border-black/5 dark:border-white/5"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
                </div>

                {/* Sort By Dropdown (z-[100] to float over lower base) */}
                <div className="relative w-40">
                  <button
                    type="button"
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="w-full h-6 px-2.5 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] text-slate-700 dark:text-slate-300 text-[8px] font-bold flex items-center justify-between border border-black/5 dark:border-white/5 cursor-pointer shadow-2xs"
                  >
                    <span className="truncate">Sort By: {sortBy.split(' ')[0]}</span>
                    <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 ml-1" />
                  </button>

                  {showSortDropdown && (
                    <div className="absolute top-7 left-0 w-44 bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-[100] flex flex-col">
                      {['Shortest Expiring Date', 'Latest Created Date', 'Oldest Created Date'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSortBy(option);
                            setShowSortDropdown(false);
                          }}
                          className={`px-3 py-1 text-left text-[9px] font-bold cursor-pointer transition-colors ${
                            sortBy === option
                              ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {(error || actionError) && (
              <div className="w-full px-6 py-2 flex items-center justify-between gap-3 bg-rose-50 dark:bg-rose-500/10 border-l border-r border-rose-200 dark:border-rose-400/20 text-rose-700 dark:text-rose-300 text-[10px] font-bold relative z-20">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {actionError || `Could not load campaigns: ${error.message}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActionError('');
                    refresh();
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-black/40 border border-rose-200 dark:border-rose-400/30 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            {sendNotice && (
              <div className="w-full px-6 py-2 flex items-center justify-between gap-3 bg-emerald-50 dark:bg-emerald-500/10 border-l border-r border-emerald-200 dark:border-emerald-400/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold relative z-20">
                <span className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  {sendNotice}
                </span>
                <button
                  type="button"
                  onClick={() => setSendNotice('')}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-black/40 border border-emerald-200 dark:border-emerald-400/30 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* 🌟 2. CONTINUOUS LOWER L-BASE: CAMPAIGNS FEED */}
            <div
              style={{ 
                backgroundColor: lCardBg,
                height: `${VarRightGalleryBaseHeight}px`,
                borderBottomLeftRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
                borderBottomRightRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full p-4 flex flex-col gap-3 overflow-y-auto border-b border-l border-r border-black/5 dark:border-white/5 transition-colors [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md"
            >
              {loading && campaigns.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-slate-400">Loading campaigns…</p>
                </div>
              ) : currentCategoryList.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-slate-400">
                    No {activeTabConfig.title.toLowerCase()} found matching criteria.
                  </p>
                </div>
              ) : (
                /* 2-Column Responsive Grid matching screenshot */
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                  {currentCategoryList.map((camp, idx) => {
                    const cardBg = getCardBgColor(idx, isDark);
                    const daysLeft = getDaysLeft(camp.EndTime);

                    return (
                      <div
                        key={camp.campaignId}
                        style={{ 
                          backgroundColor: cardBg,
                          borderRadius: `${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px`
                        }}
                        className="p-3 text-slate-900 dark:text-white shadow-2xs flex flex-col justify-between gap-1.5 relative overflow-hidden transition-all hover:shadow-xs border border-black/5 dark:border-white/5 flex-shrink-0"
                      >
                        {/* Top Line: ID Badge & Created Date */}
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-black/60 text-[9px] font-black text-slate-800 dark:text-slate-100 tracking-wide flex items-center gap-1 shadow-2xs font-mono-tech border border-black/5 dark:border-white/10">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                            {camp.campaignId}
                          </span>

                          <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-600 dark:text-slate-300">
                            <span>Created on: {formatDisplayDate(camp.CreationDate)}</span>
                            <button
                              type="button"
                              onClick={() => setDetailModalItem(camp)}
                              className="text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer ml-1"
                              title="View Full Specifications & Email Preview"
                            >
                              <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                            </button>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="text-[12px] font-voda font-bold tracking-tight leading-tight text-slate-900 dark:text-white line-clamp-1">
                            {camp.CampaignTitle}
                          </h4>
                          <p className="text-[9px] font-medium text-slate-700 dark:text-slate-300 leading-snug line-clamp-2 mt-0.5">
                            <span className="font-bold text-slate-900 dark:text-white">Description: </span>
                            {camp.CampaignDescription}
                          </p>
                        </div>

                        {/* Bottom Row: Created By & Scheduled End Time */}
                        <div className="flex items-center justify-between text-[9px] pt-1.5 border-t border-black/5 dark:border-white/5 flex-wrap gap-1">
                          <span className="font-bold flex items-center gap-1 text-slate-800 dark:text-slate-200">
                            <User className="w-2.5 h-2.5 text-slate-600 dark:text-slate-400" />
                            Created By: <strong className="font-semibold text-slate-700 dark:text-slate-300">{camp.CreatedBy?.split('@')[0] || 'User'}</strong>
                          </span>

                          {activeTab === 'drafts' ? (
                            renderDraftActions(camp)
                          ) : (
                            <>
                              <span className="text-slate-700 dark:text-slate-300 font-bold">
                                Scheduled End Time: <strong className="font-semibold">{formatDisplayDate(camp.EndTime, true)}</strong>
                                {daysLeft && activeTab !== 'historical' && (
                                  <span className="ml-1 text-[#15803D] dark:text-[#4ADE80] font-extrabold">{daysLeft}</span>
                                )}
                              </span>
                              {camp.status === 'APPROVED' && renderSendAction(camp)}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 FULL SPECIFICATIONS MODAL ──                                        */}
        {/* ========================================================================= */}
        {detailModalItem && (
          <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              style={{
                borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full max-w-3xl bg-white dark:bg-[#12141A] border border-black/10 dark:border-white/10 p-6 relative overflow-hidden shadow-2xl flex flex-col gap-3.5 text-slate-900 dark:text-white transition-colors"
            >
              {/* Top Bar: ID Pill (Left) + Close Button (Right) */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#D8F3DC] text-emerald-900 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-[#E60000]" />
                  <span>{detailModalItem.campaignId}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-voda font-bold text-[9px] uppercase cursor-pointer transition-colors shadow-2xs"
                >
                  Close
                </button>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-voda font-bold tracking-tight text-slate-950 dark:text-white">
                  {detailModalItem.CampaignTitle}
                </h3>
                <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                  <strong>Description: </strong>
                  {detailModalItem.CampaignDescription}
                </p>
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-400 mt-0.5">
                  Created on: {formatDisplayDate(detailModalItem.CreationDate, true)} &bull; Created By: {detailModalItem.CreatedBy}
                </div>
              </div>

              <div className="w-full h-px bg-slate-200 dark:bg-white/10" />

              {/* Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-[12px] font-medium text-slate-800 dark:text-slate-200">
                <div>
                  <strong>Start Type: </strong>
                  <span>{detailModalItem.CampaignStartType}</span>
                </div>
                <div>
                  <strong>User List: </strong>
                  <span className="font-mono-tech text-[#E60000] font-bold">{detailModalItem.RecipientGroupType}</span>
                </div>
                <div>
                  <strong>Scheduled Start: </strong>
                  <span className="font-semibold">{formatDisplayDate(detailModalItem.StartTime, true)}</span>
                </div>
                <div>
                  <strong>Scheduled End: </strong>
                  <span className="font-semibold">{formatDisplayDate(detailModalItem.EndTime, true)}</span>
                </div>
              </div>

              {/* Email & Target Setup Box */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-black/5 dark:border-white/10 flex flex-col gap-2 shadow-2xs">
                <h4 className="text-[12.5px] font-voda font-bold uppercase text-slate-900 dark:text-white">
                  Email Dispatch Details & Payloads
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 text-[11.5px] text-slate-700 dark:text-slate-300 font-medium">
                  <div>
                    <strong>Sender Name: </strong>
                    <span>{detailModalItem.SenderName || 'Not set'}</span>
                  </div>
                  <div>
                    <strong>Sender Email: </strong>
                    <span className="font-mono-tech">{detailModalItem.SenderEmailID || 'Not set'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <strong>Email Subject: </strong>
                    <span>{detailModalItem.EmailSubject}</span>
                  </div>
                  <div>
                    <strong>Landing Page ID: </strong>
                    <span className="font-mono-tech text-[#E60000] font-bold">{detailModalItem.LandingPageID || 'Not set'}</span>
                  </div>
                  <div>
                    <strong>Training Path ID: </strong>
                    <span className="font-mono-tech text-[#E60000] font-bold">{detailModalItem.TrainingPathID || 'Not set'}</span>
                  </div>
                </div>

                {/* Preview Email Body Button */}
                {detailModalItem.EmailBody && (
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewEmailHtml(detailModalItem.EmailBody)}
                      className="px-3 py-1 rounded-lg bg-white dark:bg-black text-slate-800 dark:text-white border border-slate-300 dark:border-white/15 text-[10.5px] font-bold flex items-center gap-1.5 hover:bg-slate-50 shadow-2xs cursor-pointer w-fit transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#E60000]" />
                      <span>Preview Email Body</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ── 🌟 SIMULATED EMAIL BODY PREVIEW POPUP ──                               */}
        {/* ========================================================================= */}
        {previewEmailHtml && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden shadow-2xl border border-white/20 flex flex-col">
              <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-[#121418]">
                <span className="text-xs font-voda font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  Simulated Email Payload Preview
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewEmailHtml(null)}
                  className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[60vh] bg-slate-100/70 dark:bg-black/50">
                <div 
                  className="bg-white text-slate-900 p-6 rounded-xl shadow-xs border border-slate-200/80 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-2 [&_p]:mb-2.5 [&_p]:leading-relaxed [&_a]:text-[#E60000] [&_a]:underline [&_a]:font-semibold"
                  dangerouslySetInnerHTML={{
                    __html: String(previewEmailHtml)
                      .replace(/{{userName}}/g, DEMO_USER.name)
                      .replace(/{{email}}/g, DEMO_USER.email)
                      .replace(/{{department}}/g, 'AI & Data Analytics')
                      .replace(/{{phishLink}}/g, '#simulated-phish-link')
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Campaigns;