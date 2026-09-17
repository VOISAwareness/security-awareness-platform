import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import {
  Check,
  Calendar,
  Eye,
  Send,
  X,
  Play,
  HelpCircle,
  Award,
  ArrowLeft,
  Users,
  CheckCircle2
} from 'lucide-react';
import { CAMPAIGN_STEPS } from './ChooseAScenario';
import scenariosJsonData from '../Scenarios/ScenariosData.json';
import userDLsJson from '../UserDLs/UserDLsData.json';
import masterUsersData from '../../MasterUserData.json';
import initialLandingCatalogues from '../LandingPageCatalogue/LandingPageCatalogues.json';
import trainingPathsJson from '../Training/TrainingPath.json';
import trainingVideosJson from '../Training/TrainingVideos.json';
import trainingQuizJson from '../Training/TrainingQuiz.json';
import trainingCertificateJson from '../Training/TrainingCertificate.json';
import gamificationCardLogo from '../../assets/GamificationCardLogoStartNewCamapignScreen.png';

// =========================================================================
// 🎛️ SCALE & THEME CONSTANTS (STRICTLY PRESERVED & MATCHED TO CAMPAIGN EMAIL)
// =========================================================================
const VarStartCampaignScale = 0.93;
const VarOverallRoundednessScale = 0.5;

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
  
  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Montserrat', sans-serif;
    font-weight: 900;
  }
  .font-mono-tech {
    font-family: 'JetBrains Mono', monospace;
  }
  .rounded-3xl { border-radius: ${Math.round(28 * VarOverallRoundednessScale)}px !important; }
  .rounded-2xl { border-radius: ${Math.round(20 * VarOverallRoundednessScale)}px !important; }
  .rounded-xl  { border-radius: ${Math.round(14 * VarOverallRoundednessScale)}px !important; }
  .rounded-lg  { border-radius: ${Math.round(10 * VarOverallRoundednessScale)}px !important; }
  .rounded-md  { border-radius: ${Math.round(6 * VarOverallRoundednessScale)}px !important; }

  /* Custom Slim Light Scrollbar */
  .custom-light-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #CBD5E1 transparent;
  }
  .custom-light-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .custom-light-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-light-scrollbar::-webkit-scrollbar-thumb {
    background-color: #CBD5E1;
    border-radius: 9999px;
  }
  .custom-light-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: #94A3B8;
  }
  .dark .custom-light-scrollbar {
    scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
  }
  .dark .custom-light-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.25);
  }
