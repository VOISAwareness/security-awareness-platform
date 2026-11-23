import { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS
// =========================================================================
export const VarCoverImageScale = 0.94;
export const VarOverallCornerRoundednessAdjuster = 0.5;
export const VarSectionGap = 10; // in px

// =========================================================================
// 🔤 VODAFONE TYPOGRAPHY & CORNER STYLES
// =========================================================================
const VODAFONE_FONT_STYLE =
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');\n" +
  ".font-voda-exb { font-family: 'Vodafone ExB', 'Montserrat', sans-serif; font-weight: 900; }\n" +
  ".font-mono-tech { font-family: 'JetBrains Mono', monospace; }\n" +
  ".rounded-3xl { border-radius: " + Math.round(28 * VarOverallCornerRoundednessAdjuster) + "px !important; }\n" +
  ".rounded-2xl { border-radius: " + Math.round(20 * VarOverallCornerRoundednessAdjuster) + "px !important; }\n" +
  ".rounded-xl  { border-radius: " + Math.round(14 * VarOverallCornerRoundednessAdjuster) + "px !important; }\n" +
  ".rounded-lg  { border-radius: " + Math.round(10 * VarOverallCornerRoundednessAdjuster) + "px !important; }\n" +
  ".rounded-md  { border-radius: " + Math.round(6 * VarOverallCornerRoundednessAdjuster) + "px !important; }\n";

const CoverImageCatalogueModal = ({ isDark: propIsDark }) => {
  const userContext = useUserType?.() || {};

  // Theme check: Reactive pipeline with HTML class and MutationObserver
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
      return;
    }
    if (typeof userContext.isDark === 'boolean') {
      setIsDark(userContext.isDark);
    }
  }, [propIsDark, userContext.isDark]);

  useEffect(() => {
    if (typeof propIsDark === 'boolean' || typeof document === 'undefined') return;
    const checkDark = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(hasDarkClass || !!userContext.isDark);
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [propIsDark, userContext.isDark]);

  return (
    <>
      <style>{String(VODAFONE_FONT_STYLE)}</style>

      {/* 🌟 ROOT CONTAINER */}
      <div
        style={{ zoom: VarCoverImageScale }}
        className="w-full max-w-[1780px] mx-auto p-3.5 -mt-2 select-none font-sans flex flex-col gap-3"
      >
        {/* ── TOP HEADER BAR: "COVER IMAGE CATALOGUE" ── */}
        <div
          className={
            'w-full h-[40px] py-2.5 px-6 -mt-2 rounded-2xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ' +
            (isDark
              ? 'bg-white text-black border-white/10'
              : 'bg-[#000000] text-white border-black/10')
          }
        >
          <div className="flex items-center gap-3">
            <h1 className="text-[13.5px] font-bold tracking-tight uppercase">
              COVER IMAGE CATALOGUE
            </h1>
          </div>
        </div>

        {/* ── MAIN WORKSPACE PLACEHOLDER ── */}
        <div
          style={{ gap: VarSectionGap + 'px' }}
          className="w-full flex flex-col items-start"
        >
          <div
            className={
              'w-full p-8 rounded-2xl border shadow-xs flex flex-col items-center justify-center text-center gap-2 min-h-[320px] ' +
              (isDark
                ? 'bg-[#1C1E24] border-white/10 text-white'
                : 'bg-[#FFFFFF] border-slate-200 text-slate-900')
            }
          >
            <div
              className={
                'w-12 h-12 rounded-xl flex items-center justify-center mb-1 ' +
                (isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600')
              }
            >
              <ImageIcon className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold uppercase tracking-tight">
              Welcome to Cover Image Catalogue
            </h2>
            <p
              className={
                'text-xs max-w-md ' +
                (isDark ? 'text-slate-400' : 'text-slate-500')
              }
            >
              This Cover Image Catalogue module is ready for implementation.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CoverImageCatalogueModal;