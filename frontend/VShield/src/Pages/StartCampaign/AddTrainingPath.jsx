import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { useCampaignDraft } from '../../services/useCampaignDraft';
import {
  Check,
  ExternalLink,
  Play,
  HelpCircle,
  Award,
  X,
  Maximize2,
  AlertTriangle
} from 'lucide-react';
import { CAMPAIGN_STEPS } from './ChooseAScenario';
import scenariosJsonData from '../Scenarios/ScenariosData.json';
import trainingPathsJson from '../Training/TrainingPath.json';
import trainingVideosJson from '../Training/TrainingVideos.json';
import trainingQuizJson from '../Training/TrainingQuiz.json';
import trainingCertificateJson from '../Training/TrainingCertificate.json';
import videoBottomAsset from '../../assets/VideoImageStartACampaign.png';
import quizBottomAsset from '../../assets/QuizImageStartANewCampaign.png';
import certBottomAsset from '../../assets/CertificateImageStartANewCampaign.png';

// =========================================================================
// 🎛️ SCALE & THEME CONSTANTS (STRICTLY PRESERVED)
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

  /* Custom Slim Light Scrollbar */
  .custom-light-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: #CBD5E1 transparent;
  }
  .custom-light-scrollbar::-webkit-scrollbar {
    width: 5px;
    height: 0px;
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
  .dark .custom-light-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.4);
  }
