import React, { useState, useEffect } from 'react';
import MySpacePart2 from './MySpacePart2';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ShieldCheck,
  Star,
  Users,
  Check,
  Info,
  Mail,
  Bell,
  GraduationCap,
  Sparkles,
  ShieldAlert,
  Award,
  Activity,
  Clock,
  User as UserIcon
} from 'lucide-react';

// Card Background Texture Assets
import MySpaceCardBgLight from '../../assets/MySpaceCardBgLightMode.png';
import MySpaceCardBgDark from '../../assets/MySpaceCardBgDarkMode.png';

// =========================================================================
// 🎛️ SCALE CONTROL VARIABLES
// =========================================================================
const VarMySpaceScale = 0.975;

// 🌟 GLOBAL CORNER RADIUS SCALE (Reduces roundedness universally by ~2-4px)
const VarOverallMySpaceRoundednessScale = 0.75;

// 🌟 MY ACTIVITIES DONUT CHART SCALE
const VarMyActivitiesDonutScale = 1.05;

// =========================================================================
// 🎛️ PART 2 (VIDEO GALLERY) POSITION & SCALE CONTROLS
// =========================================================================
const VarMySpacePart2Scale = 1.0;       // Scale of Part 2 (1.0 = 100%, 0.95 = 95%, etc.)
const VarMySpacePart2OffsetY = 0;       // Move Up (-) / Down (+) in px
const VarMySpacePart2OffsetX = 0;       // Move Left (-) / Right (+) in px
const VarMySpacePart2MarginTop = 14;    // Gap between Explore bar & Part 2 in px

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
  
  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Vodafone', 'Montserrat', 'Plus Jakarta Sans', sans-serif;
    font-weight: 900;
  }

  /* Universal Roundedness Scaler */
  .rounded-2xl { border-radius: ${Math.round(16 * VarOverallMySpaceRoundednessScale)}px !important; }
  .rounded-xl  { border-radius: ${Math.round(12 * VarOverallMySpaceRoundednessScale)}px !important; }
  .rounded-lg  { border-radius: ${Math.round(8 * VarOverallMySpaceRoundednessScale)}px !important; }
  .rounded-md  { border-radius: ${Math.round(6 * VarOverallMySpaceRoundednessScale)}px !important; }
