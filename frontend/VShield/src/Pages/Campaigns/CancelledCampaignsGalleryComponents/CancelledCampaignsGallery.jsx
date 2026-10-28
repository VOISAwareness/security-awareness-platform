import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ChevronDown, 
  ExternalLink, 
  User, 
  Eye, 
  X,
  Calendar as CalendarIcon,
  RotateCcw
} from 'lucide-react';
import campaignsJsonData from '../CampaignsData.json';

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

// Uniform Card Background for Cancelled Gallery
export const VarGalleryCardColor = '#F1F5F7';

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
  .rounded-xl { border-radius: ${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px !important; }
  .rounded-lg { border-radius: ${Math.round(10 * VarOverallCornerRoundednessAdjuster)}px !important; }
  .rounded-md { border-radius: ${Math.round(6 * VarOverallCornerRoundednessAdjuster)}px !important; }
`;

const getLCardBg = (isDark) => (isDark ? '#1C1E24' : '#FFFFFF');

const CancelledCampaignsGallery = ({ 
  campaigns = [], 
  isDark = false 
}) => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Latest Created Date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [previewEmailHtml, setPreviewEmailHtml] = useState(null);

  // 🌟 Advanced Calendar Slicer Filter State
  const [showCalendarFilter, setShowCalendarFilter] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [appliedDateRange, setAppliedDateRange] = useState({ start: '', end: '' });
  const calendarPopoverRef = useRef(null);

  const lCardBg = getLCardBg(isDark);
  const cardItemBg = isDark ? '#1F222A' : VarGalleryCardColor;

  // Close calendar popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (calendarPopoverRef.current && !calendarPopoverRef.current.contains(e.target)) {
        setShowCalendarFilter(false);
      }
    };
    if (showCalendarFilter) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showCalendarFilter]);

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

  const formatDisplayDate = (dateStr, includeTime = true) => {
    if (!dateStr) return '09/28/2026 04:20:00 PM';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const year = d.getFullYear();
      if (!includeTime) return `${month}/${day}/${year}`;
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

  const resolvedCampaigns = useMemo(() => {
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
  }, [campaigns]);

  // Filter only Cancelled campaigns
  const filteredList = useMemo(() => {
    let list = resolvedCampaigns.filter((c) => {
      const status = (c.CampaignStatus || c.campaignStatus || '').toLowerCase();
      return status === 'cancelled';
    });

    // Calendar Range Slicer Filter
    if (appliedDateRange.start) {
      const startMs = new Date(appliedDateRange.start).setHours(0, 0, 0, 0);
      list = list.filter((c) => {
        const dateVal = new Date(c.CancelledDate || c.LastModified || c.CreationDate || 0).getTime();
        return dateVal >= startMs;
      });
    }
    if (appliedDateRange.end) {
      const endMs = new Date(appliedDateRange.end).setHours(23, 59, 59, 999);
      list = list.filter((c) => {
        const dateVal = new Date(c.CancelledDate || c.LastModified || c.CreationDate || 0).getTime();
        return dateVal <= endMs;
      });
    }

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => 
        (c.campaignId && c.campaignId.toLowerCase().includes(q)) ||
        (c.CampaignTitle && c.CampaignTitle.toLowerCase().includes(q)) ||
        (c.campaignTitle && c.campaignTitle.toLowerCase().includes(q)) ||
        (c.CreatedBy && c.CreatedBy.toLowerCase().includes(q)) ||
        (c.CancelledBy && c.CancelledBy.toLowerCase().includes(q)) ||
        (c.ReasonForCancel && c.ReasonForCancel.toLowerCase().includes(q))
      );
    }

    list = [...list].sort((a, b) => {
      const dateA = new Date(a.CancelledDate || a.LastModified || a.CreationDate || 0).getTime();
      const dateB = new Date(b.CancelledDate || b.LastModified || b.CreationDate || 0).getTime();
      const createdA = new Date(a.CreationDate || 0).getTime();
      const createdB = new Date(b.CreationDate || 0).getTime();

      if (sortBy === 'Latest Created Date') return createdB - createdA;
      if (sortBy === 'Oldest Created Date') return createdA - createdB;
      if (sortBy === 'Shortest Expiring Date') return dateA - dateB;
      return 0;
    });

    return list;
  }, [resolvedCampaigns, searchTerm, sortBy, appliedDateRange]);

  // Reinvoke Campaign -> takes to CampaignEmail.jsx
  const handleReinvoke = (camp) => {
    try {
      localStorage.setItem('voisshield_active_campaign_draft', JSON.stringify({
        ...camp,
        isReinvoking: true,
        campaignId: undefined // generate fresh draft id on load
      }));
    } catch (e) {
      console.error(e);
    }
    navigate('/start-campaign/email');
  };

  const handleApplyCalendarFilter = () => {
    setAppliedDateRange({ start: filterStartDate, end: filterEndDate });
    setShowCalendarFilter(false);
  };

  const handleClearCalendarFilter = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setAppliedDateRange({ start: '', end: '' });
    setShowCalendarFilter(false);
  };

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div className="flex flex-col min-w-0 w-full">
        {/* 🌟 1. TOP-RIGHT ARM: CONTROLS & DYNAMIC REDISH BIG COUNTER */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            borderTopRightRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
            borderTopLeftRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-full h-[100px] px-6 py-3 flex items-center justify-between border-t border-l border-r border-black/5 dark:border-white/5 transition-colors relative z-30"
        >
          {/* Left: Total Cancelled Campaigns in #F43F5E Theme */}
          <div className="flex items-center gap-4">
            <span 
              style={{ color: '#F43F5E' }}
              className="text-5xl font-black leading-none tracking-tight font-voda-exb"
            >
              {String(filteredList.length).padStart(2, '0')}
            </span>
            <span className="text-[15px] font-voda font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
              Total <br /> Cancelled Campaigns
            </span>
          </div>

          {/* Right Controls: Search + Calendar Slicer Icon + Sort Dropdown */}
          <div className="flex flex-col gap-2 max-w-[360px] w-full">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search by Campaign ID, Name or Reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-7 pl-3 pr-8 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] font-bold text-slate-800 dark:text-slate-200 text-[9px] placeholder-slate-400 outline-none border border-black/5 dark:border-white/5"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2 justify-end relative">
              {/* 🌟 Small Calendar Icon Slicer Button (Left of Sort By) */}
              <div className="relative" ref={calendarPopoverRef}>
                <button
                  type="button"
                  onClick={() => setShowCalendarFilter(!showCalendarFilter)}
                  className={`h-6 px-2.5 rounded-lg border text-[8.5px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                    appliedDateRange.start || appliedDateRange.end
                      ? 'bg-[#F43F5E] text-white border-[#F43F5E]'
                      : 'bg-[#EEF2F6] dark:bg-[#12141A] text-slate-700 dark:text-slate-300 border-black/5 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                  title="Filter by Cancelled Date Range"
                >
                  <CalendarIcon className="w-3 h-3" />
                  <span>{appliedDateRange.start || appliedDateRange.end ? 'Filtered Date' : 'Calendar'}</span>
                </button>

                {/* 🌟 Advanced Calendar Range Slicer Popover */}
                {showCalendarFilter && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '110%',
                      right: 0,
                      zIndex: 120,
                      borderRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
                    }}
                    className="w-64 p-3 bg-white dark:bg-[#161820] border border-black/10 dark:border-white/10 shadow-2xl flex flex-col gap-2.5 text-slate-900 dark:text-white"
                  >
                    <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-1.5">
                      <span className="text-[11px] font-voda font-bold tracking-tight">
                        Date Range Slicer
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowCalendarFilter(false)}
                        className="p-0.5 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 text-[10px]">
                      <label className="font-bold text-slate-600 dark:text-slate-400">
                        From Date:
                      </label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full h-7 px-2 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] font-medium text-[10px] outline-none border border-black/5 dark:border-white/10 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex flex-col gap-1 text-[10px]">
                      <label className="font-bold text-slate-600 dark:text-slate-400">
                        To Date:
                      </label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full h-7 px-2 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] font-medium text-[10px] outline-none border border-black/5 dark:border-white/10 text-slate-900 dark:text-white"
                      />
                    </div>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date();
                          const last30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                          setFilterStartDate(last30.toISOString().split('T')[0]);
                          setFilterEndDate(today.toISOString().split('T')[0]);
                        }}
                        className="flex-1 py-1 rounded bg-[#EEF2F6] dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[8px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        Last 30 Days
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCalendarFilter}
                        className="flex-1 py-1 rounded bg-[#EEF2F6] dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[8px] font-bold text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        Reset
                      </button>
                    </div>

                    {/* Apply Filter Button */}
                    <button
                      type="button"
                      onClick={handleApplyCalendarFilter}
                      className="w-full h-6 rounded-lg bg-[#F43F5E] hover:bg-[#E11D48] text-white text-[9.5px] font-voda font-bold tracking-tight shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center mt-1"
                    >
                      Apply Filter
                    </button>
                  </div>
                )}
              </div>

              {/* Sort By Dropdown */}
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
                  <div className="absolute top-7 right-0 w-44 bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-[100] flex flex-col">
                    {['Latest Created Date', 'Oldest Created Date', 'Shortest Expiring Date'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSortBy(option);
                          setShowSortDropdown(false);
                        }}
                        className={`px-3 py-1 text-left text-[9px] font-bold cursor-pointer transition-colors ${
                          sortBy === option
                            ? 'bg-rose-50 text-rose-900 dark:bg-rose-950 dark:text-rose-300'
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
        </div>

        {/* 🌟 2. CONTINUOUS LOWER L-BASE: UNIFORM #F1F5F7 FEED */}
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
                No cancelled campaigns found matching criteria.
              </p>
            </div>
          ) : (
            <div 
              style={{ gap: `${Math.round(10 * VarCardSleeknessAdjuster * VarGalleryCardsHeightAdjuster)}px` }}
              className="flex flex-col w-full"
            >
              {filteredList.map((camp) => {
                const cancelledBy = camp.CancelledBy || camp.CreatedBy || 'mary.james@vodafone.com';
                const cancelledOn = camp.CancelledDate || camp.LastModified || '09/28/2026 04:20:00 PM';

                return (
                  <div
                    key={camp.campaignId}
                    style={{ 
                      backgroundColor: cardItemBg,
                      borderRadius: `${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px`,
                      padding: `${Math.round(10 * VarCardSleeknessAdjuster * VarGalleryCardsPaddingScale)}px ${Math.round(15 * VarCardSleeknessAdjuster * VarGalleryCardsPaddingScale)}px`,
                      gap: `${Math.round(6 * VarCardSleeknessAdjuster * VarGalleryCardsHeightAdjuster)}px`
                    }}
                    className="text-slate-900 dark:text-white shadow-2xs flex flex-col relative overflow-hidden transition-all hover:shadow-xs border border-black/5 dark:border-white/5 flex-shrink-0"
                  >
                    {/* Top Row: ID Badge + Created On + Reinvoke Button + External Link */}
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

                        {/* Reinvoke Button */}
                        <button
                          type="button"
                          onClick={() => handleReinvoke(camp)}
                          style={{ 
                            height: `${Math.round(20 * VarGalleryCardsHeightAdjuster)}px`,
                            fontSize: `${(9 * VarGalleryCardsTextSizeScale).toFixed(1)}px`,
                            paddingLeft: `${Math.round(12 * VarGalleryCardsPaddingScale)}px`,
                            paddingRight: `${Math.round(12 * VarGalleryCardsPaddingScale)}px`
                          }}
                          className="rounded-md font-voda font-bold tracking-tight shadow-2xs flex items-center gap-1 bg-[#8ED973] hover:bg-[#7DC862] text-white cursor-pointer active:scale-95 transition-all"
                          title="Reinvoke this campaign to start campaign email"
                        >
                          <span>Reinvoke</span>
                        </button>

                        {/* External Link Specification Trigger */}
                        <button
                          type="button"
                          onClick={() => setDetailModalItem(camp)}
                          className="text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer transition-colors p-0.5 ml-0.5"
                          title="View Specifications & Full Cancellation Reason"
                        >
                          <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                        </button>
                      </div>
                    </div>

                    {/* Middle Row: Title & Reason For Cancelling (No Description Here) */}
                    <div>
                      <h4 
                        style={{ fontSize: `${(12 * VarGalleryCardsTextSizeScale).toFixed(1)}px` }}
                        className="font-voda font-bold tracking-tight text-slate-950 dark:text-white leading-tight"
                      >
                        {camp.CampaignTitle}
                      </h4>
                      <p 
                        style={{ fontSize: `${(9 * VarGalleryCardsTextSizeScale).toFixed(1)}px` }}
                        className="font-medium text-slate-700 dark:text-slate-300 leading-snug mt-0.5 max-w-3xl line-clamp-2"
                      >
                        <strong className="font-bold text-slate-900 dark:text-white">Reason for cancelling: </strong>
                        {camp.ReasonForCancel || 'Campaign cancelled per administrative security directives.'}
                      </p>
                    </div>

                    {/* Bottom Meta Line: Cancelled By + Cancelled On */}
                    <div 
                      style={{ 
                        paddingTop: `${Math.round(5 * VarCardSleeknessAdjuster * VarGalleryCardsPaddingScale)}px`,
                        fontSize: `${(8.5 * VarGalleryCardsTextSizeScale).toFixed(1)}px`
                      }}
                      className="w-full border-t border-black/10 dark:border-white/10 flex items-center justify-between font-voda font-bold text-slate-800 dark:text-slate-200 flex-wrap gap-2"
                    >
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-900 dark:text-white" />
                        <span>Cancelled By: <strong className="font-semibold text-slate-700 dark:text-slate-300">{cancelledBy}</strong></span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span>Cancelled On: <strong className="font-semibold text-slate-700 dark:text-slate-300">{formatDisplayDate(cancelledOn)}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🌟 FULL SPECIFICATIONS MODAL (SHOWS BOTH DESCRIPTION & REASON FOR CANCELLING) */}
        {detailModalItem && (
          <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              style={{
                backgroundColor: isDark ? '#161820' : VarGalleryCardColor,
                borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full max-w-3xl border border-black/10 dark:border-white/10 p-6 relative overflow-hidden shadow-2xl flex flex-col gap-3.5 text-slate-900 dark:text-white transition-colors"
            >
              {/* Top Bar: ID Pill (Left) + Reinvoke Button + Close Button */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/80 dark:bg-black/60 text-slate-900 dark:text-white shadow-2xs border border-black/5 dark:border-white/10">
                  <span className="w-2 h-2 rounded-full bg-[#E60000]" />
                  <span>{detailModalItem.campaignId}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReinvoke(detailModalItem)}
                    className="h-6 px-3.5 rounded-lg text-[9.5px] font-voda font-bold tracking-tight shadow-xs flex items-center gap-1.5 bg-[#8ED973] hover:bg-[#7DC862] text-white cursor-pointer active:scale-95 transition-all"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reinvoke Campaign</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailModalItem(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-voda font-bold text-[9px] uppercase cursor-pointer transition-colors shadow-2xs"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Title & Both Reason for Cancelling and Description */}
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-voda font-bold tracking-tight text-slate-950 dark:text-white">
                  {detailModalItem.CampaignTitle}
                </h3>
                
                {/* Reason For Cancelling Box */}
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-[11px] leading-relaxed">
                  <strong className="text-rose-700 dark:text-rose-400 font-bold block mb-0.5">
                    Reason for Cancelling:
                  </strong>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {detailModalItem.ReasonForCancel || 'Campaign cancelled per administrative security directives.'}
                  </span>
                </div>

                {/* Description */}
                <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                  <strong>Description: </strong>
                  {detailModalItem.CampaignDescription}
                </p>

                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-400 mt-0.5">
                  Cancelled By: {detailModalItem.CancelledBy || detailModalItem.CreatedBy} &bull; Cancelled On: {formatDisplayDate(detailModalItem.CancelledDate || detailModalItem.LastModified)}
                </div>
              </div>

              <div className="w-full h-px bg-black/10 dark:bg-white/10" />

              {/* Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-[12px] font-medium text-slate-800 dark:text-slate-200">
                <div>
                  <strong>Start Type: </strong>
                  <span>{detailModalItem.CampaignStartType || detailModalItem.startType || 'Scenario'}</span>
                </div>
                <div>
                  <strong>User List: </strong>
                  <span className="font-mono-tech text-[#E60000] font-bold">{detailModalItem.RecipientGroupType || detailModalItem.UserListID || 'UserList (ul-001)'}</span>
                </div>
                <div>
                  <strong>Originally Scheduled Start: </strong>
                  <span className="font-semibold">{formatDisplayDate(detailModalItem.StartTime, true)}</span>
                </div>
                <div>
                  <strong>Originally Scheduled End: </strong>
                  <span className="font-semibold">{formatDisplayDate(detailModalItem.EndTime, true)}</span>
                </div>
              </div>

              {/* Email & Target Setup Box */}
              <div className="p-4 rounded-xl bg-white/65 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col gap-2 shadow-2xs">
                <h4 className="text-[12.5px] font-voda font-bold uppercase text-slate-900 dark:text-white">
                  Email Dispatch Details & Payloads
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 text-[11.5px] text-slate-700 dark:text-slate-300 font-medium">
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
                      className="px-3 py-1 rounded-lg bg-white dark:bg-black text-slate-800 dark:text-white border border-slate-300 dark:border-white/20 text-[10.5px] font-bold flex items-center gap-1.5 hover:bg-slate-50 shadow-2xs cursor-pointer w-fit transition-colors"
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

export default CancelledCampaignsGallery;