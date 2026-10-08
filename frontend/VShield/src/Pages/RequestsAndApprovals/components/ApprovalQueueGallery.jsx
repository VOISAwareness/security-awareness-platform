import React, { useState, useMemo } from 'react';
import { formatDateTime } from '../../../services/campaignStatus';
import { 
  Search, 
  ChevronDown, 
  ExternalLink, 
  User, 
  Megaphone, 
  Check, 
  AlertCircle, 
  XCircle, 
  Eye, 
  X,
  Clock,
  Layers,
  Sparkles,
  Users,
  Info
} from 'lucide-react';
import ApprovalQueueImg from '../../../assets/RequestAndApprovalsAssets/ApprovalQueueImage.png';

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS
// =========================================================================
export const VarOverallCornerRoundednessAdjuster = 0.6;
export const VarGallaryCardLenghtAdjuster = 1.0;
export const VarGallaryCardsScaleAdjuster = 0.99;
// Height adjuster for Lower L-Base (in px or custom calculation)
export const VarGalleryLowerBaseHeightAdjuster = 460;
// Alignment for all four action buttons: 'Right' | 'Left' | 'Center' | 'Between'
export const VarAllFourButtonsAlign = 'Right';

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

// Global modulo-3 color series rule:
// Series 1, 4, 7, 10, 13... -> #CEFBEA
// Series 2, 5, 8, 11...     -> #ECE8FF
// Series 3, 6, 9, 12...     -> #FFEFCE
const getCardBgColor = (index) => {
  const remainder = index % 3;
  if (remainder === 0) return '#CEFBEA';
  if (remainder === 1) return '#ECE8FF';
  return '#FFEFCE';
};

const CAPSULE_THEME_COLOR = '#D8F3DC';
const CAPSULE_COUNTER_COLOR = '#8ED973';

