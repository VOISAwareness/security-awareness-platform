import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";
import MySpacePart2 from "./MySpacePart2";
import { useUserType } from "../../UserTypeContext/UserTypeContext";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import {
  Star,
  Users,
  Check,
  Sparkles,
  ShieldAlert,
  Award,
  Clock,
  User as UserIcon,
} from "lucide-react";

// Card Background Texture Assets
import MySpaceCardBgLight from "../../assets/MySpaceCardBgLightMode.png";
import MySpaceCardBgDark from "../../assets/MySpaceCardBgDarkMode.png";
import { DEMO_USER } from "../../appConfig";
import LevelBadge from "../../GlobalComponents/LevelBadge";
import AllBadges from "../../GlobalComponents/AllBadges";
import PointsAndBadges from "./PointsAndBadges";
import LevelChangeNotice from "./LevelChangeNotice";
import AchievementsDialog from "../../Achievements/AchievementsDialog";
import ClayImage from "../../GlobalComponents/ClayImage";
import { achievementsFor, latestEarned } from "../../Achievements/achievements";
import { useMyStanding } from "../../services/useMyStanding";
import {
  levelAltText,
  rankName,
  riskColor,
  riskPosition,
} from "../../services/levels";
import { PAGE_SCALE } from '../../shared/SharedStyles';
import useIsWide from '../../GlobalComponents/useIsWide';

// =========================================================================
// 🎛️ SCALE CONTROL VARIABLES
// =========================================================================

// 🌟 GLOBAL CORNER RADIUS SCALE (Reduces roundedness universally by ~2-4px)
const VarOverallMySpaceRoundednessScale = 0.5;

// 🌟 MY ACTIVITIES DONUT CHART SCALE
const VarMyActivitiesDonutScale = 1.05;

// =========================================================================
// 🎛️ PART 2 (VIDEO GALLERY) POSITION & SCALE CONTROLS
// =========================================================================
const VarMySpacePart2Scale = 1.0; // Scale of Part 2 (1.0 = 100%, 0.95 = 95%, etc.)
const VarMySpacePart2OffsetY = 0; // Move Up (-) / Down (+) in px
const VarMySpacePart2OffsetX = 0; // Move Left (-) / Right (+) in px
const VarMySpacePart2MarginTop = 14; // Gap between Explore bar & Part 2 in px

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');

  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Montserrat', sans-serif;
    font-weight: 900;
  }

  .font-mono-tech {
    font-family: 'JetBrains Mono', monospace;
  }

  /* Universal Roundedness Scaler */
  .rounded-2xl { border-radius: ${Math.round(20 * VarOverallMySpaceRoundednessScale)}px !important; }
  .rounded-xl  { border-radius: ${Math.round(14 * VarOverallMySpaceRoundednessScale)}px !important; }
  .rounded-lg  { border-radius: ${Math.round(10 * VarOverallMySpaceRoundednessScale)}px !important; }
  .rounded-md  { border-radius: ${Math.round(6 * VarOverallMySpaceRoundednessScale)}px !important; }
  .voda-rounded-2xl { border-radius: ${Math.round(20 * VarOverallMySpaceRoundednessScale)}px !important; }
  
