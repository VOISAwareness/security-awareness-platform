import React, { useState } from 'react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Mail,
  MousePointer,
  AlertTriangle,
  ShieldCheck,
  GraduationCap,
  Award
} from 'lucide-react';
import gamificationJsonData from './GamificationData.json';

// =========================================================================
// 🎛️ SCALE CONTROL & BRAND CONSTANTS
// =========================================================================
const VarGamificationScale = 0.98;

// 🌟 DEDICATED SCALE CONTROL FOR THE 6 GALLERY ITEMS (0.85 = 85%, 0.88 = 88%, etc.)
const VarGamificationGalleryItemsScale = 1.15;

const VarOverallRoundednessScale = 0.85;

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
  
  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Montserrat', 'Plus Jakarta Sans', sans-serif;
    font-weight: 900;
  }

  /* Universal Roundedness Scaler */
  .rounded-2xl { border-radius: ${Math.round(16 * VarOverallRoundednessScale)}px !important; }
  .rounded-xl  { border-radius: ${Math.round(12 * VarOverallRoundednessScale)}px !important; }
  .rounded-lg  { border-radius: ${Math.round(8 * VarOverallRoundednessScale)}px !important; }
  .rounded-md  { border-radius: ${Math.round(6 * VarOverallRoundednessScale)}px !important; }
