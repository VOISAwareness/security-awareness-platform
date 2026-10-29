import React, { useState, useEffect } from 'react';
import {
  Search
} from 'lucide-react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';

// Assets imported strictly from src/assets/CampaignsAssets
import OnGoingImg from '../../assets/CampaignsAssets/OnGoingCampaignsImage.png';
import HistoricalImg from '../../assets/CampaignsAssets/HistoricalCampaignsImage.png';
// Fallback direct JSON data
import PendingTrainingTableData from './components/PendingTraining/PendingTrainingTableData';
import HistoryTrainingTableData from './HistoryTrainingTableData';

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS
// =========================================================================
export const VarTrainingScale = 0.90;
export const VarOverallCornerRoundednessAdjuster = 0.7;
export const VarLeftSectionWidth = '22%';
export const VarRightSectionWidth = '78%';
export const VarSectionGap = 10; // in px
export const VarRightGalleryBaseHeight = 490; // in px
export const VarThreeButtonsHeightAdjuster = 80; // Height of the top three category capsules in px

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

const TAB_CONFIG = {
  pending: {
    id: 'pending',
    title: 'Pending Training',
    subtitle: 'Training that has not started yet or on going state',
    counterColor: '#818CF8', // Soft Indigo
    img: OnGoingImg
  },
  historical: {
    id: 'historical',
    title: 'Training History',
    subtitle: 'Traings that were successfully completed by user',
    counterColor: '#E57A44', // Orange
    img: HistoricalImg
  }
};

