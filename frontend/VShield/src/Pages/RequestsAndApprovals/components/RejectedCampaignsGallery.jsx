import React, { useState, useMemo } from 'react';
import { formatDateTime } from '../../../services/campaignStatus';
import { 
  Search, 
  ChevronDown, 
  ExternalLink, 
  UserX
} from 'lucide-react';
import RejectedIconImg from '../../../assets/RequestAndApprovalsAssets/RejectedCampaignsImage.png';

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS
// =========================================================================
export const VarOverallCornerRoundednessAdjuster = 0.6;
export const VarGallaryCardsScaleAdjuster = 1.0;
export const VarGalleryLowerBaseHeightAdjuster = 460;

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

const getLCardBg = (isDark) => (isDark ? '#1C1E24' : '#FFFFFF');

const CAPSULE_THEME_COLOR = '#FCD5CE';
const CAPSULE_COUNTER_COLOR = '#F43F5E';

const RejectedCampaignsGallery = ({ 
  campaigns = [], 
  onViewDetails,
  isDark = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Latest Date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);

  const lCardBg = getLCardBg(isDark);

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split(' ')[0];
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = String(d.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr.split(' ')[0] || '—';
    }
  };

  const getCleanUserName = (emailStr) => {
    if (!emailStr) return 'Unknown';
    const prefix = emailStr.split('@')[0] || '';
    return prefix
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || emailStr;
  };

  const resolvedCampaigns = useMemo(() => {
    return Array.isArray(campaigns) ? campaigns : [];
  }, [campaigns]);

  const filteredRejectedCampaigns = useMemo(() => {
    let list = resolvedCampaigns.filter((c) => {
      const isRejected = c.CampaignStatus === 'Rejected' || c.campaignStatus === 'Rejected';
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || 
        (c.campaignId && c.campaignId.toLowerCase().includes(q)) ||
        (c.CampaignTitle && c.CampaignTitle.toLowerCase().includes(q)) ||
        (c.campaignTitle && c.campaignTitle.toLowerCase().includes(q)) ||
        (c['Approved/RejectedBy'] && c['Approved/RejectedBy'].toLowerCase().includes(q));
      return isRejected && matchesSearch;
    });

    list.sort((a, b) => {
      const dateA = new Date(a.CreationDate || a.StartTime || 0).getTime();
      const dateB = new Date(b.CreationDate || b.StartTime || 0).getTime();
      if (sortBy === 'Oldest Date') return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [resolvedCampaigns, searchTerm, sortBy]);

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* 🌟 ROOT L-SHAPE CONTAINER */}
      <div className="relative flex flex-col w-full select-none font-sans overflow-x-hidden">
        
        {/* 🌟 1. TRULY ISOLATED CAPSULE HEADER (TOP-LEFT) */}
        <div
          style={{ 
            backgroundColor: CAPSULE_THEME_COLOR,
            borderRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="absolute top-0 left-0 w-[176px] h-[126px] p-3 flex flex-col justify-between shadow-xs z-20 text-slate-900 select-none overflow-hidden flex-shrink-0"
        >
          <div className="flex justify-between items-start relative z-10">
            <h3 className="text-[14.5px] font-voda font-bold tracking-tight leading-tight">
              Rejected<br />Campaigns
            </h3>
          </div>

          <p className="text-[9px] font-bold text-slate-700 leading-tight relative z-10 max-w-[115px] mb-1">
            Those which were reviewed and rejected after review
          </p>
        </div>

        {/* 🌟 2. Concave Arc Fillet */}
        <div className="absolute top-[118px] left-[166px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
          </svg>
        </div>

        {/* 🌟 3. Top-Right Arm of L-Shape Container */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            borderTopRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderTopLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-[calc(100%-182px)] ml-auto h-[133px] px-4 py-2.5 flex items-center justify-between relative z-30 select-none -ml-2 transition-colors border-t border-r border-black/5 dark:border-white/5 flex-shrink-0"
        >
          <div className="flex flex-col gap-2 -mt-8 max-w-[340px] w-full">
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

            <div className="relative w-44">
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="w-full h-6 px-2.5 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] text-slate-700 dark:text-slate-300 text-[8px] font-bold flex items-center justify-between border border-black/5 dark:border-white/5 cursor-pointer shadow-2xs"
              >
                <span className="truncate">Sort: {sortBy}</span>
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 ml-1" />
              </button>

              {showSortDropdown && (
                <div className="absolute top-7 left-0 w-44 bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-[100] flex flex-col">
                  {['Latest Date', 'Oldest Date'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSortBy(option);
                        setShowSortDropdown(false);
                      }}
                      className={`px-3 py-1 text-left text-[9.5px] font-bold cursor-pointer transition-colors ${
                        sortBy === option 
                          ? 'bg-[#FCD5CE] text-[#BE123C] dark:bg-rose-950 dark:text-rose-300' 
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

          <div className="flex flex-col items-end justify-center text-right pr-2">
            <span 
              style={{ color: CAPSULE_COUNTER_COLOR }}
              className="text-5xl font-black leading-none tracking-tight font-voda-exb"
            >
              {String(filteredRejectedCampaigns.length).padStart(2, '0')}
            </span>
            <span className="text-[13.5px] font-voda font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight text-right">
              Total Rejected Campaigns
            </span>
          </div>
        </div>

        {/* 🌟 4. Continuous Lower L-Base */}
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
          {filteredRejectedCampaigns.length === 0 ? (
            <div className="w-full h-full min-h-[160px] flex items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-400">No rejected campaigns found in log.</p>
            </div>
          ) : (
            filteredRejectedCampaigns.map((camp) => {
              const rejectedByEmail = camp['Approved/RejectedBy'] || camp.ApprovedBy || camp.RejectedBy || 'Unknown';
              const rejectedByName = getCleanUserName(rejectedByEmail);

              return (
                <div
                  key={camp.campaignId}
                  style={{ 
                    borderRadius: `${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px`,
                    transform: `scale(${VarGallaryCardsScaleAdjuster})`
                  }}
                  className="w-full box-border bg-[#EEF2F6] dark:bg-[#15171E] px-3.5 py-2 flex items-center justify-between text-slate-900 dark:text-slate-100 shadow-2xs border border-black/5 dark:border-white/5 hover:border-black/10 transition-colors flex-shrink-0"
                >
                  <div className="flex flex-col text-left leading-tight min-w-0 flex-1 pr-2">
                    <span className="text-[9.5px] font-bold text-[#F43F5E] tracking-wide font-mono-tech shrink-0">
                      {camp.campaignId}
                    </span>
                    <h4 className="text-[12px] font-voda font-bold tracking-tight leading-tight text-slate-900 dark:text-white truncate mt-0.5">
                      {camp.CampaignTitle}
                    </h4>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <span 
                        title={`Rejected by ${rejectedByEmail}`}
                        className="h-5 px-2 rounded-md bg-[#FEE2E2] dark:bg-rose-950/60 text-[#BE123C] dark:text-rose-300 text-[8px] font-voda font-bold whitespace-nowrap flex items-center gap-1 border border-[#FCA5A5]/40 shadow-2xs"
                      >
                        <UserX className="w-2.5 h-2.5 stroke-[2.5]" />
                        <span>Rejected by: <strong className="font-extrabold">{rejectedByName}</strong></span>
                      </span>

                      <span className="text-[8px] font-bold text-slate-600 dark:text-slate-300 hidden sm:inline whitespace-nowrap">
                        Created By: <span className="font-semibold text-slate-500">{camp.CreatedBy?.split('@')[0] || 'User'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setDetailModalItem(camp)}
                        className="text-slate-500 hover:text-black dark:hover:text-white cursor-pointer ml-1 transition-colors"
                        title="View Full Specifications"
                      >
                        <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                      </button>
                    </div>

                    <span className="text-[8.5px] font-bold text-slate-600 dark:text-slate-400 mr-4">
                      Created on: {formatShortDate(camp.CreationDate)}
                    </span>
                  </div>
                </div>
              );
            })
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
                  <span className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                  <span>{detailModalItem.campaignId} (Rejected)</span>
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
                  Created on: {formatDateTime(detailModalItem.CreationDate)} &bull; Created By: {detailModalItem.CreatedBy || 'N/A'}
                  {detailModalItem['Approved/RejectedBy'] && (
                    <span className="ml-2 font-bold text-[#BE123C]">
                      &bull; Rejected by: {detailModalItem['Approved/RejectedBy']}
                    </span>
                  )}
                </div>
              </div>

              {detailModalItem.NotificationMessage && (
                <div className="p-3.5 rounded-xl bg-red-100/90 border border-red-300 text-red-950 flex flex-col gap-1 shadow-2xs">
                  <span className="text-[11px] font-voda font-bold uppercase tracking-wider text-red-700">
                    Rejection Feedback & Remarks:
                  </span>
                  <p className="text-[12px] font-medium leading-relaxed">
                    {detailModalItem.NotificationMessage}
                  </p>
                </div>
              )}

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
                  <span className="font-semibold">{formatDateTime(detailModalItem.StartTime)}</span>
                </div>
                <div>
                  <strong>Scheduled End: </strong>
                  <span className="font-semibold">{formatDateTime(detailModalItem.EndTime)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RejectedCampaignsGallery;