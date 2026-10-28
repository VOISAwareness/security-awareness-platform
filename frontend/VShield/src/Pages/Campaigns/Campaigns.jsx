import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';

// Assets imported strictly from src/assets/CampaignsAssets
import OnGoingImg from '../../assets/CampaignsAssets/OnGoingCampaignsImage.png';
import ScheduledImg from '../../assets/CampaignsAssets/ScheduledCampaignsImage.png';
import HistoricalImg from '../../assets/CampaignsAssets/HistoricalCampaignsImage.png';
import CancelledImg from '../../assets/CampaignsAssets/CancelledCampaignsImage.png';
import CalendarWhiteIcon from '../../assets/CampaignsAssets/CalenderWhiteIconCampaignsImage.png';
import CalendarBlackIcon from '../../assets/CampaignsAssets/CalenderBlackIconCampaignsImage.png';

// Fallback direct JSON data
import initialCampaignsData from './CampaignsData.json';

// Galleries
import OnGoingCampaignsGallery from './OngoingCampaignsGalleryComponents/OnGoingCampaignsGallery';
import ScheduledCampaignsGallery from './ScheduledCampaignsGalleryComponents/ScheduledCampaignsGallery';
import HistoricalCampaignsGallery from './HistoricalCampaignsGalleryComponents/HistoricalCampaignsGallery';
import CancelledCampaignsGallery from './CancelledCampaignsGalleryComponents/CancelledCampaignsGallery';

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS
// =========================================================================
export const VarCampaignsScale = 0.90;
export const VarOverallCornerRoundednessAdjuster = 0.7;
export const VarLeftSectionWidth = '22%';
export const VarRightSectionWidth = '78%';
export const VarSectionGap = 10; // in px
export const VarFourButtonsHeightAdjuster = 83; // Height of the top four category capsules in px
export const VarCalanderHeightAdjuster = 'auto'; // Height of calendar card in px or 'auto'
export const VarCalanderSectionVisibility = 'off'; // 'on' or 'off'

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
  .rounded-xl { border-radius: ${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px !important; }
  .rounded-lg { border-radius: ${Math.round(10 * VarOverallCornerRoundednessAdjuster)}px !important; }
  .rounded-md { border-radius: ${Math.round(6 * VarOverallCornerRoundednessAdjuster)}px !important; }
`;

const TAB_CONFIG = {
  ongoing: {
    id: 'ongoing',
    title: 'On Going Campaigns',
    subtitle: "Campaigns that currently started and haven't end yet",
    counterColor: '#818CF8',
    img: OnGoingImg
  },
  scheduled: {
    id: 'scheduled',
    title: 'Scheduled Campaigns',
    subtitle: 'Campaigns that are successfully scheduled to run in coming days',
    counterColor: '#8ED973',
    img: ScheduledImg
  },
  historical: {
    id: 'historical',
    title: 'Historical Campaigns',
    subtitle: 'Campaigns that were successfully ended over time',
    counterColor: '#E57A44',
    img: HistoricalImg
  },
  cancelled: {
    id: 'cancelled',
    title: 'Cancelled Campaigns',
    subtitle: 'Campiagns that were schedulled and then cancelled for some reason',
    counterColor: '#EF4444',
    img: CancelledImg
  }
};

const Campaigns = ({ isDark: propIsDark }) => {
  const userContext = useUserType?.() || {};

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

  const [activeTab, setActiveTab] = useState('ongoing');
  const [calendarDate, setCalendarDate] = useState(new Date());

  const campaignsList = useMemo(() => {
    try {
      const stored = localStorage.getItem('voisshield_campaigns_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return initialCampaignsData?.campaigns || [];
  }, []);

  const calendarMonthDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }
    const remaining = 35 - days.length;
    for (let i = 1; i <= (remaining > 0 ? remaining : 42 - days.length); i++) {
      days.push({ day: i, isCurrentMonth: false });
    }
    return days;
  }, [calendarDate]);

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
        style={{ zoom: VarCampaignsScale }}
        className="w-full max-w-[1780px] mx-auto p-3.5 -mt-2 select-none font-sans flex flex-col gap-3 min-h-[calc(108vh-0px)]"
      >
        {/* ── TOP HEADER BAR: "Campaigns" ── */}
        <div
          className={`w-full h-[40px] py-2.5 px-6 -mt-2 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${
            isDark ? 'bg-white text-black border-white/10' : 'bg-[#000000] text-white border-black/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] font-bold tracking-tight uppercase">
              Campaigns
            </h1>
          </div>
        </div>

        {/* ── 2-COLUMN MAIN WORKSPACE ── */}
        <div
          style={{ gap: `${VarSectionGap}px` }}
          className="w-full flex flex-col lg:flex-row items-start"
        >
          {/* ========================================================================= */}
          {/* 👈 LEFT COLUMN: 4 SWITCHER CAPSULES + MINI CALENDAR CARD                 */}
          {/* ========================================================================= */}
          <div
            style={{ width: VarLeftSectionWidth, flex: `0 0 ${VarLeftSectionWidth}` }}
            className="flex flex-col gap-3.5 min-w-[280px]"
          >
            {/* 1. ON GOING CAMPAIGNS CAPSULE */}
            <div
              onClick={() => setActiveTab('ongoing')}
              style={{
                height: `${VarFourButtonsHeightAdjuster}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${getTabButtonClasses('ongoing')}`}
            >
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-[14px] font-voda font-bold tracking-tight leading-tight">
                  On Going Campaigns
                </h3>
              </div>
              <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                activeTab === 'ongoing'
                  ? (isDark ? 'text-slate-700' : 'text-slate-300')
                  : (isDark ? 'text-slate-400' : 'text-slate-500')
              }`}>
                {TAB_CONFIG.ongoing.subtitle}
              </p>
              <div className="absolute -bottom-2 -right-1 w-14 h-16 pointer-events-none select-none z-0">
                <img
                  src={TAB_CONFIG.ongoing.img}
                  alt="On Going"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* 2. SCHEDULED CAMPAIGNS CAPSULE */}
            <div
              onClick={() => setActiveTab('scheduled')}
              style={{
                height: `${VarFourButtonsHeightAdjuster}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className={`relative p-3.5 -mt-1 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${getTabButtonClasses('scheduled')}`}
            >
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-[14px] font-voda font-bold tracking-tight leading-tight">
                  Scheduled Campaigns
                </h3>
              </div>
              <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                activeTab === 'scheduled'
                  ? (isDark ? 'text-slate-700' : 'text-slate-300')
                  : (isDark ? 'text-slate-400' : 'text-slate-500')
              }`}>
                {TAB_CONFIG.scheduled.subtitle}
              </p>
              <div className="absolute -bottom-2 -right-1 w-14 h-16 pointer-events-none select-none z-0">
                <img
                  src={TAB_CONFIG.scheduled.img}
                  alt="Scheduled"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* 3. HISTORICAL CAMPAIGNS CAPSULE */}
            <div
              onClick={() => setActiveTab('historical')}
              style={{
                height: `${VarFourButtonsHeightAdjuster}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className={`relative p-3.5 -mt-1 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${getTabButtonClasses('historical')}`}
            >
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-[14px] font-voda font-bold tracking-tight leading-tight">
                  Historical Campaigns
                </h3>
              </div>
              <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                activeTab === 'historical'
                  ? (isDark ? 'text-slate-700' : 'text-slate-300')
                  : (isDark ? 'text-slate-400' : 'text-slate-500')
              }`}>
                {TAB_CONFIG.historical.subtitle}
              </p>
              <div className="absolute -bottom-1 -right-2 w-16 h-14 pointer-events-none select-none z-0">
                <img
                  src={TAB_CONFIG.historical.img}
                  alt="Historical"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* 4. CANCELLED CAMPAIGNS CAPSULE */}
            <div
              onClick={() => setActiveTab('cancelled')}
              style={{
                height: `${VarFourButtonsHeightAdjuster}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className={`relative p-3.5 mb-3 -mt-1 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${getTabButtonClasses('cancelled')}`}
            >
              <div className="flex justify-between items-start relative z-10">
                <h3 className="text-[14px] font-voda font-bold tracking-tight leading-tight">
                  Cancelled Campaigns
                </h3>
              </div>
              <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[155px] ${
                activeTab === 'cancelled'
                  ? (isDark ? 'text-slate-700' : 'text-slate-300')
                  : (isDark ? 'text-slate-400' : 'text-slate-500')
              }`}>
                {TAB_CONFIG.cancelled.subtitle}
              </p>
              <div className="absolute -bottom-2 -right-3 w-20 h-16 pointer-events-none select-none z-0">
                <img
                  src={TAB_CONFIG.cancelled.img}
                  alt="Cancelled"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            </div>

            {/* 5. DOCKED CALENDAR CARD */}
            {VarCalanderSectionVisibility === 'on' && (
              <div
                style={{
                  borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`,
                  ...(VarCalanderHeightAdjuster !== 'auto' && VarCalanderHeightAdjuster
                    ? { height: typeof VarCalanderHeightAdjuster === 'number' ? `${VarCalanderHeightAdjuster}px` : VarCalanderHeightAdjuster }
                    : {})
                }}
                className="w-full bg-[#0B0C10] dark:bg-[#ffffff] text-white p-4 shadow-md border border-white/10 flex flex-col gap-3 select-none"
              >
                <div className="flex items-center justify-between border-b border-white/10 dark:border-black/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <img
                      src={isDark ? CalendarBlackIcon : CalendarWhiteIcon}
                      alt="Calendar Icon"
                      className="w-4 h-4 object-contain dark:invert"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <span className="text-[13.5px] font-voda font-bold tracking-tight text-white dark:text-black">
                      Calendar
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between px-1">
                  <span className="text-[12px] font-bold text-white dark:text-black">
                    {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <ArrowUp className="w-3 h-3 text-white dark:text-black" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                      className="p-1 rounded bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3 text-white dark:text-black" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <span key={i}>{d}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1.5 text-center text-[10.5px]">
                  {calendarMonthDays.map((item, idx) => {
                    const isCurrentDay = item.isCurrentMonth && item.day === 5;
                    return (
                      <div key={idx} className="flex items-center justify-center h-6">
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold ${
                            isCurrentDay
                              ? 'bg-[#3730A3] text-white shadow-xs'
                              : item.isCurrentMonth
                                ? 'text-white dark:text-black'
                                : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 👉 RIGHT COLUMN: RENDER SELECTED GALLERY                                 */}
          {/* ========================================================================= */}
          <div
            style={{ width: VarRightSectionWidth, flex: `0 0 ${VarRightSectionWidth}` }}
            className="flex flex-col min-w-0"
          >
            {activeTab === 'ongoing' && (
              <OnGoingCampaignsGallery
                campaigns={campaignsList}
                isDark={isDark}
              />
            )}

            {activeTab === 'scheduled' && (
              <ScheduledCampaignsGallery
                campaigns={campaignsList}
                isDark={isDark}
              />
            )}

            {activeTab === 'historical' && (
              <HistoricalCampaignsGallery
                campaigns={campaignsList}
                isDark={isDark}
              />
            )}

            {activeTab === 'cancelled' && (
              <CancelledCampaignsGallery
                campaigns={campaignsList}
                isDark={isDark}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Campaigns;