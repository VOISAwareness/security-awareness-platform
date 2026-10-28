import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserType } from '../../../UserTypeContext/UserTypeContext';
import { 
  Search, 
  ChevronDown,
  ExternalLink,
  User, 
  Megaphone, 
  Bell, 
  Edit3,
  X,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import MegaphoneImg from '../../../assets/RequestAndApprovalsAssets/NotifyForChangeImage.png';
import campaignsJsonData from '../../Campaigns/CampaignsData.json';

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS (MATCHING APPROVAL QUEUE GALLERY)
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

const CAPSULE_THEME_COLOR = '#E9D5FF';
const CAPSULE_COUNTER_COLOR = '#9333EA';

const NotifiedCampaignsGallery = ({
  isOpen = true,
  onClose,
  campaigns = (campaignsJsonData?.campaigns || []),
  currentUserEmail,
  isDark: propIsDark
}) => {
  const navigate = useNavigate();
  const { user, isDark: contextIsDark } = useUserType?.() || {};
  const isDark = propIsDark !== undefined ? propIsDark : (contextIsDark || false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Latest Notified Date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [activeMessageCamp, setActiveMessageCamp] = useState(null);

  const lCardBg = getLCardBg(isDark);

  // Normalize logged-in user email
  const activeEmail = useMemo(() => {
    return (
      currentUserEmail ||
      user?.email ||
      user?.userEmail ||
      user?.UserEmailD_Admin ||
      user?.UserEmailD_CamapignManager ||
      user?.UserEmailD_CamapignCreator ||
      user?.UserEMailID ||
      user?.userEmailId ||
      ''
    ).trim().toLowerCase();
  }, [currentUserEmail, user]);

  // Helper to format ISO or human date strings to datetime-local input format
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

  // Select campaign and navigate directly to DetailsAndSettings.jsx
  const handleEditYourself = (camp) => {
    try {
      const existingDraft = localStorage.getItem('voisshield_active_campaign_draft');
      const draftObj = existingDraft ? JSON.parse(existingDraft) : {};

      const updatedDraft = {
        ...draftObj,
        isEditingExisting: true,
        campaignId: camp.campaignId || camp.CampaignID || '',
        campaignTitle: camp.CampaignTitle || camp.campaignTitle || '',
        campaignDescription: camp.CampaignDescription || camp.campaignDescription || '',
        startTime: formatForDateTimeInput(camp.StartTime || camp.startTime || ''),
        endTime: formatForDateTimeInput(camp.EndTime || camp.endTime || ''),
        isTestCampaign: camp.TestCampaign === 'Yes' || camp.TestCampaign === true || camp.isTestCampaign === true,
        autoEndPostSending: camp.autoEndPostSending !== undefined ? Boolean(camp.autoEndPostSending) : true,
        senderEmailId: camp.SenderEmailID || camp.senderEmailId || '',
        senderName: camp.SenderName || camp.senderName || '',
        emailSubject: camp.EmailSubject || camp.emailSubject || '',
        emailBody: camp.EmailBody || camp.emailBody || camp.ScenarioEmailBody || camp.EmailContent || '',
        landingPageId: camp.LandingPageID || camp.landingPageId || 'LP-001',
        trainingId: camp.TrainingPathID || camp.trainingId || 'TP-001',
        targetAudience: camp.UserList || camp.TargetUsers || camp.targetAudience || 'All Employees',
        scenarioId: camp.scenarioId || 'custom',
        scenarioName: '__EDIT_MODE__'
      };

      localStorage.setItem('voisshield_active_campaign_draft', JSON.stringify(updatedDraft));
    } catch (e) {
      console.error('Error saving campaign draft for edit:', e);
    }

    if (onClose) onClose();
    navigate('/start-campaign/details');
  };

  const resolvedCampaigns = useMemo(() => {
    if (Array.isArray(campaigns) && campaigns.length > 0) return campaigns;
    return campaignsJsonData?.campaigns || [];
  }, [campaigns]);

  // Filter only 'Notified' campaigns
  const notifiedCampaigns = useMemo(() => {
    let list = resolvedCampaigns.filter((c) => {
      const isNotified = c.CampaignStatus === 'Notified' || c.campaignStatus === 'Notified';
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        (c.campaignId && c.campaignId.toLowerCase().includes(q)) ||
        (c.CampaignTitle && c.CampaignTitle.toLowerCase().includes(q)) ||
        (c.campaignTitle && c.campaignTitle.toLowerCase().includes(q)) ||
        (c.CreatedBy && c.CreatedBy.toLowerCase().includes(q)) ||
        (c.NotifiedBy && c.NotifiedBy.toLowerCase().includes(q));
      return isNotified && matchesSearch;
    });

    list.sort((a, b) => {
      const dateA = new Date(a.LastModified || a.CreationDate || 0).getTime();
      const dateB = new Date(b.LastModified || b.CreationDate || 0).getTime();
      if (sortBy === 'Oldest Notified Date') return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [resolvedCampaigns, searchTerm, sortBy]);

  const getElapsedBadge = (dateStr) => {
    if (!dateStr) return '2 days ago';
    try {
      const diffMs = new Date() - new Date(dateStr);
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? `${diffDays} days ago` : 'Today';
    } catch {
      return '2 days ago';
    }
  };

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
              Notified<br />Campaigns
            </h3>
          </div>

          <p className="text-[9px] font-bold text-slate-700 leading-tight relative z-10 max-w-[135px] mb-1">
            Review campaigns requested for modifications by Campaign Approvers
          </p>

          {/* Corner Icon 
          <div className="absolute -bottom-[5%] -right-[5%] w-[68px] h-[68px] pointer-events-none select-none z-0">
            <img
              src={MegaphoneImg}
              alt="Notified Megaphone"
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

            {/* Sort By Dropdown */}
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
                  {['Latest Notified Date', 'Oldest Notified Date'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSortBy(option);
                        setShowSortDropdown(false);
                      }}
                      className={`px-3 py-1 text-left text-[9.5px] font-bold cursor-pointer transition-colors ${
                        sortBy === option
                          ? 'bg-[#E9D5FF] text-[#6B21A8] dark:bg-purple-950 dark:text-purple-300'
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

          {/* Dynamic Big Purple Counter */}
          <div className="flex flex-col items-end justify-center text-right pr-2">
            <span
              style={{ color: CAPSULE_COUNTER_COLOR }}
              className="text-5xl font-black leading-none tracking-tight font-voda-exb"
            >
              {String(notifiedCampaigns.length).padStart(2, '0')}
            </span>
            <span className="text-[13.5px] font-voda font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight">
              Total Notified<br />Campaigns
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
          {notifiedCampaigns.length === 0 ? (
            <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-400">No campaigns currently notified for changes.</p>
            </div>
          ) : (
            notifiedCampaigns.map((camp) => {
              // Only enabled for the user who created it
              const isCreatorOfCamp = Boolean(
                activeEmail && (camp.CreatedBy || '').trim().toLowerCase() === activeEmail
              );

              return (
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
                    <span className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-black/60 text-[9px] font-black text-[#6B21A8] dark:text-purple-300 tracking-wide flex items-center gap-1 shadow-2xs font-mono-tech border border-purple-200/50 dark:border-purple-900/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#9333EA]" />
                      {camp.campaignId}
                    </span>

                    <span className="px-2 py-0.5 rounded-md bg-[#E9D5FF] text-[#6B21A8] text-[8.5px] font-voda font-bold uppercase whitespace-nowrap shadow-2xs">
                      {getElapsedBadge(camp.LastModified || camp.CreationDate)}
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
                        Created By: <strong className="text-slate-800 dark:text-slate-200">{camp.CreatedBy?.split('@')[0] || 'Creator'}</strong>
                      </span>
                      <span>&bull;</span>
                      <span className="font-bold flex items-center gap-1 text-[#6B21A8] dark:text-purple-300">
                        <User className="w-2.5 h-2.5" />
                        Notified By: <strong>{camp.NotifiedBy || 'Approver'}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Check Notified Message Button */}
                      <button
                        type="button"
                        onClick={() => setActiveMessageCamp(camp)}
                        className="h-5 px-2.5 rounded-md bg-[#FDE2E4] hover:bg-[#FCD5CE] text-[#BE123C] text-[8.5px] font-voda font-bold uppercase tracking-wider flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                      >
                        <Bell className="w-2.5 h-2.5 fill-[#BE123C]" />
                        <span>Check Message</span>
                      </button>

                      {/* Edit Campaign Button (Enabled ONLY for Creator) */}
                      <button
                        type="button"
                        disabled={!isCreatorOfCamp}
                        onClick={() => isCreatorOfCamp && handleEditYourself(camp)}
                        title={isCreatorOfCamp ? "Edit Campaign" : "Only the campaign creator can edit this campaign"}
                        className={`h-5 px-3 rounded-md text-[8.5px] font-voda font-bold tracking-tight uppercase transition-all shadow-2xs flex items-center justify-center gap-1 whitespace-nowrap ${
                          isCreatorOfCamp
                            ? 'bg-[#9E98F2] hover:bg-[#B9B4F6] text-white hover:scale-[1.02] active:scale-95 cursor-pointer'
                            : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Edit3 className="w-2.5 h-2.5" />
                        <span>Edit</span>
                      </button>

                      <span className="text-[8px] font-semibold text-slate-500 ml-1">
                        Date: {camp.LastModified?.split(' ')[0] || camp.CreationDate?.split(' ')[0] || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* 🌟 5. NESTED NOTIFICATION MESSAGE MODAL POPUP DIALOG                      */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {activeMessageCamp && (
            <div className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative w-full max-w-[460px] rounded-2xl bg-[#FCD5CE] border border-rose-300 text-slate-900 shadow-2xl p-5 z-50 flex flex-col gap-3 select-none"
              >
                {/* Dialog Header */}
                <div className="flex items-center justify-between pb-1.5 border-b border-rose-300/60">
                  <span className="text-[12.5px] font-voda font-bold text-[#9F1239] tracking-tight uppercase">
                    Notification Message ({activeMessageCamp.campaignId})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveMessageCamp(null)}
                    className="p-1 rounded-lg text-slate-600 hover:text-black cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Message Body */}
                <div className="w-full bg-white/95 rounded-xl p-3.5 shadow-2xs text-[11.5px] font-medium leading-relaxed text-slate-800 whitespace-pre-wrap max-h-[260px] overflow-y-auto">
                  {activeMessageCamp.NotificationMessage || 'No specific feedback notes attached.'}
                </div>

                {/* Dialog Bottom Action: Edit Shortcut */}
                <div className="flex justify-end gap-2 pt-1 border-t border-rose-300/60">
                  <button
                    type="button"
                    onClick={() => setActiveMessageCamp(null)}
                    className="px-4 py-1.5 rounded-lg bg-[#4A4E58] hover:bg-black text-white text-[9.5px] font-voda font-bold uppercase transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                  {(() => {
                    const isModalCreator = Boolean(
                      activeEmail && (activeMessageCamp.CreatedBy || '').trim().toLowerCase() === activeEmail
                    );

                    return (
                      <button
                        type="button"
                        disabled={!isModalCreator}
                        onClick={() => isModalCreator && handleEditYourself(activeMessageCamp)}
                        title={isModalCreator ? "Proceed to Edit Campaign" : "Only the campaign creator can edit this campaign"}
                        className={`px-4 py-1.5 rounded-lg text-[9.5px] font-voda font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-2xs transition-all ${
                          isModalCreator
                            ? 'bg-[#FBBF24] hover:bg-[#F59E0B] text-slate-900 cursor-pointer active:scale-95'
                            : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Proceed to Edit Campaign</span>
                      </button>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default NotifiedCampaignsGallery;