`;

const CURRENT_STEP_NUMBER = 5; // Step 5: Add Training Path

const AddTrainingPath = () => {
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

  // Server-backed draft from prior steps (loads asynchronously).
  const { draft: serverDraft, update, flush } = useCampaignDraft();
  const draft = serverDraft || {};

  // Strict Start Fresh Detection
  const isStartFresh =
    draft.scenarioId === 'start-fresh' ||
    draft.scenarioName === 'Start Fresh' ||
    Boolean(draft.isStartFresh);

  // Find scenario selected in Step 1 if not Start Fresh
  const matchedScenario = !isStartFresh
    ? (scenariosJsonData?.scenarios || []).find((s) => s.scenarioId === draft.scenarioId) || scenariosJsonData?.scenarios?.[0]
    : null;

  // Selected Training Path ID: None preselected if Start Fresh unless explicitly chosen by user.
  // Safe default while the draft is still loading; seeded once it arrives.
  const [selectedPathId, setSelectedPathId] = useState(null);

  // The draft is fetched asynchronously, so the original preselection logic runs
  // when it lands. Seeded only once so a later save cannot clobber a user pick.
  const seededRef = useRef(false);
  useEffect(() => {
    if (!serverDraft || seededRef.current) return;
    seededRef.current = true;
    setSelectedPathId(
      isStartFresh
        ? (serverDraft.trainingPathAttachedByUser ? (serverDraft.trainingId || null) : null)
        : (serverDraft.trainingId || matchedScenario?.trainingId || 'TP-00001')
    );
  }, [serverDraft, isStartFresh, matchedScenario]);

  // Validation toaster message state
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-dismiss top-right toaster after 4 seconds
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Expanded detailed sheet modal item
  const [detailItem, setDetailItem] = useState(null);

  // Active playing video modal
  const [activeVideoModal, setActiveVideoModal] = useState(null);

  // Preview modals for Quiz & Certificate
  const [previewQuizModal, setPreviewQuizModal] = useState(null);
  const [previewCertModal, setPreviewCertModal] = useState(null);

  const handleSelectPath = (path) => {
    // An explicit pick always wins, even if the draft is still in flight.
    seededRef.current = true;
    setSelectedPathId(path.TrainingPathID);
    setErrorMsg('');
    update({
      trainingPathAttachedByUser: true,
      trainingId: path.TrainingPathID,
      trainingPathName: path.TrainingPathName
    });
  };

  const handleProceed = async () => {
    if (!selectedPathId) {
      setErrorMsg('Please select a Training Path to proceed');
      return;
    }
    const activePath = trainingPathsJson.find((p) => p.TrainingPathID === selectedPathId);
    if (!activePath) {
      setErrorMsg('Please select a Training Path to proceed');
      return;
    }
    update({
      trainingPathAttachedByUser: true,
      trainingId: activePath.TrainingPathID,
      trainingPathName: activePath.TrainingPathName
    });
    await flush().catch(() => {});
    navigate('/start-campaign/review');
  };

  // Back does not persist anything new — the selection is saved on click — but
  // any debounced save still pending must land before we leave.
  const handleGoBack = async () => {
    await flush().catch(() => {});
    navigate('/start-campaign/landing-page');
  };

  const stepsList = CAMPAIGN_STEPS || [
    { id: 'scenario', step: 1, titleLine1: 'Choose A', titleLine2: 'Scenario' },
    { id: 'details', step: 2, titleLine1: 'Details &', titleLine2: 'Settings' },
    { id: 'email', step: 3, titleLine1: 'Campaign', titleLine2: 'Email' },
    { id: 'landing', step: 4, titleLine1: 'Landing', titleLine2: 'Page' },
    { id: 'training', step: 5, titleLine1: 'Add Training', titleLine2: 'Path' },
    { id: 'review', step: 6, titleLine1: 'Review &', titleLine2: 'Publish' }
  ];

  // Helper to resolve linked videos, quiz, and certificate
  const resolvePathDetails = (path) => {
    if (!path) return { videos: [], quiz: null, certificate: null, questionCount: 0, passingScore: 80 };
    const videos = (path.TrainingVideoAttached || []).map(
      (vidId) =>
        trainingVideosJson.find((v) => v.TrainingVideoID === vidId) || {
          TrainingVideoID: vidId,
          TrainingVideoName: 'Security Awareness Module',
          Description: 'Comprehensive training video module on identifying phishing lures.'
        }
    );

    const quiz =
      trainingQuizJson.find(
        (q) => q.TrainingQuizID === (path.TrainingQuizAttached?.[0] || 'TQ-00001')
      ) || trainingQuizJson[0];

    const certificate =
      trainingCertificateJson.find(
        (c) => c.TrainingCertificateID === (path.TrainingCertificateAttached?.[0] || 'TC-00001')
      ) || trainingCertificateJson[0];

    const questionCount = quiz?.QuizData ? Object.keys(quiz.QuizData).length : 10;
    const passingScore = quiz?.TrainingCompletionThreshold || 80;

    return { videos, quiz, certificate, questionCount, passingScore };
  };

  // Helper to load scenario cover image for the path card
  const getCoverImage = (imgName) => {
    try {
      return new URL(`../Scenarios/${imgName}`, import.meta.url).href;
    } catch {
      return `/assets/Scenarios/${imgName}`;
    }
  };

  // Helper to load uploaded video asset from src/assets/
  const getVideoSource = (video) => {
    if (!video) return '';
    const src = video.TrainingVideo || video.VideoURL || video.videoUrl || video.VideoPath || '';
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('blob:')) {
      return src;
    }
    const fileName = src.split('/').pop();
    try {
      return new URL(`../../assets/${fileName}`, import.meta.url).href;
    } catch {
      return src;
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: VODAFONE_FONT_STYLE }} />

      {/* Screen Shell */}
      <div
        style={{ zoom: VarStartCampaignScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 h-[calc(109vh-0px)] overflow-hidden"
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
          {/* ── 3. WORKSPACE: GALLERY VIEW                                             */}
          {/* ========================================================================= */}
          <div className="flex-1 min-h-0 p-2 sm:p-3 flex flex-col overflow-hidden">
            <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Gallery Cards Grid (Internally Scrollable Area with Light Slim Scrollbar & No Horizontal Scroll) */}
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-3.5 custom-light-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 items-start pb-4">
                  {trainingPathsJson.map((path) => {
                    const isSelected = selectedPathId === path.TrainingPathID;
                    const { videos, questionCount, passingScore } = resolvePathDetails(path);
                    const coverSrc = getCoverImage(path['Thumbnail(CoverImage)'] || 'CovImg-001.png');

                    return (
                      <div
                        key={path.TrainingPathID}
                        className="relative group w-full h-[220px] cursor-pointer hover:z-30 transition-all duration-300"
                        onClick={() => handleSelectPath(path)}
                      >
                        {/* 🌟 1. Underlying Peeking Drawer (Exact 1-2px Peek at Rest, Slides Smoothly on Hover) */}
                        <div
                          className={`absolute inset-0 rounded-3xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-0 border overflow-hidden ${
                            isDark
                              ? 'bg-[#E4ECF0] border-white/10 text-white'
                              : 'bg-[#EBF1F5] border-slate-300 text-slate-800'
                          } translate-x-[10px] translate-y-[10px] group-hover:translate-x-[10px] group-hover:translate-y-[50px] group-hover:shadow-xl`}
                        >
                          {/* Stats items docked at bottom of the open drawer */}
                          <div className="absolute bottom-0 left-0 right-0 h-[50px] flex items-center justify-between px-3.5 py-1.5 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300 delay-75 pointer-events-none group-hover:pointer-events-auto">
                            {/* Item 1: Videos */}
                            <div className="flex items-center gap-1.5">
                              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                              <div className="flex flex-col text-left leading-tight">
                                <span className="text-[10px] font-bold text-slate-900">
                                  {videos.length} Videos
                                </span>
                                <span className="text-[8.5px] text-slate-500">
                                  Total: 10s
                                </span>
                              </div>
                            </div>

                            {/* Item 2: Quiz */}
                            <div className="flex items-center gap-1.5 -ml-3">
                              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                                <HelpCircle className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col text-left leading-tight">
                                <span className="text-[10px] font-bold text-slate-900">
                                  1 Quiz
                                </span>
                                <span className="text-[8.5px] text-slate-500">
                                  {questionCount} Qs
                                </span>
                              </div>
                            </div>

                            {/* Item 3: Certificate */}
                            <div className="flex items-center gap-1.5 mr-2">
                              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                                <Award className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col text-left leading-tight">
                                <span className="text-[10px] font-bold text-slate-900">
                                  1 Cert
                                </span>
                                <span className="text-[8.5px] text-slate-500">
                                  Pass: {passingScore}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 🌟 2. Main Card Layer */}
                        <div
                          className={`relative p-4 rounded-3xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col justify-between overflow-hidden select-none w-full h-[220px] shadow-sm z-10 ${
                            isDark
                              ? 'bg-[#15161A] text-white border border-white/10'
                              : 'bg-black text-white border border-black/10'
                          } ${isSelected ? 'ring-2 ring-inset ring-[#8ED973]' : ''} group-hover:-translate-y-0.5`}
                        >
                          {/* Top Bar: Badge (Left) + Creation Date & Expand Sheet Button (Right) */}
                          <div className="flex items-center justify-between mb-1 z-10">
                            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-bold bg-white/75 text-black/75 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                              <span>{path.TrainingPathID}</span>
                            </div>

                            <div className="flex items-center gap-1 text-[10px] font-bold text-white/70">
                              <span>Created on: {path.CreatedOn}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailItem(path);
                                }}
                                className="p-1 rounded hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
                                title="Expand in Sheet Pop-up"
                              >
                                <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                              </button>
                            </div>
                          </div>

                          {/* Title & Description */}
                          <div className="flex flex-col gap-1 text-left z-10 max-w-[70%]">
                            <h3 className="text-[14.5px] font-voda font-bold text-white leading-tight tracking-tight mb-3">
                              {path.TrainingPathName}
                            </h3>
                            <p className="text-[9px] text-white/75 font-medium line-clamp-4 leading-relaxed -mt-0.5">
                              <strong>Description: </strong>
                              {path.Description}
                            </p>
                          </div>

                          {/* Bottom Left Button */}
                          <div className="pt-2 z-10 flex items-center">
                            {isSelected ? (
                              <div className="px-3 py-1 rounded-md bg-[#8ED973] text-white text-[10.5px] font-bold flex items-center gap-1 shadow-2xs">
                                <span>Selected</span>
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectPath(path);
                                }}
                                className="px-3.5 py-1 rounded-md bg-[#E2E8F0] hover:bg-white text-slate-900 text-[10.5px] font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                Select This
                              </button>
                            )}
                          </div>

                          {/* 3D Asset cropped 10% bottom & right */}
                          <div className="absolute -right-[5%] -bottom-[7%] w-[125px] h-[125px] pointer-events-none select-none flex items-center justify-center overflow-hidden z-0">
                            <img
                              src={coverSrc}
                              alt={path.TrainingPathName}
                              className="w-full h-full object-contain filter drop-shadow-md"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Action Bar */}
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

        {/* ========================================================================= */}
        {/* ── 🌟 EXACT DESIGN: EXPANDED POP-UP (ZERO-SCROLL FIXED FIT)               */}
        {/* ========================================================================= */}
        {detailItem &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="fixed inset-0 z-[2147483640] bg-white/5 dark:bg-white/25 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-hidden animate-in fade-in duration-200"
              onClick={() => setDetailItem(null)}
            >
              <div
                className="w-full max-w-[1160px] h-[min(750px,88vh)] rounded-[16px] bg-black text-white p-4 sm:p-6 border border-white/10 shadow-2xl relative flex flex-col justify-between overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* ── Top Bar: Pill Badge (Left) + "Go Back" Button (Right) ── */}
                <div className="flex items-center justify-between flex-shrink-0">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-black text-[10px] font-bold shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                    <span>{detailItem.TrainingPathID}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDetailItem(null)}
                    className="px-4 py-1 rounded-xl bg-[#71767C] hover:bg-[#60656A] text-white text-[9.5px] font-bold transition-all cursor-pointer shadow-sm"
                  >
                    Go Back
                  </button>
                </div>

                {/* ── Path Title & Description ── */}
                <div className="flex flex-col gap-1 text-left my-2 flex-shrink-0">
                  <h2 className="text-[17px] sm:text-[19px] font-voda font-extrabold text-white tracking-tight leading-tight">
                    {detailItem.TrainingPathName}
                  </h2>
                  <p className="text-[11px] text-white/90 leading-snug line-clamp-2">
                    <strong className="font-bold text-white">Description: </strong>
                    {detailItem.Description}
                  </p>
                </div>

                {/* ── Created on (Left) & Selection Status Button (Right) ── */}
                <div className="flex items-center justify-between flex-shrink-0">
                  <span className="text-[11.5px] text-white font-bold">
                    Created on: {detailItem.CreatedOn}
                  </span>

                  {selectedPathId === detailItem.TrainingPathID ? (
                    <div className="px-4 py-1 rounded-xl bg-[#8BD76B] text-white font-voda font-bold text-[12px] flex items-center gap-1.5 shadow-sm">
                      <span>Selected</span>
                      <div className="w-3.5 h-3.5 rounded-full bg-white text-[#8BD76B] flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectPath(detailItem)}
                      className="px-4 py-1 rounded-xl bg-white text-black font-voda font-bold text-[11px] hover:bg-white/90 transition-all cursor-pointer shadow-sm"
                    >
                      Select This
                    </button>
                  )}
                </div>

                {/* ── Thin Divider Line ── */}
                <div className="w-full h-px bg-white/20 my-2 flex-shrink-0" />

                {/* ── 2 COLUMNS: VIDEOS (LEFT) & QUIZ + CERTIFICATE (RIGHT) ── */}
                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch text-slate-900 overflow-hidden">
                  {/* 👈 LEFT COLUMN: VIDEOS CARD (Soft Peach/Blush #F5E5E1) */}
                  {(() => {
                    const { videos } = resolvePathDetails(detailItem);
                    return (
                      <div className="relative rounded-[12px] p-3.5 sm:p-4 bg-[#F5E5E1] flex flex-col justify-between overflow-hidden shadow-xs h-full">
                        <div className="flex flex-col flex-1 min-h-0 justify-between">
                          {/* Header */}
                          <div className="flex-shrink-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <h3 className="text-[15px] font-voda font-bold text-black tracking-tight">
                                Videos
                              </h3>
                              <button
                                type="button"
                                className="px-3.5 py-1 rounded-full bg-white text-black font-bold text-[9px] shadow-xs hover:bg-white/90 cursor-pointer"
                              >
                                Change Videos
                              </button>
                            </div>
                            <p className="text-[10.5px] text-slate-700 text-left mb-1.5">
                              Below are the videos present in this training path
                            </p>
                            <div className="w-full h-px bg-slate-300/80 mb-2" />
                          </div>

                          {/* Videos Stack */}
                          <div className="flex flex-col gap-2 flex-1 min-h-0 justify-between relative z-10">
                            {videos.slice(0, 2).map((vid) => (
                              <div
                                key={vid.TrainingVideoID}
                                className="p-2 sm:p-2.5 rounded-xl bg-[#CF9387]/30 flex items-center justify-between gap-2.5 text-left shadow-xs flex-1 min-h-0 overflow-hidden"
                              >
                                <div className="flex flex-col flex-1 min-w-0 justify-between h-full py-0.5">
                                  <div>
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white text-black w-fit mb-1 shadow-2xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                                      <span>{vid.TrainingVideoID}</span>
                                    </div>
                                    <h4 className="text-[11.5px] font-bold text-black leading-snug line-clamp-1">
                                      {vid.TrainingVideoName}
                                    </h4>
                                  </div>
                                  <p className="text-[9px] text-slate-700 leading-snug line-clamp-2 mt-0.5">
                                    {vid.Description}
                                  </p>
                                </div>

                                {/* Clickable Video Player Thumbnail */}
                                <div
                                  onClick={() => setActiveVideoModal(vid)}
                                  className="w-[130px] sm:w-[145px] h-[72px] sm:h-[78px] rounded-lg bg-[#A59591] relative flex flex-col justify-between p-1.5 flex-shrink-0 overflow-hidden cursor-pointer group/vid shadow-xs"
                                  title="Click to play video"
                                >
                                  {/* Watermark Logo */}
                                  <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                                    <span className="font-voda font-extrabold text-[12px] tracking-wider text-black">
                                      VOIShield.
                                    </span>
                                  </div>

                                  {/* Centered Play Button */}
                                  <div className="w-full h-full flex items-center justify-center relative z-10">
                                    <div className="w-7 h-7 rounded-full bg-black/85 text-white flex items-center justify-center shadow-md group-hover/vid:scale-110 group-hover/vid:bg-black transition-all">
                                      <Play className="w-3 h-3 fill-white ml-0.5" />
                                    </div>
                                  </div>

                                  {/* Player Controls Strip */}
                                  <div className="flex items-center justify-between text-[7px] font-mono-tech text-black/85 font-semibold relative z-10">
                                    <span>01:28:00/04:30:28</span>
                                    <Maximize2 className="w-2.5 h-2.5 text-black/85" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 3D Asset pinned in bottom right */}
                        <div className="absolute -right-[2%] -bottom-[5%] w-[122px] h-[122px] pointer-events-none select-none flex items-center justify-center z-0">
                          <img
                            src={videoBottomAsset || '/assets/VideoImageStartACampaign.png'}
                            alt="Videos Asset"
                            className="w-full h-full object-contain filter drop-shadow-md"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* 👉 RIGHT COLUMN: QUIZ (TOP) & CERTIFICATE (BOTTOM) */}
                  {(() => {
                    const { quiz, certificate, questionCount, passingScore } =
                      resolvePathDetails(detailItem);
                    return (
                      <div className="flex flex-col gap-3 justify-between h-full overflow-hidden">
                        {/* 1. QUIZ CARD (Soft Sage Green #E2EFE7) */}
                        <div className="relative rounded-[14px] p-3.5 sm:p-4 bg-[#E2EFE7] flex flex-col justify-between overflow-hidden shadow-xs flex-1 min-h-0">
                          <div className="flex flex-col justify-between h-full">
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <h3 className="text-[15px] font-voda font-bold text-black tracking-tight">
                                  Quiz
                                </h3>
                                <button
                                  type="button"
                                  className="px-3.5 py-1 rounded-full bg-white text-black font-bold text-[9px] shadow-xs hover:bg-white/90 cursor-pointer"
                                >
                                  Change Quiz
                                </button>
                              </div>
                              <p className="text-[10.5px] text-slate-700 text-left mb-1.5">
                                Below is the quiz present in this training path
                              </p>
                              <div className="w-full h-px bg-slate-300/80 mb-2" />
                            </div>

                            {/* Quiz Inner Card */}
                            <div className="p-2.5 sm:p-3 -mt-5 rounded-xl bg-[#356B2F]/30 flex items-center justify-between gap-2.5 text-left shadow-xs relative z-10">
                              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 rounded-full text-[9px] font-bold bg-white text-black w-fit shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                                  <span>{quiz?.TrainingQuizID || 'TQ-00002'}</span>
                                </div>
                                <h4 className="text-[11.5px] font-bold text-black leading-snug line-clamp-1">
                                  {quiz?.TrainingQuizName || 'Spotting Deceptive Email Lures & Headers'}
                                </h4>
                              </div>

                              <div className="flex flex-row items-start gap-4 flex-shrink-0">
                                {/* Left Section: Stats Group (Vertically Middle Aligned) */}
                                <div className="flex items-center gap-1.5 self-center mr-6">
                                  <span className="text-[29px] font-voda font-extrabold text-black leading-none">
                                    {questionCount}
                                  </span>
                                  <div className="flex flex-col text-left leading-none">
                                    <span className="text-[8.5px] font-bold text-slate-800">
                                      Total Questions
                                    </span>
                                    <span className="text-[8px] font-bold text-[#15803D]">
                                      Passing Score: {passingScore}%
                                    </span>
                                  </div>
                                </div>

                                {/* Right Section: Preview Button (Top Aligned) */}
                                <button
                                  type="button"
                                  onClick={() => setPreviewQuizModal(quiz)}
                                  className="px-3 py-0.5 rounded-full bg-white text-black text-[9.5px] font-bold shadow-xs hover:bg-white/90 cursor-pointer self-start"
                                >
                                  Preview
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 3D Asset pinned in bottom right */}
                          <div className="absolute -right-[2%] -bottom-[5%] w-[82px] h-[92px] pointer-events-none select-none flex items-center justify-center z-0">
                            <img
                              src={quizBottomAsset || '/assets/QuizImageStartANewCampaign.png'}
                              alt="Quiz Asset"
                              className="w-full h-full object-contain filter drop-shadow-md"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        </div>

                        {/* 2. CERTIFICATE CARD (Soft Warm Sand/Cream #F8EED9) */}
                        <div className="relative rounded-[14px] p-3.5 sm:p-4 bg-[#F8EED9] flex flex-col justify-between overflow-hidden shadow-xs flex-1 min-h-0">
                          <div className="flex flex-col justify-between h-full">
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <h3 className="text-[15px] font-voda font-bold text-black tracking-tight">
                                  Certificate
                                </h3>
                                <button
                                  type="button"
                                  className="px-3.5 py-1 rounded-full bg-white text-black font-bold text-[9px] shadow-xs hover:bg-white/90 cursor-pointer"
                                >
                                  Change Certificate
                                </button>
                              </div>
                              <p className="text-[10.5px] text-slate-700 text-left mb-1.5">
                                Below is the certificate present in this training path
                              </p>
                              <div className="w-full h-px bg-slate-300/80 mb-2" />
                            </div>

                            {/* Certificate Inner Card */}
                            <div className="p-2.5 sm:p-3 rounded-xl bg-[#D3BA73]/30 flex items-start justify-between gap-2 text-left shadow-xs relative z-10">
                              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 -mt-1 mb-1 rounded-full text-[9px] font-bold bg-white text-black w-fit shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                                  <span>{certificate?.TrainingCertificateID || 'TC-00002'}</span>
                                </div>
                                <h4 className="text-[11.5px] font-bold text-black leading-snug line-clamp-1">
                                  {certificate?.TrainingCertificateName || 'Spotting Deceptive Email Lures & Headers'}
                                </h4>
                                <p className="text-[9px] text-slate-700 leading-snug mt-0.5 line-clamp-2">
                                  {certificate?.Description ||
                                    'Advanced certificate honoring completion of targeted executive and high-risk spear-phishing remediation modules.'}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => setPreviewCertModal(certificate)}
                                className="px-3 py-0.5 rounded-full bg-white text-black text-[9.5px] font-bold shadow-xs hover:bg-white/90 cursor-pointer flex-shrink-0"
                              >
                                Preview
                              </button>
                            </div>
                          </div>

                          {/* 3D Asset pinned in bottom right */}
                          <div className="absolute -right-[1%] -bottom-[15%] w-[82px] h-[102px] pointer-events-none select-none flex items-center justify-center z-0">
                            <img
                              src={certBottomAsset || '/assets/CertificateImageStartANewCampaign.png'}
                              alt="Certificate Asset"
                              className="w-full h-full object-contain filter drop-shadow-md"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* ── 🌟 INTERACTIVE VIDEO PLAYER MODAL                                      */}
        {/* ========================================================================= */}
        {activeVideoModal &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="fixed inset-0 z-[2147483647] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
              onClick={() => setActiveVideoModal(null)}
            >
              <div
                className="w-full max-w-4xl bg-[#14151A] rounded-2xl overflow-hidden shadow-2xl border border-white/15 flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Video Header */}
                <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between bg-black/60">
                  <div className="flex items-center gap-2.5">
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-black">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                      <span>{activeVideoModal.TrainingVideoID}</span>
                    </div>
                    <span className="text-xs font-voda font-bold text-white truncate max-w-[450px]">
                      {activeVideoModal.TrainingVideoName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveVideoModal(null)}
                    className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* HTML5 Video Player */}
                <div className="relative aspect-video bg-black flex items-center justify-center">
                  <video
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                    src={
                      getVideoSource(activeVideoModal) ||
                      activeVideoModal.TrainingVideo ||
                      activeVideoModal.VideoURL ||
                      activeVideoModal.videoUrl ||
                      activeVideoModal.VideoPath ||
                      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                    }
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* ── 🌟 QUIZ PREVIEW MODAL                                                  */}
        {/* ========================================================================= */}
        {previewQuizModal &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[2147483646] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="w-full max-w-2xl bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden shadow-2xl border border-white/15 flex flex-col">
                <div className="px-5 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-[#121418]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-voda font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Quiz Preview: {previewQuizModal.TrainingQuizName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewQuizModal(null)}
                    className="p-1 rounded-lg text-slate-500 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 overflow-y-auto max-h-[60vh] flex flex-col gap-4 text-left">
                  {Object.entries(previewQuizModal.QuizData || {}).map(([qKey, qData], idx) => (
                    <div
                      key={qKey}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                    >
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white mb-2">
                        {idx + 1}. {qData.question}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        {['optionA', 'optionB', 'optionC', 'optionD'].map((optKey) => (
                          <div
                            key={optKey}
                            className={`p-2 rounded-lg border text-left ${
                              qData.Answer === optKey
                                ? 'bg-green-50 border-green-500 text-green-800 font-bold dark:bg-green-950/40 dark:text-green-300'
                                : 'bg-white dark:bg-black/30 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="uppercase text-[9px] font-mono-tech mr-1 opacity-70">
                              [{optKey.replace('option', '')}]
                            </span>
                            {qData[optKey]}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* ── 🌟 CERTIFICATE PREVIEW MODAL                                           */}
        {/* ========================================================================= */}
        {previewCertModal &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[2147483646] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden shadow-2xl border border-white/15 flex flex-col">
                <div className="px-5 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-[#121418]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-voda font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Certificate Preview: {previewCertModal.TrainingCertificateName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewCertModal(null)}
                    className="p-1 rounded-lg text-slate-500 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 overflow-auto flex items-center justify-center bg-slate-200 dark:bg-black/60">
                  <iframe
                    title="Certificate Preview"
                    srcDoc={previewCertModal['Certificate(html)']
                      ?.replace(/{{userName}}/g, draft.userName || 'Abhay H S')
                      ?.replace(/{{trainingPathName}}/g, detailItem?.TrainingPathName || 'Anti-Phishing Path')
                      ?.replace(/{{completionDate}}/g, '15-Jan-2026')
                      ?.replace(/{{certificateId}}/g, previewCertModal.TrainingCertificateID)}
                    className="w-[850px] h-[520px] border-none rounded-xl bg-white shadow-xl"
                  />
                </div>
              </div>
            </div>,
            document.body
          )}

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

export default AddTrainingPath;