`;

// =========================================================================
// 🌟 1. UNBREAKABLE ELASTIC LANYARD & SNAP-BACK ID BADGE (LOWERED BY 4PX)
// =========================================================================
const DraggableIdBadge = ({
  isDark,
  userName,
  email,
  tower,
  level,
  achievement,
  onOpenLeaderboard,
  onOpenBadges,
  onOpenAchievements,
  strap = 0, // px the lanyard is longer by on a taller window
}) => {
  const cardBgImage = isDark ? MySpaceCardBgDark : MySpaceCardBgLight;

  const x = useMotionValue(180);
  const y = useMotionValue(-350);

  const rotateZ = useTransform(x, [-120, 120], [-18, 18]);
  const rotateY = useTransform(x, [-120, 120], [-10, 10]);
  const rotateX = useTransform(y, [-100, 100], [8, -8]);

  // Anchored curve math with +4px vertical downward offset
  const strapLength = useMotionValue(strap);
  useEffect(() => strapLength.set(strap), [strap, strapLength]);
  const strapPath = useTransform([x, y, strapLength], ([latestX, latestY, extra]) => {
    const startX = 150;
    const startY = 4;
    const targetX = 150 + latestX;
    const targetY = 79 + extra + latestY;
    const controlX = 150 + latestX * 0.35;
    const controlY = (targetY + startY) / 2;
    return `M ${startX} ${startY} Q ${controlX} ${controlY} ${targetX} ${targetY}`;
  });

  useEffect(() => {
    const controlsY = animate(y, [-350, 26, -14, 6, -2, 0], {
      duration: 1.9,
      ease: [0.22, 1, 0.36, 1],
      times: [0, 0.38, 0.62, 0.78, 0.9, 1],
    });

    const controlsX = animate(x, [180, -48, 24, -10, 3, 0], {
      duration: 1.9,
      ease: [0.22, 1, 0.36, 1],
      times: [0, 0.38, 0.62, 0.78, 0.9, 1],
    });

    return () => {
      controlsY.stop();
      controlsX.stop();
    };
  }, []);

  return (
    <div className="relative w-full flex-shrink-0 flex flex-col items-center justify-start select-none overflow-visible pt-1 pb-2">
      {/* ── Continuous Lanyard Ribbon (SVG Shifted Down 4px) ── */}
      <svg
        className="absolute top-1 left-0 w-full pointer-events-none z-10 overflow-visible"
        style={{ height: 180 + strap }}
        viewBox={`0 0 300 ${180 + strap}`}
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
          marginTop: 58 + strap,
          x,
          y,
          rotateZ,
          rotateX,
          rotateY,
          transformPerspective: 1000,
        }}
        className="relative z-20 w-[290px] cursor-grab active:cursor-grabbing"
      >
        <div
          className={`w-full rounded-2xl p-4 flex flex-col justify-between items-center text-center relative overflow-hidden border shadow-xl transition-all duration-300 ${
            isDark
              ? "bg-[#15161a] border-white/10 text-white shadow-[0_20px_45px_rgba(0,0,0,0.85)]"
              : "bg-white border-slate-200/90 text-slate-900 shadow-[0_16px_38px_rgba(0,0,0,0.08)]"
          }`}
          style={{
            backgroundImage: `url(${cardBgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* Lanyard Top Punch Hole */}
          <div className="w-9 h-1.5 -mt-1 mb-1.5 rounded-full bg-slate-300 dark:bg-[#0c0d10] border border-black/15 dark:border-white/10 shadow-inner" />

          {/* User Photo & Info */}
          <div className="flex flex-col items-center w-full z-10">
            <div className="w-14 h-14 rounded-full bg-[#1e2026] dark:bg-[#111216] border-2 border-white/80 dark:border-white/10 shadow-md flex items-center justify-center mb-1.5 lg:mb-[calc(6px_+_var(--ms-extra,0)_*_14px)] text-white">
              <UserIcon className="w-8 h-8 text-slate-200" strokeWidth={1.5} />
            </div>

            <h2 className="font-semibold font-voda text-[14.5px] uppercase tracking-tight text-inherit leading-tight">
              {userName}
            </h2>
            <span
              className={`text-[10.5px] font-medium mt-0.5 max-w-full truncate ${isDark ? "text-slate-300" : "text-slate-600"}`}
              title={email}
            >
              {email}
            </span>
            <span
              className={`text-[11px] font-semibold mt-0.5 leading-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}
            >
              {tower}
            </span>
          </div>

          {/* Divider */}
          <div className="w-full my-1.5 lg:my-[calc(6px_+_var(--ms-extra,0)_*_22px)] z-10">
            <div className="w-full h-px bg-black/10 dark:bg-white/10 shadow-xs" />
          </div>

          {/* Your rank plate: badge and level (the risk is on the Risk Score
              row). Opens All badges. Same shape as the achievements row below,
              so the two badges line up. */}
          {level && (
            <button
              type="button"
              data-id-card-badge={level.id}
              onClick={onOpenBadges}
              onPointerDownCapture={(e) => e.stopPropagation()} // a press here is a click, not a drag of the card
              aria-label={`${levelAltText(level)}. See all badges`}
              className={`w-full min-h-[80px] flex items-center gap-3 p-2 pr-3 rounded-xl border text-left z-10 cursor-pointer transition-[box-shadow,transform] duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                isDark
                  ? "border-white/10 bg-white/[0.04] hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
                  : "border-slate-200 bg-white hover:shadow-[0_8px_18px_rgba(15,23,42,0.10)]"
              }`}
            >
              <span className="w-[64px] h-[64px] flex-shrink-0 flex items-center justify-center">
                <LevelBadge
                  level={level}
                  size={64}
                  glow={isDark ? "dark" : true}
                  tilt={false}
                  decorative
                />
              </span>
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className={`text-[8.5px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  My badge
                </span>
                <span className={`text-[12px] font-semibold leading-tight truncate ${isDark ? "text-white" : "text-slate-800"}`}>
                  {rankName(level)}
                </span>
              </span>
            </button>
          )}

          {/* My achievements: the hardest badge earned (its name and what it
              was earned for on hover). Opens every achievement. */}
          <button
            type="button"
            data-id-card-achievement={achievement?.id || "none"}
            onClick={onOpenAchievements}
            onPointerDownCapture={(e) => e.stopPropagation()} // a press here is a click, not a drag of the card
            aria-label={
              achievement
                ? `My achievements. Latest: ${achievement.name}. See all achievements`
                : "My achievements: none yet. See how to earn them"
            }
            className={`group w-full min-h-[60px] flex items-center gap-3 mt-2 lg:mt-[calc(8px_+_var(--ms-extra,0)_*_22px)] p-2 pr-3 rounded-xl border text-left z-10 cursor-pointer transition-[box-shadow,transform] duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
              isDark
                ? "border-white/10 bg-white/[0.04] hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
                : "border-slate-200 bg-white hover:shadow-[0_8px_18px_rgba(15,23,42,0.10)]"
            }`}
          >
            <span className="relative w-[64px] h-[44px] flex-shrink-0 flex items-center justify-center">
              <ClayImage
                name={achievement ? achievement.image : "first-report"}
                alt=""
                className={`w-[44px] h-[44px] object-contain ${achievement ? "" : "grayscale opacity-40"}`}
              />
              {/* what it is, on hover */}
              <span
                role="tooltip"
                className="pointer-events-none absolute left-0 bottom-full mb-2 w-max max-w-[230px] px-2.5 py-1.5 rounded-lg bg-[#0b1121] text-white text-[10px] leading-snug font-medium text-left shadow-lg opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 z-30"
              >
                <span className="block font-bold">{achievement ? achievement.name : "No achievements yet"}</span>
                {achievement ? achievement.how : "Report a simulated phishing email before ever clicking one to earn your first."}
              </span>
            </span>
            <span className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className={`text-[8.5px] font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                My achievements
              </span>
              <span className={`text-[12px] font-semibold leading-tight truncate ${achievement ? (isDark ? "text-white" : "text-slate-800") : isDark ? "text-slate-500" : "text-slate-400"}`}>
                {achievement ? achievement.name : "None yet"}
              </span>
            </span>
          </button>

          {/* Metrics Row: Campaigns Involved & Certificates Earned */}
          <div className="w-full grid grid-cols-2 gap-2 mt-2 lg:mt-[calc(8px_+_var(--ms-extra,0)_*_22px)] z-10">
            {/* Centred: the number with its icon, the label under it */}
            {[
              { label: "Campaigns Involved", value: "07", Icon: Sparkles, tone: "text-amber-500", tint: isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white" },
              { label: "Certificates Earned", value: "04", Icon: Award, tone: "text-purple-500", tint: isDark ? "border-white/10 bg-white/[0.04]" : "border-slate-200 bg-white" },
            ].map(({ label, value, Icon, tone, tint }) => (
              <div
                key={label}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl text-center border ${tint}`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <Icon aria-hidden="true" className={`w-4 h-4 ${tone}`} />
                  <span className="text-[15px] font-semibold font-voda leading-none text-inherit">{value}</span>
                </span>
                <span
                  className={`text-[8.5px] font-bold uppercase tracking-tight leading-tight ${isDark ? "text-slate-400" : "text-slate-600"}`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Outlined LEADERBOARD Button */}
          <div className="w-full mt-2 lg:mt-[calc(8px_+_var(--ms-extra,0)_*_22px)] z-10">
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className={`w-full py-1.5 px-3 rounded-lg border text-[10px] font-semibold font-voda uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? "bg-white/20 border-white/20 text-white hover:bg-white/15"
                  : "bg-black/5 border-slate-300 text-slate-800 hover:bg-black/15"
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
      style={{ transform: `scale(calc(${VarMyActivitiesDonutScale} * (1 + var(--ms-extra, 0) * 0.6)))` }}
      className="relative flex items-center justify-center w-[80px] h-[80px] flex-shrink-0"
    >
      <svg
        height={radius * 2}
        width={radius * 2}
        className="transform -rotate-90 overflow-visible"
      >
        <circle
          stroke={isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}
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
        <span
          className={`text-[13px] font-semibold font-voda leading-none ${isDark ? "text-white" : "text-slate-900"}`}
        >
          {percentage}%
        </span>
        {subLabel && (
          <span
            className={`text-[6.5px] font-bold uppercase tracking-tight mt-0.5 leading-none ${isDark ? "text-slate-400" : "text-slate-500"}`}
          >
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
const VerticalAccordionContainer = ({ isDark, standing, onOpenBadges }) => {
  const level = standing?.level;
  const [active, setActive] = useState(0); // 0: Activities (Default), 1: Risk Score, 2: Points & Badges

  const sections = [
    {
      id: "activities",
      title: "My Activities",
      line1: "MY",
      line2: "ACTIVITIES",
      color: "#9b9dff",
      subText: "Activities you were involved in",
    },
    {
      id: "risk",
      title: "Risk Score",
      line1: "RISK",
      line2: "SCORE",
      color: "#F8B2C0",
      subText: "Security Posture",
    },
    {
      id: "badges",
      title: "Points and Badges",
      line1: "POINTS &",
      line2: "BADGES",
      color: "#69edd7",
      subText: "Your rank and progress",
    },
  ];

  // A fixed height on wide windows; narrower, the open section's cards stack
  // and the box grows with them.
  return (
    <div className="flex flex-col gap-2.5 w-full h-auto lg:h-full lg:min-h-[420px] min-w-0 select-none">
      {sections.map((section, index) => {
        const isActive = index === active;

        return (
          <motion.div
            key={section.id}
            onMouseEnter={() => setActive(index)}
            onClick={() => setActive(index)}
            className={`relative rounded-[8px] border transition-colors duration-300 overflow-hidden cursor-pointer ${
              isActive
                ? `flex-1 ${
                    isDark
                      ? "bg-[#15161a] border-white/10 shadow-xl"
                      : "bg-white border-slate-200 shadow-sm"
                  } p-4 sm:p-5 flex flex-col justify-between`
                : `h-[42px] lg:h-[calc(42px_+_var(--ms-extra,0)_*_16px)] flex-shrink-0 ${
                    isDark
                      ? "bg-[#18191f] border-white/5 hover:border-white/15"
                      : "bg-white border-slate-200 hover:border-slate-300"
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
                    <span className="text-[11px] font-voda font-semibold uppercase leading-none text-black">
                      {section.line1}
                    </span>
                    <span className="text-[11px] font-voda font-semibold uppercase leading-none text-black mt-0.5">
                      {section.line2}
                    </span>
                  </div>

                  {/* Dynamic Right Side for Unexpanded Strip */}
                  <div className="flex items-center gap-3 pr-4">
                    {/* Section 1 (Risk Score): your level's risk category */}
                    {index === 1 && level && (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: riskColor(riskPosition(level)) }}
                        />
                        <span
                          className="text-[11px] font-semibold font-voda uppercase leading-none"
                          style={{ color: riskColor(riskPosition(level)) }}
                        >
                          {level.risk === "Unknown"
                            ? "Not known yet"
                            : level.risk}
                        </span>
                      </div>
                    )}

                    {/* Section 2 (Points & Badges): badge | My Points | My Rank */}
                    {index === 2 && level && (
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <LevelBadge
                            level={level}
                            size={30}
                            tilt={false}
                            decorative
                          />
                          <span
                            className={`text-[10px] font-semibold font-voda ${isDark ? "text-white" : "text-slate-900"}`}
                          >
                            {level.name}
                          </span>
                        </div>

                        {/* Rounded Divider */}
                        <span className="w-0.5 h-3.5 rounded-full bg-black/15 dark:bg-white/20" />

                        {/* My Points */}
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-[9.5px] font-semibold font-voda ${isDark ? "text-slate-400" : "text-slate-600"}`}
                          >
                            My Points
                          </span>
                          <span
                            className={`text-[11px] font-semibold font-voda ${isDark ? "text-white" : "text-slate-900"}`}
                          >
                            {standing.points.toLocaleString()}
                          </span>
                          {standing.points >= 0 && (
                            <span className="w-3.5 h-3.5 rounded-full bg-[#22c55e] text-white flex items-center justify-center text-[7.5px] font-semibold">
                              <Check className="w-2 h-2 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        {/* My Rank */}
                        {standing.rank && (
                          <>
                            <span className="w-0.5 h-3.5 rounded-full bg-black/15 dark:bg-white/20" />
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[9.5px] font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}
                              >
                                My Rank
                              </span>
                              <span
                                className={`text-[11px] font-voda font-semibold ${isDark ? "text-white" : "text-slate-900"}`}
                              >
                                {standing.rank}
                              </span>
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            </div>
                          </>
                        )}
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
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="w-full h-full flex flex-col justify-between"
                >
                  {/* Header Bar */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/5 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-4 rounded-full"
                        style={{ backgroundColor: section.color }}
                      />
                      <h3
                        className={`text-xs font-voda font-semibold tracking-tight uppercase ${isDark ? "text-white" : "text-slate-900"}`}
                      >
                        {section.title}
                      </h3>
                    </div>
                    <span
                      className={`text-[9.5px] font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {section.subText}
                    </span>
                  </div>

                  {/* ── SECTION 0: MY ACTIVITIES (SEAMLESS CONNECTED L-SHAPED BENTO CONTAINERS) ── */}
                  {index === 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch flex-1 min-h-0 pt-2 pb-0.5">
                      {/* ── CARD 1: PHISHING SIMULATIONS ── */}
                      <div className="flex flex-col h-full min-w-0 justify-between">
                        {/* Top Section */}
                        <div className="flex items-end justify-between w-full relative lg:flex-1 lg:min-h-0">
                          {/* Top-Left Isolated Box */}
                          <div
                            className={`w-[calc(50%-4px)] h-[120px] lg:h-[calc(100%_-_8px)] lg:min-h-[calc(112px_+_var(--ms-extra,0)_*_120px)] p-2.5 lg:p-[calc(10px_+_var(--ms-extra,0)_*_4px)] rounded-xl [container-type:inline-size] flex flex-col justify-start items-start text-left transition-colors mb-2 ${
                              isDark ? "bg-[#202127]" : "bg-[#9b9dff]/20"
                            }`}
                          >
                            <h4
                              className={`text-[min(13px,10cqw)] lg:text-[min(calc(13px_+_var(--ms-extra,0)_*_3px),11cqw)] font-voda font-semibold uppercase leading-tight tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              PHISHING
                              <br />
                              SIMULATIONS
                            </h4>
                            <p
                              className={`text-[7.5px] lg:text-[calc(7.5px_+_var(--ms-extra,0)_*_1.5px)] leading-[1.25] mt-1.5 font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
                            >
                              Data captured through your <br /> interaction with
                              security
                              <br /> training modules
                            </p>
                          </div>

                          {/* Top-Right L-Head */}
                          <div
                            className={`w-[calc(50%-4px)] h-[128px] lg:h-full lg:min-h-[calc(120px_+_var(--ms-extra,0)_*_120px)] rounded-t-xl flex items-center justify-center transition-colors relative z-10 ${
                              isDark ? "bg-[#202127]" : "bg-[#f1f3f7]"
                            }`}
                          >
                            <ActivityGauge
                              percentage={28}
                              subLabel="Compromised"
                              color="#fb7185"
                              isDark={isDark}
                            />

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
                          className={`flex-1 min-h-0 w-full p-2.5 rounded-b-xl rounded-tl-xl flex flex-col justify-start lg:justify-center gap-1.5 lg:gap-[calc(6px_+_var(--ms-extra,0)_*_6px)] transition-colors -mt-px relative z-10 ${
                            isDark ? "bg-[#202127]" : "bg-[#f1f3f7]"
                          }`}
                        >
                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Received
                              </span>
                            </div>
                            <strong
                              className={`text-[11px] font-semibold font-voda ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              10
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Opened
                              </span>
                            </div>
                            <strong
                              className={`text-[11px] font-semibold font-voda ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              2
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Clicked
                              </span>
                            </div>
                            <strong className="text-[11px] font-semibold font-voda text-amber-500">
                              2
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#fb7185]" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Compromised
                              </span>
                            </div>
                            <strong className="text-[11px] font-semibold font-voda text-[#fb7185]">
                              2
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Reported
                              </span>
                            </div>
                            <strong className="text-[11px] font-semibold font-voda text-[#22c55e]">
                              0
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* ── CARD 2: SECURITY BULLETINS ── */}
                      <div className="flex flex-col h-full min-w-0 justify-between">
                        {/* Top Section */}
                        <div className="flex items-end justify-between w-full relative lg:flex-1 lg:min-h-0">
                          {/* Top-Left Isolated Box */}
                          <div
                            className={`w-[calc(50%-4px)] h-[120px] lg:h-[calc(100%_-_8px)] lg:min-h-[calc(112px_+_var(--ms-extra,0)_*_120px)] p-2.5 lg:p-[calc(10px_+_var(--ms-extra,0)_*_4px)] rounded-xl [container-type:inline-size] flex flex-col justify-start items-start text-left transition-colors mb-2 ${
                              isDark ? "bg-[#202127]" : "bg-[#9b9dff]/20"
                            }`}
                          >
                            <h4
                              className={`text-[min(13px,10cqw)] lg:text-[min(calc(13px_+_var(--ms-extra,0)_*_3px),11cqw)] font-semibold font-voda uppercase leading-tight tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              ANNOUNCEMENTS
                              <br />
                              INTERACTIONS
                            </h4>
                            <p
                              className={`text-[7.5px] lg:text-[calc(7.5px_+_var(--ms-extra,0)_*_1.5px)] leading-[1.25] mt-1.5 font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
                            >
                              Data captured through your <br /> interaction with
                              security
                              <br /> training modules
                            </p>
                          </div>

                          {/* Top-Right L-Head */}
                          <div
                            className={`w-[calc(50%-4px)] h-[128px] lg:h-full lg:min-h-[calc(120px_+_var(--ms-extra,0)_*_120px)] rounded-t-xl flex items-center justify-center transition-colors relative z-10 ${
                              isDark ? "bg-[#202127]" : "bg-[#f1f3f7]"
                            }`}
                          >
                            <ActivityGauge
                              percentage={90}
                              subLabel={
                                <span className="text-center block w-full">
                                  Acknow
                                  <br />
                                  ledged
                                </span>
                              }
                              color="#22c55e"
                              isDark={isDark}
                            />

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
                          className={`flex-1 min-h-0 w-full p-2.5 rounded-b-xl rounded-tl-xl flex flex-col justify-start lg:justify-center gap-1.5 lg:gap-[calc(6px_+_var(--ms-extra,0)_*_6px)] transition-colors -mt-px relative z-10 ${
                            isDark ? "bg-[#202127]" : "bg-[#f1f3f7]"
                          }`}
                        >
                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Received
                              </span>
                            </div>
                            <strong
                              className={`text-[11px] font-semibold font-voda ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              10
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Opened
                              </span>
                            </div>
                            <strong
                              className={`text-[11px] font-semibold font-voda ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              10
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Acknowledged
                              </span>
                            </div>
                            <strong
                              className={`text-[11px] font-semibold font-voda text-[#22c55e]`}
                            >
                              9
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Pending
                              </span>
                            </div>
                            <strong className="text-[11px] font-semibold font-voda text-amber-500">
                              1
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Response Status
                              </span>
                            </div>
                            <span className="text-[9px] font-semibold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded">
                              Compliant
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ── CARD 3: SECURITY TRAININGS ── */}
                      <div className="flex flex-col h-full min-w-0 justify-between">
                        {/* Top Section */}
                        <div className="flex items-end justify-between w-full relative lg:flex-1 lg:min-h-0">
                          {/* Top-Left Isolated Box */}
                          <div
                            className={`w-[calc(50%-4px)] h-[120px] lg:h-[calc(100%_-_8px)] lg:min-h-[calc(112px_+_var(--ms-extra,0)_*_120px)] p-2.5 lg:p-[calc(10px_+_var(--ms-extra,0)_*_4px)] rounded-xl [container-type:inline-size] flex flex-col justify-start items-start text-left transition-colors mb-2 ${
                              isDark ? "bg-[#202127]" : "bg-[#9b9dff]/20"
                            }`}
                          >
                            <h4
                              className={`text-[min(13px,10cqw)] lg:text-[min(calc(13px_+_var(--ms-extra,0)_*_3px),11cqw)] font-semibold font-voda uppercase leading-tight tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              TRAININGS
                              <br />
                              DETAIL
                            </h4>
                            <p
                              className={`text-[7.5px] lg:text-[calc(7.5px_+_var(--ms-extra,0)_*_1.5px)] leading-[1.25] mt-1.5 font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}
                            >
                              Data captured through your <br /> interaction with
                              security
                              <br /> training modules
                            </p>
                          </div>

                          {/* Top-Right L-Head */}
                          <div
                            className={`w-[calc(50%-4px)] h-[128px] lg:h-full lg:min-h-[calc(120px_+_var(--ms-extra,0)_*_120px)] rounded-t-xl flex items-center justify-center transition-colors relative z-10 ${
                              isDark ? "bg-[#202127]" : "bg-[#f1f3f7]"
                            }`}
                          >
                            <ActivityGauge
                              percentage={90}
                              subLabel="Evaluated"
                              color="#990099"
                              isDark={isDark}
                            />

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
                          className={`flex-1 min-h-0 w-full p-2.5 rounded-b-xl rounded-tl-xl flex flex-col justify-start lg:justify-center gap-1.5 lg:gap-[calc(6px_+_var(--ms-extra,0)_*_6px)] transition-colors -mt-px relative z-10 ${
                            isDark ? "bg-[#202127]" : "bg-[#f1f3f7]"
                          }`}
                        >
                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Assigned
                              </span>
                            </div>
                            <strong
                              className={`text-[11px] font-semibold font-voda ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              10
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Trained
                              </span>
                            </div>
                            <strong
                              className={`text-[11px] font-semibold font-voda ${isDark ? "text-white" : "text-slate-900"}`}
                            >
                              2
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Evaluated
                              </span>
                            </div>
                            <strong
                              className={`text-[11px] font-semibold font-voda text-[#22c55e]`}
                            >
                              2
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Pending
                              </span>
                            </div>
                            <strong className="text-[11px] font-semibold font-voda text-amber-500">
                              0
                            </strong>
                          </div>

                          <div
                            className={`flex justify-between items-center h-7 lg:h-auto lg:flex-1 lg:max-h-[calc(28px_+_var(--ms-extra,0)_*_24px)] min-h-[22px] px-2.5 rounded-md border transition-colors  ${
                              isDark
                                ? "bg-[#15161a]/60 border-white/5"
                                : "bg-white/80 border-black/5 shadow-2xs"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              <span
                                className={`text-[9.5px] font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
                              >
                                Expired
                              </span>
                            </div>
                            <strong className="text-[11px] font-semibold font-voda text-slate-400">
                              0
                            </strong>
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
                          border: `1px solid ${section.color}40`,
                        }}
                      >
                        <ShieldAlert
                          className="w-7 h-7"
                          style={{ color: section.color }}
                        />
                      </div>
                      <h4
                        className={`text-base font-bold font-voda uppercase tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}
                      >
                        Risk Score Matrix
                      </h4>
                      <p
                        className={`text-xs font-medium mt-1 max-w-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}
                      >
                        The Content will be available soon
                      </p>
                      <div className="flex items-center gap-1.5 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Clock className="w-3 h-3" /> Under Active Calibration
                      </div>
                    </div>
                  )}

                  {/* SECTION 2: POINTS AND BADGES */}
                  {index === 2 && standing && (
                    <PointsAndBadges
                      standing={standing}
                      isDark={isDark}
                      onOpenBadges={onOpenBadges}
                    />
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

// The first screen of My Space (header, activities, risk score, points and
// badges, ID card) fills the window down to the Explore bar, at the same size
// as every other page. Extra height is shared out in set amounts through
// --ms-extra (0 on a 14-inch laptop, up to 1.5): the title boxes and gauges,
// the activity rows and their gaps, the section strips and the ID card rows
// grow a little each; the text does not. Set on the element, so a resize or
// the navigation bar opening never re-renders or animates anything.
const FIRST_SCREEN_HEIGHT = 584; // CSS px: the first screen on a 14-inch laptop
const EXTRA_RANGE = 300; // CSS px of extra height for --ms-extra = 1
const MIN_FIRST_SCREEN = 500;

function useFillScreen(enabled) {
  const ref = useRef(null);
  const [extra, setExtra] = useState(0); // for the lanyard; changes only with the height
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!enabled) {
      el.style.height = "";
      el.style.removeProperty("--ms-extra");
      return undefined;
    }
    const main = el.closest("main");
    const fit = () => {
      if (!main) return;
      const box = el.getBoundingClientRect();
      const zoom = el.offsetWidth ? box.width / el.offsetWidth : 1; // visual px per CSS px
      const top = box.top - main.getBoundingClientRect().top + main.scrollTop;
      const visible = main.clientHeight * (main.getBoundingClientRect().height / (main.offsetHeight || 1));
      const height = Math.max(MIN_FIRST_SCREEN, (visible - top - 10) / zoom);
      const extra = Math.min(1.5, Math.max(0, (height - FIRST_SCREEN_HEIGHT) / EXTRA_RANGE));
      el.style.height = `${height}px`;
      el.style.setProperty("--ms-extra", extra.toFixed(3));
      setExtra(Math.round(extra * 50) / 50);
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (main) ro.observe(main);
    window.addEventListener("resize", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [enabled]);
  return [ref, enabled ? extra : 0];
}

// ==========================================
// 4. MAIN MY SPACE PAGE COMPONENT
// ==========================================
const MySpace = () => {
  const { isDark, user } = useUserType?.() || { isDark: false };
  const navigate = useNavigate();
  const [firstScreenRef, extra] = useFillScreen(useIsWide());
  const [showBadges, setShowBadges] = useState(false);
  const openBadges = useCallback(() => setShowBadges(true), []);
  const closeBadges = useCallback(() => setShowBadges(false), []);
  const standing = useMyStanding();
  const achievements = achievementsFor(standing);
  const [showAchievements, setShowAchievements] = useState(false);

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* My achievements on the ID card opens every achievement */}
      {showAchievements && (
        <AchievementsDialog list={achievements} isDark={isDark} onClose={() => setShowAchievements(false)} />
      )}

      {/* your badge (Points & Badges, or the ID card) opens every level and grade */}
      <AnimatePresence>
        {showBadges && standing.level && (
          <AllBadges
            key="all-badges"
            current={standing.level}
            points={standing.points}
            rank={standing.rank}
            total={standing.total}
            isDark={isDark}
            onClose={closeBadges}
          />
        )}
      </AnimatePresence>

      <div
        style={{ zoom: PAGE_SCALE }}
        className="w-full max-w-[2560px] mx-auto p-3.5 -mt-2 select-none font-sans flex flex-col gap-3"
      >
        {/* First screen: everything down to the Explore bar fills the window */}
        <div ref={firstScreenRef} className="w-full flex flex-col gap-3 min-h-0">
        {/* ========================================================================= */}
        {/* ── TOP FULL-WIDTH SECTION BAR: "MY SPACE" ─────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full h-[40px] py-2.5 px-6 -mt-2 voda-rounded-2xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${
            isDark
              ? "bg-white text-black border-white/10"
              : "bg-[#000000] text-white border-black/10"
          }`}
        >
          <span className="text-[13.5px] font-bold tracking-tight uppercase">
            MY SPACE
          </span>
        </div>

        {/* Level up since you last looked: a pop-up; down: a short note here */}
        {standing.ready !== false && standing.level && (
          <LevelChangeNotice
            key={standing.email}
            email={standing.email}
            level={standing.level}
            isDark={isDark}
          />
        )}

        {/* Main 2-Column Dashboard Grid */}
        <div className="flex flex-col lg:flex-row items-stretch gap-3.5 w-full lg:flex-1 lg:min-h-0">
          {/* ========================================================================= */}
          {/* ── COLUMN 1 (LEFT): VERTICAL ACCORDION GALLERY ────────────────────────── */}
          {/* ========================================================================= */}
          <div className="flex-1 min-w-0 flex flex-col">
            <VerticalAccordionContainer
              isDark={isDark}
              standing={standing}
              onOpenBadges={openBadges}
            />
          </div>

          {/* ========================================================================= */}
          {/* ── COLUMN 2 (RIGHT): ELASTIC LANYARD ID BADGE ─────────────────────────── */}
          {/* ========================================================================= */}
          <div className="w-full lg:w-[310px] xl:w-[300px] flex-shrink-0 flex flex-col">
            <DraggableIdBadge
              isDark={isDark}
              userName={(user?.UserName || DEMO_USER.name).toUpperCase()}
              email={user?.UserEMailID || DEMO_USER.email}
              tower="AI & Data Analytics Tower (AIDA)"
              level={standing.level}
              achievement={latestEarned(achievements)}
              onOpenLeaderboard={() => navigate("/leaderboard")}
              onOpenBadges={openBadges}
              onOpenAchievements={() => setShowAchievements(true)}
              strap={Math.round(Math.min(1, extra) * 110)}
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── BOTTOM FULL-WIDTH STATIC EXPLORE BAR ───────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full h-[40px] flex-shrink-0 px-5 rounded-xl border flex items-center justify-between transition-colors duration-300 shadow-md select-none ${
            isDark
              ? "bg-white text-[#0B1121] border-slate-200"
              : "bg-[#06080D] text-white border-black/10"
          }`}
        >
          <span className="text-xs sm:text-[12px] font-bold tracking-tight">
            Explore More About VOIS Cyber Security and Awareness
          </span>

          {/* Static Rounded Double Down Arrow */}
          <div className="flex items-center justify-center">
            <svg
              className={`w-5 h-5 ${isDark ? "text-[#0B1121]" : "text-white"}`}
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
        </div>

        {/* ========================================================================= */}
        {/* ── CONTINUATION SECTION: MY SPACE PART 2 (ACADEMY VIDEO GALLERY) ──────── */}
        {/* ========================================================================= */}
        <div
          style={{
            transform: `translate(${VarMySpacePart2OffsetX}px, ${VarMySpacePart2OffsetY}px) scale(${VarMySpacePart2Scale})`,
            marginTop: `${VarMySpacePart2MarginTop}px`,
            transformOrigin: "top center",
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
