import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ChevronDown, 
  ExternalLink, 
  User, 
  Eye, 
  X,
  Pencil,
  AlertTriangle
} from 'lucide-react';
import campaignsJsonData from '../CampaignsData.json';
import { useUserType } from '../../../UserTypeContext/UserTypeContext';

// Role datasets for deriving user permissions
import adminUsersData from '../../../UserDataBaseAdmin.json';
import campaignManagersData from '../../../UserDataBaseCamapignManager.json';
import campaignCreatorsData from '../../../UserDataBaseCamapignCreator.json';

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS
// =========================================================================
export const VarOverallCornerRoundednessAdjuster = 0.7;
export const VarRightGalleryBaseHeight = 490; // in px
export const VarCardSleeknessAdjuster = 0.85;

// Gallery Cards Fine-Tuning Scale Adjusters
export const VarGalleryCardsTextSizeScale = 1.1; // Controls text size scaling of all card labels
export const VarGalleryCardsPaddingScale = 1.4;   // Controls card internal padding scaling
export const VarGalleryCardsHeightAdjuster = 1.0; // Controls card height and vertical gaps scaling

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

// Sequential modulo-3 color series based on campaign numeric ID:
// 1, 4, 7... -> Warm Peach (#FFEFCE)
// 2, 5, 8... -> Lavender (#ECE8FF)
// 3, 6, 9... -> Soft Mint / Cyanish (#CEFBEA)
const getCardBgColorByCampaignId = (camp, isDark) => {
  const num = parseInt((camp?.campaignId || '').replace(/\D/g, ''), 10);
  const remainder = isNaN(num) ? 0 : (num - 1 + 3000) % 3;
  if (isDark) {
    if (remainder === 0) return '#2E200C'; // Warm Peach Inverted
    if (remainder === 1) return '#22193E'; // Lavender Inverted
    return '#0D271E';                      // Soft Mint Inverted
  }
  if (remainder === 0) return '#FFEFCE';   // Warm Peach (1, 4, 7...)
  if (remainder === 1) return '#ECE8FF';   // Lavender (2, 5, 8...)
  return '#CEFBEA';                        // Soft Mint / Cyanish (3, 6, 9...)
};

const getLCardBg = (isDark) => (isDark ? '#1C1E24' : '#FFFFFF');