`;

// =========================================================================
// 🌟 1. UNBREAKABLE ELASTIC LANYARD & SNAP-BACK ID BADGE (LOWERED BY 4PX)
// =========================================================================
const DraggableIdBadge = ({ isDark, userName, email, tower }) => {
  const cardBgImage = isDark ? MySpaceCardBgDark : MySpaceCardBgLight;

  const x = useMotionValue(180);
  const y = useMotionValue(-350);

  const rotateZ = useTransform(x, [-120, 120], [-18, 18]);
  const rotateY = useTransform(x, [-120, 120], [-10, 10]);
  const rotateX = useTransform(y, [-100, 100], [8, -8]);

  // Anchored curve math with +4px vertical downward offset
  const strapPath = useTransform([x, y], ([latestX, latestY]) => {
    const startX = 150;
    const startY = 4;
    const targetX = 150 + latestX;
    const targetY = 79 + latestY;
    const controlX = 150 + latestX * 0.35;
    const controlY = (targetY + startY) / 2;
    return `M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;
  });

  useEffect(() => {
    const controlsY = animate(y, [-350, 26, -14, 6, -2, 0], {
      duration: 1.9,
      ease: [0.22, 1, 0.36, 1],
      times: [0, 0.38, 0.62, 0.78, 0.9, 1]
    });

    const controlsX = animate(x, [180, -48, 24, -10, 3, 0], {
      duration: 1.9,
      ease: [0.22, 1, 0.36, 1],
      times: [0, 0.38, 0.62, 0.78, 0.9, 1]
    });

    return () => {
      controlsY.stop();
      controlsX.stop();
    };
  }, []);

  return (
    <div className="relative w-full h-[524px] flex flex-col items-center justify-start select-none overflow-visible pt-1">
      {/* ── Continuous Lanyard Ribbon (SVG Shifted Down 4px) ── */}
      <svg
        className="absolute top-1 left-0 w-full h-[180px] pointer-events-none z-10 overflow-visible"
        viewBox="0 0 300 180"
      >
        <motion.path
          d={strapPath}
          fill="none"
          stroke={isDark ? "#d6d6de" : "#1e2026"}
          strokeWidth="20"
          strokeLinecap="round"
        />
        <motion.path
          d={strapPath}
          fill="none"
          stroke={isDark ? "#3c3b3b" : "#dcdee4"}
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeOpacity="0.9"
          strokeLinecap="round"
        />
      </svg>

      {/* ── Interactive Snap-Back Spring Card (Lowered by 4px: mt-[58px]) ── */}
      <motion.div
        drag
        dragSnapToOrigin={true}
        dragElastic={0.45}
        dragTransition={{ bounceStiffness: 340, bounceDamping: 18 }}
        style={{
          x,
          y,
          rotateZ,
          rotateX,
          rotateY,
          transformPerspective: 1000
        }}
        className="relative z-20 mt-[58px] w-[290px] cursor-grab active:cursor-grabbing"
      >
        <div
          className={`w-full rounded-2xl p-4 sm:p-5 flex flex-col justify-between items-center text-center relative overflow-hidden border shadow-xl transition-all duration-300 min-h-[415px] ${
            isDark
              ? 'bg-[#15161a] border-white/10 text-white shadow-[0_20px_45px_rgba(0,0,0,0.85)]'
              : 'bg-white border-slate-200/90 text-slate-900 shadow-[0_16px_38px_rgba(0,0,0,0.08)]'
          }`}
          style={{
            backgroundImage: `url(${cardBgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Lanyard Top Punch Hole */}
          <div className="w-9 h-1.5 -mt-1 mb-1.5 rounded-full bg-slate-300 dark:bg-[#0c0d10] border border-black/15 dark:border-white/10 shadow-inner" />

          {/* User Photo & Info */}
          <div className="flex flex-col items-center w-full z-10">
            <div className="w-16 h-16 rounded-full bg-[#1e2026] dark:bg-[#111216] border-2 border-white/80 dark:border-white/10 shadow-md flex items-center justify-center mb-2 text-white">
              <UserIcon className="w-9 h-9 text-slate-200" strokeWidth={1.5} />
            </div>

            <h2 className="font-voda-exb text-[17px] uppercase tracking-tight text-inherit leading-tight">
              {userName}
            </h2>
            <span className={`text-[9.5px] font-semibold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {email}
            </span>
            <span className={`text-[9.5px] font-bold mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
              {tower}
            </span>
          </div>

          {/* Divider */}
          <div className="w-full my-2 z-10">
            <div className="w-full h-px bg-black/10 dark:bg-white/10 shadow-xs" />
          </div>

          {/* Restored Risk Score Meter */}
          <div className="flex flex-col items-center w-full z-10">
            <div className="flex items-center gap-1.5 justify-center">
              <span className={`text-[11px] font-voda-exb tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Risk Score
              </span>
              <Info className="w-3 h-3 text-slate-400 cursor-pointer" />
            </div>

            <div className="w-20 h-1 rounded-full mt-1 overflow-hidden bg-gradient-to-r from-[#22c55e] via-[#eab308] to-[#ef4444] shadow-inner" />

            <span className="text-[17px] font-voda-exb text-[#22c55e] leading-none mt-1.5">
              18%
            </span>
            <span className={`text-[9px] font-bold mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Good
            </span>
          </div>

          {/* Metrics Row: Campaigns Involved & Certificates Earned */}
          <div className="w-full grid grid-cols-2 gap-2 mt-2 z-10 text-center">
            {/* 1. Campaigns Involved */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
              <div className="flex items-center justify-center gap-1">
                <span className={`text-[8.5px] font-bold uppercase tracking-tight leading-tight text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Campaigns<br />Involved
                </span>
                <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
              </div>
              <span className="text-[16px] font-voda-exb mt-0.5 text-inherit leading-none">
                07
              </span>
            </div>

            {/* 2. Certificates Earned */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
              <div className="flex items-center justify-center gap-1">
                <span className={`text-[8.5px] font-bold uppercase tracking-tight leading-tight text-center ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Certificates<br />Earned
                </span>
                <Award className="w-3 h-3 text-purple-400 flex-shrink-0" />
              </div>
              <span className="text-[16px] font-voda-exb mt-0.5 text-inherit leading-none">
                04
              </span>
            </div>
          </div>

          {/* Outlined LEADERBOARD Button */}
          <div className="w-full mt-2.5 z-10">
            <button
              type="button"
              className={`w-full py-1.5 px-3 rounded-lg border text-[10px] font-voda-exb uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? 'bg-white/20 border-white/20 text-white hover:bg-white/15'
                  : 'bg-black/5 border-slate-300 text-slate-800 hover:bg-black/15'
              }`}
            >
              <Users className="w-3 h-3" />
              LEADERBOARD
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ==========================================
// 2. CIRCULAR ACTIVITY GAUGE
// ==========================================
const ActivityGauge = ({ percentage, subLabel, color, isDark }) => {
  const radius = 35;
  const stroke = 6;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div
      style={{ transform: `scale(${VarMyActivitiesDonutScale})` }}
      className="relative flex items-center justify-center w-[80px] h-[80px] flex-shrink-0"
    >
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90 overflow-visible">
        <circle
          stroke={isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <motion.circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={`text-[14px] font-voda-exb leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {percentage}%
        </span>
        {subLabel && (
          <span className={`text-[6.5px] font-bold uppercase tracking-tight mt-0.5 leading-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// 🌟 3. HIGH-EFFICIENCY VERTICAL ACCORDION GALLERY
// =========================================================================
const VerticalAccordionContainer = ({ isDark }) => {
  const [active, setActive] = useState(0); // 0: Activities (Default), 1: Risk Score, 2: Points & Badges

  const sections = [
    {
      id: 'activities',
      title: 'My Activities',
      line1: 'MY',
      line2: 'ACTIVITIES',
      color: '#9b9dff',
      subText: 'Activities you were involved in'
    },
    {
      id: 'risk',
      title: 'Risk Score',
      line1: 'RISK',
      line2: 'SCORE',
      color: '#F8B2C0',
      subText: 'Security Posture'
    },
    {
      id: 'badges',
      title: 'Points and Badges',
      line1: 'POINTS &',
      line2: 'BADGES',
      color: '#69edd7',
      subText: 'Achievements Matrix'
    }
  ];

  return (
    <div className="flex flex-col gap-2.5 w-full h-[480px] min-w-0 select-none">
      {sections.map((section, index) => {
        const isActive = index === active;

        return (
          <motion.div
            key={section.id}
            layout
            transition={{ duration: 0.45, ease: [0.25, 1, 0.5, 1] }}
            onMouseEnter={() => setActive(index)}
            className={`relative rounded-[8px] border transition-colors duration-300 overflow-hidden cursor-pointer ${
              isActive
                ? `flex-1 ${
                    isDark
                      ? 'bg-[#15161a] border-white/10 shadow-xl'
                      : 'bg-white border-slate-200 shadow-sm'
                  } p-4 sm:p-5 flex flex-col justify-between`
                : `h-[42px] flex-shrink-0 ${
                    isDark
                      ? 'bg-[#18191f] border-white/5 hover:border-white/15'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  } flex items-center justify-between`
            }`}
          >
            <AnimatePresence mode="wait" initial={false}>
              {/* ── UNEXPANDED STRIP (Zero Color Bleeding) ── */}
              {!isActive ? (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-full h-full flex items-center justify-between"
                >
                  {/* Left Pastel Solid Tag with 2-line Text */}
                  <div
                    className="h-full px-4 flex flex-col justify-center items-start min-w-[130px] flex-shrink-0"
                    style={{ backgroundColor: section.color }}
                  >
                    <span className="text-[11px] font-voda font-bold uppercase leading-none text-black">
                      {section.line1}
                    </span>
                    <span className="text-[11px] font-voda font-bold uppercase leading-none text-black mt-0.5">
                      {section.line2}
                    </span>
                  </div>

                  {/* Dynamic Right Side for Unexpanded Strip */}
                  <div className="flex items-center gap-3 pr-4">
                    {/* Section 1 (Risk Score): Display 18% Good */}
                    {index === 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-voda-exb text-[#22c55e] leading-none">
                          18%
                        </span>
                        <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Good
                        </span>
                      </div>
                    )}

                    {/* Section 2 (Points & Badges): Display My Points | My Rank */}
                    {index === 2 && (
                      <div className="flex items-center gap-2.5">
                        {/* My Points */}
                        <div className="flex items-center gap-1">
                          <span className={`text-[9.5px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            My Points
                          </span>
                          <span className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            +85
                          </span>
                          <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] text-white flex items-center justify-center text-[7.5px] font-bold">
                            <Check className="w-2 h-2 stroke-[3]" />
                          </span>
                        </div>

                        {/* Rounded Divider */}
                        <span className="w-0.5 h-3.5 rounded-full bg-black/15 dark:bg-white/20" />

                        {/* My Rank */}
                        <div className="flex items-center gap-1">
                          <span className={`text-[9.5px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            My Rank
                          </span>
                          <span className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            72
                          </span>
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        </div>
                      </div>
                    )}

                    {/* End Dot Indicator */}
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: section.color }}
                    />
                  </div>
                </motion.div>
              ) : (
                /* ── EXPANDED FULL VIEW ── */
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="w-full h-full flex flex-col justify-between"
                >
                  {/* Header Bar */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-4 rounded-full"
                        style={{ backgroundColor: section.color }}
                      />
                      <h3 className={`text-xs font-voda font-bold tracking-tight uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {section.title}
                      </h3>
                    </div>
                    <span className={`text-[9.5px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {section.subText}
                    </span>
                  </div>

                  {/* ── SECTION 0: MY ACTIVITIES (SEAMLESS CONNECTED L-SHAPED BENTO CONTAINERS) ── */}
                  {index === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch flex-1 min-h-0 pt-2 pb-0.5">
                      
                      {/* ── CARD 1: PHISHING SIMULATIONS ── */}
                      <div className="flex flex-col h-full min-w-0 justify-between">
                        {/* Top Section */}
                        <div className="flex items-end justify-between w-full relative">
                          {/* Top-Left Isolated Box */}
                          <div
                            className={`w-[calc(50%-4px)] h-[120px] p-2.5 rounded-xl flex flex-col justify-start items-start text-left transition-colors mb-2 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#9b9dff]/20'
                            }`}
                          >
                            <h4 className={`text-[14.5px] font-voda-exb uppercase leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              PHISHING<br />SIMULATIONS
                            </h4>
                            <p className={`text-[7.5px] leading-[1.25] mt-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Data captured through your <br /> interaction with security<br /> training modules
                            </p>
                          </div>

                          {/* Top-Right L-Head */}
                          <div
                            className={`w-[calc(50%-4px)] h-[128px] rounded-t-xl flex items-center justify-center transition-colors relative z-10 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                            }`}
                          >
                            <ActivityGauge percentage={28} subLabel="Compromised" color="#fb7185" isDark={isDark} />

                            {/* Corrected Concave Inner Corner Fillet */}
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

                        {/* Bottom L-Foot with Enhanced Styled Metric Tiles */}
                        <div
                          className={`flex-1 w-full p-2.5 rounded-b-xl rounded-tl-xl flex flex-col justify-between gap-1 transition-colors -mt-px relative z-10 ${
                            isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                          }`}
                        >
                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Received</span>
                            </div>
                            <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>10</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Opened</span>
                            </div>
                            <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>2</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Clicked</span>
                            </div>
                            <strong className="text-[12px] font-voda-exb text-amber-500">2</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#fb7185]" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Compromised</span>
                            </div>
                            <strong className="text-[12px] font-voda-exb text-[#fb7185]">2</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Reported</span>
                            </div>
                            <strong className="text-[12px] font-voda-exb text-[#22c55e]">0</strong>
                          </div>
                        </div>
                      </div>

                      {/* ── CARD 2: SECURITY BULLETINS ── */}
                      <div className="flex flex-col h-full min-w-0 justify-between">
                        {/* Top Section */}
                        <div className="flex items-end justify-between w-full relative">
                          {/* Top-Left Isolated Box */}
                          <div
                            className={`w-[calc(50%-4px)] h-[120px] p-2.5 rounded-xl flex flex-col justify-start items-start text-left transition-colors mb-2 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#9b9dff]/20'
                            }`}
                          >
                            <h4 className={`text-[14.5px] font-voda-exb uppercase leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              ANNOUNCEMENTS<br />INTERACTIONS
                            </h4>
                            <p className={`text-[7.5px] leading-[1.25] mt-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Data captured through your <br /> interaction with security<br /> training modules
                            </p>
                          </div>

                          {/* Top-Right L-Head */}
                          <div
                            className={`w-[calc(50%-4px)] h-[128px] rounded-t-xl flex items-center justify-center transition-colors relative z-10 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                            }`}
                          >
                            <ActivityGauge percentage={90} subLabel={<span className="text-center block w-full">Acknow<br />ledged</span>} color="#22c55e" isDark={isDark} />

                            {/* Corrected Concave Inner Corner Fillet */}
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

                        {/* Bottom L-Foot with Enhanced Styled Metric Tiles */}
                        <div
                          className={`flex-1 w-full p-2.5 rounded-b-xl rounded-tl-xl flex flex-col justify-between gap-1 transition-colors -mt-px relative z-10 ${
                            isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                          }`}
                        >
                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Received</span>
                            </div>
                            <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>10</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Opened</span>
                            </div>
                            <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>10</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Acknowledged</span>
                            </div>
                            <strong className={`text-[12px] font-voda-exb text-[#22c55e]`}>9</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Pending</span>
                            </div>
                            <strong className="text-[12px] font-voda-exb text-amber-500">1</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Response Status</span>
                            </div>
                            <span className="text-[9.5px] font-bold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded">
                              Compliant
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── CARD 3: SECURITY TRAININGS ── */}
                      <div className="flex flex-col h-full min-w-0 justify-between">
                        {/* Top Section */}
                        <div className="flex items-end justify-between w-full relative">
                          {/* Top-Left Isolated Box */}
                          <div
                            className={`w-[calc(50%-4px)] h-[120px] p-2.5 rounded-xl flex flex-col justify-start items-start text-left transition-colors mb-2 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#9b9dff]/20'
                            }`}
                          >
                            <h4 className={`text-[14.5px] font-voda-exb uppercase leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              TRAININGS<br />DETAIL
                            </h4>
                            <p className={`text-[7.5px] leading-[1.25] mt-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Data captured through your <br /> interaction with security<br /> training modules
                            </p>
                          </div>

                          {/* Top-Right L-Head */}
                          <div
                            className={`w-[calc(50%-4px)] h-[128px] rounded-t-xl flex items-center justify-center transition-colors relative z-10 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                            }`}
                          >
                            <ActivityGauge percentage={90} subLabel="Evaluated" color="#990099" isDark={isDark} />

                            {/* Corrected Concave Inner Corner Fillet */}
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

                        {/* Bottom L-Foot with Enhanced Styled Metric Tiles */}
                        <div
                          className={`flex-1 w-full p-2.5 rounded-b-xl rounded-tl-xl flex flex-col justify-between gap-1 transition-colors -mt-px relative z-10 ${
                            isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                          }`}
                        >
                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Assigned</span>
                            </div>
                            <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>10</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Trained</span>
                            </div>
                            <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>2</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Evaluated</span>
                            </div>
                            <strong className={`text-[12px] font-voda-exb text-[#22c55e]`}>2</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Pending</span>
                            </div>
                            <strong className="text-[12px] font-voda-exb text-amber-500">0</strong>
                          </div>

                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Expired</span>
                            </div>
                            <strong className="text-[12px] font-voda-exb text-slate-400">0</strong>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* SECTION 1: RISK SCORE (Placeholder) */}
                  {index === 1 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner"
                        style={{
                          backgroundColor: `${section.color}20`,
                          border: `1px solid ${section.color}40`
                        }}
                      >
                        <ShieldAlert className="w-7 h-7" style={{ color: section.color }} />
                      </div>
                      <h4 className={`text-base font-voda-exb uppercase tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Risk Score Matrix
                      </h4>
                      <p className={`text-xs font-medium mt-1 max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        The Content will be available soon
                      </p>
                      <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Clock className="w-3 h-3" /> Under Active Calibration
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: POINTS AND BADGES (Placeholder) */}
                  {index === 2 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner"
                        style={{
                          backgroundColor: `${section.color}20`,
                          border: `1px solid ${section.color}40`
                        }}
                      >
                        <Award className="w-7 h-7" style={{ color: section.color }} />
                      </div>
                      <h4
                        className="text-base font-voda-exb uppercase tracking-tight"
                        style={{ color: section.color }}
                      >
                        Points and Badges
                      </h4>
                      <p className={`text-xs font-medium mt-1 max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        The Content will be available soon
                      </p>
                      <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Sparkles className="w-3 h-3 text-amber-500" /> Unlocking Soon
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

// ==========================================
// 4. MAIN MY SPACE PAGE COMPONENT
// ==========================================
const MySpace = () => {
  const { isDark } = useUserType?.() || { isDark: false };

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div
        style={{ zoom: VarMySpaceScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3 -mt-3 select-none font-sans flex flex-col gap-3"
      >
        {/* ========================================================================= */}
        {/* ── TOP FULL-WIDTH SECTION BAR: "MY SPACE" ─────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full h-[40px] px-5 rounded-xl border flex items-center justify-start transition-colors duration-300 shadow-sm select-none ${
            isDark
              ? 'bg-white text-[#0B1121] border-slate-200'
              : 'bg-[#06080D] text-white border-black/10'
          }`}
        >
          <span className="text-xs sm:text-[12.5px] font-voda-exb tracking-wider uppercase">
            MY SPACE
          </span>
        </div>

        {/* Main 2-Column Dashboard Grid */}
        <div className="flex flex-col lg:flex-row items-stretch gap-3.5 w-full">
          
          {/* ========================================================================= */}
          {/* ── COLUMN 1 (LEFT): VERTICAL ACCORDION GALLERY ────────────────────────── */}
          {/* ========================================================================= */}
          <div className="flex-1 min-w-0 flex flex-col">
            <VerticalAccordionContainer isDark={isDark} />
          </div>

          {/* ========================================================================= */}
          {/* ── COLUMN 2 (RIGHT): ELASTIC LANYARD ID BADGE ─────────────────────────── */}
          {/* ========================================================================= */}
          <div className="w-full lg:w-[310px] xl:w-[300px] flex-shrink-0 flex flex-col">
            <DraggableIdBadge
              isDark={isDark}
              userName="ABHAY H S"
              email="abhay.hs1@vodafone.com"
              tower="AI & Data Analytics Tower (AIDA)"
            />
          </div>

        </div>

        {/* ========================================================================= */}
        {/* ── BOTTOM FULL-WIDTH STATIC EXPLORE BAR ───────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full h-[40px] px-5 rounded-xl border flex items-center justify-between transition-colors duration-300 shadow-md -mt-8 select-none ${
            isDark
              ? 'bg-white text-[#0B1121] border-slate-200'
              : 'bg-[#06080D] text-white border-black/10'
          }`}
        >
          <span className="text-xs sm:text-[12px] font-bold tracking-tight">
            Explore More About VOIS Cyber Security and Awareness
          </span>
          
          {/* Static Rounded Double Down Arrow */}
          <div className="flex items-center justify-center">
            <svg 
              className={`w-5 h-5 ${isDark ? 'text-[#0B1121]' : 'text-white'}`} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="7 6 12 11 17 6" />
              <polyline points="7 12 12 17 17 12" />
            </svg>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── CONTINUATION SECTION: MY SPACE PART 2 (ACADEMY VIDEO GALLERY) ──────── */}
        {/* ========================================================================= */}
        <div
          style={{
            transform: `translate(${VarMySpacePart2OffsetX}px, ${VarMySpacePart2OffsetY}px) scale(${VarMySpacePart2Scale})`,
            marginTop: `${VarMySpacePart2MarginTop}px`,
            transformOrigin: 'top center'
          }}
          className="w-full transition-transform duration-300"
        >
          <MySpacePart2 />
        </div>

      </div>
    </>
  );
};

export default MySpace;