const MyTraining = ({ isDark: propIsDark }) => {
  const userContext = useUserType?.() || {};
  const [trainingCount, setTrainingCount] = useState(0);

  // Theme check: Reactive Pipeline with HTML class and MutationObserver
  const [isDark, setIsDark] = useState(() => {
    if (typeof propIsDark === 'boolean') return propIsDark;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || !!userContext.isDark;
    }
    return !!userContext.isDark;
  });

  useEffect(() => {
    if (typeof propIsDark === 'boolean') {
      setIsDark(propIsDark);
    } else if (typeof userContext.isDark === 'boolean') {
      setIsDark(userContext.isDark);
    }
  }, [propIsDark, userContext.isDark]);

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

  // Active selected view: 'pending' | 'scheduled' | 'historical'
  const [activeTab, setActiveTab] = useState('pending');

  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const lCardBg = getLCardBg(isDark);

  const activeTabConfig = TAB_CONFIG[activeTab];

  // Helper for Top Three Buttons styling
  const getTabButtonClasses = (tabId) => {
    const isSelected = activeTab === tabId;
    if (isSelected) {
      return isDark
        ? 'bg-white text-black shadow-md border-transparent'
        : 'bg-black text-white shadow-md border-transparent';
    }
    return isDark
      ? 'bg-[#1C1E24] text-white hover:bg-[#252830] border-white/10 shadow-xs'
      : 'bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs';
  };

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* 🌟 ROOT CONTAINER */}
      <div
        style={{ zoom: VarTrainingScale }}
        className="w-full max-w-[1780px] mx-auto p-3.5 -mt-2 select-none font-sans flex flex-col gap-3 min-h-[calc(108vh-0px)]"
      >
        {/* ── TOP HEADER BAR: "Training" ── */}
        <div
          className={`w-full h-[40px] py-2.5 px-6 -mt-2 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${isDark ? 'bg-white text-black border-white/10' : 'bg-[#000000] text-white border-black/10'
            }`}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] font-bold tracking-tight uppercase">
              My Training
            </h1>
          </div>
        </div>

        {/* ── 2-COLUMN MAIN WORKSPACE ── */}
        <div
          style={{ gap: `${VarSectionGap}px` }}
          className="w-full flex flex-col lg:flex-row items-start"
        >
          {/* ========================================================================= */}
          {/* 👈 LEFT COLUMN: 3 SWITCHER CAPSULES + MINI CALENDAR CARD                 */}
          {/* ========================================================================= */}
          <div
            style={{ width: VarLeftSectionWidth, flex: `0 0 ${VarLeftSectionWidth}` }}
            className="flex flex-col gap-3.5 min-w-[280px]"
          >
            {/* 1. PENDING TRAINING CAPSULE*/}
            <div
              onClick={() => setActiveTab('pending')}
              style={{
                height: `${VarThreeButtonsHeightAdjuster}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${getTabButtonClasses('pending')}`}
            >
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-[14px] font-voda font-bold tracking-tight leading-tight">
                  Pending Training
                </h3>
              </div>
              <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${activeTab === 'pending'
                ? (isDark ? 'text-slate-700' : 'text-slate-300')
                : (isDark ? 'text-slate-400' : 'text-slate-500')
                }`}>
                {TAB_CONFIG.pending.subtitle}
              </p>
              <div className="absolute -bottom-1 -right-1 w-14 h-14 pointer-events-none select-none z-0">
                <img
                  src={TAB_CONFIG.pending.img}
                  alt="On Going"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* 3. HISTORICAL TRAINING CAPSULE */}
            <div
              onClick={() => setActiveTab('historical')}
              style={{
                height: `${VarThreeButtonsHeightAdjuster}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${getTabButtonClasses('historical')}`}
            >
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-[14px] font-voda font-bold tracking-tight leading-tight">
                  Training History
                </h3>
              </div>
              <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${activeTab === 'historical'
                ? (isDark ? 'text-slate-700' : 'text-slate-300')
                : (isDark ? 'text-slate-400' : 'text-slate-500')
                }`}>
                {TAB_CONFIG.historical.subtitle}
              </p>
              <div className="absolute -bottom-1 -right-1 w-14 h-14 pointer-events-none select-none z-0">
                <img
                  src={TAB_CONFIG.historical.img}
                  alt="Historical"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* 👉 RIGHT COLUMN: DYNAMIC GALLERY (CARDS AND L-BASE VIEW)                  */}
          {/* ========================================================================= */}
          <div
            style={{ width: VarRightSectionWidth, flex: `0 0 ${VarRightSectionWidth}` }}
            className="flex flex-col min-w-0"
          >
            {/* 🌟 1. TOP-RIGHT ARM: CONTROLS & DYNAMIC BIG COUNTER (ELEVATED Z-INDEX) */}
            <div
              style={{
                backgroundColor: lCardBg,
                borderTopRightRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
                borderTopLeftRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full h-[100px] px-6 flex items-center justify-between border-t border-l border-r border-black/5 dark:border-white/5 transition-colors relative z-30"
            >
              {/* Left Side: Dynamic Big Counter + Category Headline */}
              <div className="flex items-center gap-4">
                <span
                  style={{ color: activeTabConfig.counterColor }}
                  className="text-5xl font-black leading-none tracking-tight font-voda-exb"
                >
                  {trainingCount}
                </span>
                <span className="text-[15px] font-voda font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
                  Total <br /> {activeTabConfig.title}
                </span>
              </div>

              {/* Right Side: Search Input & Sort Dropdown */}

              {/* Search Box + Export CSV Button */}
              <div className="flex items-center gap-2">
                {/* Search Box */}
                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="Search by Training Name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-[300px] h-8 pl-3 pr-8 rounded-lg
  bg-[#EEF2F6] dark:bg-[#12141A]
  font-medium text-slate-800 dark:text-slate-200
  text-[11px] placeholder-slate-400
  outline-none border border-black/10 dark:border-white/10"
                  />

                  <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>


              </div>

            </div>

            {/* 🌟 2. CONTINUOUS LOWER L-BASE: TRAINING FEED */}

            {/* LOWER SECTION: PENDING TABLE OR TRAINING HISTORY HEADER */}
            <div
              style={{
                backgroundColor: lCardBg,
                height: `${VarRightGalleryBaseHeight}px`,
                borderBottomLeftRadius: `${Math.round(
                  20 * VarOverallCornerRoundednessAdjuster
                )}px`,
                borderBottomRightRadius: `${Math.round(
                  20 * VarOverallCornerRoundednessAdjuster
                )}px`,
              }}
              className="w-full p-4 flex flex-col gap-3 overflow-y-auto border-b border-l border-r border-black/5 dark:border-white/5 transition-colors [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md"
            >
              {activeTab === "pending" ? (
                // Pending tab: display the existing table
                <PendingTrainingTableData
                  searchTerm={searchTerm}
                  onCountChange={setTrainingCount}
                />
              ) : activeTab === "historical" ? (
                // History tab: display only the title header

                <HistoryTrainingTableData searchTerm={searchTerm}
                  onCountChange={setTrainingCount} />

              ) : null}
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default MyTraining;