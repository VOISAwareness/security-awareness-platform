import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import {
  ExternalLink,
  ArrowRight,
  Eye,
  X
} from 'lucide-react';
import scenariosJsonData from '../Scenarios/ScenariosData.json';
import chooseAScenarioStartFresh from '../../assets/ChooseAScenarioStartFresh.png';

// =========================================================================
// 🎛️ SCALE & THEME CONSTANTS (STRICTLY PRESERVED)
// =========================================================================
const VarStartCampaignScale = 0.94;
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
`;

export const CAMPAIGN_STEPS = [
  { id: 'scenario', step: 1, titleLine1: 'Choose A', titleLine2: 'Scenario', path: '/start-campaign' },
  { id: 'details', step: 2, titleLine1: 'Details &', titleLine2: 'Settings', path: '/start-campaign/details' },
  { id: 'email', step: 3, titleLine1: 'Campaign', titleLine2: 'Email', path: '/start-campaign/email' },
  { id: 'landing', step: 4, titleLine1: 'Landing', titleLine2: 'Page', path: '/start-campaign/landing-page' },
  { id: 'training', step: 5, titleLine1: 'Add Training', titleLine2: 'Path', path: '/start-campaign/training' },
  { id: 'review', step: 6, titleLine1: 'Review &', titleLine2: 'Publish', path: '/start-campaign/review' }
];

// Difficulty colors exact to canvas design
const DIFFICULTY_THEMES = {
  Low: {
    bgLight: '#CEFBEA',
    bgDark: '#0D271E',
    border: '#A8F5D8',
    borderDark: '#174A37',
    btnBg: 'bg-[#B6F5DC] hover:bg-[#A0EFCF] dark:bg-[#12382A]',
    btnBorder: 'border-[#73D8B0] dark:border-[#1F5C44]',
    btnText: 'text-slate-900 dark:text-emerald-100',
    diffTextColor: 'text-[#16A34A] dark:text-[#4ADE80]'
  },
  Medium: {
    bgLight: '#FFEFCE',
    bgDark: '#2E200C',
    border: '#FFE19C',
    borderDark: '#4A3414',
    btnBg: 'bg-[#FFE4AC] hover:bg-[#FEDC94] dark:bg-[#402D12]',
    btnBorder: 'border-[#F8C86A] dark:border-[#5C411A]',
    btnText: 'text-slate-900 dark:text-amber-100',
    diffTextColor: 'text-amber-600 dark:text-amber-400'
  },
  High: {
    bgLight: '#ECE8FF',
    bgDark: '#22193E',
    border: '#D8D0FF',
    borderDark: '#392C63',
    btnBg: 'bg-[#DDD5FF] hover:bg-[#CDC1FF] dark:bg-[#322359]',
    btnBorder: 'border-[#B8A7FF] dark:border-[#4B3B7A]',
    btnText: 'text-slate-900 dark:text-purple-100',
    diffTextColor: 'text-purple-600 dark:text-purple-400'
  }
};

// =========================================================================
// 🌐 DYNAMIC ASSET & AWS S3 BUCKET RESOLVER
// =========================================================================
const S3_BUCKET_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_S3_SCENARIOS_BUCKET_URL) || '';

const getScenarioImage = (coverImageId) => {
  if (!coverImageId) return '';

  if (coverImageId.startsWith('http://') || coverImageId.startsWith('https://')) {
    return coverImageId;
  }

  if (S3_BUCKET_BASE_URL) {
    const cleanBase = S3_BUCKET_BASE_URL.replace(/\/+$/, '');
    const cleanId = coverImageId.replace(/^\/+/, '');
    return `${cleanBase}/${cleanId}`;
  }

  try {
    return new URL(`../Scenarios/${coverImageId}`, import.meta.url).href;
  } catch (e) {
    return `/assets/Scenarios/${coverImageId}`;
  }
};

const ChooseAScenario = () => {
  const navigate = useNavigate();
  const userContext = useUserType?.() || {};

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

  // Read scenarios from ScenariosData.json & map CoverImageID dynamically
  const scenariosList = (scenariosJsonData?.scenarios || []).map((s, idx) => ({
    ...s,
    difficulty: s.difficulty || 'Medium',
    CreatedOn: s.CreatedOn || s.createdDate || '2-Jan-26',
    CoverImageID: s.CoverImageID || `CovImg-${String(idx + 1).padStart(3, '0')}.png`
  }));

  // Selected State
  const [selectedScenarioId, setSelectedScenarioId] = useState(() => {
    try {
      const draft = localStorage.getItem('voisshield_active_campaign_draft');
      return draft ? JSON.parse(draft)?.scenarioId || scenariosList[0]?.scenarioId : scenariosList[0]?.scenarioId;
    } catch {
      return scenariosList[0]?.scenarioId;
    }
  });

  const [detailModalItem, setDetailModalItem] = useState(null);
  const [previewEmailHtml, setPreviewEmailHtml] = useState(null);

  // Auto-fill campaign draft & navigate to step 2
  const handleUseScenario = (scenario) => {
    setSelectedScenarioId(scenario.scenarioId);

    try {
      const existingDraft = localStorage.getItem('voisshield_active_campaign_draft');
      const draftObj = existingDraft ? JSON.parse(existingDraft) : {};

      const updatedDraft = {
        ...draftObj,
        isStartFresh: false,
        scenarioId: scenario.scenarioId,
        scenarioName: scenario.scenarioName,
        campaignTitle: draftObj.campaignTitle || scenario.scenarioName,
        campaignDescription: draftObj.campaignDescription || scenario.description,
        campaignType: scenario.campaignType,
        targetAudience: scenario.targetAudience,
        difficulty: scenario.difficulty,
        motivator: scenario.motivator,
        senderEmailId: scenario.senderEmailId,
        senderName: scenario.senderName,
        emailSubject: scenario.emailSubject,
        emailBody: scenario.emailBody || '',
        landingPageId: scenario.landingPageId || 'LP-001',
        trainingId: scenario.trainingId || 'TP-001',
        CoverImageID: scenario.CoverImageID
      };

      localStorage.setItem('voisshield_active_campaign_draft', JSON.stringify(updatedDraft));
    } catch (e) {
      console.error(e);
    }

    if (detailModalItem) setDetailModalItem(null);
    navigate('/start-campaign/details');
  };

  // Start from scratch / Start Fresh (Blank canvas: clears all template defaults)
  const handleStartFresh = () => {
    setSelectedScenarioId('start-fresh');

    try {
      const existingDraft = localStorage.getItem('voisshield_active_campaign_draft');
      const draftObj = existingDraft ? JSON.parse(existingDraft) : {};

      const freshDraft = {
        ...draftObj,
        isStartFresh: true,
        scenarioId: 'start-fresh',
        scenarioName: 'Start Fresh',
        campaignTitle: '',
        campaignDescription: '',
        campaignType: 'Custom',
        targetAudience: 'All Employees',
        difficulty: 'Medium',
        motivator: '',
        senderEmailId: '',
        senderName: '',
        emailSubject: '',
        emailBody: '',
        landingPageId: '',
        trainingId: '',
        CoverImageID: ''
      };

      localStorage.setItem('voisshield_active_campaign_draft', JSON.stringify(freshDraft));
    } catch (e) {
      console.error(e);
    }

    navigate('/start-campaign/details');
  };

  const handleNextStep = () => {
    if (selectedScenarioId === 'start-fresh') {
      handleStartFresh();
      return;
    }
    const selected = scenariosList.find((s) => s.scenarioId === selectedScenarioId) || scenariosList[0];
    handleUseScenario(selected);
  };

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* Screen Shell */}
      <div
        style={{ zoom: VarStartCampaignScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 h-[calc(108vh-0px)] overflow-hidden"
      >
        {/* ========================================================================= */}
        {/* ── 1. TOP HEADER BAR: "Start New Campaign"                                */}
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
        {/* ── 2. MAIN CONTAINER WITH DOCKED STEPPER STRIP                            */}
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
            {CAMPAIGN_STEPS.map((step) => {
              const isCurrent = step.id === 'scenario';

              if (isCurrent) {
                return (
                  <div
                    key={step.id}
                    className="bg-black dark:bg-white text-white px-14 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm cursor-default"
                  >
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-black text-black dark:text-white font-black flex items-center justify-center text-[12px] flex-shrink-0">
                      {step.step}
                    </div>
                    <div className="flex flex-col text-white dark:text-black text-left leading-tight text-[11px] font-voda font-bold tracking-tight">
                      <span>{step.titleLine1}</span>
                      <span>{step.titleLine2}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={step.id}
                  className={`flex-1 flex items-center justify-center gap-2.5 px-3 py-3 cursor-default transition-opacity ${
                    isDark ? 'opacity-80 text-white' : 'opacity-85 text-black'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 ${
                      isDark ? 'bg-white text-black' : 'bg-black text-white'
                    }`}
                  >
                    {step.step}
                  </div>
                  <div className="flex flex-col text-left leading-tight text-[11px] font-bold">
                    <span>{step.titleLine1}</span>
                    <span>{step.titleLine2}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── 3. GALLERY CARDS: SQUARISH PROPORTIONS & RESOLVED COVER IMAGE ── */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-3 pr-3 mt-1 mb-3 items-start flex flex-wrap gap-4 content-start [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md">
            
            {/* 🌟 START FRESH CARD (FIRST IN THE GALLERY) */}
            <div
              onClick={() => setSelectedScenarioId('start-fresh')}
              className={`relative p-4 rounded-3xl border transition-all duration-150 cursor-pointer flex flex-col justify-between overflow-hidden select-none w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] lg:w-[calc(20%-13px)] min-w-[250px] max-w-[310px] h-[270px] shadow-2xs hover:shadow-md ${
                isDark 
                  ? 'bg-white text-black border-slate-200' 
                  : 'bg-black text-white border-black/20'
              } ${selectedScenarioId === 'start-fresh' ? 'ring-1 ring-[#e66565]' : ''}`}
            >
              {/* Top Bar: "No Template Needed" Badge with Green Dot */}
              <div className="flex items-center justify-between mb-1.5 z-10">
                <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[9px] font-bold shadow-2xs ${
                  isDark ? 'bg-black/95 text-white/90' : 'bg-white/95 text-black/90'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] inline-block flex-shrink-0" />
                  <span>No Template Needed</span>
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1.5 text-left z-10 max-w-[70%]">
                <h3 className="text-[15px] font-black leading-tight tracking-tight">
                  Start Complete<br />Fresh
                </h3>

                <p className={`text-[9.5px] font-medium line-clamp-8 leading-relaxed ${
                  isDark ? 'text-black/80' : 'text-white/80'
                }`}>
                  <strong className={isDark ? 'text-black' : 'text-white'}>Description: </strong>
                  Start with a completely blank canvas without predefined templates. Design custom phishing lures tailored to your exact security needs. Take full control over sender details, landing pages, and payloads.
                </p>
              </div>

              {/* Bottom Left "Let's Go ->" Button */}
              <div className="pt-2 z-10 flex items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartFresh();
                  }}
                  className={`px-3.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    isDark 
                      ? 'bg-black/95 hover:bg-black/90 text-white border-black/20' 
                      : 'bg-white/95 hover:bg-white/90 text-black border-white/20'
                  }`}
                >
                  <span>Let's Go</span>
                  <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                </button>
              </div>

              {/* 3D Asset: Attached to walls, cropped ~10% bottom & 10% right */}
              <div className="absolute -right-[5%] -bottom-[5%] w-[115px] h-[115px] pointer-events-none select-none flex items-center justify-center overflow-hidden">
                <img
                  src={chooseAScenarioStartFresh || '/assets/ChooseAScenarioStartFresh.png'}
                  alt="Start Fresh"
                  className="w-full h-full object-contain filter drop-shadow-md"
                  loading="eager"
                  onError={(e) => {
                    if (!e.currentTarget.dataset.retried) {
                      e.currentTarget.dataset.retried = 'true';
                      e.currentTarget.src = '/assets/ChooseAScenarioStartFresh.png';
                    }
                  }}
                />
              </div>
            </div>

            {/* SCENARIOS LIST */}
            {scenariosList.map((scenario) => {
              const theme = DIFFICULTY_THEMES[scenario.difficulty] || DIFFICULTY_THEMES.Low;
              const isSelected = selectedScenarioId === scenario.scenarioId;
              const resolvedImageSrc = getScenarioImage(scenario.CoverImageID);

              return (
                <div
                  key={scenario.scenarioId}
                  onClick={() => setSelectedScenarioId(scenario.scenarioId)}
                  style={{
                    backgroundColor: isDark ? theme.bgDark : theme.bgLight,
                    borderColor: isSelected ? '#e66565' : isDark ? theme.borderDark : theme.border
                  }}
                  className={`relative p-4 rounded-3xl border transition-all duration-150 cursor-pointer flex flex-col justify-between overflow-hidden select-none w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] lg:w-[calc(20%-13px)] min-w-[250px] max-w-[310px] h-[270px] shadow-2xs hover:shadow-md ${
                    isSelected ? 'ring-1 ring-[#e66565]' : ''
                  }`}
                >
                  {/* Top Bar: Pill Badge (Left) + Created on & Expand Button (Right) */}
                  <div className="flex items-center justify-between mb-1.5 z-10">
                    {/* ID Badge with red dot */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-white/90 dark:bg-black/60 shadow-2xs text-slate-900 dark:text-white">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                      <span>{scenario.scenarioId}</span>
                    </div>

                    {/* Created on & Expand Button */}
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      <span>Created on: {scenario.CreatedOn}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailModalItem(scenario);
                        }}
                        className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                        title="View Full Scenario Details"
                      >
                        <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Description & Type */}
                  <div className="flex flex-col gap-1.5 text-left z-10 max-w-[70%]">
                    <h3 className="text-[13.5px] font-black text-slate-950 dark:text-white leading-tight tracking-tight">
                      {scenario.scenarioName}
                    </h3>

                    <p className="text-[9.5px] text-slate-700 dark:text-slate-300 font-medium line-clamp-8 leading-relaxed">
                      <strong className="text-slate-900 dark:text-white">Description: </strong>
                      {scenario.description}
                    </p>

                    <div className="text-[9.5px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      Type: {scenario.campaignType}
                    </div>
                  </div>

                  {/* Bottom Left "Use This ->" Button */}
                  <div className="pt-2 z-10 flex items-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUseScenario(scenario);
                      }}
                      className={`px-3.5 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${theme.btnBg} ${theme.btnBorder} ${theme.btnText}`}
                    >
                      <span>Use This</span>
                      <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* ── 3D Asset: Attached to walls, cropped ~10% bottom & 10% right ── */}
                  <div className="absolute -right-[10%] -bottom-[10%] w-[135px] h-[135px] pointer-events-none select-none flex items-center justify-center overflow-hidden">
                    {resolvedImageSrc && (
                      <img
                        src={resolvedImageSrc}
                        alt={scenario.scenarioName}
                        className="w-full h-full object-contain filter drop-shadow-md"
                        loading="eager"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 FULL SCENARIO SPECIFICATIONS MODAL                                 */}
        {/* ========================================================================= */}
        {detailModalItem && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            {(() => {
              const modalTheme = DIFFICULTY_THEMES[detailModalItem.difficulty] || DIFFICULTY_THEMES.Low;
              const modalImgSrc = getScenarioImage(detailModalItem.CoverImageID);

              return (
                <div
                  style={{
                    backgroundColor: isDark ? modalTheme.bgDark : modalTheme.bgLight,
                    borderColor: isDark ? modalTheme.borderDark : modalTheme.border
                  }}
                  className="w-full max-w-3xl rounded-[18px] border-2 p-6 sm:p-7 relative overflow-hidden shadow-2xl flex flex-col gap-4 text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Top Bar: Pill Badge (Left) + Go Back Button (Right) */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/90 dark:bg-black/60 shadow-2xs text-slate-900 dark:text-white">
                      <span className="w-2 h-2 rounded-full bg-[#E60000]" />
                      <span>{detailModalItem.scenarioId}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailModalItem(null)}
                      className="px-4 py-1.5 rounded-xl bg-slate-500/80 hover:bg-slate-600 text-white font-bold text-xs uppercase cursor-pointer transition-colors"
                    >
                      Go Back
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                      {detailModalItem.scenarioName}
                    </h3>
                    <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>Description: </strong>
                      {detailModalItem.description}
                    </p>
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-300 mt-0.5">
                      Created on: {detailModalItem.CreatedOn}
                    </div>
                  </div>

                  <div className="w-full h-px bg-slate-400/30 dark:bg-white/10" />

                  {/* 2x2 Specifications Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-[12px] font-medium text-slate-800 dark:text-slate-200">
                    <div>
                      <strong>Campaign Type: </strong>
                      <span>{detailModalItem.campaignType}</span>
                    </div>
                    <div>
                      <strong>Motivator: </strong>
                      <span>{detailModalItem.motivator || 'Security / Urgency'}</span>
                    </div>
                    <div>
                      <strong>Target Audience: </strong>
                      <span>{detailModalItem.targetAudience}</span>
                    </div>
                    <div>
                      <strong>Difficulty: </strong>
                      <span className={`font-bold ${modalTheme.diffTextColor}`}>
                        {detailModalItem.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Email & Target Users Information Box */}
                  <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/40 border border-black/5 dark:border-white/10 flex flex-col gap-2 relative z-10">
                    <h4 className="text-[13px] font-bold underline text-slate-900 dark:text-white">
                      Email & Target Users Information
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-[11.5px] text-slate-700 dark:text-slate-300 font-medium">
                      <div>
                        <strong>Sender Email Id: </strong>
                        <span className="font-mono-tech">{detailModalItem.senderEmailId}</span>
                      </div>
                      <div>
                        <strong>Landing Page Id: </strong>
                        <span className="font-mono-tech">{detailModalItem.landingPageId || 'LP-001'}</span>
                      </div>
                      <div>
                        <strong>Sender Name: </strong>
                        <span>{detailModalItem.senderName}</span>
                      </div>
                      <div>
                        <strong>Training Id: </strong>
                        <span className="font-mono-tech">{detailModalItem.trainingId || 'TP-005'}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <strong>Email Subject: </strong>
                        <span>{detailModalItem.emailSubject}</span>
                      </div>
                    </div>

                    {/* Preview Email Body Button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewEmailHtml(detailModalItem.emailBody)}
                        className="px-3 py-1 rounded-lg bg-white/90 dark:bg-black/60 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/15 text-[10.5px] font-bold flex items-center gap-1.5 hover:bg-white shadow-2xs cursor-pointer"
                      >
                        <span>Preview Email Body</span>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom "Use This ->" Button & Modal Image */}
                  <div className="flex items-center justify-between pt-1 relative">
                    <button
                      type="button"
                      onClick={() => handleUseScenario(detailModalItem)}
                      className={`px-5 py-2 rounded-xl border text-[12px] font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${modalTheme.btnBg} ${modalTheme.btnBorder} ${modalTheme.btnText} hover:scale-105 active:scale-95 z-10`}
                    >
                      <span>Use This</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>

                    {/* 3D Visual in Modal Bottom Right */}
                    <div className="absolute -right-[5%] -bottom-[15%] w-44 h-44 pointer-events-none select-none">
                      {modalImgSrc && (
                        <img
                          src={modalImgSrc}
                          alt={detailModalItem.scenarioName}
                          className="w-full h-full object-contain filter drop-shadow-xl"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* ── 🌟 SIMULATED EMAIL BODY PREVIEW POPUP MODAL                            */}
        {/* ========================================================================= */}
        {previewEmailHtml && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden shadow-2xl border border-white/20 flex flex-col">
              <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-[#121418]">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                  Simulated Email Payload Preview
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewEmailHtml(null)}
                  className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto max-h-[60vh] bg-slate-50 dark:bg-black/50">
                <div
                  className="bg-white p-5 rounded-xl shadow-xs border border-slate-200"
                  dangerouslySetInnerHTML={{
                    __html: previewEmailHtml
                      .replace(/{{userName}}/g, 'Abhay H S')
                      .replace(/{{email}}/g, 'abhay.hs1@vodafone.com')
                      .replace(/{{department}}/g, 'AI & Data Analytics')
                      .replace(/{{phishLink}}/g, '#training')
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

export default ChooseAScenario;