import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  ChevronDown, 
  ExternalLink, 
  RotateCcw, 
  X, 
  Eye, 
  Calendar,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import ExpiredIconImg from '../../../assets/RequestAndApprovalsAssets/ExpiredCampaignsBeforeApproval.png';
import campaignsJsonData from '../../Campaigns/CampaignsData.json';

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

const CAPSULE_THEME_COLOR = '#FDE2D2';
const CAPSULE_COUNTER_COLOR = '#E57A44';

const ExpiredCampaignsGallery = ({ 
  campaigns = (campaignsJsonData?.campaigns || []), 
  onExtendAndInvoke, 
  onViewDetails,
  isDark = false 
}) => {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Latest Date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Modals
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [previewEmailHtml, setPreviewEmailHtml] = useState(null);

  // Extend Modal states
  const [extendModalItem, setExtendModalItem] = useState(null);
  const [newStartTime, setNewStartTime] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const lCardBg = getLCardBg(isDark);

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

  const formatForDateTimeInput = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr)) return dateStr.slice(0, 16);
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    } catch {
      // fallback
    }
    return dateStr;
  };

  const formatReadableDateTime = (dateStr) => {
    if (!dateStr) return 'Not changes yet';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const getElapsedString = (dateStr) => {
    if (!dateStr) return '2 days Ago';
    try {
      const diffMs = new Date() - new Date(dateStr);
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `${diffDays} days Ago` : 'Today';
    } catch {
      return '2 days Ago';
    }
  };

  const resolvedCampaigns = useMemo(() => {
    if (Array.isArray(campaigns) && campaigns.length > 0) return campaigns;
    return campaignsJsonData?.campaigns || [];
  }, [campaigns]);

  const filteredExpiredCampaigns = useMemo(() => {
    let list = resolvedCampaigns.filter((c) => {
      const isExpired = c.CampaignStatus === 'Expired' || c.campaignStatus === 'Expired';
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || 
        (c.campaignId && c.campaignId.toLowerCase().includes(q)) ||
        (c.CampaignTitle && c.CampaignTitle.toLowerCase().includes(q)) ||
        (c.campaignTitle && c.campaignTitle.toLowerCase().includes(q));
      return isExpired && matchesSearch;
    });

    list.sort((a, b) => {
      const dateA = new Date(a.CreationDate || a.StartTime || 0).getTime();
      const dateB = new Date(b.CreationDate || b.StartTime || 0).getTime();
      if (sortBy === 'Oldest Date') return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [resolvedCampaigns, searchTerm, sortBy]);

  const isExtensionValid = useMemo(() => {
    if (!newStartTime) return false;
    const selectedDate = new Date(newStartTime).getTime();
    const thresholdDate = Date.now() + 30 * 60 * 1000;
    return selectedDate >= thresholdDate;
  }, [newStartTime]);

  const handleNewStartTimeChange = (value) => {
    setNewStartTime(value);
    if (!value) {
      setToastMessage('');
      return;
    }
    const selectedDate = new Date(value).getTime();
    const thresholdDate = Date.now() + 30 * 60 * 1000;
    if (selectedDate < thresholdDate) {
      setToastMessage('Start time must be extended by at least 30 minutes from current date and time.');
    } else {
      setToastMessage('');
    }
  };

  const handleProceedEditFurther = () => {
    if (!isExtensionValid || !extendModalItem) return;

    try {
      const existingDraft = localStorage.getItem('voisshield_active_campaign_draft');
      const draftObj = existingDraft ? JSON.parse(existingDraft) : {};

      const updatedDraft = {
        ...draftObj,
        isEditingExisting: true,
        campaignId: extendModalItem.campaignId || extendModalItem.CampaignID || '',
        campaignTitle: extendModalItem.CampaignTitle || extendModalItem.campaignTitle || '',
        campaignDescription: extendModalItem.CampaignDescription || extendModalItem.campaignDescription || '',
        startTime: formatForDateTimeInput(newStartTime),
        endTime: formatForDateTimeInput(extendModalItem.EndTime || extendModalItem.endTime || ''),
        isTestCampaign: extendModalItem.TestCampaign === 'Yes' || extendModalItem.TestCampaign === true,
        autoEndPostSending: extendModalItem.autoEndPostSending !== undefined ? Boolean(extendModalItem.autoEndPostSending) : true,
        senderEmailId: extendModalItem.SenderEmailID || extendModalItem.senderEmailId || '',
        senderName: extendModalItem.SenderName || extendModalItem.senderName || '',
        emailSubject: extendModalItem.EmailSubject || extendModalItem.emailSubject || '',
        emailBody: extendModalItem.EmailBody || extendModalItem.emailBody || extendModalItem.ScenarioEmailBody || '',
        landingPageId: extendModalItem.LandingPageID || extendModalItem.landingPageId || 'LP-001',
        trainingId: extendModalItem.TrainingPathID || extendModalItem.trainingId || 'TP-001',
        targetAudience: extendModalItem.UserList || extendModalItem.TargetUsers || 'All Employees',
        scenarioId: extendModalItem.scenarioId || 'custom',
        scenarioName: '__EDIT_MODE__'
      };

      localStorage.setItem('voisshield_active_campaign_draft', JSON.stringify(updatedDraft));
    } catch (e) {
      console.error(e);
    }

    if (onExtendAndInvoke) {
      onExtendAndInvoke(extendModalItem, newStartTime);
    }

    setExtendModalItem(null);
    navigate('/start-campaign/details');
  };

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* Top Right Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-6 z-[250] flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-[#161820] text-slate-900 dark:text-white border border-[#E57A44]/40 shadow-2xl max-w-md">
          <div className="w-7 h-7 rounded-full bg-[#E57A44]/15 text-[#E57A44] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
          </div>
          <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight flex-1">
            {toastMessage}
          </p>
          <button 
            type="button" 
            onClick={() => setToastMessage('')} 
            className="text-slate-400 hover:text-black dark:hover:text-white p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
              Expired<br />Campaigns
            </h3>
          </div>

          <p className="text-[9px] font-bold text-slate-700 leading-tight relative z-10 max-w-[125px] mb-1">
            No one approved or checked these campaigns before expiration
          </p>

         {/* <div className="absolute -bottom-[5%] -right-[5%] w-[68px] h-[68px] pointer-events-none select-none z-0">
            <img 
              src={ExpiredIconImg} 
              alt="Expired Campaigns" 
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

        {/* 🌟 3. Top-Right Arm of L-Shape Container */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            borderTopRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderTopLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-[calc(100%-182px)] ml-auto h-[133px] px-4 py-2.5 flex items-center justify-between relative z-30 select-none -ml-2 transition-colors border-t border-r border-black/5 dark:border-white/5 flex-shrink-0"
        >
          <div className="flex flex-col -mt-8 gap-2 max-w-[340px] w-full">
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
                          ? 'bg-[#FDE2D2] text-[#C2410C] dark:bg-amber-950 dark:text-amber-300' 
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
              {String(filteredExpiredCampaigns.length).padStart(2, '0')}
            </span>
            <span className="text-[13px] font-voda font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight text-right">
              Total Expired Campaign<br />Before Approval
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
          {filteredExpiredCampaigns.length === 0 ? (
            <div className="w-full h-full min-h-[160px] flex items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-400">No expired campaigns found.</p>
            </div>
          ) : (
            filteredExpiredCampaigns.map((camp) => (
              <div
                key={camp.campaignId}
                style={{ 
                  borderRadius: `${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px`,
                  transform: `scale(${VarGallaryCardsScaleAdjuster})`
                }}
                className="w-full box-border bg-[#EEF2F6] dark:bg-[#15171E] px-3.5 py-2 flex items-center justify-between text-slate-900 dark:text-slate-100 shadow-2xs border border-black/5 dark:border-white/5 hover:border-black/10 transition-colors flex-shrink-0"
              >
                <div className="flex flex-col text-left leading-tight min-w-0 flex-1 pr-2">
                  <span className="text-[9px] font-bold text-[#E57A44] tracking-wide font-mono-tech shrink-0">
                    {camp.campaignId}
                  </span>
                  <h4 className="text-[12px] font-voda font-bold tracking-tight leading-tight text-slate-900 dark:text-white truncate mt-0.5">
                    {camp.CampaignTitle}
                  </h4>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5 flex-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setExtendModalItem(camp);
                        setNewStartTime('');
                        setToastMessage('');
                      }}
                      className="h-5 px-3 rounded-md bg-[#64748B] hover:bg-[#475569] text-white text-[8.5px] font-voda font-bold uppercase tracking-wider shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap flex items-center gap-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5 stroke-[2.5]" />
                      <span>Extend Start Date & Invoke</span>
                    </button>

                    <span className="h-5 px-2.5 rounded-md bg-[#E57A44] text-white text-[8.5px] font-voda font-bold uppercase whitespace-nowrap flex items-center shadow-2xs">
                      {getElapsedString(camp.CreationDate)}
                    </span>

                    <button
                      type="button"
                      onClick={() => setDetailModalItem(camp)}
                      className="text-slate-500 hover:text-black dark:hover:text-white cursor-pointer ml-1 transition-colors"
                      title="View Full Specifications & Email Preview"
                    >
                      <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  <span className="text-[8.5px] font-bold text-slate-600 dark:text-slate-400 mr-4">
                    Created on: {formatShortDate(camp.CreationDate)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 EXTEND START TIME MODAL ──                                         */}
        {/* ========================================================================= */}
        {extendModalItem && (
          <div className="fixed inset-0 z-[160] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              style={{
                borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full max-w-[620px] bg-white dark:bg-[#12141A] border border-black/10 dark:border-white/10 p-7 relative overflow-hidden shadow-2xl flex flex-col gap-4 text-slate-900 dark:text-white"
            >
              <h2 className="text-xl font-voda font-bold text-[#E57A44] tracking-tight text-left">
                Extend Start Time to Invoke
              </h2>

              <div className="flex flex-col gap-1.5 text-left pt-1">
                <label className="text-[12px] font-voda font-bold text-slate-800 dark:text-slate-200">
                  Start Time
                </label>
                <div className="relative flex items-center">
                  <input
                    type="datetime-local"
                    value={newStartTime}
                    onChange={(e) => handleNewStartTimeChange(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-white/5 border-2 border-[#E57A44] font-medium text-[11.5px] text-slate-900 dark:text-white outline-none cursor-pointer"
                  />
                  <Calendar className="w-4 h-4 text-slate-500 absolute right-4 pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1 text-[11.5px] font-voda text-left pt-1">
                <p className="text-slate-800 dark:text-slate-200">
                  <strong className="font-bold">Previous Start Time: </strong>
                  <span>{extendModalItem.StartTime || 'N/A'}</span>
                </p>
                <p className="text-slate-800 dark:text-slate-200">
                  <strong className="font-bold">New Start Time: </strong>
                  <span className={newStartTime ? 'text-[#16A34A] font-bold' : 'text-slate-500'}>
                    {formatReadableDateTime(newStartTime)}
                  </span>
                </p>
              </div>

              <div className="flex flex-col items-end gap-2.5 pt-4">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 text-right leading-tight max-w-[280px]">
                  Post &ldquo;Edit Further&rdquo; will take you to the &ldquo;Start New Campaign&rdquo; section to edit this campaign if needed
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExtendModalItem(null);
                      setToastMessage('');
                    }}
                    className="h-8 px-5 rounded-lg bg-[#555A64] hover:bg-[#434850] text-white text-[10.5px] font-voda font-bold tracking-wide transition-all cursor-pointer active:scale-95"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={!isExtensionValid}
                    onClick={handleProceedEditFurther}
                    className={`h-8 px-5 rounded-lg text-[10.5px] font-voda font-bold tracking-wide transition-all flex items-center gap-1.5 shadow-xs ${
                      isExtensionValid
                        ? 'bg-[#8ED973] hover:bg-[#7bc761] text-white cursor-pointer active:scale-95'
                        : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-slate-500 cursor-not-allowed opacity-75'
                    }`}
                  >
                    <span>Edit Further</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  <span className="w-2 h-2 rounded-full bg-[#E57A44]" />
                  <span>{detailModalItem.campaignId} (Expired)</span>
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
                  Created on: {detailModalItem.CreationDate || 'N/A'} &bull; Created By: {detailModalItem.CreatedBy || 'N/A'}
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
                  <span>{detailModalItem.UserList || detailModalItem.TargetUsers || 'All Employees'}</span>
                </div>
                <div>
                  <strong>Scheduled Start: </strong>
                  <span className="font-semibold">{detailModalItem.StartTime || 'N/A'}</span>
                </div>
                <div>
                  <strong>Scheduled End: </strong>
                  <span className="font-semibold">{detailModalItem.EndTime || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ExpiredCampaignsGallery;