const ApprovalQueueGallery = ({ 
  campaigns = [], 
  currentUserEmail,
  onApprove, 
  onNotify, 
  onReject, 
  onOpenNotifiedModal, 
  isDark 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Shortest Expiring Date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [previewEmailHtml, setPreviewEmailHtml] = useState(null);

  const lCardBg = getLCardBg(isDark);

  // Compute days left until start date
  const getDaysLeft = (startTimeStr) => {
    if (!startTimeStr) return null;
    try {
      const start = new Date(startTimeStr);
      const diffMs = start - new Date();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `${diffDays} days left` : 'Starting soon';
    } catch {
      return null;
    }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split(' ')[0];
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = String(d.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr.split(' ')[0] || 'N/A';
    }
  };

  // Filter by Campaign ID, Pending Status, & Sort (All requested campaigns by any user)
  const processedCampaigns = useMemo(() => {
    let list = campaigns.filter(c => {
      const isPending = c.CampaignStatus === 'Pending' || c.campaignStatus === 'Pending';

      const matchesSearch = searchTerm.trim() === '' || 
        (c.campaignId && c.campaignId.toLowerCase().includes(searchTerm.trim().toLowerCase())) ||
        (c.CampaignTitle && c.CampaignTitle.toLowerCase().includes(searchTerm.trim().toLowerCase())) ||
        (c.campaignTitle && c.campaignTitle.toLowerCase().includes(searchTerm.trim().toLowerCase()));

      return isPending && matchesSearch;
    });

    // Sorting...
    list.sort((a, b) => {
      const dateA = new Date(a.StartTime || a.CreationDate || 0).getTime();
      const dateB = new Date(b.StartTime || b.CreationDate || 0).getTime();
      const createdA = new Date(a.CreationDate || 0).getTime();
      const createdB = new Date(b.CreationDate || 0).getTime();

      if (sortBy === 'Shortest Expiring Date') return dateA - dateB;
      if (sortBy === 'Latest Request date') return createdB - createdA;
      if (sortBy === 'Oldest Request Date') return createdA - createdB;
      return 0;
    });

    return list;
  }, [campaigns, searchTerm, sortBy]);

  // Robust HTML formatter for Email Body preview
  const formatEmailPayload = (rawBody) => {
    if (!rawBody) return '<p class="text-slate-400 italic">No email payload defined.</p>';

    let processed = String(rawBody)
      .replace(/{{userName}}/g, 'Abhay H S')
      .replace(/{{email}}/g, 'abhay.hs1@vodafone.com')
      .replace(/{{department}}/g, 'AI & Data Analytics')
      .replace(/{{phishLink}}/g, '#simulated-phish-link');

    // If already contains HTML markup, return with safe substitutions
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(processed);
    if (hasHtmlTags) {
      return processed;
    }

    // Convert raw plain text to formatted email template HTML
    const lines = processed.split('\n').map(l => l.trim()).filter(Boolean);
    return lines.map((line, idx) => {
      if (idx === 0 && lines.length > 1) {
        return `<h3 class="text-base font-bold text-slate-900 mb-2">${line}</h3>`;
      }
      if (
        line.toLowerCase().includes('authenticate') || 
        line.toLowerCase().includes('click here') || 
        line.toLowerCase().includes('verify') || 
        line.toLowerCase().includes('login')
      ) {
        return `<div class="my-4"><a href="#phish" class="inline-block px-5 py-2.5 bg-[#E60000] text-white font-bold text-xs rounded-md shadow-sm no-underline hover:bg-[#cc0000] transition-colors">${line}</a></div>`;
      }
      return `<p class="text-sm text-slate-700 leading-relaxed mb-2.5">${line}</p>`;
    }).join('');
  };

  // Compute active background color for the expanded modal card matching unexpanded card rules
  const modalBgColor = useMemo(() => {
    if (!detailModalItem) return '#CEFBEA';
    if (detailModalItem._cardBgColor) return detailModalItem._cardBgColor;
    const itemIndex = processedCampaigns.findIndex(c => c.campaignId === detailModalItem.campaignId);
    return getCardBgColor(itemIndex >= 0 ? itemIndex : 0);
  }, [detailModalItem, processedCampaigns]);

  // Helper to dynamically resolve buttons row horizontal justification
  const getButtonsRowJustifyClass = () => {
    const align = (VarAllFourButtonsAlign || 'Right').toLowerCase();
    if (align === 'left' || align === 'start') return 'justify-start';
    if (align === 'center') return 'justify-center';
    if (align === 'between') return 'justify-between';
    return 'justify-end';
  };

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* 🌟 ROOT CONTAINER: Locked strictly to screen viewport without stretching */}
      <div className="relative flex flex-col w-full select-none font-sans">
        
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
            <h3 className="text-[15.5px] font-voda font-bold tracking-tight leading-tight">
              Approval<br />Queue
            </h3>
          </div>

          <p className="text-[9px] font-bold text-slate-700 leading-tight relative z-10 max-w-[125px] mb-1">
            All the created campaigns from campaign creator are listed down
          </p>

          {/* 5% cropped corner artwork 
          <div className="absolute -bottom-[5%] -right-[5%] w-[68px] h-[68px] pointer-events-none select-none z-0">
            <img 
              src={ApprovalQueueImg} 
              alt="Approval Queue" 
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
        {/* 🌟 3. TOP-RIGHT ARM OF L-SHAPE CONTAINER (ELEVATED Z-INDEX)               */}
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
            {/* Search by Campaign ID */}
            <div className="relative flex items-center">
              <input 
                type="text"
                placeholder="Search by Campaign ID"
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
                <div className="absolute top-7 left-0 w-full bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-[100] flex flex-col">
                  {['Shortest Expiring Date', 'Latest Request date', 'Oldest Request Date'].map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSortBy(option);
                        setShowSortDropdown(false);
                      }}
                      className={`px-3 py-1 text-left text-[9.5px] font-bold cursor-pointer transition-colors ${
                        sortBy === option 
                          ? 'bg-[#D8F3DC] text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Check Notified Button 
            <button
              type="button"
              onClick={onOpenNotifiedModal}
              className="w-fit px-3 py-1 mt-2 rounded-md bg-[#E9D5FF] hover:bg-[#DDD6FE] text-[#6B21A8] text-[9.5px] font-extrabold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <span>Check Campaigns that are Notified for Changes</span>
              <Megaphone className="w-3 h-3 rotate-[-15deg] fill-[#6B21A8]" />
            </button> */}
          </div>

          {/* Dynamic Big Counter */}
          <div className="flex flex-col items-end justify-center text-right pr-2">
            <span 
              style={{ color: CAPSULE_COUNTER_COLOR }}
              className="text-5xl font-black leading-none tracking-tight font-voda-exb"
            >
              {String(processedCampaigns.length).padStart(2, '0')}
            </span>
            <span className="text-[13.5px] font-voda font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight">
              Total Approval<br />Pending
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 🌟 4. CONTINUOUS LOWER L-BASE (CONTROLLED BY VarGalleryLowerBaseHeightAdjuster) */}
        {/* ========================================================================= */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            height: typeof VarGalleryLowerBaseHeightAdjuster === 'number' ? `${VarGalleryLowerBaseHeightAdjuster}px` : VarGalleryLowerBaseHeightAdjuster,
            borderTopLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderBottomLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderBottomRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-full p-3 flex flex-col gap-2.5 overflow-y-auto z-10 border-b border-l border-r border-black/5 dark:border-white/5 transition-colors [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md"
        >
          {processedCampaigns.length === 0 ? (
            <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-400">No campaigns currently waiting in Approval Queue.</p>
            </div>
          ) : (
            processedCampaigns.map((camp, idx) => {
              const daysLeft = getDaysLeft(camp.StartTime);
              const cardBgColor = getCardBgColor(idx);

              return (
                <div 
                  key={camp.campaignId}
                  style={{ 
                    backgroundColor: cardBgColor,
                    borderRadius: `${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px`,
                    transform: `scale(${VarGallaryCardsScaleAdjuster})`,
                    width: `${100 * VarGallaryCardLenghtAdjuster}%`
                  }}
                  className="mx-auto px-3 py-2 text-slate-900 shadow-2xs flex flex-col gap-1 relative overflow-hidden transition-all hover:shadow-xs border border-black/5 origin-top flex-shrink-0"
                >
                  {/* Top Meta Line */}
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 mt-1 rounded-full bg-white/85 text-[9px] font-black text-slate-800 tracking-wide flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                      {camp.campaignId}
                    </span>

                    <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-600">
                      <span>Created on: {formatShortDate(camp.CreationDate)}</span>
                      <button 
                        type="button" 
                        onClick={() => setDetailModalItem({ ...camp, _cardBgColor: cardBgColor })}
                        className="text-slate-700 hover:text-black cursor-pointer ml-1"
                        title="View Full Specifications & Email Preview"
                      >
                        <ExternalLink className="w-3 h-3 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-[12px] font-voda font-bold tracking-tight leading-tight text-slate-900">
                    {camp.CampaignTitle}
                  </h4>
                  <p className="text-[9px] mb-2 font-medium text-slate-700 leading-snug line-clamp-1">
                    <span className="font-bold text-slate-900">Description: </span>
                    {camp.CampaignDescription}
                  </p>

                  {/* Created By + Scheduled for inline */}
                  <div className="flex items-center text-[9px] text-slate-800 flex-wrap gap-x-2 pt-0.5">
                    <span className="font-bold flex items-center gap-1">
                      <User className="w-2.5 h-2.5 text-slate-600" />
                      Created By: <span className="font-semibold text-slate-700">{camp.CreatedBy || 'Unknown'}</span>
                    </span>

                    {camp.StartTime && (
                      <>
                        <span className="text-slate-400 font-bold">&bull;</span>
                        <span className="font-bold text-slate-700">
                          Scheduled for: <span className="font-semibold">{formatDateTime(camp.StartTime)}</span>
                          {daysLeft && (
                            <span className="ml-1 text-[#15803D] font-black">({daysLeft})</span>
                          )}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Sleek Action Buttons Row (Controlled by VarAllFourButtonsAlign) */}
                  <div className={`flex items-center gap-1.5 pt-1.5 mt-0.5 ${getButtonsRowJustifyClass()}`}>
                    <button
                      type="button"
                      onClick={() => onApprove && onApprove(camp)}
                      className="h-5 px-3 rounded-md bg-[#84D988] hover:bg-[#72C872] text-white text-[8.5px] font-voda font-bold uppercase tracking-wider transition-all shadow-2xs hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      Approve
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => onNotify && onNotify(camp)}
                      className="h-5 px-3.5 rounded-md bg-[#0F172A] hover:bg-black text-white text-[8px] font-voda font-bold tracking-tight uppercase transition-all shadow-2xs hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                    >
                      <AlertCircle className="w-2.5 h-2.5" />
                      Notify For Changes
                    </button>


                    <button
                      type="button"
                      onClick={() => onReject && onReject(camp)}
                      className="h-5 px-3 rounded-md bg-[#F87171] hover:bg-[#EF4444] text-white text-[8.5px] font-voda font-bold uppercase tracking-wider transition-all shadow-2xs hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                    >
                      <XCircle className="w-2.5 h-2.5 stroke-[2.5]" />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 FULL SPECIFICATIONS MODAL (EXPANDED VIEW MATCHING CARD BG) ──       */}
        {/* ========================================================================= */}
        {detailModalItem && (
          <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              style={{ 
                backgroundColor: modalBgColor,
                borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full max-w-3xl border border-black/10 p-6 relative overflow-hidden shadow-2xl flex flex-col gap-3.5 text-slate-900 transition-colors"
            >
              {/* Top Bar: ID Pill (Left) + Close Button (Right) */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/80 text-slate-900 shadow-2xs border border-black/5">
                  <span className="w-2 h-2 rounded-full bg-[#E60000]" />
                  <span>{detailModalItem.campaignId}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-voda font-bold text-[9px] uppercase cursor-pointer transition-colors shadow-2xs"
                >
                  Go Back
                </button>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-voda font-bold tracking-tight text-slate-950">
                  {detailModalItem.CampaignTitle}
                </h3>
                <p className="text-[12px] font-medium text-slate-700 mb-2 leading-relaxed">
                  <strong>Description: </strong>
                  {detailModalItem.CampaignDescription}
                </p>
                <div className="text-[11px] font-bold text-slate-800 mt-0.5">
                  Created on: {formatDateTime(detailModalItem.CreationDate)} &bull; Created By: {detailModalItem.CreatedBy}
                </div>
              </div>

              <div className="w-full h-px bg-black/10" />

              {/* Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-[12px] font-medium text-slate-800">
                <div>
                  <strong>Start Type: </strong>
                  <span>{detailModalItem.CampaignStartType || detailModalItem.startType || 'Scenario'}</span>
                </div>

                {/* Target User List with Tooltip */}
                <div className="flex items-center gap-1.5">
                  <strong>User List: </strong>
                  <div className="relative group inline-flex items-center">
                    <button
                      type="button"
                      onClick={(e) => e.preventDefault()}
                      className="font-mono-tech text-[#E60000] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>
                        {detailModalItem.UserList || detailModalItem.TargetUsers || detailModalItem.userList || detailModalItem.targetUsers || detailModalItem.UserDL || 'No recipients selected'}
                      </span>
                      <ExternalLink className="w-2.5 h-2.5 stroke-[2.5]" />
                    </button>
                    {/* Hover Tooltip */}
                    <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-slate-900 text-white text-[9.5px] font-medium shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50">
                      Post development of User List / DLs screen this recipient list will be available
                    </div>
                  </div>
                </div>

                <div>
                  <strong>Scheduled Start: </strong>
                  <span className="font-semibold">{formatDateTime(detailModalItem.StartTime)}</span>
                </div>

                <div>
                  <strong>Scheduled End: </strong>
                  <span className="font-semibold">{formatDateTime(detailModalItem.EndTime)}</span>
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
                    <span>{detailModalItem.SenderName || 'Security Gateway'}</span>
                  </div>
                  <div>
                    <strong>Sender Email: </strong>
                    <span className="font-mono-tech">{detailModalItem.SenderEmailID || 'Not set'}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <strong>Email Subject: </strong>
                    <span>{detailModalItem.EmailSubject || 'Gateway TLS Certificate Refresh'}</span>
                  </div>

                  {/* Landing Page ID with Tooltip */}
                  <div className="flex items-center gap-1.5">
                    <strong>Landing Page ID: </strong>
                    <div className="relative group inline-flex items-center">
                      <button
                        type="button"
                        onClick={(e) => e.preventDefault()}
                        className="font-mono-tech text-[#E60000] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>{detailModalItem.LandingPageID || detailModalItem.landingPageId || 'LP-VOD-001'}</span>
                        <ExternalLink className="w-2.5 h-2.5 stroke-[2.5]" />
                      </button>
                      {/* Hover Tooltip */}
                      <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-slate-900 text-white text-[9.5px] font-medium shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50">
                        Post development of Landing Page Catalogue this preview will be available
                      </div>
                    </div>
                  </div>

                  {/* Training Path ID with Tooltip */}
                  <div className="flex items-center gap-1.5">
                    <strong>Training Path ID: </strong>
                    <div className="relative group inline-flex items-center">
                      <button
                        type="button"
                        onClick={(e) => e.preventDefault()}
                        className="font-mono-tech text-[#E60000] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>{detailModalItem.TrainingPathID || detailModalItem.trainingPathId || 'TP-DEF-001'}</span>
                        <ExternalLink className="w-2.5 h-2.5 stroke-[2.5]" />
                      </button>
                      {/* Hover Tooltip */}
                      <div className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded bg-slate-900 text-white text-[9.5px] font-medium shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50">
                        Post development of Training (LMS) screen this will be available as modal
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Email Body Button */}
                {(detailModalItem.EmailBody || detailModalItem.emailBody || detailModalItem.ScenarioEmailBody || detailModalItem.EmailContent) && (
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewEmailHtml(
                        detailModalItem.EmailBody || 
                        detailModalItem.emailBody || 
                        detailModalItem.ScenarioEmailBody || 
                        detailModalItem.EmailContent
                      )}
                      className="px-3 py-1 rounded-lg bg-white text-slate-800 border border-slate-300 text-[10.5px] font-bold flex items-center gap-1.5 hover:bg-slate-50 shadow-2xs cursor-pointer w-fit transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#E60000]" />
                      <span>Preview Email Body</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom: approver actions — approve, notify for changes, reject. Approvers never edit. */}
              <div className={`flex items-center gap-2 pt-2 border-t border-black/10 ${getButtonsRowJustifyClass()}`}>
                <button
                  type="button"
                  onClick={() => {
                    onApprove && onApprove(detailModalItem);
                    setDetailModalItem(null);
                  }}
                  className="h-7 px-4 rounded-lg bg-[#84D988] hover:bg-[#72C872] text-white text-[10px] font-voda font-bold uppercase tracking-wider transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  Approve
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    onNotify && onNotify(detailModalItem);
                    setDetailModalItem(null);
                  }}
                  className="h-7 px-4 rounded-lg bg-[#0F172A] hover:bg-black text-white text-[9.5px] font-voda font-bold uppercase tracking-tight transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Notify For Changes
                </button>


                <button
                  type="button"
                  onClick={() => {
                    onReject && onReject(detailModalItem);
                    setDetailModalItem(null);
                  }}
                  className="h-7 px-4 rounded-lg bg-[#F87171] hover:bg-[#EF4444] text-white text-[10px] font-voda font-bold uppercase tracking-wider transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ── 🌟 SIMULATED EMAIL BODY PREVIEW POPUP MODAL ──                        */}
        {/* ========================================================================= */}
        {previewEmailHtml && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden shadow-2xl border border-white/20 flex flex-col">
              
              {/* Modal Window Header */}
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

              {/* Email Envelope Header Bar */}
              {detailModalItem && (
                <div className="px-5 py-2.5 bg-slate-50 dark:bg-[#15171C] border-b border-slate-200 dark:border-white/5 flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <div>
                    <strong className="text-slate-900 dark:text-white">Subject: </strong>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {detailModalItem.EmailSubject || 'Gateway TLS Certificate Refresh'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4">
                    <div>
                      <strong className="text-slate-900 dark:text-white">From: </strong>
                      <span>{detailModalItem.SenderName || 'Not set'}</span>
                      <span className="text-slate-400 font-mono text-[10px] ml-1">&lt;{detailModalItem.SenderEmailID || 'Not set'}&gt;</span>
                    </div>
                    <div>
                      <strong className="text-slate-900 dark:text-white">To: </strong>
                      <span>Abhay H S</span>
                      <span className="text-slate-400 font-mono text-[10px] ml-1">&lt;abhay.hs1@vodafone.com&gt;</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rendered Email Body with Preserved Headings & Button Styles */}
              <div className="p-5 overflow-y-auto max-h-[60vh] bg-slate-100/70 dark:bg-black/50">
                <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xs border border-slate-200/80 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-2 [&_p]:mb-2.5 [&_p]:leading-relaxed [&_a]:text-[#E60000] [&_a]:underline [&_a]:font-semibold [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4">
                  <div 
                    dangerouslySetInnerHTML={{
                      __html: formatEmailPayload(previewEmailHtml)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ApprovalQueueGallery;