`;

const CURRENT_STEP_NUMBER = 6; // Step 6: Review & Publish

const ReviewAndPublishCampaign = () => {
  const navigate = useNavigate();
  const userContext = useUserType?.() || {};
  const containerRef = useRef(null);

  // Theme check
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || !!userContext.isDark;
    }
    return !!userContext.isDark;
  });

  useEffect(() => {
    if (typeof userContext.isDark === 'boolean') {
      setIsDark(userContext.isDark);
    }
  }, [userContext.isDark]);

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

  // Read saved draft from previous steps
  const [draft] = useState(() => {
    try {
      const stored = localStorage.getItem('voisshield_active_campaign_draft');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Base background for L-shapes
  const lCardBg = isDark ? '#1C1E24' : '#F1F5F7';

  // Scenario fallback data
  const matchedScenario = (scenariosJsonData?.scenarios || []).find(
    (s) => s.scenarioId === draft.scenarioId
  ) || scenariosJsonData?.scenarios?.[0] || {};

  // Selected values
  const scenarioId = draft.scenarioId || matchedScenario?.scenarioId || 'SC-001';
  const scenarioName = draft.scenarioName || matchedScenario?.scenarioName || 'Immediate Password Verification Required';
  const campaignTitle = draft.campaignTitle || scenarioName || 'Major Campaign August 26';
  const campaignDescription = draft.campaignDescription || matchedScenario?.description || 'HR Pulse engagement check impersonating the internal VOIS Spirit Team inviting staff to participate in quarterly workplace sentiment evaluations.';

  // Date Settings
  const formatDateTime = (dtStr, fallback) => {
    if (!dtStr) return fallback;
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return dtStr;
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${mm}/${dd}/${yyyy} ${hours}:${minutes} ${ampm}`;
    } catch {
      return fallback;
    }
  };

  const startTimeDisplay = formatDateTime(draft.startTime, '09/08/2026 2:00 PM');
  const endTimeDisplay = formatDateTime(draft.endTime, '09/15/2026 2:00 PM');
  const autoEndPostSending = draft.autoEndPostSending ?? true;

  // Sender & Email
  const senderName = draft.senderName || matchedScenario?.senderName || 'Vodafone Password Notification';
  const senderEmailId = draft.senderEmailId || matchedScenario?.senderEmailId || 'no-reply.vodafonepasswordnotification.com';
  const emailSubject = draft.emailSubject || matchedScenario?.emailSubject || '@UserName, your Vodafone account password has expired';
  const emailBody = draft.emailBody || matchedScenario?.emailBody || '<p>Dear Employee, please verify your credentials immediately to prevent mailbox disruption.</p>';

  // Recipient List
  const allAvailableLists = [
    ...(userDLsJson?.savedUserLists || []).map((l) => ({
      id: l.id,
      name: l.name,
      subText: l.dlId || l.description || '',
      type: l.type || 'Bulk Upload',
      totalUsers: l.totalUsers !== undefined ? l.totalUsers : (l.users ? l.users.length : 0),
      hookRate: l.aggregatedHookRate || '0%',
      reportRate: l.aggregatedReportRate || '0%',
      users: l.users || []
    })),
    ...(userDLsJson?.syncedDistributionLists || []).map((l) => ({
      id: l.dlId,
      name: l.dlName,
      subText: l.dlId || l.description || '',
      type: 'Distribution List',
      totalUsers: l.totalUsers !== undefined ? l.totalUsers : (l.members ? l.members.length : 0),
      hookRate: l.aggregatedHookRate || '0%',
      reportRate: l.aggregatedReportRate || '0%',
      users: l.members || []
    }))
  ];

  const activeUserList = draft.loadedData ||
    allAvailableLists.find((l) => l.id === draft.selectedListId) ||
    allAvailableLists[0] || {
      id: 'ul-001',
      name: 'VOIS Egypt & India Core Delivery DL',
      subText: 'dl-phishingcampaignvoisshield@vodafone.com',
      type: 'Distribution List',
      totalUsers: 1420,
      hookRate: '12%',
      reportRate: '68%',
      users: []
    };

  // Landing Page
  const landingCatalogues = (() => {
    try {
      const stored = localStorage.getItem('voisshield_landing_pages');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return initialLandingCatalogues?.landingPages || [];
    } catch {
      return initialLandingCatalogues?.landingPages || [];
    }
  })();

  const landingPageId = draft.landingPageId || matchedScenario?.landingPageId || 'LP-001';
  const matchedLanding = landingCatalogues.find(
    (c) => (c.LandingPageID || c.landingPageId || c.id) === landingPageId
  ) || landingCatalogues[0] || {};
  const landingPageName = draft.landingPageName || matchedLanding.LandingPageName || 'Blue Security Alert Landing Page';
  const landingPageContent = draft.landingPageContent || matchedLanding.LandingPageContent || '<div style="padding: 40px; text-align: center;"><h2>Phishing Intercept</h2><p>This is a simulated phishing campaign test.</p></div>';

  // Training Path
  const trainingId = draft.trainingId || matchedScenario?.trainingId || 'TP-00001';
  const matchedPath = trainingPathsJson.find((p) => p.TrainingPathID === trainingId) || trainingPathsJson[0];
  const trainingPathName = draft.trainingPathName || matchedPath?.TrainingPathName || 'Anti-Phishing & Social Engineering Remediation Path';

  const resolvedTraining = (() => {
    const videos = (matchedPath?.TrainingVideoAttached || []).map(
      (vId) => trainingVideosJson.find((v) => v.TrainingVideoID === vId)
    ).filter(Boolean);

    const quiz = trainingQuizJson.find(
      (q) => q.TrainingQuizID === (matchedPath?.TrainingQuizAttached?.[0] || 'TQ-00001')
    ) || trainingQuizJson[0];

    const certificate = trainingCertificateJson.find(
      (c) => c.TrainingCertificateID === (matchedPath?.TrainingCertificateAttached?.[0] || 'TC-00001')
    ) || trainingCertificateJson[0];

    const questionCount = quiz?.QuizData ? Object.keys(quiz.QuizData).length : 10;
    const passingScore = quiz?.TrainingCompletionThreshold || 80;

    return {
      videoCount: videos.length || 2,
      questionCount,
      passingScore,
      certificateCount: certificate ? 1 : 1
    };
  })();

  // Modals
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLandingModal, setShowLandingModal] = useState(false);
  const [showUserListModal, setShowUserListModal] = useState(false);
  const [publishSuccessModal, setPublishSuccessModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Stepper list
  const stepsList = CAMPAIGN_STEPS || [
    { id: 'scenario', step: 1, titleLine1: 'Choose A', titleLine2: 'Scenario', path: '/start-campaign' },
    { id: 'details', step: 2, titleLine1: 'Details &', titleLine2: 'Settings', path: '/start-campaign/details' },
    { id: 'email', step: 3, titleLine1: 'Campaign', titleLine2: 'Email', path: '/start-campaign/email' },
    { id: 'landing', step: 4, titleLine1: 'Landing', titleLine2: 'Page', path: '/start-campaign/landing-page' },
    { id: 'training', step: 5, titleLine1: 'Add Training', titleLine2: 'Path', path: '/start-campaign/training' },
    { id: 'review', step: 6, titleLine1: 'Review &', titleLine2: 'Publish', path: '/start-campaign/review' }
  ];

  // Publish Action
  const handlePublishCampaign = () => {
    setIsPublishing(true);
    setTimeout(() => {
      try {
        const publishedCampaigns = JSON.parse(localStorage.getItem('voisshield_published_campaigns') || '[]');
        const newCampaign = {
          ...draft,
          campaignId: `CAMP-${Date.now().toString().slice(-5)}`,
          publishedAt: new Date().toISOString(),
          status: 'Active',
          stats: {
            sent: activeUserList.totalUsers || 100,
            opened: 0,
            clicked: 0,
            compromised: 0,
            reported: 0
          }
        };
        publishedCampaigns.unshift(newCampaign);
        localStorage.setItem('voisshield_published_campaigns', JSON.stringify(publishedCampaigns));
      } catch (e) {
        console.error(e);
      }
      setIsPublishing(false);
      setPublishSuccessModal(true);
    }, 600);
  };

  // Renderable landing page preview HTML
  const getRenderablePreviewHtml = () => {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>* { box-sizing: border-box; } html, body { margin: 0; padding: 0; width: 100%; min-height: 100vh; font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; }</style></head><body>${
      (landingPageContent || '')
        .replace(/{{userName}}/g, draft.userName || 'Abhay H S')
        .replace(/{{userEmailID}}/g, 'abhay.hs1@vodafone.com')
        .replace(/{{department}}/g, 'AI & Data Analytics')
        .replace(/{{phishLink}}/g, '#training')
    }</body></html>`;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: VODAFONE_FONT_STYLE }} />

      {/* Screen Shell */}
      <div
        ref={containerRef}
        style={{ zoom: VarStartCampaignScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 h-[calc(109vh)] overflow-hidden"
      >
        {/* ========================================================================= */}
        {/* ── 1. TOP HEADER BAR: "Start New Campaign" (MATCHED EXACTLY)              */}
        {/* ========================================================================= */}
        <div
          className={`w-full py-2.5 px-6 -mt-2 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm select-none ${
            isDark ? 'bg-[#ffffff] text-white border-white/10' : 'bg-[#000000] text-white border-black/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] font-voda font-bold tracking-tight text-white dark:text-black uppercase">
              Start New Campaign
            </h1>
          </div>
          <div className="text-[13px] font-voda font-bold text-white/85 dark:text-black/85">
            -- Start a new campaign
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 2. MAIN CONTAINER WITH DOCKED STEPPER STRIP & FIXED FOOTER             */}
        {/* ========================================================================= */}
        <div
          className={`w-full flex-1 min-h-0 rounded-2xl border flex flex-col justify-between overflow-hidden shadow-xs relative ${
            isDark ? 'bg-[#0F1015] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          {/* ── DOCKED CONTINUOUS STEPPER STRIP ── */}
          <div
            className={`w-full h-12 flex items-stretch flex-shrink-0 select-none pointer-events-none cursor-default ${
              isDark ? 'border-white/10 bg-[#12141A]' : 'border-slate-200/90 bg-white'
            }`}
          >
            {stepsList.map((step) => {
              const isCompleted = step.step < CURRENT_STEP_NUMBER;
              const isCurrent = step.step === CURRENT_STEP_NUMBER;
              const isFilled = step.step <= CURRENT_STEP_NUMBER;

              return (
                <div
                  key={step.id}
                  className={`flex-1 flex items-center justify-center gap-2.5 px-4 h-full transition-colors duration-200 select-none ${
                    isFilled ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-transparent'
                  }`}
                >
                  {/* Step Icon */}
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-[#8ED973] dark:bg-[#74D054] text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-black text-black dark:text-white font-bold flex items-center justify-center text-[11px] flex-shrink-0 shadow-2xs">
                      {step.step}
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                        isDark ? 'bg-white text-black' : 'bg-black text-white'
                      }`}
                    >
                      {step.step}
                    </div>
                  )}

                  {/* Step Label */}
                  <div
                    className={`flex flex-col text-left leading-tight text-[11.5px] font-bold ${
                      isCompleted
                        ? 'text-[#8ED973] dark:text-[#74D054]'
                        : isCurrent
                        ? 'text-white dark:text-black'
                        : isDark
                        ? 'text-white opacity-85'
                        : 'text-slate-900 opacity-85'
                    }`}
                  >
                    <span>{step.titleLine1}</span>
                    <span>{step.titleLine2}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* ── 3. WORKSPACE: STRICT 2x2 GRID (STANDARDIZED FONT HIERARCHY)           */}
          {/* ========================================================================= */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-light-scrollbar p-3.5 sm:p-4 flex flex-col">
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
              
              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* 🌟 ROW 1, COL 1: SCENARIO & CAMPAIGN DETAILS                   */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="relative flex flex-col min-h-[440px]">
                {/* 1. Isolated Soft Purple Capsule (#ECE8FF) */}
                <div
                  className={`absolute top-0 left-0 w-[164px] h-[122px] p-3 rounded-2xl flex flex-col justify-between shadow-xs z-20 ${
                    isDark ? 'bg-[#251C3D] text-purple-100' : 'bg-[#ECE8FF] text-slate-900'
                  }`}
                >
                  <div>
                    <h3 className="text-[14px] -mt-1 font-voda font-bold tracking-normal leading-tight">
                      Scenario &amp;<br />Campaign<br />Details
                    </h3>
                  </div>
                  <p className="text-[8.5px] font-medium leading-snug opacity-80 mt-1">
                    Chosen scenario and campaign details filled are displayed here
                  </p>
                </div>

                {/* 2. Inner Arc Fillet */}
                <div className="absolute top-[114px] left-[154px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
                  </svg>
                </div>

                {/* 3. Top-Right Arm of L-Shape Container */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-[calc(100%-170px)] ml-auto h-[129px] rounded-t-xl px-4 py-2 flex flex-col justify-center gap-1.5 z-10 -ml-2"
                >
                  <label className="text-[12.5px] mb-1 font-bold text-slate-900 dark:text-white leading-none">
                    Scenario
                  </label>
                  <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400">
                    Scenario ID
                  </span>
                  <div
                    className={`w-full h-7 px-2.5 rounded-xl flex items-center shadow-2xs text-[10.5px] font-mono-tech font-bold ${
                      isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                    }`}
                  >
                    {scenarioId}
                  </div>
                </div>

                {/* 4. Continuous Bottom Base */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-full flex-1 rounded-tl-xl rounded-b-lg p-3 sm:p-4 flex flex-col justify-between gap-2.5 z-10"
                >
                  {/* Scenario Name */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[12px] font-bold text-slate-900 dark:text-white">
                      Scenario Name
                    </label>
                    <div
                      className={`w-full min-h-[34px] px-3 py-1.5 rounded-xl flex items-center shadow-2xs text-[10.5px] font-medium leading-snug ${
                        isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                      }`}
                    >
                      {scenarioName}
                    </div>
                  </div>

                  {/* Campaign Details Header & Title */}
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[12.5px] font-voda font-bold text-slate-900 dark:text-white mt-0.5">
                      Campaign Details
                    </h4>
                    <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300">
                      Campaign Title
                    </label>
                    <div
                      className={`w-full min-h-[32px] px-3 py-1.5 rounded-xl flex items-center shadow-2xs text-[10.5px] font-medium ${
                        isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                      }`}
                    >
                      {campaignTitle}
                    </div>
                  </div>

                  {/* Campaign Description */}
                  <div className="flex flex-col gap-1 flex-1 min-h-0">
                    <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300">
                      Campaign Description
                    </label>
                    <div
                      className={`w-full flex-1 min-h-[85px] p-2.5 rounded-xl shadow-2xs text-[10px] font-medium leading-relaxed overflow-y-auto custom-light-scrollbar ${
                        isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                      }`}
                    >
                      {campaignDescription}
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* 🌟 ROW 1, COL 2: DATE & GAMIFICATION SETTINGS                 */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="relative flex flex-col min-h-[440px]">
                {/* 1. Isolated Soft Pink/Lilac Capsule */}
                <div
                  className={`absolute top-0 left-0 w-[164px] h-[122px] p-3 rounded-2xl flex flex-col justify-between shadow-xs z-20 ${
                    isDark ? 'bg-[#3D1E3A] text-pink-100' : 'bg-[#F4D6F4] text-slate-900'
                  }`}
                >
                  <div>
                    <h3 className="text-[14px] -mt-1 font-voda font-bold tracking-normal leading-tight">
                      Date &amp;<br />Gamification<br />Settings
                    </h3>
                  </div>
                  <p className="text-[8.5px] font-medium leading-snug opacity-80 mt-1">
                    Campaign's start and end date along with Gamification points has been displayed here
                  </p>
                </div>

                {/* 2. Inner Arc Fillet */}
                <div className="absolute top-[114px] left-[154px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
                  </svg>
                </div>

                {/* 3. Top-Right Arm of L-Shape Container */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-[calc(100%-170px)] ml-auto h-[129px] rounded-t-xl px-4 py-2 flex flex-col justify-center gap-1.5 z-10 -ml-2"
                >
                  <label className="text-[12.5px] mb-1 font-bold text-slate-900 dark:text-white leading-none">
                    Date &amp; Time Settings
                  </label>
                  <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400">
                    Start Time
                  </span>
                  <div
                    className={`w-full h-7 px-3 rounded-xl flex items-center justify-between shadow-2xs text-[10.5px] font-medium ${
                      isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                    }`}
                  >
                    <span className="truncate pr-1">{startTimeDisplay}</span>
                    <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  </div>
                </div>

                {/* 4. Continuous Bottom Base */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-full flex-1 rounded-tl-xl rounded-b-lg p-3 sm:p-4 flex flex-col justify-between gap-2.5 z-10"
                >
                  {/* End Time */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300">
                      End Time
                    </span>
                    <div
                      className={`w-full h-7 px-3 rounded-xl flex items-center justify-between shadow-2xs text-[10.5px] font-medium ${
                        isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                      }`}
                    >
                      <span className="truncate pr-1">{endTimeDisplay}</span>
                      <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    </div>

                    {/* Auto End Checkbox Display */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <div className="w-3.5 h-3.5 rounded bg-slate-300 dark:bg-white/20 flex items-center justify-center flex-shrink-0">
                        {autoEndPostSending && <Check className="w-2.5 h-2.5 text-black dark:text-white stroke-[3]" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                        Auto End post sending out all emails
                      </span>
                    </div>
                  </div>

                  {/* Gamification Points 3D Card */}
                  <div
                    className="relative w-full rounded-2xl p-3.5 text-white overflow-hidden shadow-xs flex flex-col justify-between select-none min-h-[195px] flex-1"
                    style={{
                      background: 'linear-gradient(135deg, #7E87C8 0%, #A294D8 50%, #C9A9E8 100%)'
                    }}
                  >
                    <div>
                      <h4 className="text-[13.5px] font-voda font-bold tracking-tight leading-tight">
                        Gamification<br />Points
                      </h4>
                    </div>

                    {/* Points Pills 2x3 Grid */}
                    <div className="grid grid-cols-2 gap-x-2.5 gap-y-2 w-full max-w-[70%] z-10 my-1">
                      <span className="px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-xs text-white text-[9.5px] font-bold text-center shadow-2xs">
                        Opened: 0
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-xs text-white text-[9.5px] font-bold text-center shadow-2xs">
                        Clicked: -30
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-xs text-white text-[9.5px] font-bold text-center shadow-2xs">
                        Compromised: 0
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-xs text-white text-[9.5px] font-bold text-center shadow-2xs">
                        Reported: -30
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-xs text-white text-[9.5px] font-bold text-center shadow-2xs">
                        Trained: 0
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-white/25 backdrop-blur-xs text-white text-[9.5px] font-bold text-center shadow-2xs">
                        Evaluated: -30
                      </span>
                    </div>

                    {/* 3D Asset pinned in bottom right */}
                    <div className="absolute -right-[3%] -bottom-[4%] w-[125px] h-[120px] pointer-events-none select-none flex items-center justify-center z-0">
                      <img
                        src={gamificationCardLogo || '/assets/GamificationCardLogoStartNewCamapignScreen.png'}
                        alt="Gamification Controller"
                        className="w-full h-full object-contain filter drop-shadow-md"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* 🌟 ROW 2, COL 1: EMAIL ID & RECIPIENT LIST                     */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="relative flex flex-col h-full min-h-[440px]">
                {/* 1. Isolated Black Capsule */}
                <div
                  className={`absolute top-0 left-0 w-[164px] h-[122px] p-3 rounded-2xl flex flex-col justify-between shadow-xs z-20 ${
                    isDark ? 'bg-white text-black' : 'bg-black text-white'
                  }`}
                >
                  <div>
                    <h3 className="text-[14px] -mt-1 font-voda font-bold tracking-normal leading-tight">
                      Email ID &amp;<br />Recipient<br />List
                    </h3>
                  </div>
                  <p className="text-[8.5px] font-medium leading-snug opacity-80 mt-1">
                    Phishing Email ID details and Recipient List has been displayed here
                  </p>
                </div>

                {/* 2. Inner Arc Fillet */}
                <div className="absolute top-[114px] left-[154px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
                  </svg>
                </div>

                {/* 3. Top-Right Arm of L-Shape Container */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-[calc(100%-170px)] ml-auto h-[129px] rounded-t-xl px-4 py-2 flex flex-col justify-center gap-1.5 z-10 -ml-2"
                >
                  <label className="text-[12.5px] mb-1 font-bold text-slate-900 dark:text-white leading-none">
                    Sender Details
                  </label>
                  <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400">
                    Sender Name
                  </span>
                  <div
                    className={`w-full h-7 px-3 rounded-xl flex items-center shadow-2xs text-[10.5px] font-medium truncate ${
                      isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                    }`}
                  >
                    {senderName}
                  </div>
                </div>

                {/* 4. Continuous Bottom Base */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-full flex-1 rounded-tl-xl rounded-b-lg p-3 sm:p-4 flex flex-col justify-between gap-2.5 z-10"
                >
                  {/* Sender Email ID */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[12px] font-bold text-slate-900 dark:text-white">
                      Sender Email ID
                    </label>
                    <div
                      className={`w-full h-7 px-3 rounded-xl flex items-center shadow-2xs text-[10.5px] font-mono-tech truncate ${
                        isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                      }`}
                    >
                      {senderEmailId}
                    </div>
                  </div>

                  {/* Email Subject */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[12px] font-bold text-slate-900 dark:text-white">
                      Email Subject
                    </label>
                    <div
                      className={`w-full min-h-[46px] px-3 py-2 rounded-xl flex items-start shadow-2xs text-[10.5px] font-medium leading-snug line-clamp-2 ${
                        isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                      }`}
                    >
                      {emailSubject}
                    </div>
                  </div>

                  {/* Email Body Interactive Preview Bar */}
                  <div
                    onClick={() => setShowEmailModal(true)}
                    className="w-full h-9 px-3 rounded-xl bg-black dark:bg-[#121418] text-white flex items-center justify-between cursor-pointer hover:bg-black/90 active:scale-[0.99] transition-all shadow-xs"
                    title="Click to view rendered email payload"
                  >
                    <div className="flex flex-col text-left leading-tight">
                      <span className="text-[10px] font-bold">Email Body</span>
                      <span className="text-[8px] text-white/70">Click here to view full email body</span>
                    </div>
                    <Eye className="w-3.5 h-3.5 text-white/80" />
                  </div>

                  {/* Recipient List Box */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] font-bold text-slate-900 dark:text-white">
                        Recipient List
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowUserListModal(true)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black hover:bg-black/80 text-white text-[8.5px] font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <span>View Full List</span>
                        <Eye className="w-2.5 h-2.5" />
                      </button>
                    </div>

                    <div
                      className={`w-full p-2.5 rounded-xl shadow-2xs flex flex-col justify-between gap-1.5 ${
                        isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                      }`}
                    >
                      <div>
                        <h5 className="text-[10.5px] font-bold leading-tight truncate">
                          {activeUserList.name}
                        </h5>
                        <p className="text-[8.5px] font-mono-tech text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {activeUserList.subText || activeUserList.id}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5">
                        <span className="text-[8.5px] font-mono-tech font-bold text-slate-500 dark:text-slate-400">
                          {activeUserList.id}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                          <span className="text-[8.5px] font-medium text-slate-700 dark:text-slate-300">
                            {activeUserList.type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* 🌟 ROW 2, COL 2: LANDING PAGE & TRAINING PATH (WHITE UNDERLAYS)*/}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="relative flex flex-col min-h-[440px]">
                {/* 1. Isolated Soft Rose Capsule (#FFE2E5) */}
                <div
                  className={`absolute top-0 left-0 w-[164px] h-[122px] p-3 rounded-2xl flex flex-col justify-between shadow-xs z-20 ${
                    isDark ? 'bg-[#3B1C24] text-rose-100' : 'bg-[#FFE2E5] text-slate-900'
                  }`}
                >
                  <div>
                    <h3 className="text-[14px] -mt-1 font-voda font-bold tracking-normal leading-tight">
                      Landing Page<br />&amp; Training<br />Path
                    </h3>
                  </div>
                  <p className="text-[8.5px] font-medium leading-snug opacity-80 mt-1">
                    Post phishing User Landing Page and Training Path has been displayed here
                  </p>
                </div>

                {/* 2. Inner Arc Fillet */}
                <div className="absolute top-[114px] left-[154px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
                  </svg>
                </div>

                {/* 3. Top-Right Arm of L-Shape Container */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-[calc(100%-170px)] ml-auto h-[129px] rounded-t-xl px-3 py-1.5 flex flex-col justify-center gap-1 z-10 -ml-2"
                >
                  <label className="text-[12.5px] mb-1 font-bold text-slate-900 dark:text-white leading-none">
                    Landing Page
                  </label>
                  {/* White Underlay for Landing Page Section */}
                  <div
                    className={`w-full p-2.5 rounded-2xl shadow-2xs flex flex-col gap-1 transition-colors ${
                      isDark ? 'bg-[#15161A] text-white border border-white/10' : 'bg-white text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#16A34A] flex-shrink-0" />
                      <span className="text-[10.5px] font-mono-tech font-bold text-slate-900 dark:text-white">
                        {landingPageId}
                      </span>
                    </div>
                    <span className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-tight">
                      Click here to view Landing Page in full screen
                    </span>
                    <div className="flex justify-end pt-0.5">
                      <button
                        type="button"
                        onClick={() => setShowLandingModal(true)}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFE4E6] text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-[8.5px] font-bold cursor-pointer hover:bg-rose-200 transition-colors shadow-2xs"
                      >
                        <span>Full Screen View</span>
                        <Eye className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Continuous Bottom Base: Training Path Detailed Card */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-full flex-1 rounded-tl-xl rounded-b-lg p-3 sm:p-4 flex flex-col justify-between gap-2 z-10"
                >
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[12.5px] font-voda font-bold text-slate-900 dark:text-white">
                      Training Path
                    </h4>
                    {/* White Underlay for Training Path Section */}
                    <div
                      className={`w-full p-3.5 rounded-2xl shadow-2xs flex flex-col gap-2 transition-colors ${
                        isDark ? 'bg-[#15161A] text-white border border-white/10' : 'bg-white text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#16A34A] flex-shrink-0" />
                        <span className="text-[11px] font-mono-tech font-bold text-slate-900 dark:text-white">
                          {trainingId}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2">
                        {trainingPathName}
                      </p>

                      {/* Modules Breakdown List */}
                      <div className="flex flex-col gap-2.5 pt-1">
                        {/* Item 1: Videos */}
                        <div className="flex items-center gap-2.5">
                          <Play className="w-3.5 h-3.5 fill-black dark:fill-white text-black dark:text-white flex-shrink-0" />
                          <div className="flex flex-col text-left leading-tight">
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white">
                              {resolvedTraining.videoCount} Videos
                            </span>
                            <span className="text-[8.5px] text-slate-500 dark:text-slate-400">
                              Total Duration: 10 seconds
                            </span>
                          </div>
                        </div>

                        {/* Item 2: Quiz */}
                        <div className="flex items-center gap-2.5">
                          <HelpCircle className="w-3.5 h-3.5 text-black dark:text-white flex-shrink-0" />
                          <div className="flex flex-col text-left leading-tight">
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white">
                              1 Quiz
                            </span>
                            <span className="text-[8.5px] text-slate-500 dark:text-slate-400">
                              Total Questions: {resolvedTraining.questionCount}
                            </span>
                          </div>
                        </div>

                        {/* Item 3: Certificate */}
                        <div className="flex items-center gap-2.5">
                          <Award className="w-3.5 h-3.5 text-black dark:text-white flex-shrink-0" />
                          <div className="flex flex-col text-left leading-tight">
                            <span className="text-[10px] font-bold text-slate-900 dark:text-white">
                              1 Certificate
                            </span>
                            <span className="text-[8.5px] text-slate-500 dark:text-slate-400">
                              Passing score : {resolvedTraining.passingScore} %
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-0.5" />
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* ── 4. PERMANENT STICKY DOCKED FOOTER                                     */}
          {/* ========================================================================= */}
          <div
            className={`w-full px-5 py-2.5 border-t flex items-center justify-end gap-2.5 flex-shrink-0 z-30 transition-colors shadow-xs ${
              isDark ? 'bg-[#0F1015] border-white/10' : 'bg-white border-slate-100'
            }`}
          >
            <button
              type="button"
              onClick={() => navigate('/start-campaign/training')}
              className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center tracking-wider"
            >
              BACK
            </button>
            <button
              type="button"
              disabled={isPublishing}
              onClick={handlePublishCampaign}
              className="px-5 h-[24px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3 h-3 stroke-[2.5]" />
              <span>{isPublishing ? 'PUBLISHING...' : 'PUBLISH CAMPAIGN'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 MODAL 1: SIMULATED EMAIL BODY PREVIEW                               */}
        {/* ========================================================================= */}
        {showEmailModal &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[2147483646] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="w-full max-w-2xl bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden shadow-2xl border border-white/20 flex flex-col">
                <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-[#121418]">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Simulated Email Payload Preview
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto max-h-[60vh] bg-slate-50 dark:bg-black/50 text-left">
                  <div
                    className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 text-slate-900"
                    dangerouslySetInnerHTML={{
                      __html: (emailBody || '')
                        .replace(/{{userName}}/g, 'Abhay H S')
                        .replace(/{{userEmailID}}/g, 'abhay.hs1@vodafone.com')
                        .replace(/{{department}}/g, 'AI & Data Analytics')
                        .replace(/{{phishLink}}/g, '#training')
                    }}
                  />
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* ── 🌟 MODAL 2: FULLSCREEN LIVE LANDING PAGE PREVIEW                       */}
        {/* ========================================================================= */}
        {showLandingModal &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              id="review-landing-page-fullscreen-viewport"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2147483647,
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                margin: 0,
                padding: 0,
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 2147483647 }}>
                <button
                  type="button"
                  onClick={() => setShowLandingModal(false)}
                  className="px-4 py-2 rounded-xl bg-black hover:bg-black/80 text-white font-voda font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-2xl hover:scale-105 active:scale-95 transition-all border border-white/30"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                  Go Back
                </button>
              </div>

              <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 2147483647 }}>
                <button
                  type="button"
                  onClick={() => setShowLandingModal(false)}
                  className="p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md border border-white/20 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              <iframe
                title="Full Screen Live Landing Page"
                srcDoc={getRenderablePreviewHtml()}
                style={{
                  width: '100vw',
                  height: '100vh',
                  border: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'block',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* ── 🌟 MODAL 3: RECIPIENT LIST AUDIENCE DETAILS MODAL                      */}
        {/* ========================================================================= */}
        {showUserListModal &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[2147483646] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="w-full max-w-2xl bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden shadow-2xl border border-white/15 flex flex-col">
                <div className="px-5 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-[#121418]">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#E60000]" />
                    <span className="text-xs font-voda font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Audience List: {activeUserList.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUserListModal(false)}
                    className="p-1 rounded-lg text-slate-500 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 flex flex-col gap-4 text-left">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="py-2.5 px-2 rounded-xl bg-[#FFD6DE] dark:bg-[#2E181D] text-slate-900 dark:text-rose-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-semibold opacity-85">Total Recipients</span>
                      <span className="text-[20px] font-voda font-bold mt-0.5">{activeUserList.totalUsers}</span>
                    </div>
                    <div className="py-2.5 px-2 rounded-xl bg-[#FFD6DE] dark:bg-[#2E181D] text-slate-900 dark:text-rose-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-semibold opacity-85">Aggregated Hook Rate</span>
                      <span className="text-[20px] font-voda font-bold mt-0.5">{activeUserList.hookRate}</span>
                    </div>
                    <div className="py-2.5 px-2 rounded-xl bg-[#FFD6DE] dark:bg-[#2E181D] text-slate-900 dark:text-rose-100 flex flex-col items-center justify-center text-center">
                      <span className="text-[9px] font-semibold opacity-85">Aggregated Report Rate</span>
                      <span className="text-[20px] font-voda font-bold mt-0.5">{activeUserList.reportRate}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Distribution Identifier</span>
                    <span className="text-[11px] font-mono-tech font-bold text-slate-900 dark:text-white">{activeUserList.subText || activeUserList.id}</span>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* ── 🌟 MODAL 4: PUBLISH SUCCESS CONFIRMATION                               */}
        {/* ========================================================================= */}
        {publishSuccessModal &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[2147483647] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="w-full max-w-md bg-white dark:bg-[#181A20] rounded-3xl p-6 text-center flex flex-col items-center gap-4 shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-voda font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Campaign Launched!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    Your phishing simulation campaign <strong>"{campaignTitle}"</strong> has been successfully scheduled and published.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('voisshield_active_campaign_draft');
                    navigate('/start-campaign');
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-xs uppercase tracking-wider shadow-md transition-all cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>,
            document.body
          )}
      </div>
    </>
  );
};

export default ReviewAndPublishCampaign;