const ScheduledCampaignsGallery = ({ 
  campaigns = [], 
  isDark: propIsDark 
}) => {
  const navigate = useNavigate();
  const userContext = useUserType?.() || {};

  // Theme check: Reactive pipeline with MutationObserver
  const [isDark, setIsDark] = useState(() => {
    if (typeof propIsDark === 'boolean') return propIsDark;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || !!userContext.isDark;
    }
    return !!userContext.isDark;
  });

  const lCardBg = getLCardBg(isDark);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Shortest Expiring Date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Modals state
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [previewEmailHtml, setPreviewEmailHtml] = useState(null);
  const [campaignToCancel, setCampaignToCancel] = useState(null);

  // Date formatters
  const formatShortDate = (dateStr) => {
    if (!dateStr) return '2-Jan-26';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split(' ')[0];
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = String(d.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr.split(' ')[0] || '2-Jan-26';
    }
  };

  const formatScheduleTimestamp = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const month = d.toLocaleString('en-US', { month: 'short' });
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${month}-${day}-${year} ${hours}:${minutes}${ampm}`;
    } catch {
      return dateStr;
    }
  };

  const formatPublishedTimestamp = (dateStr) => {
    if (!dateStr) return '09/28/2026 04:20:00 PM';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${month}/${day}/${year} ${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  const getInDays = (startTimeStr) => {
    if (!startTimeStr) return '';
    try {
      const start = new Date(startTimeStr);
      const diffMs = start - new Date();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `(In ${diffDays} Days)` : '(Starting today)';
    } catch {
      return '';
    }
  };

  // Load campaigns from localStorage or seed fallback
  const [campaignsList, setCampaignsList] = useState(() => {
    if (Array.isArray(campaigns) && campaigns.length > 0) return campaigns;
    try {
      const stored = localStorage.getItem('voisshield_campaigns_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return campaignsJsonData?.campaigns || [];
  });

  // Filter only Scheduled campaigns (published and in future)
  const filteredList = useMemo(() => {
    const now = new Date().getTime();

    let list = campaignsList.filter((c) => {
      const status = (c.CampaignStatus || c.campaignStatus || '').toLowerCase();
      const start = c.StartTime ? new Date(c.StartTime).getTime() : 0;
      return (status === 'published') && (start > now);
    });

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
  }, [campaignsList, searchTerm, sortBy]);

  // Derived user permission logic strictly cross-referenced from context and user datasets
  const canModifyCampaign = (camp) => {
    const activeUser = userContext.user || {};
    const currentEmail = (
      activeUser.UserEMailID || 
      activeUser.userEmail || 
      activeUser.email || 
      activeUser.UserEmailD_Admin ||
      activeUser.UserEmailD_CamapignManager ||
      activeUser.UserEmailD_CamapignCreator ||
      ''
    ).toLowerCase().trim();

    const currentRole = (activeUser.role || '').trim();

    // 1. Verify if user is an Admin in UserDataBaseAdmin.json
    const isAdmin = currentRole === 'Admin' || (Array.isArray(adminUsersData) ? adminUsersData : []).some(
      (u) => (u.UserEmailD_Admin || '').toLowerCase().trim() === currentEmail && (u.UserStatus_Admin || 'Active').toLowerCase() === 'active'
    );

    // 2. Verify if user is a Campaign Manager in UserDataBaseCamapignManager.json
    const isManager = currentRole === 'Campaign Manager' || (Array.isArray(campaignManagersData) ? campaignManagersData : []).some(
      (u) => (u.UserEmailD_CamapignManager || '').toLowerCase().trim() === currentEmail && (u.UserStatus_CamapignManager || 'Active').toLowerCase() === 'active'
    );

    // Admins and Campaign Managers have unrestricted rights
    if (isAdmin || isManager) {
      return true;
    }

    // 3. Verify if user is a Campaign Creator in UserDataBaseCamapignCreator.json
    const isCreator = currentRole === 'Campaign Creator' || (Array.isArray(campaignCreatorsData) ? campaignCreatorsData : []).some(
      (u) => (u.UserEmailD_CamapignCreator || '').toLowerCase().trim() === currentEmail && (u.UserStatus_CamapignCreator || 'Active').toLowerCase() === 'active'
    );

    // Campaign Creators can only edit/cancel if they created this specific campaign
    if (isCreator) {
      const campCreatorEmail = (camp?.CreatedBy || '').toLowerCase().trim();
      return campCreatorEmail.length > 0 && currentEmail.length > 0 && (campCreatorEmail === currentEmail || campCreatorEmail.includes(currentEmail));
    }

    return false;
  };

  // Action Handlers
  const handleEditCampaign = (camp) => {
    if (!canModifyCampaign(camp)) return;
    try {
      localStorage.setItem('voisshield_active_campaign_draft', JSON.stringify({
        ...camp,
        isEditing: true
      }));
    } catch (e) {
      console.error(e);
    }
    navigate('/start-campaign/details');
  };

  const handleConfirmCancel = () => {
    if (!campaignToCancel) return;
    const targetId = campaignToCancel.campaignId;

    const updated = campaignsList.map((c) => {
      if (c.campaignId === targetId) {
        return {
          ...c,
          CampaignStatus: 'Cancelled',
          LastModified: new Date().toLocaleString()
        };
      }
      return c;
    });

    setCampaignsList(updated);
    try {
      localStorage.setItem('voisshield_campaigns_data', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    if (detailModalItem?.campaignId === targetId) {
      setDetailModalItem(null);
    }
    setCampaignToCancel(null);
  };

  // Color matching for modal based on campaign numeric ID
  const modalBgColor = useMemo(() => {
    if (!detailModalItem) return '#FFEFCE';
    return getCardBgColorByCampaignId(detailModalItem, isDark);
  }, [detailModalItem, isDark]);

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div className="flex flex-col min-w-0 w-full">
        {/* 🌟 1. TOP-RIGHT ARM: CONTROLS & DYNAMIC BIG COUNTER */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            borderTopRightRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
            borderTopLeftRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-full h-[100px] px-6 py-3 flex items-center justify-between border-t border-l border-r border-black/5 dark:border-white/5 transition-colors relative z-30"
        >
          <div className="flex items-center gap-4">
            <span 
              style={{ color: '#8ED973' }}
              className="text-5xl font-black leading-none tracking-tight font-voda-exb"
            >
              {String(filteredList.length).padStart(2, '0')}
            </span>
            <span className="text-[15px] font-voda font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
              Total <br /> Scheduled Campaigns
            </span>
          </div>

          <div className="flex flex-col gap-2 max-w-[340px] w-full">
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
                          ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
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

        {/* 🌟 2. CONTINUOUS LOWER L-BASE: FULL-WIDTH DETAILED CARDS FEED */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            height: `${VarRightGalleryBaseHeight}px`,
            borderBottomLeftRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
            borderBottomRightRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-full p-4 flex flex-col gap-3 overflow-y-auto border-b border-l border-r border-black/5 dark:border-white/5 transition-colors [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md"
        >
          {filteredList.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-400">
                No scheduled campaigns found matching criteria.
              </p>
            </div>
          ) : (
            <div 
              style={{ gap: `${Math.round(10 * VarCardSleeknessAdjuster * VarGalleryCardsHeightAdjuster)}px` }}
              className="flex flex-col w-full"
            >
              {filteredList.map((camp) => {
                const cardBg = getCardBgColorByCampaignId(camp, isDark);
                const inDaysText = getInDays(camp.StartTime);
                const approvedByValue = camp['Approved/RejectedBy'] || camp.ApprovedBy || 'NA';
                const hasRights = canModifyCampaign(camp);

                return (
                  <div
                    key={camp.campaignId}
                    style={{ 
                      backgroundColor: cardBg,
                      borderRadius: `${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px`,
                      padding: `${Math.round(10 * VarCardSleeknessAdjuster * VarGalleryCardsPaddingScale)}px ${Math.round(15 * VarCardSleeknessAdjuster * VarGalleryCardsPaddingScale)}px`,
                      gap: `${Math.round(6 * VarCardSleeknessAdjuster * VarGalleryCardsHeightAdjuster)}px`
                    }}
                    className="text-slate-900 dark:text-white shadow-2xs flex flex-col relative overflow-hidden transition-all hover:shadow-xs border border-black/5 dark:border-white/5 flex-shrink-0"
                  >
                    {/* Top Row: ID Badge + Created On + Edit Button + Cancel Button + External Link */}
                    <div className="flex items-center justify-between">
                      {/* Left: ID Badge with Red Dot */}
                      <span 
                        style={{ fontSize: `${(8.5 * VarGalleryCardsTextSizeScale).toFixed(1)}px` }}
                        className="px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-black/60 font-black text-slate-800 dark:text-slate-100 tracking-wide flex items-center gap-1 shadow-2xs font-mono-tech border border-black/5 dark:border-white/10"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                        {camp.campaignId}
                      </span>

                      {/* Right Meta Controls matching Screenshot */}
                      <div className="flex items-center gap-2.5">
                        <span 
                          style={{ fontSize: `${(9 * VarGalleryCardsTextSizeScale).toFixed(1)}px` }}
                          className="font-bold text-slate-600 dark:text-slate-300"
                        >
                          Created on: {formatShortDate(camp.CreationDate)}
                        </span>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleEditCampaign(camp)}
                          disabled={!hasRights}
                          style={{ 
                            height: `${Math.round(20 * VarGalleryCardsHeightAdjuster)}px`,
                            fontSize: `${(9 * VarGalleryCardsTextSizeScale).toFixed(1)}px`,
                            paddingLeft: `${Math.round(10 * VarGalleryCardsPaddingScale)}px`,
                            paddingRight: `${Math.round(10 * VarGalleryCardsPaddingScale)}px`
                          }}
                          className={`rounded-md font-voda font-bold tracking-tight shadow-2xs flex items-center gap-1 transition-all ${
                            hasRights
                              ? 'bg-[#8ED973] hover:bg-[#7DC862] text-white cursor-pointer active:scale-95'
                              : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-white/30 cursor-not-allowed opacity-40 shadow-none'
                          }`}
                          title={hasRights ? 'Edit this scheduled campaign' : 'Only Admins, Managers, or the assigned Creator can edit'}
                        >
                          <span>Edit</span>
                          <Pencil className="w-2.5 h-2.5 stroke-[2.5]" />
                        </button>

                        {/* Cancel Button */}
                        <button
                          type="button"
                          onClick={() => setCampaignToCancel(camp)}
                          disabled={!hasRights}
                          style={{ 
                            height: `${Math.round(20 * VarGalleryCardsHeightAdjuster)}px`,
                            fontSize: `${(9 * VarGalleryCardsTextSizeScale).toFixed(1)}px`,
                            paddingLeft: `${Math.round(10 * VarGalleryCardsPaddingScale)}px`,
                            paddingRight: `${Math.round(10 * VarGalleryCardsPaddingScale)}px`
                          }}
                          className={`rounded-md font-voda font-bold tracking-tight shadow-2xs flex items-center gap-1 transition-all ${
                            hasRights
                              ? 'bg-[#F43F5E] hover:bg-[#E11D48] text-white cursor-pointer active:scale-95'
                              : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-white/30 cursor-not-allowed opacity-40 shadow-none'
                          }`}
                          title={hasRights ? 'Cancel this scheduled campaign' : 'Only Admins, Managers, or the assigned Creator can cancel'}
                        >
                          <span>Cancel</span>
                          <X className="w-2.5 h-2.5 stroke-[2.5]" />
                        </button>

                        {/* External Link Specification Trigger */}
                        <button
                          type="button"
                          onClick={() => setDetailModalItem(camp)}
                          className="text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer transition-colors p-0.5 ml-0.5"
                          title="View Full Specifications & Email Preview"
                        >
                          <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Title, Description & Horizontal Timeline Slider */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                      {/* Left: Title & Description */}
                      <div className="lg:col-span-7 flex flex-col text-left">
                        <h4 
                          style={{ fontSize: `${(12 * VarGalleryCardsTextSizeScale).toFixed(1)}px` }}
                          className="font-voda font-bold tracking-tight text-slate-950 dark:text-white leading-tight"
                        >
                          {camp.CampaignTitle}
                        </h4>
                        <p 
                          style={{ fontSize: `${(9 * VarGalleryCardsTextSizeScale).toFixed(1)}px` }}
                          className="font-medium text-slate-700 dark:text-slate-300 leading-snug mt-0.5 max-w-xl line-clamp-1 xl:line-clamp-2"
                        >
                          <strong className="font-bold text-slate-900 dark:text-white">Description: </strong>
                          {camp.CampaignDescription}
                        </p>
                      </div>

                      {/* Right: Connected Timeline Slider with Start/End */}
                      <div className="lg:col-span-5 flex items-center justify-end gap-2 text-right flex-shrink-0">
                        {/* Start Time Stack */}
                        <div className="flex flex-col items-end leading-tight">
                          <span 
                            style={{ fontSize: `${(8.5 * VarGalleryCardsTextSizeScale).toFixed(1)}px` }}
                            className="font-bold text-slate-800 dark:text-slate-200"
                          >
                            Scheduled Start Time:
                          </span>
                          <span 
                            style={{ fontSize: `${(8 * VarGalleryCardsTextSizeScale).toFixed(1)}px` }}
                            className="font-medium text-slate-600 dark:text-slate-300"
                          >
                            {formatScheduleTimestamp(camp.StartTime)}
                          </span>
                          <span 
                            style={{ fontSize: `${(8 * VarGalleryCardsTextSizeScale).toFixed(1)}px` }}
                            className="font-bold text-[#16A34A] dark:text-[#4ADE80]"
                          >
                            {inDaysText}
                          </span>
                        </div>

                        {/* Connected Slider Line with Green Start Dot & Coral End Dot */}
                        <div className="flex items-center w-20 sm:w-24 mx-1 relative">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] shrink-0 z-10 shadow-xs" />
                          <div className="flex-1 h-[1.5px] bg-slate-400 dark:bg-slate-500" />
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] shrink-0 z-10 shadow-xs" />
                        </div>

                        {/* End Time Stack */}
                        <div className="flex flex-col items-start text-left leading-tight">
                          <span 
                            style={{ fontSize: `${(8.5 * VarGalleryCardsTextSizeScale).toFixed(1)}px` }}
                            className="font-bold text-slate-800 dark:text-slate-200"
                          >
                            Scheduled End Time:
                          </span>
                          <span 
                            style={{ fontSize: `${(8 * VarGalleryCardsTextSizeScale).toFixed(1)}px` }}
                            className="font-medium text-slate-600 dark:text-slate-300"
                          >
                            {formatScheduleTimestamp(camp.EndTime)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Meta Line: Created By + Approved By + Published On */}
                    <div 
                      style={{ 
                        paddingTop: `${Math.round(5 * VarCardSleeknessAdjuster * VarGalleryCardsPaddingScale)}px`,
                        fontSize: `${(8.5 * VarGalleryCardsTextSizeScale).toFixed(1)}px`
                      }}
                      className="w-full border-t border-black/10 dark:border-white/10 flex items-center justify-between font-voda font-bold text-slate-800 dark:text-slate-200 flex-wrap gap-2"
                    >
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-900 dark:text-white" />
                        <span>Created By: <strong className="font-semibold text-slate-700 dark:text-slate-300">{camp.CreatedBy || 'User'}</strong></span>
                      </div>

                      <div className="flex items-center gap-1 text-[#9333EA] dark:text-[#C084FC]">
                        <User className="w-3 h-3" />
                        <span>Approved By: <strong>{approvedByValue}</strong></span>
                      </div>

                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-900 dark:text-white" />
                        <span>Published On: <strong className="font-semibold text-slate-700 dark:text-slate-300">{formatPublishedTimestamp(camp.CreationDate || camp.StartTime)}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🌟 FULL SPECIFICATIONS MODAL (INHERITING MODULO-3 COLOR + EDIT/CANCEL ACTIONS) */}
        {detailModalItem && (
          <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              style={{
                backgroundColor: modalBgColor,
                borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full max-w-3xl border border-black/10 p-6 relative overflow-hidden shadow-2xl flex flex-col gap-3.5 text-slate-900 transition-colors"
            >
              {/* Top Bar: ID Pill (Left) + Actions (Right) */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/80 text-slate-900 shadow-2xs border border-black/5">
                  <span className="w-2 h-2 rounded-full bg-[#E60000]" />
                  <span>{detailModalItem.campaignId}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Edit inside Modal */}
                  <button
                    type="button"
                    onClick={() => handleEditCampaign(detailModalItem)}
                    disabled={!canModifyCampaign(detailModalItem)}
                    className={`h-6 px-3 rounded-lg text-[9.5px] font-voda font-bold tracking-tight shadow-xs flex items-center gap-1.5 transition-all ${
                      canModifyCampaign(detailModalItem)
                        ? 'bg-[#8ED973] hover:bg-[#7DC862] text-white cursor-pointer'
                        : 'bg-slate-300 dark:bg-white/10 text-slate-500 cursor-not-allowed opacity-40'
                    }`}
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  {/* Cancel inside Modal */}
                  <button
                    type="button"
                    onClick={() => setCampaignToCancel(detailModalItem)}
                    disabled={!canModifyCampaign(detailModalItem)}
                    className={`h-6 px-3 rounded-lg text-[9.5px] font-voda font-bold tracking-tight shadow-xs flex items-center gap-1.5 transition-all ${
                      canModifyCampaign(detailModalItem)
                        ? 'bg-[#F43F5E] hover:bg-[#E11D48] text-white cursor-pointer'
                        : 'bg-slate-300 dark:bg-white/10 text-slate-500 cursor-not-allowed opacity-40'
                    }`}
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={() => setDetailModalItem(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-voda font-bold text-[9px] uppercase cursor-pointer transition-colors shadow-2xs"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-voda font-bold tracking-tight text-slate-950">
                  {detailModalItem.CampaignTitle}
                </h3>
                <p className="text-[12px] font-medium text-slate-700 leading-relaxed">
                  <strong>Description: </strong>
                  {detailModalItem.CampaignDescription}
                </p>
                <div className="text-[11px] font-bold text-slate-800 mt-0.5">
                  Created on: {formatPublishedTimestamp(detailModalItem.CreationDate)} &bull; Created By: {detailModalItem.CreatedBy}
                </div>
              </div>

              <div className="w-full h-px bg-black/10" />

              {/* Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-[12px] font-medium text-slate-800">
                <div>
                  <strong>Start Type: </strong>
                  <span>{detailModalItem.CampaignStartType || detailModalItem.startType || 'Scenario'}</span>
                </div>
                <div>
                  <strong>User List: </strong>
                  <span className="font-mono-tech text-[#E60000] font-bold">{detailModalItem.RecipientGroupType || detailModalItem.UserListID || 'UserList (ul-001)'}</span>
                </div>
                <div>
                  <strong>Scheduled Start: </strong>
                  <span className="font-semibold">{formatPublishedTimestamp(detailModalItem.StartTime)}</span>
                </div>
                <div>
                  <strong>Scheduled End: </strong>
                  <span className="font-semibold">{formatPublishedTimestamp(detailModalItem.EndTime)}</span>
                </div>
              </div>

              {/* Email & Target Setup Box */}
              <div className="p-4 rounded-xl bg-white/65 border border-black/10 flex flex-col gap-2 shadow-2xs">
                <h4 className="text-[12.5px] font-voda font-bold uppercase text-slate-900">
                  Email Dispatch Details & Payloads
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 text-[11.5px] text-slate-700 font-medium">
                  <div>
                    <strong>Sender Name: </strong>
                    <span>{detailModalItem.SenderName || 'Security Operations'}</span>
                  </div>
                  <div>
                    <strong>Sender Email: </strong>
                    <span className="font-mono-tech">{detailModalItem.SenderEmailID || 'security-alert@vodafone.com'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <strong>Email Subject: </strong>
                    <span>{detailModalItem.EmailSubject}</span>
                  </div>
                  <div>
                    <strong>Landing Page ID: </strong>
                    <span className="font-mono-tech text-[#E60000] font-bold">{detailModalItem.LandingPageID || 'LP-001'}</span>
                  </div>
                  <div>
                    <strong>Training Path ID: </strong>
                    <span className="font-mono-tech text-[#E60000] font-bold">{detailModalItem.TrainingPathID || 'TP-00001'}</span>
                  </div>
                </div>

                {detailModalItem.EmailBody && (
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewEmailHtml(detailModalItem.EmailBody)}
                      className="px-3 py-1 rounded-lg bg-white text-slate-800 border border-slate-300 text-[10.5px] font-bold flex items-center gap-1.5 hover:bg-slate-50 shadow-2xs cursor-pointer w-fit transition-colors"
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

        {/* 🌟 CANCELLATION CONFIRMATION DIALOG */}
        {campaignToCancel && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div 
              style={{ borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px` }}
              className="w-full max-w-md bg-white dark:bg-[#161820] border border-black/10 dark:border-white/10 p-6 flex flex-col gap-4 text-slate-900 dark:text-white shadow-2xl relative"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-voda font-bold tracking-tight leading-tight">
                    Confirm Cancellation
                  </h3>
                  <span className="text-[11px] font-mono-tech text-rose-600 font-bold">
                    {campaignToCancel.campaignId}
                  </span>
                </div>
              </div>

              <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Are you sure you want to cancel the scheduled campaign <strong className="text-slate-950 dark:text-white">"{campaignToCancel.CampaignTitle}"</strong>? Once cancelled, its status will permanently change to <strong>Cancelled</strong>.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCampaignToCancel(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-[10px] font-voda font-bold cursor-pointer transition-colors"
                >
                  No, Keep Scheduled
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="px-4 py-1.5 rounded-xl bg-[#F43F5E] hover:bg-[#E11D48] text-white text-[10px] font-voda font-bold cursor-pointer shadow-xs active:scale-95 transition-all"
                >
                  Yes, Cancel Campaign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🌟 SIMULATED EMAIL BODY PREVIEW POPUP */}
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
                      .replace(/{{userName}}/g, 'Abhay H S')
                      .replace(/{{email}}/g, 'abhay.hs1@vodafone.com')
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

export default ScheduledCampaignsGallery;