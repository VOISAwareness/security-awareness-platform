import React, { useState, useEffect } from 'react';
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
import TrainingImage from '../../assets/TrainingImage.png';

// =========================================================================
// 🎛️ SCALE CONTROL VARIABLES
// =========================================================================
const VarMySpaceScale = 0.975;

// 🌟 GLOBAL CORNER RADIUS SCALE (Reduces roundedness universally by ~2-4px)
const VarOverallMySpaceRoundednessScale = 0.75;

// 🌟 MY ACTIVITIES DONUT CHART SCALE
const VarMyActivitiesDonutScale = 1.05;

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
// 🌟 3. HIGH-EFFICIENCY VERTICAL ACCORDION GALLERY
// =========================================================================
const TrainingContainer = ({ isDark }) => {
  const [active, setActive] = useState(0); // 0: Activities (Default), 1: Risk Score, 2: Points & Badges

  const sections = [
    {
      id: 'activities',
      title: 'Training Content',
      line1: 'MY',
      line2: 'ACTIVITIES',
      color: '#9b9dff',
      subText: 'Activities you were involved in'
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
                      <div className="flex flex-col h-[150px] min-w-0 justify-between">
                        {/* Top Section */}
                        <div className="flex items-end justify-between w-full relative">
                          {/* Top-Left Isolated Box */}
                          <div
                           style={{
                              backgroundColor: isDark ? '#22193E' : '#ECE8FF'
                            }}
                            className={`w-[calc(50%-4px)] h-[120px] p-2.5 rounded-xl flex flex-col justify-start items-start text-left transition-colors mb-2 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#9b9dff]/20'
                            }`}
                          >
                            <h4 className={`text-[14.5px] font-voda-exb uppercase leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              INDIVIDUAL VIDEOS<br />QUIZ<br />CERTIFICATE
                            </h4>
                            <p className={`text-[7.5px] leading-[1.25] mt-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Data captured through your <br /> interaction with security<br /> training modules
                            </p>
                          </div>

                          {/* Top-Right L-Head */}
                          <div
                            className={`w-[calc(50%-4px)] h-[128px] rounded-t-xl flex-2 py-2 px-2.5 items-center justify-center transition-colors relative z-10 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                            }`}
                          >
                            <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                                <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Existing Videos</span>
                                </div>
                                <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>10</strong>
                            </div>
                            <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Existing Quizs</span>
                            </div>
                            <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>2</strong>
                          </div>
                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Existing Cirtificate</span>
                            </div>
                            <strong className="text-[12px] font-voda-exb text-amber-500">2</strong>
                          </div>
                          </div>
                        </div>

                        {/* Bottom L-Foot with Enhanced Styled Metric Tiles */}
                        <div
                          className={`flex-1 w-full p-2.5 rounded-b-xl rounded-tl-xl flex flex-col justify-between gap-1 transition-colors -mt-px relative z-10 ${
                            isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                          }`}
                        >
                          <div className="w-full h-full overflow-hidden rounded-lg">
                            {/* Video */}
                            <div className="w-full flex-1 px-2 sm:px-3 flex items-center justify-center min-h-0">
                              <video
                                controls
                                className="w-full max-w-full h-auto max-h-full object-contain rounded-lg"
                              >
                                <source src="/videos/training-video.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                            </div>

                            {/* Bottom-right Button */}
                            <div className="flex justify-end pt-2 px-2 sm:px-3 flex-shrink-0">
                              <button
                                type="button"
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-voda-exb uppercase tracking-wider transition-all ${
                                  isDark
                                    ? 'bg-white text-[#15161a] hover:bg-slate-200'
                                    : 'bg-[#06080D] text-white hover:bg-slate-800'
                                }`}
                              >
                                Start Training
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── CARD 2: SECURITY BULLETINS ── */}
                      <div className="flex flex-col h-[150px] min-w-0 justify-between">
                        {/* Top Section */}
                        <div className="flex items-end justify-between w-full relative">
                          {/* Top-Left Isolated Box */}
                          <div
                            style={{
                              backgroundColor: isDark ? '#2E200C' : '#FFEFCE'
                            }}
                            className={`w-[calc(50%-4px)] h-[120px] p-2.5 rounded-xl flex flex-col justify-start items-start text-left transition-colors mb-2 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#9b9dff]/20'
                            }`}
                          >
                            <h4 className={`text-[14.5px] font-voda-exb uppercase leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              TRAINING<br />PATHS
                            </h4>
                            <p className={`text-[7.5px] leading-[1.25] mt-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Data captured through your <br /> interaction with security<br /> training modules
                            </p>
                          </div>

                          {/* Top-Right L-Head */}
                          <div
                            className={`w-[calc(50%-4px)] h-[128px] rounded-t-xl flex-2 py-2 px-2.5 items-center justify-center transition-colors relative z-10 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                            }`}
                          >
                            <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                                <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Existing Videos</span>
                                </div>
                                <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>10</strong>
                            </div>
                            <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Existing Quizs</span>
                            </div>
                            <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>2</strong>
                          </div>
                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Existing Cirtificate</span>
                            </div>
                            <strong className="text-[12px] font-voda-exb text-amber-500">2</strong>
                          </div>
                          </div>
                        </div>

                        {/* Bottom L-Foot with Enhanced Styled Metric Tiles */}
                        <div
                          className={`flex-1 w-full p-2.5 rounded-b-xl rounded-tl-xl flex flex-col justify-between gap-1 transition-colors -mt-px relative z-10 ${
                            isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                          }`}
                        >
                          <div className="w-full h-full overflow-hidden rounded-lg">
                            {/* Video */}
                            <div className="w-full flex-1 px-2 sm:px-3 flex items-center justify-center min-h-0">
                              <video
                                controls
                                className="w-full max-w-full h-auto max-h-full object-contain rounded-lg"
                              >
                                <source src="/videos/training-video.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                            </div>

                            {/* Bottom-right Button */}
                            <div className="flex justify-end pt-2 px-2 sm:px-3 flex-shrink-0">
                              <button
                                type="button"
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-voda-exb uppercase tracking-wider transition-all ${
                                  isDark
                                    ? 'bg-white text-[#15161a] hover:bg-slate-200'
                                    : 'bg-[#06080D] text-white hover:bg-slate-800'
                                }`}
                              >
                                Start Training
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── CARD 3: SECURITY TRAININGS ── */}
                      <div className="flex flex-col h-[150px] min-w-0 justify-between">
                        {/* Top Section */}
                        <div className="flex items-end justify-between w-full relative">
                          {/* Top-Left Isolated Box */}
                          <div
                            style={{
                                backgroundColor: isDark ? '#0D271E' : '#CEFBEA'
                            }}
                            className={`w-[calc(50%-4px)] h-[120px] p-2.5 rounded-xl flex flex-col justify-start items-start text-left transition-colors mb-2 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#9b9dff]/20'
                            }`}
                          >
                            <h4 className={`text-[14.5px] font-voda-exb uppercase leading-tight tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              ALWAYS<br />AVAILABLE<br />COURSES
                            </h4>
                            <p className={`text-[7.5px] leading-[1.25] mt-1.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              Data captured through your <br /> interaction with security<br /> training modules
                            </p>
                          </div>

                          {/* Top-Right L-Head */}
                          <div
                            className={`w-[calc(50%-4px)] h-[128px] rounded-t-xl flex-2 py-2 px-2.5 items-center justify-center transition-colors relative z-10 ${
                              isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                            }`}
                          >
                            <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                                <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Existing Videos</span>
                                </div>
                                <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>10</strong>
                            </div>
                            <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Existing Quizs</span>
                            </div>
                            <strong className={`text-[12px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>2</strong>
                          </div>
                          <div className={`flex justify-between items-center py-1 px-2.5 rounded-md border transition-colors ${
                            isDark ? 'bg-[#15161a]/60 border-white/5' : 'bg-white/80 border-black/5 shadow-2xs'
                          }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span className={`text-[10px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Existing Cirtificate</span>
                            </div>
                            <strong className="text-[12px] font-voda-exb text-amber-500">2</strong>
                          </div>
                          </div>
                        </div>

                        {/* Bottom L-Foot with Enhanced Styled Metric Tiles */}
                        <div
                          className={`flex-1 w-full p-2.5 rounded-b-xl rounded-tl-xl flex flex-col justify-between gap-1 transition-colors -mt-px relative z-10 ${
                            isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                          }`}
                        >
                          <div className="w-full h-full overflow-hidden rounded-lg">
                            {/* Video */}
                            <div className="w-full flex-1 px-2 sm:px-3 flex items-center justify-center min-h-0">
                              <video
                                controls
                                className="w-full max-w-full h-auto max-h-full object-contain rounded-lg"
                              >
                                <source src="/videos/training-video.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                              </video>
                            </div>

                            {/* Bottom-right Button */}
                            <div className="flex justify-end pt-2 px-2 sm:px-3 flex-shrink-0">
                              <button
                                type="button"
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-voda-exb uppercase tracking-wider transition-all ${
                                  isDark
                                    ? 'bg-white text-[#15161a] hover:bg-slate-200'
                                    : 'bg-[#06080D] text-white hover:bg-slate-800'
                                }`}
                              >
                                Start Training
                              </button>
                            </div>
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
const Training = () => {
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
            MY TRAINING
          </span>
        </div>

        {/* Main 2-Column Dashboard Grid */}
        <div className="flex flex-col lg:flex-row items-stretch gap-3.5 w-full">
          
          {/* ========================================================================= */}
          {/* ── COLUMN 1 (LEFT): VERTICAL ACCORDION GALLERY ────────────────────────── */}
          {/* ========================================================================= */}
          <div className="flex-1 min-w-0 flex flex-col">
            <TrainingContainer isDark={isDark} />
          </div>
        </div>
      </div>
    </>
  );
};

export default Training;