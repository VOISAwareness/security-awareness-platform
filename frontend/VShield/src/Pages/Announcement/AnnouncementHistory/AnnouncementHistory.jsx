import { useState, useEffect } from 'react';
import {
  Search
} from 'lucide-react';
import { useUserType } from '../../../UserTypeContext/UserTypeContext';

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS
// =========================================================================
export const VarTrainingScale = 0.94;
export const VarOverallCornerRoundednessAdjuster = 0.5;
export const VarLeftSectionWidth = '22%';
export const VarRightSectionWidth = '77.3%';
export const VarSectionGap = 10; // in px
export const VarRightGalleryBaseHeight = 465; // in px
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



const AnnouncementHistory = ({ isDark: propIsDark }) => {
  const userContext = useUserType?.() || {};

  // Theme check: Reactive Pipeline with HTML class and MutationObserver
  const [isDark, setIsDark] = useState(() => {
    if (typeof propIsDark === 'boolean') return propIsDark;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || !!userContext.isDark;
    }
    return !!userContext.isDark;
  });  

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* 🌟 ROOT CONTAINER */}
      <div
        style={{ zoom: VarTrainingScale }}
        className="w-full max-w-[2560px] mx-auto p-3.5 -mt-2 select-none font-sans flex flex-col gap-3"
      >
        {/* ── TOP HEADER BAR: "My Training" ── */}
        <div
          className={`w-full h-[40px] py-2.5 px-6 -mt-2 rounded-2xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${isDark ? 'bg-white text-black border-white/10' : 'bg-[#000000] text-white border-black/10'
            }`}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-[13.5px] font-bold tracking-tight uppercase">
              Announcement Template History
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
          
            <div className="flex items-center justify-between gap-3 flex-shrink-0">
                <h1>Welcome to Announcement Template History</h1>
            </div>

          </div>
        
      </div>
    </>
  );
};

export default AnnouncementHistory;