`;

// Helper to format today's date matching "01-Aug-2026" / "1-Aug-26" pattern
const getFormattedTodayDate = () => {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Base UI Configuration merged with dynamic columns from GamificationData.json
const BASE_RULES_CONFIG = [
  {
    id: 'opened',
    title: 'OPENED',
    description: `Triggered when a recipient \nopens the simulated \nphishing email`,
    currentPoints: 0,
    tagBg: '#f9e9bc', // Soft Amber/Yellow
    icon: Mail,
    lastModified: '01-Aug-2026'
  },
  {
    id: 'clicked',
    title: 'CLICKED',
    description: `Triggered when a recipient \nclicks a suspicious link \nin the email`,
    currentPoints: -30,
    tagBg: '#fbbfbf', // Soft Coral/Salmon
    icon: MousePointer,
    lastModified: '01-Aug-2026'
  },
  {
    id: 'compromised',
    title: 'COMPROMISED',
    description: `Triggered when a recipient \nsubmits credentials or downloads \nattachments`,
    currentPoints: -50,
    tagBg: '#fc8888', // Soft Crimson/Red
    icon: AlertTriangle,
    lastModified: '01-Aug-2026'
  },
  {
    id: 'reported',
    title: 'REPORTED',
    description: `Triggered when a recipient \nreports the simulated \nphishing email`,
    currentPoints: 80,
    tagBg: '#f3e7fd', // Soft Lavender/Purple
    icon: ShieldCheck,
    lastModified: '01-Aug-2026'
  },
  {
    id: 'trained',
    title: 'TRAINED',
    description: `Triggered when a recipient \ncompletes assigned mandatory \ntraining`,
    currentPoints: 30,
    tagBg: '#d0fbdf', // Soft Mint/Green
    icon: GraduationCap,
    lastModified: '01-Aug-2026'
  },
  {
    id: 'evaluated',
    title: 'EVALUATED',
    description: `Triggered when a recipient \npasses the post-training \nevaluation assessment`,
    currentPoints: 30,
    tagBg: '#defcf3', // Soft Cyan/Teal
    icon: Award,
    lastModified: '01-Aug-2026'
  }
];

// Reads PointsAssigned and LastModifiedOn from GamificationData.json
const INITIAL_GAMIFICATION_DATA = BASE_RULES_CONFIG.map((item) => {
  const jsonRow = (gamificationJsonData || []).find(
    (row) => row?.EventOperation?.trim().toLowerCase() === item.id.toLowerCase()
  );

  return {
    ...item,
    currentPoints: jsonRow && jsonRow.PointsAssigned !== undefined ? Number(jsonRow.PointsAssigned) : item.currentPoints,
    lastModified: jsonRow && jsonRow.LastModifiedOn ? jsonRow.LastModifiedOn : item.lastModified,
    modifiedBy: jsonRow ? jsonRow.ModifiedBy : ''
  };
});

// =========================================================================
// 🌟 2-SECOND TODDLE ANIMATED LOGO BADGE (INITIAL + ON HOVER)
// =========================================================================
const AnimatedLogoBadge = ({ icon: Icon, tagBg, isDark, animTriggerKey }) => {
  return (
    <motion.div
      key={animTriggerKey}
      initial={{ rotate: 0, scale: 1, y: 0 }}
      animate={{
        rotate: [0, -14, 12, -8, 6, -2, 0],
        scale: [1, 1.15, 0.97, 1.09, 0.99, 1],
        y: [0, -3.5, 2, -1.5, 1, 0]
      }}
      transition={{
        duration: 2,
        ease: [0.22, 1, 0.36, 1],
        times: [0, 0.18, 0.38, 0.58, 0.76, 0.9, 1]
      }}
      className="relative flex items-center justify-center w-8 h-8 rounded-lg shadow-xs flex-shrink-0"
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
        border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.07)'
      }}
    >
      {/* Ambient background glow matching card theme */}
      <div
        className="absolute inset-0 rounded-lg opacity-40 blur-[3px]"
        style={{ backgroundColor: tagBg }}
      />
      <Icon
        className="w-4 h-4 relative z-10"
        style={{ color: isDark ? '#FFFFFF' : '#1E2026' }}
        strokeWidth={2.3}
      />
    </motion.div>
  );
};

const GamificationEngine = () => {
  const { isDark } = useUserType?.() || { isDark: false };
  const [elements, setElements] = useState(INITIAL_GAMIFICATION_DATA);

  // Per-card hover animation trigger counters (Initial value 0 triggers 2-second animation on mount)
  const [hoverKeys, setHoverKeys] = useState(() =>
    INITIAL_GAMIFICATION_DATA.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {})
  );

  // Editable draft values for input steppers
  const [draftInputs, setDraftInputs] = useState(() =>
    INITIAL_GAMIFICATION_DATA.reduce((acc, item) => ({ ...acc, [item.id]: item.currentPoints }), {})
  );

  const [toastMessage, setToastMessage] = useState('');

  // Trigger animation once per hover
  const handleCardMouseEnter = (id) => {
    setHoverKeys((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1
    }));
  };

  // Handle Steppers
  const handleStep = (id, delta) => {
    setDraftInputs((prev) => ({
      ...prev,
      [id]: (Number(prev[id]) || 0) + delta
    }));
  };

  // Handle Direct Input Change
  const handleInputChange = (id, val) => {
    setDraftInputs((prev) => ({
      ...prev,
      [id]: val
    }));
  };

  // Commit Update Action: Updates points and stamps the Last Modified On date
  const handleUpdate = (id) => {
    const val = Number(draftInputs[id]);
    const cleanVal = isNaN(val) ? 0 : val;
    const updatedDate = getFormattedTodayDate();

    setElements((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, currentPoints: cleanVal, lastModified: updatedDate }
          : item
      )
    );

    const target = elements.find((e) => e.id === id);
    setToastMessage(`Updated ${target?.title} to ${cleanVal > 0 ? `+${cleanVal}` : cleanVal} points`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Inner L-Container background color matching theme
  const containerBg = isDark ? '#202127' : '#EEF2F6';

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div
        style={{ zoom: VarGamificationScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3 -mt-3 select-none font-sans flex flex-col gap-3"
      >
        {/* ========================================================================= */}
        {/* ── 1. TOP FULL-WIDTH SECTION BAR: "GAMIFICATION ENGINE" ───────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full h-[40px] px-5 rounded-xl border flex items-center justify-start transition-colors duration-300 shadow-sm select-none ${
            isDark
              ? 'bg-white text-[#0B1121] border-slate-200'
              : 'bg-[#06080D] text-white border-black/10'
          }`}
        >
          <span className="text-xs sm:text-[12.5px] font-voda-exb tracking-wider uppercase">
            GAMIFICATION ENGINE
          </span>
        </div>

        {/* ========================================================================= */}
        {/* ── 2. LARGE WRAPPER CONTAINER (WHITE IN LIGHT / BLACK IN DARK) ────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
            isDark
              ? 'bg-[#15161A] border-white/10 text-white shadow-xl'
              : 'bg-white border-slate-200 text-slate-900 shadow-sm'
          }`}
        >
          {/* ── 6 SEAMLESS L-SHAPED BENTO ITEMS (Controlled via VarGamificationGalleryItemsScale) ── */}
          <div
            style={{ zoom: VarGamificationGalleryItemsScale }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full"
          >
            {elements.map((item) => {
              const currentPointsDisplay = item.currentPoints > 0 ? `+${item.currentPoints}` : item.currentPoints;

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => handleCardMouseEnter(item.id)}
                  className="relative w-full flex flex-col transition-all duration-300"
                >
                  {/* ── TOP TIER: [Left Floating Pill] + [Right L-Head] ── */}
                  <div className="flex items-stretch w-full">
                    
                    {/* 1. Left Colored Tag Pill */}
                    <div
                      className="w-[48%] rounded-lg h-[100px] p-2 sm:p-2.5 mb-2 flex flex-col justify-between flex-shrink-0 mr-2.5 shadow-2xs"
                      style={{ backgroundColor: item.tagBg }}
                    >
                      <div>
                        <h3 className="text-[15px] font-voda-exb uppercase tracking-tight text-black leading-tight">
                          {item.title}
                        </h3>
                        <p className="text-[8.5px] font-normal text-black/85 leading-snug mt-2 whitespace-pre-line">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* 2. Right L-Head (Continuous with Bottom Shelf) */}
                    <div
                      className={`flex-1 rounded-t-lg rounded-tr-lg p-3 flex flex-col justify-between relative ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                      style={{ backgroundColor: containerBg }}
                    >
                      {/* Top Header Row with Title + Toddle Animated Logo */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-[12.5px] -mt-1 font-voda-exb uppercase tracking-tight leading-tight">
                            CURRENT<br />POINTS
                          </h4>
                          <div className="text-[18px] mt-1 sm:text-[24px] font-voda-exb leading-none my-1">
                            {currentPointsDisplay}
                          </div>
                        </div>

                        {/* 🌟 Animated Logo Badge (Runs on mount & on hover) */}
                        <AnimatedLogoBadge
                          icon={item.icon}
                          tagBg={item.tagBg}
                          isDark={isDark}
                          animTriggerKey={hoverKeys[item.id]}
                        />
                      </div>

                      <p className={`text-[8px] font-normal leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Last Modified on: {item.lastModified}
                      </p>

                      {/* 🌟 Concave Arc Fillet smoothly rounding the L-junction */}
                      <svg
                        className="absolute -bottom-px -left-[14px] w-[14px] h-[14px] pointer-events-none z-20 overflow-visible"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M 0,14 A 14,14 0 0 0 14,0 V 14 H 0 Z"
                          fill={isDark ? "#202127" : "#f1f3f7"}
                        />
                      </svg>
                    </div>

                  </div>

                  {/* ── BOTTOM TIER: Continuous L-Shelf Underneath ── */}
                  <div
                    className="w-full p-3 h-[100px] rounded-lg rounded-tl-lg flex flex-col items-center gap-2 -mt-px"
                    style={{ backgroundColor: containerBg }}
                  >
                    {/* Compact Input Pill with Steppers [- | +] */}
                    <div className={`w-full max-w-[220px] mt-2 px-2.5 py-1 rounded-lg border flex items-center justify-between shadow-2xs ${
                      isDark ? 'bg-[#292B35] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}>
                      {/* Numeric Value Input */}
                      <input
                        type="number"
                        value={draftInputs[item.id] ?? ''}
                        onChange={(e) => handleInputChange(item.id, e.target.value)}
                        className="bg-transparent font-bold text-[13px] text-center w-20 -ml-5 outline-none"
                      />

                      {/* Right Stepper [- | +] */}
                      <div className={`px-2 py-0.5 rounded-md flex items-center gap-2 font-bold text-[11px] select-none ${
                        isDark ? 'bg-white/10 text-slate-200' : 'bg-[#EEF2F6] text-slate-700'
                      }`}>
                        <button
                          type="button"
                          onClick={() => handleStep(item.id, -5)}
                          className="hover:text-red-500 cursor-pointer transition-colors px-0.5 font-bold leading-none"
                          title="Decrease 5 pts"
                        >
                          –
                        </button>
                        <span className="opacity-30">|</span>
                        <button
                          type="button"
                          onClick={() => handleStep(item.id, 5)}
                          className="hover:text-green-500 cursor-pointer transition-colors px-0.5 font-bold leading-none"
                          title="Increase 5 pts"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Compact UPDATE Button */}
                    <button
                      type="button"
                      onClick={() => handleUpdate(item.id)}
                      className={`w-full max-w-[120px] h-8 sm:h-10 md:h-6 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs active:scale-98 flex items-center justify-center ${
                        isDark
                          ? 'bg-[#32353E] hover:bg-[#3D404A] text-white border border-white/10'
                          : 'bg-[#373A40] hover:bg-[#25272B] text-white'
                      }`}
                    >
                      UPDATE
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 3. TOAST CONFIRMATION NOTIFICATION ─────────────────────────────────── */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-xl bg-[#22C55E] text-white text-xs font-voda-exb shadow-xl flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default GamificationEngine;