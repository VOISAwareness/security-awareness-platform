import React, { useState, useMemo } from 'react';
import { useUserType } from '../../../UserTypeContext/UserTypeContext';
import { 
  Search, 
  ChevronDown,
  ExternalLink, 
  User, 
  CheckCircle2, 
  X,
  Check
} from 'lucide-react';
import MyApprovedImg from '../../../assets/RequestAndApprovalsAssets/MyApprovedCampaignsImage.png';

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS (MATCHING OTHER GALLERIES)
// =========================================================================
export const VarOverallCornerRoundednessAdjuster = 0.6;
export const VarGallaryCardLenghtAdjuster = 1.0;
export const VarGallaryCardsScaleAdjuster = 1.0;
export const VarGalleryLowerBaseHeightAdjuster = 460; // Height of Lower L-Base (in px)

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

// Pure white in light mode, dark tone in dark mode
const getLCardBg = (isDark) => (isDark ? '#1C1E24' : '#FFFFFF');

const CAPSULE_THEME_COLOR = '#D9F2D0';
const CAPSULE_COUNTER_COLOR = '#16A34A';

const ApprovedCampaignsGallery = ({
  isOpen = true,
  onClose,
  campaigns = [],
  currentUserEmail,
  onViewDetails,
  isDark: propIsDark
}) => {
  const { user, isDark: contextIsDark } = useUserType?.() || {};
  const isDark = propIsDark !== undefined ? propIsDark : contextIsDark;

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Latest Approved Date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);

  const lCardBg = getLCardBg(isDark);

  // Standardized Date Formatter: mm/dd/yyyy and optional full time stamp
  const formatDisplayDate = (dateStr, includeTime = false) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        return dateStr;
      }
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();

      if (!includeTime) {
        return `${month}/${day}/${year}`;
      }

      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      const formattedHours = String(hours).padStart(2, '0');

      return `${month}/${day}/${year} ${formattedHours}:${minutes}:${seconds} ${ampm}`;
    } catch {
      return dateStr;
    }
  };

  // Resolve normalized active user email
  const activeEmail = useMemo(() => {
    return (
      currentUserEmail ||
      user?.email ||
      user?.userEmail ||
      user?.UserEmailD_Admin ||
      user?.UserEmailD_CamapignManager ||
      user?.UserEmailD_CamapignCreator ||
      user?.UserEMailID ||
      ''
    ).trim().toLowerCase();
  }, [currentUserEmail, user]);

  const isCreator = user?.role === 'Campaign Creator';

  const resolvedCampaigns = useMemo(() => {
    return Array.isArray(campaigns) ? campaigns : [];
  }, [campaigns]);

  // Filter only 'Published' campaigns matching role-based ownership
  const approvedCampaigns = useMemo(() => {
    let list = resolvedCampaigns.filter((c) => {
      const isApproved = c.CampaignStatus === 'Published' || c.campaignStatus === 'Published';
      if (!isApproved) return false;

      const createdByEmail = (c.CreatedBy || '').trim().toLowerCase();
      const approvedByEmail = (
        c['Approved/RejectedBy'] ||
        c.ApprovedBy ||
        c.ApprovedRejectedBy ||
        ''
      ).trim().toLowerCase();

      // Role-based visibility logic:
      // Campaign Creator: Only view campaigns created by them that got approved
      // Admin / Campaign Manager: View campaigns they approved OR created
      const isMine = isCreator
        ? createdByEmail === activeEmail
        : (approvedByEmail === activeEmail || createdByEmail === activeEmail);

      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        (c.campaignId && c.campaignId.toLowerCase().includes(q)) ||
        (c.CampaignTitle && c.CampaignTitle.toLowerCase().includes(q)) ||
        (c.campaignTitle && c.campaignTitle.toLowerCase().includes(q)) ||
        (c.CreatedBy && c.CreatedBy.toLowerCase().includes(q));

      return (!activeEmail || isMine) && matchesSearch;
    });

    list.sort((a, b) => {
      const dateA = new Date(a.LastModified || a.StartTime || a.CreationDate || 0).getTime();
      const dateB = new Date(b.LastModified || b.StartTime || b.CreationDate || 0).getTime();
      if (sortBy === 'Oldest Approved Date') return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [resolvedCampaigns, activeEmail, isCreator, searchTerm, sortBy]);

  if (!isOpen) return null;

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* 🌟 ROOT INLINE L-SHAPE CONTAINER */}
      <div className="relative flex flex-col w-full select-none font-sans overflow-x-hidden">
        
        {/* ========================================================================= */}
        {/* 🌟 1. TRULY ISOLATED CAPSULE HEADER (TOP-LEFT)                            */}
        {/* ========================================================================= */}
        <div
          style={{ 
            backgroundColor: CAPSULE_THEME_COLOR,
            borderRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="absolute top-0 left-0 w-[176px] h-[126px] p-3 flex flex-col justify-between shadow-xs z-20 text-slate-900 select-none overflow-hidden flex-shrink-0"
        >
          <div className="flex justify-between items-start relative z-10">
            <h3 className="text-[14.5px] font-voda font-bold tracking-tight leading-tight">
              My Approved<br />Campaigns
            </h3>
          </div>

          <p className="text-[9px] font-bold text-slate-700 leading-tight relative z-10 max-w-[105px] mb-1">
            {isCreator
              ? 'These are the campaigns that you created and got approved'
              : 'These are the campaigns that you reviewed, cleared and published'}
          </p>

          {/* 5% cropped corner artwork 
          <div className="absolute -bottom-[5%] -right-[5%] w-[68px] h-[68px] pointer-events-none select-none z-0">
            <img 
              src={MyApprovedImg} 
              alt="My Approved Campaigns" 
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>*/}
        </div>

        {/* 🌟 2. Concave Arc Fillet */}
        <div className="absolute top-[118px] left-[166px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
          </svg>
        </div>

        {/* ========================================================================= */}
        {/* 🌟 3. TOP-RIGHT ARM OF L-SHAPE CONTAINER                                 */}
        {/* ========================================================================= */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            borderTopRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderTopLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-[calc(100%-182px)] ml-auto h-[133px] px-4 py-2.5 flex items-center justify-between relative z-30 select-none -ml-2 transition-colors border-t border-r border-black/5 dark:border-white/5 flex-shrink-0"
        >
          {/* Controls Column */}
          <div className="flex flex-col -mt-8 gap-2 max-w-[340px] w-full">
            {/* Search by Campaign ID or Name */}
            <div className="relative flex items-center">
              <input 
                type="text"
                placeholder="Search by Campaign ID or Name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-7 pl-3 pr-8 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] font-bold text-slate-800 dark:text-slate-200 text-[9px] placeholder-slate-400 outline-none border border-black/5 dark:border-white/5"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Sort By Dropdown (z-[100] to float over lower base) */}
            <div className="relative w-48">
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="w-full h-6 px-2.5 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] text-slate-700 dark:text-slate-300 text-[8px] font-bold flex items-center justify-between border border-black/5 dark:border-white/5 cursor-pointer shadow-2xs"
              >
                <span className="truncate">Sort: {sortBy}</span>
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 ml-1" />
              </button>

              {showSortDropdown && (
                <div className="absolute top-7 left-0 w-48 bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-[100] flex flex-col">
                  {['Latest Approved Date', 'Oldest Approved Date'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSortBy(option);
                        setShowSortDropdown(false);
                      }}
                      className={`px-3 py-1 text-left text-[9.5px] font-bold cursor-pointer transition-colors ${
                        sortBy === option 
                          ? 'bg-[#D9F2D0] text-[#16A34A] dark:bg-emerald-950 dark:text-emerald-300' 
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

          {/* Dynamic Big Counter */}
          <div className="flex flex-col items-end justify-center text-right pr-2">
            <span 
              style={{ color: CAPSULE_COUNTER_COLOR }}
              className="text-5xl font-black leading-none tracking-tight font-voda-exb"
            >
              {String(approvedCampaigns.length).padStart(2, '0')}
            </span>
            <span className="text-[13.5px] font-voda font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight">
              Total Approved<br />Campaigns
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 🌟 4. CONTINUOUS LOWER L-BASE                                            */}
        {/* ========================================================================= */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            height: `${VarGalleryLowerBaseHeightAdjuster}px`,
            borderTopLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderBottomLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderBottomRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-full p-3 pb-5 flex flex-col gap-2.5 overflow-y-auto z-10 border-b border-l border-r border-black/5 dark:border-white/5 transition-colors [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md"
        >
          {approvedCampaigns.length === 0 ? (
            <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-400">No approved campaigns found matching criteria.</p>
            </div>
          ) : (
            approvedCampaigns.map((camp) => (
              <div
                key={camp.campaignId}
                style={{ 
                  borderRadius: `${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px`,
                  transform: `scale(${VarGallaryCardsScaleAdjuster})`,
                  width: `${100 * VarGallaryCardLenghtAdjuster}%`
                }}
                className="mx-auto px-3.5 py-2.5 bg-[#EEF2F6] dark:bg-[#15171E] text-slate-900 dark:text-white shadow-2xs flex flex-col gap-1.5 relative overflow-hidden transition-all hover:shadow-xs border border-black/5 dark:border-white/5 origin-top flex-shrink-0"
              >
                {/* Top Meta Line */}
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-black/60 text-[9px] font-black text-[#16A34A] dark:text-emerald-300 tracking-wide flex items-center gap-1 shadow-2xs font-mono-tech border border-emerald-200/50 dark:border-emerald-900/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    {camp.campaignId}
                  </span>

                  <span className="px-2 py-0.5 rounded-md bg-[#D9F2D0] text-[#16A34A] text-[8.5px] font-voda font-bold uppercase whitespace-nowrap shadow-2xs">
                    Status: Published
                  </span>
                </div>

                {/* Title & Description */}
                <h4 className="text-[12px] font-voda font-bold tracking-tight leading-tight text-slate-900 dark:text-white">
                  {camp.CampaignTitle}
                </h4>
                <p className="text-[9px] font-medium text-slate-700 dark:text-slate-300 leading-snug line-clamp-1">
                  <span className="font-bold text-slate-900 dark:text-white">Description: </span>
                  {camp.CampaignDescription}
                </p>

                {/* Identities & Actions Row */}
                <div className="flex items-center justify-between text-[9px] pt-1 border-t border-black/5 dark:border-white/5 flex-wrap gap-2">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-medium">
                    <span className="font-bold flex items-center gap-1">
                      <User className="w-2.5 h-2.5 text-slate-500" />
                      Created By: <strong className="text-slate-800 dark:text-slate-200">{camp.CreatedBy?.split('@')[0] || 'User'}</strong>
                    </span>
                    <span>&bull;</span>
                    <span className="font-bold flex items-center gap-1 text-[#16A34A] dark:text-emerald-300">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      Approved By: <strong>{camp['Approved/RejectedBy']?.split('@')[0] || camp.ApprovedBy?.split('@')[0] || 'Unknown'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#C2EAB4] text-[#064E3B] text-[8.5px] font-voda font-black shadow-2xs whitespace-nowrap">
                      Scheduled: {formatDisplayDate(camp.StartTime, true)}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        if (onViewDetails) onViewDetails(camp);
                        setDetailModalItem(camp);
                      }}
                      className="text-slate-500 hover:text-black dark:hover:text-white cursor-pointer ml-1 transition-colors"
                      title="View Full Specifications"
                    >
                      <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>

                    <span className="text-[8px] font-semibold text-slate-500 ml-1">
                      Created on: {formatDisplayDate(camp.CreationDate, false)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 SPECIFICATIONS MODAL ──                                            */}
        {/* ========================================================================= */}
        {detailModalItem && (
          <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              style={{ 
                backgroundColor: CAPSULE_THEME_COLOR,
                borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full max-w-3xl border border-black/10 p-6 relative overflow-hidden shadow-2xl flex flex-col gap-3.5 text-slate-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/80 text-slate-900 shadow-2xs border border-black/5">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <span>{detailModalItem.campaignId} (Approved)</span>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-voda font-bold text-[9px] uppercase cursor-pointer transition-colors shadow-2xs"
                >
                  Go Back
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-voda font-bold tracking-tight text-slate-950">
                  {detailModalItem.CampaignTitle}
                </h3>
                <p className="text-[12px] font-medium text-slate-700 mb-2 leading-relaxed">
                  <strong>Description: </strong>
                  {detailModalItem.CampaignDescription || 'No description provided.'}
                </p>
                <div className="text-[11px] font-bold text-slate-800 mt-0.5">
                  Created on: {formatDisplayDate(detailModalItem.CreationDate, true)} &bull; Created By: {detailModalItem.CreatedBy}
                  {detailModalItem['Approved/RejectedBy'] && (
                    <span className="ml-2 font-bold text-[#16A34A]">
                      &bull; Approved By: {detailModalItem['Approved/RejectedBy']}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full h-px bg-black/10" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-[12px] font-medium text-slate-800">
                <div>
                  <strong>Start Type: </strong>
                  <span>{detailModalItem.CampaignStartType || detailModalItem.startType || 'Scenario'}</span>
                </div>
                <div>
                  <strong>Target Audience: </strong>
                  <span>{detailModalItem.UserList || detailModalItem.TargetUsers || 'No recipients selected'}</span>
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
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ApprovedCampaignsGallery;