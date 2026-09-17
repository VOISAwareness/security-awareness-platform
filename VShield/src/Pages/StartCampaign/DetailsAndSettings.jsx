import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { Check, Calendar, AlertTriangle, X } from 'lucide-react';
import { CAMPAIGN_STEPS } from './ChooseAScenario';
import scenariosJsonData from '../Scenarios/ScenariosData.json';
import gamificationCardLogo from '../../assets/GamificationCardLogoStartNewCamapignScreen.png';

// =========================================================================
// 🎛️ SCALE & THEME CONSTANTS (STRICTLY PRESERVED)
// =========================================================================
const VarStartCampaignScale = 0.93 ;
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

  /* 3D Flip Card Utilities */
  .perspective-1000 {
    perspective: 1000px;
    -webkit-perspective: 1000px;
  }
  .transform-style-preserve-3d {
    transform-style: preserve-3d;
    -webkit-transform-style: preserve-3d;
  }
  .backface-hidden {
    backface-visibility: hidden !important;
    -webkit-backface-visibility: hidden !important;
  }
  .rotate-y-180 {
    transform: rotateY(180deg);
    -webkit-transform: rotateY(180deg);
  }
`;

const CURRENT_STEP_NUMBER = 2; // Step 2: Details & Settings

const DetailsAndSettings = () => {
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

  // Read saved draft from step 1
  const [draft, setDraft] = useState(() => {
    try {
      const stored = localStorage.getItem('voisshield_active_campaign_draft');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Base L-shape container color
  const lCardBg = isDark ? '#1C1E24' : '#F1F5F7';

  // Prevent scenario names and descriptions from populating here (Start Fresh or Scenario Chosen -> Always empty by default)
  const allScenarioTitles = new Set([
    'Start Fresh',
    draft.scenarioName,
    ...(scenariosJsonData?.scenarios || []).map((s) => s.scenarioName)
  ].filter(Boolean));

  const allScenarioDescs = new Set([
    draft.description,
    ...(scenariosJsonData?.scenarios || []).map((s) => s.description)
  ].filter(Boolean));

  // Form Fields: ALWAYS empty with placeholder "Type Here"
  const [campaignTitle, setCampaignTitle] = useState(
    draft.campaignTitle && !allScenarioTitles.has(draft.campaignTitle) ? draft.campaignTitle : ''
  );
  const [campaignDescription, setCampaignDescription] = useState(
    draft.campaignDescription && !allScenarioDescs.has(draft.campaignDescription) ? draft.campaignDescription : ''
  );
  const [startTime, setStartTime] = useState(draft.startTime || '');
  const [endTime, setEndTime] = useState(draft.endTime || '');
  const [isTestCampaign, setIsTestCampaign] = useState(Boolean(draft.isTestCampaign));
  const [autoEndPostSending, setAutoEndPostSending] = useState(
    draft.autoEndPostSending !== undefined ? Boolean(draft.autoEndPostSending) : true
  );
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-dismiss top right toaster after 4 seconds
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Gamification Card Flip State
  const [isGamificationFlipped, setIsGamificationFlipped] = useState(false);

  // Save changes to draft
  const persistChanges = (fields) => {
    try {
      const current = localStorage.getItem('voisshield_active_campaign_draft');
      const updated = { ...(current ? JSON.parse(current) : {}), ...fields };
      localStorage.setItem('voisshield_active_campaign_draft', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Strict Validation: Title, Description, Start Time, and End Time (or Auto End checkbox)
  const handleProceed = () => {
    if (!campaignTitle.trim()) {
      setErrorMsg('Please specify a Campaign Title');
      return;
    }
    if (!campaignDescription.trim()) {
      setErrorMsg('Please enter a Campaign Description');
      return;
    }
    if (!startTime.trim()) {
      setErrorMsg('Please select a Start Time for the campaign');
      return;
    }
    if (!endTime.trim() && !autoEndPostSending) {
      setErrorMsg('Please specify an End Time or check "Auto End post sending out all emails"');
      return;
    }

    setErrorMsg('');
    persistChanges({
      campaignTitle: campaignTitle.trim(),
      campaignDescription: campaignDescription.trim(),
      startTime,
      endTime,
      isTestCampaign,
      autoEndPostSending
    });
    navigate('/start-campaign/email');
  };

  const handleGoBack = () => {
    persistChanges({
      campaignTitle: campaignTitle.trim(),
      campaignDescription: campaignDescription.trim(),
      startTime,
      endTime,
      isTestCampaign,
      autoEndPostSending
    });
    navigate('/start-campaign');
  };

  const stepsList = CAMPAIGN_STEPS || [
    { id: 1, step: 1, titleLine1: 'Choose', titleLine2: 'Scenario' },
    { id: 2, step: 2, titleLine1: 'Campaign Details', titleLine2: '& Settings' },
    { id: 3, step: 3, titleLine1: 'Select', titleLine2: 'Email Template' },
    { id: 4, step: 4, titleLine1: 'Review &', titleLine2: 'Launch' }
  ];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: VODAFONE_FONT_STYLE }} />

      {/* Screen Shell */}
      <div
        style={{ zoom: VarStartCampaignScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 h-[calc(109.5vh-0px)] overflow-hidden"
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
        {/* ── 2. MAIN CONTAINER WITH DOCKED PROGRESS-FILL STEPPER STRIP              */}
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
                    <div className="w-6 h-6 rounded-full bg-white dark:bg-black text-black dark:text-white font-black flex items-center justify-center text-[11px] flex-shrink-0 shadow-2xs">
                      {step.step}
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 ${
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

          {/* ── 3. MAIN WORKSPACE WITH 2 L-SHAPED BENTO COLUMNS ── */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              
              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* 👈 LEFT COLUMN: CAMPAIGN DETAILS (SEAMLESS L-SHAPE CONTAINER) */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="relative flex flex-col h-full min-h-[400px]">
                {/* 🌟 1. Truly Isolated Capsule (#ECE8FF) */}
                <div
                  className={`absolute top-0 left-0 w-[164px] h-[122px] p-3.5 rounded-2xl flex flex-col justify-between shadow-xs z-20 ${
                    isDark ? 'bg-[#ECE8FF] text-slate-900' : 'bg-[#ECE8FF] text-slate-900'
                  }`}
                >
                  <div>
                    <h3 className="text-[14px] -mt-1 font-voda font-bold tracking-normal leading-tight">
                      Campaign<br />Details
                    </h3>
                  </div>
                  <p className="text-[9.5px] font-medium leading-tight opacity-75 mt-1">
                    Fill in the required <br />campaign details <br /> here
                  </p>
                </div>

                {/* 🌟 2. Concave Arc Fillet smoothing the re-entrant inner corner */}
                <div className="absolute top-[114px] left-[154px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
                  </svg>
                </div>

                {/* 🌟 3. Top-Right Arm of L-Shape Container (#F1F5F7) */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-[calc(100%-170px)] ml-auto h-[129px] rounded-t-xl px-4 py-2.5 flex flex-col justify-center gap-1.5 z-10 -ml-2"
                >
                  <label className="text-[12.5px] py-2.5 mt-2 font-bold text-slate-900 dark:text-white leading-none">
                    Campaign Title <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
                  </label>
                  <div
                    className={`w-full h-auto min-h-[80px] p-3 rounded-2xl flex items-start shadow-2xs ${
                      isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                    }`}
                  >
                    <textarea
                      rows={3}
                      value={campaignTitle}
                      onChange={(e) => {
                        setCampaignTitle(e.target.value);
                        setErrorMsg('');
                        persistChanges({ campaignTitle: e.target.value });
                      }}
                      placeholder="Type Here"
                      className="w-full bg-transparent text-[11.5px] font-medium outline-none placeholder-slate-400 resize-none text-left align-top leading-normal"
                    />
                  </div>
                </div>

                {/* 🌟 4. Continuous Bottom Base of L-Shape Container (#F1F5F7) */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-full min-h-[348px] pb-8 rounded-tl-xl rounded-b-lg p-4 sm:p-5 flex flex-col justify-between gap-3 z-10"
                >
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-[12.5px] py-2 -mt-2 font-bold text-slate-900 dark:text-white">
                      Campaign Description <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
                    </label>
                    <div
                      className={`w-full h-44 sm:h-52 p-4 mt-0 rounded-xl shadow-2xs ${
                        isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                      }`}
                    >
                      <textarea
                        rows={5}
                        value={campaignDescription}
                        onChange={(e) => {
                          setCampaignDescription(e.target.value);
                          setErrorMsg('');
                          persistChanges({ campaignDescription: e.target.value });
                        }}
                        placeholder="Type Here"
                        className="w-full h-full bg-transparent text-[11.5px] font-medium outline-none resize-none leading-relaxed placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* Bottom-Right: Test Campaign Checkbox */}
                  <div className="flex justify-end pt-1 -translate-y-3.5">
                    <label className="flex items-center gap-2 cursor-pointer text-[10.5px] font-bold text-slate-900 dark:text-white select-none">
                      <input
                        type="checkbox"
                        checked={isTestCampaign}
                        onChange={(e) => {
                          setIsTestCampaign(e.target.checked);
                          persistChanges({ isTestCampaign: e.target.checked });
                        }}
                        className="w-3.5 h-3.5 rounded border-slate-400 accent-[#E60000] cursor-pointer"
                      />
                      <span>Test Campaign</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* 👉 RIGHT COLUMN: GAMIFICATION (SEAMLESS L-SHAPE CONTAINER)  */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              <div className="relative flex flex-col h-full min-h-[400px]">
                {/* 🌟 1. Truly Isolated Capsule (#D9F2D0) */}
                <div
                  className={`absolute top-0 left-0 w-[164px] h-[122px] p-3.5 rounded-2xl flex flex-col justify-between shadow-xs z-20 ${
                    isDark ? 'bg-[#D9F2D0] text-slate-900' : 'bg-[#D9F2D0] text-slate-900'
                  }`}
                >
                  <div>
                    <h3 className="text-[14px] -mt-1 font-voda font-bold tracking-normal leading-tight">
                      Gamification<br />& Date<br />Settings
                    </h3>
                  </div>
                  <p className="text-[9.5px] font-medium leading-tight opacity-75 mt-1">
                    Set the start and end time <br /> of the campaign here
                  </p>
                </div>

                {/* 🌟 2. Concave Arc Fillet */}
                <div className="absolute top-[114px] left-[154px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
                  </svg>
                </div>

                {/* 🌟 3. Top-Right Arm of L-Shape Container: 3D Flipping Gamification Card */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-[calc(100%-170px)] ml-auto h-[129px] rounded-t-xl p-1.5 flex items-center z-10"
                >
                  <div
                    className="w-full h-full perspective-1000 cursor-pointer"
                    onMouseEnter={() => setIsGamificationFlipped(true)}
                    onMouseLeave={() => setIsGamificationFlipped(false)}
                  >
                    <div
                      className="relative w-full h-full rounded-2xl transition-transform duration-500 transform-style-preserve-3d shadow-xs"
                      style={{
                        transform: isGamificationFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        WebkitTransform: isGamificationFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                      }}
                    >
                      {/* FRONT OF FLIP CARD */}
                      <div
                        className="absolute inset-0 w-full h-full rounded-2xl px-4 py-2 text-white flex items-center justify-between backface-hidden shadow-sm select-none"
                        style={{
                          background: 'linear-gradient(105deg, #5965A2 0%, #7E82C2 50%, #D4A3E7 100%)',
                          transform: 'rotateY(0deg)',
                          WebkitTransform: 'rotateY(0deg)'
                        }}
                      >
                        {/* Left: Gamification Points Label */}
                        <div className="flex flex-col justify-center leading-tight flex-shrink-0 self-start text-left">
                          <span className="text-[13px] font-voda font-bold text-white tracking-tight">Gamification</span>
                          <span className="text-[13px] font-voda font-bold text-white tracking-tight -mt-0.5">Points</span>
                        </div>

                        {/* Middle: Capsules (2 Columns × 3 Rows) */}
                        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 flex-shrink-0">
                          <span className="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[9.5px] font-bold whitespace-nowrap text-center shadow-2xs">
                            Opened: 0
                          </span>
                          <span className="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[9.5px] font-bold whitespace-nowrap text-center shadow-2xs">
                            Clicked: -30
                          </span>
                          <span className="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[9.5px] font-bold whitespace-nowrap text-center shadow-2xs">
                            Compromised: 0
                          </span>
                          <span className="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[9.5px] font-bold whitespace-nowrap text-center shadow-2xs">
                            Reported: -30
                          </span>
                          <span className="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[9.5px] font-bold whitespace-nowrap text-center shadow-2xs">
                            Trained: 0
                          </span>
                          <span className="px-3 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[9.5px] font-bold whitespace-nowrap text-center shadow-2xs">
                            Evaluated: -30
                          </span>
                        </div>

                        {/* Right: Controller Image */}
                        <div className="w-[100px] h-[95px] mt-12 -mr-5 flex items-center justify-center flex-shrink-0 relative pointer-events-none">
                          <img
                            src={gamificationCardLogo || '/assets/GamificationCardLogoStartNewCamapignScreen.png'}
                            alt="Gamification Controller"
                            className="w-full h-full object-contain filter drop-shadow-md select-none"
                            onError={(e) => {
                              if (!e.currentTarget.dataset.retried) {
                                e.currentTarget.dataset.retried = 'true';
                                e.currentTarget.src = '/assets/GamificationCardLogoStartNewCamapignScreen.png';
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* BACK OF FLIP CARD */}
                      <div
                        className="absolute inset-0 w-full h-full rounded-2xl px-4 py-3 text-white flex flex-col items-center justify-center text-center backface-hidden shadow-md select-none gap-2 rotate-y-180"
                        style={{
                          background: 'linear-gradient(105deg, #5965A2 0%, #7E82C2 50%, #D4A3E7 100%)'
                        }}
                      >
                        <h4 className="text-[13px] font-voda font-bold text-white tracking-tight leading-tight">
                          No Access to Edit Gamification<br />Points Here!
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/gamification');
                          }}
                          className="px-5 py-1 rounded-full bg-[#8ED973] hover:bg-[#7ec963] text-white text-[10px] font-bold shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          Click here to go to Gamification Engine
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 🌟 4. Continuous Bottom Base: Date Settings + Buttons */}
                <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-full min-h-[348px] pb-8 rounded-tl-xl rounded-b-lg p-4 sm:p-5 flex flex-col justify-between gap-3 z-10"
                >
                  <div className="flex flex-col gap-2.5">
                    {/* Start Time Field */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[12.5px] mb-2 font-bold text-slate-800 dark:text-slate-200">
                        Start Time <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
                      </label>
                      <div
                        className={`w-full h-9 px-4 mb-2 rounded-xl flex items-center justify-between shadow-2xs ${
                          isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                        }`}
                      >
                        <input
                          type="datetime-local"
                          value={startTime}
                          onChange={(e) => {
                            setStartTime(e.target.value);
                            setErrorMsg('');
                            persistChanges({ startTime: e.target.value });
                          }}
                          placeholder="Enter Date Time"
                          className="w-full bg-transparent text-[10.5px] font-normal outline-none cursor-pointer"
                        />
                        <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0 pointer-events-none" />
                      </div>
                    </div>

                    {/* End Time Field */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[12.5px] mb-2 font-bold text-slate-800 dark:text-slate-200">
                        End Time {!autoEndPostSending && <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>}
                      </label>
                      <div
                        className={`w-full h-9 px-4 mb-2 rounded-xl flex items-center justify-between shadow-2xs ${
                          isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
                        }`}
                      >
                        <input
                          type="datetime-local"
                          value={endTime}
                          onChange={(e) => {
                            setEndTime(e.target.value);
                            setErrorMsg('');
                            persistChanges({ endTime: e.target.value });
                          }}
                          placeholder="Enter Date Time"
                          className="w-full bg-transparent text-[10.5px] font-normal outline-none cursor-pointer"
                        />
                        <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0 pointer-events-none" />
                      </div>
                    </div>

                    {/* Auto End Checkbox */}
                    <div className="flex justify-end pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold text-slate-900 dark:text-white select-none">
                        <input
                          type="checkbox"
                          checked={autoEndPostSending}
                          onChange={(e) => {
                            setAutoEndPostSending(e.target.checked);
                            setErrorMsg('');
                            persistChanges({ autoEndPostSending: e.target.checked });
                          }}
                          className="w-4 h-4 rounded border-slate-400 accent-[#E60000] cursor-pointer"
                        />
                        <span>Auto End post sending out all emails</span>
                      </label>
                    </div>
                  </div>

                  {/* Buttons: Back (#000000) & Next (#8ED973) */}
                  <div className="flex items-center justify-end gap-2.5 pt-2 -mt-2 border-black/5 dark:border-white/10">
                    <button
                      type="button"
                      onClick={handleGoBack}
                      className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleProceed}
                      className="w-[90px] h-[24px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center"
                    >
                      NEXT
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 SCREEN TOP-RIGHT CORNER TOASTER (PORTAL)                            */}
        {/* ========================================================================= */}
        {errorMsg &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed top-5 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-slate-900 border border-red-500/30 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm">
              <div className="w-8 h-8 rounded-full bg-red-100 text-[#E60000] flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex flex-col text-left leading-tight flex-1">
                <span className="text-[10px] font-voda font-bold text-[#E60000] uppercase tracking-wider">
                  Input Required
                </span>
                <span className="text-[9.5px] font-medium text-slate-700 mt-0.5">
                  {errorMsg}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg('')}
                className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>,
            document.body
          )}
      </div>
    </>
  );
};

export default DetailsAndSettings;