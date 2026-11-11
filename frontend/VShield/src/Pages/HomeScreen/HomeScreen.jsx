import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { motion } from 'framer-motion';
import { Rocket, Wand2, Trophy } from 'lucide-react';

// Card Background Texture Assets
import CardBgLight from '../../assets/HomeScreenCardLightMode.png';
import CardBgDark from '../../assets/HomeScreenCardDarkMode.png';
import QuoteCardLight from '../../assets/HomeScreenQuoteCard2LightMode.png';
import QuoteCardDark from '../../assets/HomeScreenQuoteCard2DarkMode.png';
import { DEMO_USER } from '../../appConfig';
import { useHomeDashboard } from '../../services/useHomeDashboard';
import { longDate, PERIODS, showRate } from '../../services/homeDashboard';

// =========================================================================
// 🎛️ SCALE CONTROL VARIABLES
// =========================================================================
const VarHomeScreenScale = 0.9;
const VarSection2HeightAdjuster = 1.3;

// 🌟 FADED CIRCLES STEP DISC SCALE (1.0 = 100%, 0.85 = 85%, 1.2 = 120%, etc.)
const VarFadedStepDiscScale = 0.85;

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

// Where each country's marker goes on the map. A country that is not here is
// still listed, just not drawn.
const COUNTRY_COORDINATES = {
  UK: [-2.24, 54.5],
  'United Kingdom': [-2.24, 54.5],
  Egypt: [30.8, 26.8],
  India: [78.96, 20.59],
  Albania: [20.16, 41.15],
  Germany: [10.45, 51.16],
  Ireland: [-8.24, 53.41],
  Spain: [-3.75, 40.46],
  Italy: [12.57, 41.87],
  Portugal: [-8.22, 39.4],
  Romania: [24.97, 45.94],
  Greece: [21.82, 39.07],
  Turkey: [35.24, 38.96],
  'South Africa': [22.94, -30.56],
};

// Injected Web Font style for Vodafone ExB Fallback
const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@600;700;800;900&family=Poppins:wght@600;700;800&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
  
  /* Original Vodafone font for the rest of the dashboard */
  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Vodafone', 'Montserrat', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    font-weight: 900;
  }

  /* 🌟 Dedicated Button Title Font */
  .font-button-title {
    font-family: 'Poppins', 'Plus Jakarta Sans', sans-serif;
    font-weight: 800;
  }

  /* 🌟 Dedicated Button Subtitle Font */
  .font-button-sub {
    font-family: 'Inter', sans-serif;
    font-weight: 600;
  }
`;

// =========================================================================
// 🌟 3D UIVERSE EMBOSSED ACTION CARD (SEPARATE LIGHT & DARK PALETTES)
// =========================================================================
const Uiverse3DCard = ({ title, subtitle, Icon, theme, isDark = false, onClick }) => {
  const themes = {
    // 1. Red / Coral Theme (New Campaign)
    red: {
      light: {
        cardBg: 'from-[#ffffff] via-[#ffffff] to-[#ffffff]',
        fillColor: '#fbb9c5',
        shadowColor: 'rgba(159, 18, 57, 0.28)',
        badgeBg: 'from-[#FF657F] to-[#fbb9c5]',
        titleColor: 'text-[#000000]',
        subColor: 'text-[#262626]',
        border: 'border-[#000000]/10'
      },
      dark: {
        cardBg: 'bg-[#25252B]',
        fillColor: '#fbb9c5',
        shadowColor: 'rgba(0, 0, 0, 0.55)',
        badgeBg: 'from-[#FF657F] to-[#fbb9c5]',
        titleColor: 'text-white/90',
        subColor: 'text-white/40',
        border: 'border-white/10'
      }
    },
    // 2. Purple / Violet Theme (Create Scenario)
    purple: {
      light: {
        cardBg: 'from-[#ffffff] via-[#ffffff] to-[#ffffff]',
        fillColor: '#e2caf9',
        shadowColor: 'rgba(76, 29, 149, 0.28)',
        badgeBg: 'from-[#e2caf9] to-[#9D70E6]',
        titleColor: 'text-[#000000]',
        subColor: 'text-[#262626]',
        border: 'border-[#000000]/10'
      },
      dark: {
        cardBg: 'bg-[#25252B]',
        fillColor: '#e2caf9',
        shadowColor: 'rgba(0, 0, 0, 0.55)',
        badgeBg: 'from-[#e2caf9] to-[#9D70E6]',
        titleColor: 'text-white/90',
        subColor: 'text-white/40',
        border: 'border-white/10'
      }
    },
    // 3. Neon Mint / Teal Theme (My Space)
    mint: {
      light: {
        cardBg: 'from-[#ffffff] via-[#ffffff] to-[#ffffff]',
        fillColor: '#bdf7d1',
        shadowColor: 'rgba(21, 128, 61, 0.28)',
        badgeBg: 'from-[#4BE184] to-[#bdf7d1]',
        titleColor: 'text-[#000000]',
        subColor: 'text-[#262626]',
        border: 'border-[#000000]/10'
      },
      dark: {
        cardBg: 'bg-[#25252B]',
        fillColor: '#bdf7d1',
        shadowColor: 'rgba(0, 0, 0, 0.55)',
        badgeBg: 'from-[#4BE184] to-[#bdf7d1]',
        titleColor: 'text-white/90',
        subColor: 'text-white/40',
        border: 'border-white/10'
      }
    }
  };

  const selectedTheme = themes[theme] || themes.mint;
  const t = isDark ? selectedTheme.dark : selectedTheme.light;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -1.5 }}
      whileTap={{ scale: 0.98 }}
      style={{
        width: 'calc(100% + 0px)',
        marginLeft: 'auto',
        marginRight: 0,
        display: 'block'
      }}
      className={`relative text-left px-2.5 py-[7px] rounded-[10px] overflow-hidden bg-gradient-to-br ${t.cardBg} border ${t.border} shadow-[0_6px_16px_${t.shadowColor}] transition-all duration-300 group cursor-pointer select-none`}
    >
      {/* ── 1. 3D Concentric Full-Filled Fading Step-Discs (Controlled by VarFadedStepDiscScale) ── */}
      <svg
        style={{
          transform: `scale(${VarFadedStepDiscScale})`,
          transformOrigin: 'top right'
        }}
        className="absolute -top-3 -right-3 w-36 h-36 pointer-events-none transition-transform duration-500 group-hover:scale-105"
        viewBox="0 0 140 140"
        fill="none"
      >
        <defs>
          <filter id={`emboss-${theme}-${isDark ? 'dark' : 'light'}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-1" dy="2" stdDeviation="1.5" floodColor={t.shadowColor} floodOpacity="0.45" />
          </filter>
        </defs>

        {/* Ring 3 */}
        <circle
          cx="110"
          cy="30"
          r="52"
          fill={t.fillColor}
          fillOpacity={isDark ? "0.22" : "0.35"}
          filter={`url(#emboss-${theme}-${isDark ? 'dark' : 'light'})`}
        />
        {/* Ring 2 */}
        <circle
          cx="110"
          cy="30"
          r="34"
          fill={t.fillColor}
          fillOpacity={isDark ? "0.35" : "0.5"}
          filter={`url(#emboss-${theme}-${isDark ? 'dark' : 'light'})`}
        />
        {/* Inner Ring 1 */}
        <circle
          cx="110"
          cy="30"
          r="18"
          fill={t.fillColor}
          fillOpacity={isDark ? "0.55" : "0.75"}
          filter={`url(#emboss-${theme}-${isDark ? 'dark' : 'light'})`}
        />
      </svg>

      {/* ── 2. Top-Right 3D Circular Icon Badge ── */}
      <div
        className={`absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-white/20 backdrop-blur-xl bg-gradient-to-br ${t.badgeBg} shadow-[0_3px_8px_rgba(0,0,0,0.15)] border border-white/40 dark:border-white/20 flex items-center justify-center z-10 transition-transform duration-300 group-hover:scale-110`}
      >
        <Icon className="w-2.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
      </div>

      {/* ── 3. Content Text Overlay ── */}
      <div
        style={{ minHeight: '43.5px' }}
        className="relative z-20 flex flex-col justify-between items-start text-left pr-9"
      >
        <h4
          className={`text-[14px] font-voda-exb uppercase tracking-wider leading-tight ${isDark ? 'text-white' : 'text-slate-700'} text-left ${t.titleColor}`}
        >
          {typeof title === 'string'
            ? title.split(' ').map((word, index) => (
                <span key={index} className="block">
                  {word}
                </span>
              ))
            : title}
        </h4>

        <p className={`text-[7.5px] leading-tight mt-1 text-left ${t.subColor} opacity-95`}>
          {subtitle}
        </p>
      </div>
    </motion.button>
  );
};

// ==========================================
// 1. MINI CIRCULAR PROGRESS RING COMPONENT
// ==========================================
const MiniDonutGauge = ({ label, percentage, color, isDark }) => {
  const radius = 31;
  const stroke = 7;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - ((percentage ?? 0) / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-2 flex-1 min-w-0 mt-1.5">
      <span className={`text-[10.5px] font-bold tracking-tight text-center truncate w-full ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
        {label}
      </span>
      <div className="relative flex items-center justify-center w-[72px] h-[72px] mb-2">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
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
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <span className={`absolute text-[12px] font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {showRate(percentage)}
        </span>
      </div>
    </div>
  );
};

// ==========================================
// 2. SEAMLESS MULTI-SEGMENT DONUT CHART
// ==========================================
const SecurityFitnessDonut = ({ isDark, report = null, hook = null, none = null, periodLabel = 'Current Quarter' }) => {
  const size = 180;
  const center = size / 2;
  const radius = 48;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  const segReport = report ?? 0;
  const segHook = hook ?? 0;
  const segNoInteract = none ?? 0;

  const lenReport = (segReport / 100) * circumference;
  const lenHook = (segHook / 100) * circumference;
  const lenNoInteract = (segNoInteract / 100) * circumference;

  const rotReport = -60;
  const rotHook = rotReport + (segReport / 100) * 360;
  const rotNoInteract = rotHook + (segHook / 100) * 360;

  return (
    <div className="relative flex items-center justify-center w-full h-[155px]">
      <svg width={size + 140} height={size} viewBox={`0 0 ${size + 140} ${size}`} className="overflow-visible">
        <g transform="translate(70, 0)">
          <circle
            cx={center}
            cy={center}
            r={radius - 2}
            fill="transparent"
            stroke={isDark ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.06)"}
            strokeWidth={strokeWidth / 2}
          />
          {segReport > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#45d8b8"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${lenReport} ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(${rotReport} ${center} ${center})`}
          />
          )}
          {segHook > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#f87171"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${lenHook} ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(${rotHook} ${center} ${center})`}
          />
          )}
          {segNoInteract > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#818cf8"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${lenNoInteract} ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(${rotNoInteract} ${center} ${center})`}
          />
          )}
          {segReport > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="#45d8b8"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`0.1 ${circumference}`}
            strokeDashoffset={0}
            transform={`rotate(${rotReport} ${center} ${center})`}
          />
          )}
          <circle
            cx={center}
            cy={center}
            r={radius - strokeWidth / 4}
            fill="transparent"
            stroke={isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.08)"}
            strokeWidth={strokeWidth / 2}
          />
        </g>

        <g>
          <polyline points="204,70 226,60 246,60" fill="none" stroke="#45d8b8" strokeWidth="1.2" />
          <text x="250" y="56" fill="#45d8b8" fontSize="11" className="font-voda-exb">
            {report === null ? '—' : `${report.toFixed(1)}%`}
          </text>
          <text x="250" y="68" fill={isDark ? "#cbd5e1" : "#475569"} fontSize="9.5" fontWeight="600" fontFamily="sans-serif">
            Report Rate
          </text>
        </g>
        <g>
          <polyline points="126,50 110,32 85,32" fill="none" stroke="#818cf8" strokeWidth="1.2" />
          <text x="80" y="28" textAnchor="end" fill="#818cf8" fontSize="11" className="font-voda-exb">
            {none === null ? '—' : `${none.toFixed(1)}%`}
          </text>
          <text x="80" y="40" textAnchor="end" fill={isDark ? "#cbd5e1" : "#475569"} fontSize="9.5" fontWeight="600" fontFamily="sans-serif">
            No Interaction
          </text>
        </g>
        <g>
          <polyline points="128,126 112,142 86,142" fill="none" stroke="#f87171" strokeWidth="1.2" />
          <text x="82" y="138" textAnchor="end" fill="#f87171" fontSize="11" className="font-voda-exb">
            {hook === null ? '—' : `${hook.toFixed(1)}%`}
          </text>
          <text x="82" y="150" textAnchor="end" fill={isDark ? "#cbd5e1" : "#475569"} fontSize="9.5" fontWeight="600" fontFamily="sans-serif">
            Hook Rate
          </text>
        </g>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={`text-[11px] font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {periodLabel.split(' ')[0]}
        </span>
        <span className={`text-[11px] font-bold leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {periodLabel.split(' ').slice(1).join(' ')}
        </span>
      </div>
    </div>
  );
};

// ==========================================
// 3. MAIN HOMESCREEN COMPONENT
// ==========================================
const HomeScreen = () => {
  const { isDark, user } = useUserType?.() || { isDark: false };
  const navigate = useNavigate();
  const [period, setPeriod] = useState(PERIODS[0]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { loading, error, summary, latest } = useHomeDashboard(period);
  const lc = latest;
  const locations = lc?.locations ?? [];
  const waiting = lc && !lc.loaded;
  const num = (value) => (lc && lc.loaded ? value : '…');
  const bar = (value) => `${Math.min(100, Math.max(0, value ?? 0))}%`;

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const cardBgImage = isDark ? CardBgDark : CardBgLight;
  const quoteBgImage = isDark ? QuoteCardDark : QuoteCardLight;

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div
        style={{ zoom: VarHomeScreenScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3 -mt-3 select-none font-sans"
      >
        <div className="flex flex-col lg:flex-row items-stretch gap-4 w-full">
          
          {/* ========================================================================= */}
          {/* ── COLUMN 1: LEFT GREETING + UIVERSE 3D ACTION BUTTONS ────────────────── */}
          {/* ========================================================================= */}
          <div
            className={`w-full lg:w-[320px] xl:w-[285px] flex-shrink-0 rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden border transition-all duration-300 ${
              isDark
                ? 'bg-[#15161a] border-white/5 text-white shadow-xl'
                : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            }`}
            style={{
              backgroundImage: `url(${cardBgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'left 0px center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            {/* Top Greeting Block */}
            <div className="relative z-10 flex flex-col">
              <h1 className="font-voda-exb text-[22px] xl:text-[22px] tracking-[-0.02em] leading-[1.1] text-inherit text-[#404040] dark:text-[#F2F2F2]">
                Hi {(user?.UserName || DEMO_USER.name).toUpperCase()},
              </h1>
              <h2 className="font-voda-exb text-[22px] xl:text-[19px] uppercase tracking-[-0.02em] leading-[1.1] text-inherit mt-0.5 opacity-90">
                WELCOME
              </h2>
            </div>

            {/* Bottom 3D Uiverse Quick Access Buttons */}
            <div className="relative z-10 mt-2 -mx-1 transform -translate-y-2 flex flex-col gap-2.5">
              <div className="flex flex-col items-end pb-0.5">
                <span className={`text-[16px] text-right font-voda-exb uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Quick<br /> Access
                </span>
                <span
                  style={{
                    background: 'linear-gradient(to right, #fbb9c5 0%, #fbb9c5 33.33%, #9D70E6 33.33%, #9D70E6 66.66%, #4BE184 66.66%, #4BE184 100%)'
                  }}
                  className="w-16 h-[2px] mt-1 rounded-[4px] block"
                />
              </div>

              {/* Card 1: New Campaign */}
              <Uiverse3DCard
                title="New Campaign"
                subtitle="Start or Schedule a new campaign."
                Icon={Rocket}
                theme="red"
                isDark={isDark}
                onClick={() => navigate('/start-campaign')}
              />

              {/* Card 2: Create Scenario */}
              <Uiverse3DCard
                title="Create Scenario"
                subtitle="Got an idea? Create custom scenarios."
                Icon={Wand2}
                theme="purple"
                isDark={isDark}
                onClick={() => navigate('/create-scenario')}
              />

              {/* Card 3: My Space */}
              <Uiverse3DCard
                title="My Space"
                subtitle="Check your leaderboard standings."
                Icon={Trophy}
                theme="mint"
                isDark={isDark}
                onClick={() => navigate('/my-space')}
              />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ── COLUMN 2: BIG OVERLAY CONTAINER WRAPPING BOTH SECTIONS ─────────────── */}
          {/* ========================================================================= */}
          <div
            className={`flex-1 rounded-2xl p-4 sm:p-5 border transition-all duration-300 flex flex-col gap-4 min-w-0 min-h-[620px] ${
              isDark
                ? 'bg-[#15161a] border-white/5 shadow-xl'
                : 'bg-white border-slate-200 text-slate-900 shadow-sm'
            }`}
          >
            {/* ───────────────────────────────────────────────────────────────────────── */}
            {/* SECTION 1: SECURITY HEALTH PULSE                                          */}
            {/* ───────────────────────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3.5 rounded-full bg-[#E60000]" />
                <h3 className={`text-xs font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Security Health Pulse
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
                {/* Left Sub-Card: Security Fitness Meter */}
                <div
                  className={`lg:col-span-5 px-3.5 pt-2.5 pb-0 rounded-xl border flex flex-col justify-between transition-colors overflow-hidden ${
                    isDark ? 'bg-[#202127]/80 border-white/0' : 'bg-[#f1f3f7] border-slate-200/0'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`text-[16px] font-voda-exb uppercase tracking-wider leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        SECURITY
                      </h4>
                      <h4 className={`text-[16px] font-voda-exb uppercase tracking-wider leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        FITNESS
                      </h4>
                      <h4 className={`text-[16px] font-voda-exb uppercase tracking-wider leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        METER
                      </h4>
                    </div>
                    <span className={`text-[9.5px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Out of {summary.evaluated} Campaign{summary.evaluated === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="transform -translate-y-[26px] translate-x-6 mb-0">
                    <SecurityFitnessDonut isDark={isDark} report={summary.reportRate} hook={summary.hookRate} none={summary.noInteractRate} periodLabel={period} />
                  </div>
                </div>

                {/* Right Sub-Card: Totals + Gauges + Integrated Quote Card */}
                <div className="lg:col-span-6 xl:col-span-6 flex flex-col justify-between w-full max-w-[540px]">
                  <div className="flex items-stretch justify-start w-full relative">
                    {/* 1. L-Shape Top-Left Head */}
                    <div
                      className={`relative inline-flex items-center gap-4 pl-3.5 py-3 pr-6 rounded-t-xl transition-colors flex-shrink-0 -mb-1 ${
                        isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                      }`}
                    >
                      <div className="flex flex-col flex-shrink-0 leading-[1.12] self-start">
                        <span className={`text-[16px] font-voda-exb uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          TOTAL
                        </span>
                        <span className={`text-[16px] font-voda-exb uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          CAMPAIGNS
                        </span>
                        <span className={`text-[16px] font-voda-exb uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          RAN
                        </span>
                      </div>

                      {/* 7 Campaigns White Badge Card */}
                      <div
                        className={`px-8 py-3 rounded-lg border flex flex-col items-center justify-center min-w-[96px] ${
                          isDark
                            ? 'bg-[#15161a] border-white/10 text-white'
                            : 'bg-[#ffffff] border-slate-200/90 text-slate-900'
                        }`}
                      >
                        <span className="text-[22px] font-voda-exb leading-none">
                          {loading ? '…' : summary.total}
                        </span>
                        <span className={`text-[9px] font-bold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Campaigns
                        </span>
                        <div className="flex flex-col items-center text-[8.5px] font-bold mt-0.5 text-[#22c55e] leading-tight">
                          <span>Active {summary.active}</span>
                          <span className="text-[#595959]">Closed {summary.closed}</span>
                        </div>
                      </div>

                      {/* Smooth Concave Inner Corner Fillet */}
                      <svg
                        className="absolute bottom-0 -right-4 w-4 h-4 pointer-events-none z-10"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M0 0 A16 16 0 0 0 16 16 H0 V0 Z"
                          fill={isDark ? "#202127" : "#f1f3f7"}
                        />
                      </svg>
                    </div>

                    {/* Period slicer */}
                    <div
                      className={`flex-1 ml-1.5 px-3 py-2 rounded-[10px] flex items-start justify-between relative transition-colors mb-1.5 select-none ${
                        isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                      }`}
                    >
                      <div className="flex flex-col pr-1">
                        <span className={`text-[14px] font-voda-exb uppercase tracking-wider leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          SELECTED:
                        </span>
                        <span className={`text-[12px] font-bold tracking-tight leading-tight mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {period}
                        </span>
                      </div>

                      <div className="relative flex-shrink-0" ref={menuRef}>
                        <button
                          type="button"
                          aria-haspopup="listbox"
                          aria-expanded={menuOpen}
                          aria-label="Choose the period"
                          onClick={() => setMenuOpen((open) => !open)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10.5px] font-bold cursor-pointer transition-colors ${
                            isDark
                              ? 'bg-[#15161a] border-white/10 text-white hover:bg-white/5'
                              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          Period
                          <svg width="9" height="6" viewBox="0 0 10 6" fill="currentColor" aria-hidden="true">
                            <path d="M0 0.5L5 5.5L10 0.5H0Z" />
                          </svg>
                        </button>

                        {menuOpen && (
                          <div
                            role="listbox"
                            className={`absolute right-0 top-full mt-1 w-48 rounded-lg border shadow-lg py-1 z-50 ${
                              isDark ? 'bg-[#15161a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            {PERIODS.map((option) => (
                              <button
                                key={option}
                                type="button"
                                role="option"
                                aria-selected={period === option}
                                onClick={() => {
                                  setPeriod(option);
                                  setMenuOpen(false);
                                }}
                                className={`w-full px-2.5 py-1 text-left text-[10.5px] font-semibold transition-colors cursor-pointer ${
                                  period === option
                                    ? isDark ? 'bg-white/10 text-white font-bold' : 'bg-slate-100 text-slate-900 font-bold'
                                    : isDark ? 'hover:bg-white/5 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {error && (
                    <p role="alert" className="text-[10px] font-semibold text-[#E60000] mt-1">
                      Couldn't load the campaigns. The numbers below are empty.
                    </p>
                  )}

                  {/* BOTTOM TIER: Full-width Foot with 4 Mini Donut Gauges */}
                  <div
                    className={`px-4 py-2 max-w-lg rounded-b-2xl rounded-tr-2xl flex items-center justify-between gap-2 transition-colors ${
                      isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                    }`}
                  >
                    <MiniDonutGauge label="Email Reach Rate" percentage={summary.reachRate} color="#c084fc" isDark={isDark} />
                    <MiniDonutGauge label="Open Rate" percentage={summary.openRate} color="#22c55e" isDark={isDark} />
                    <MiniDonutGauge label="Compromised Rate" percentage={summary.compromisedRate} color="#fb7185" isDark={isDark} />
                    <MiniDonutGauge label="Trained Rate" percentage={summary.trainedRate} color="#22c55e" isDark={isDark} />
                  </div>
                </div>
              </div>
            </div>

            {/* ───────────────────────────────────────────────────────────────────────── */}
            {/* SECTION 2: LATEST CAMPAIGN                                                */}
            {/* ───────────────────────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-[#E60000]" />
                  <h3 className={`text-xs font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Latest Campaign
                  </h3>
                </div>

                {/* 🌟 Top-Right 'Live' Badge */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-md text-[11px] font-bold border transition-colors ${
                    isDark
                      ? 'bg-[#202127]/90 border-white/5 text-[#22c55e]'
                      : 'bg-[#f1f3f7] border-slate-200/50 text-[#16a34a]'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22c55e]"></span>
                  </span>
                  <span>{lc && !lc.live ? 'Completed' : 'Live'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
                
                {/* ── LEFT COLUMN: CAMPAIGN DETAILS + EMAILS SENT (L-SHAPE) ── */}
                <div className="lg:col-span-6 flex flex-col justify-between gap-2.5 relative">
                  <div className="flex flex-col w-full relative">
                    
                    {/* Header */}
                    <div
                      style={{ minHeight: `${Math.round(76 * VarSection2HeightAdjuster)}px` }}
                      className={`w-full p-3.5 sm:p-4 rounded-t-xl rounded-br-xl flex items-start gap-4 transition-colors relative z-10 ${
                        isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                      }`}
                    >
                      <div className="flex flex-col flex-shrink-0">
                        <span className={`text-[16px] font-voda-exb uppercase tracking-wider leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          CAMPAIGN
                        </span>
                        <span className={`text-[16px] font-voda-exb uppercase tracking-wider leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          DETAILS
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 text-[10.5px] min-w-0">
                        <p className={`truncate font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <strong className={isDark ? 'text-white' : 'text-slate-900'}>Campaign ID:</strong> {lc?.id ?? '—'}
                        </p>
                        <p className={`truncate font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <strong className={isDark ? 'text-white' : 'text-slate-900'}>Campaign Name:</strong> {lc?.name ?? (loading ? 'Loading…' : 'No campaign has been sent yet')}
                        </p>
                        <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <strong className={isDark ? 'text-white' : 'text-slate-900'}>Campaign Type:</strong> {lc?.type || '—'}
                        </p>
                        <div className="flex items-center gap-3 font-semibold text-[10.5px] mt-0.5">
                          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                            <strong className={isDark ? 'text-white' : 'text-slate-900'}>Sent date :</strong> {longDate(lc?.startedAt)}
                          </span>
                          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                            <strong className={isDark ? 'text-white' : 'text-slate-900'}>End date :</strong> {lc?.live ? 'Live (Not Ended)' : longDate(lc?.endTime)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Row 1 Metrics */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 items-stretch relative">
                      <div
                        style={{ minHeight: `${Math.round(62 * VarSection2HeightAdjuster)}px` }}
                        className={`p-3 rounded-b-xl flex flex-col justify-between relative transition-colors ${
                          isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                        }`}
                      >
                        <span className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Emails Sent
                        </span>
                        <div className="my-1">
                          <span className={`text-[15px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {num(lc?.sent)}
                          </span>
                          <span className={`text-[9px] font-semibold ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            out of {num(lc?.sent)} ({lc?.sent ? '100%' : '—'})
                          </span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <div className="bg-[#22c55e] h-full rounded-full" style={{ width: lc?.sent ? '100%' : '0%' }} />
                        </div>

                        <svg
                          className="absolute top-0 -right-4 w-4 h-4 pointer-events-none z-20"
                          viewBox="0 0 16 16"
                          fill="none"
                        >
                          <path
                            d="M 0,0 H 16 A 16,16 0 0 0 0,16 Z"
                            fill={isDark ? "#202127" : "#f1f3f7"}
                          />
                        </svg>
                      </div>

                      <div
                        style={{ minHeight: `${Math.round(62 * VarSection2HeightAdjuster)}px` }}
                        className={`p-3 rounded-xl border flex flex-col justify-between mt-2 transition-colors ${
                          isDark
                            ? 'bg-[#202127]/80 border-white/0 text-white shadow-sm'
                            : 'bg-[#f1f3f7] border-slate-200/0 text-slate-900 shadow-2xs'
                        }`}
                      >
                        <span className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Opened/Read
                        </span>
                        <div className="my-1">
                          <span className={`text-[15px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {num(lc?.opened)}
                          </span>
                          <span className={`text-[9px] font-semibold ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            out of {num(lc?.sent)} ({showRate(lc?.openPercent ?? null, 1)})
                          </span>
                        </div>
                        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                          <div className="bg-[#fb7185] h-full rounded-full" style={{ width: bar(lc?.openPercent) }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Row 2 Metrics */}
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <div
                      style={{ minHeight: `${Math.round(62 * VarSection2HeightAdjuster)}px` }}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-colors ${
                        isDark
                          ? 'bg-[#202127]/80 border-white/0 text-white shadow-sm'
                          : 'bg-[#f1f3f7] border-slate-200/0 text-slate-900 shadow-2xs'
                      }`}
                    >
                      <span className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Phished/Trapped
                      </span>
                      <div className="my-1">
                        <span className={`text-[15px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {num(lc?.clicked)}
                        </span>
                        <span className={`text-[9px] font-semibold ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          out of {num(lc?.opened)}
                        </span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <div className="bg-[#fb7185] h-full rounded-full" style={{ width: bar(lc?.clickedPercent) }} />
                      </div>
                    </div>

                    <div
                      style={{ minHeight: `${Math.round(62 * VarSection2HeightAdjuster)}px` }}
                      className={`p-3 rounded-xl border flex flex-col justify-between transition-colors ${
                        isDark
                          ? 'bg-[#202127]/80 border-white/0 text-white shadow-sm'
                          : 'bg-[#f1f3f7] border-slate-200/0 text-slate-900 shadow-2xs'
                      }`}
                    >
                      <span className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Reported
                      </span>
                      <div className="my-1">
                        <span className={`text-[15px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {num(lc?.reported)}
                        </span>
                        <span className={`text-[9px] font-semibold ml-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          out of {num(lc?.opened)}
                        </span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                        <div className="bg-[#22c55e] h-full rounded-full" style={{ width: bar(lc?.reportedPercent) }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT COLUMN: TARGET LOCATIONS + WORLD MAP (ZERO-GAP L-SHAPE) ── */}
                <div className="lg:col-span-6 w-full relative flex flex-col justify-start">
                  
                  {/* Standalone Overall Hook Rate Card */}
                  <div
                    style={{ minHeight: `${Math.round(102 * VarSection2HeightAdjuster)}px` }}
                    className={`absolute top-0 right-0 w-[42%] min-w-[180px] max-w-[240px] p-3 sm:p-3.5 rounded-xl border flex items-center justify-between gap-2 z-20 transition-all mb-2 ${
                      isDark
                        ? 'bg-[#202127]/80 border-white/0 text-white shadow-sm'
                        : 'bg-[#f1f3f7] border-slate-200/0 text-slate-900 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col self-start min-w-0 pr-1">
                      <span className={`text-[16px] sm:text-[15px] xl:text-[15px] font-voda-exb uppercase tracking-wider leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        OVERALL
                      </span>
                      <span className={`text-[16px] sm:text-[15px] xl:text-[15px] font-voda-exb uppercase tracking-wider leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        HOOK RATE %
                      </span>
                      <span className={`text-[9px] font-semibold mt-1 leading-tight truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Total {num(lc?.clicked)} Recipients
                      </span>
                      <span className={`text-[9px] font-semibold mt-0.5 leading-tight truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        got Phished
                      </span>
                    </div>

                    <div className="relative flex items-center justify-center w-[80px] h-[80px] xl:w-[80px] xl:h-[80px] flex-shrink-0">
                      <svg viewBox="0 0 84 84" className="w-full h-full transform -rotate-90">
                        <circle
                          stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}
                          fill="transparent"
                          strokeWidth="12"
                          r="34"
                          cx="42"
                          cy="42"
                        />
                        <circle
                          stroke="#fb7185"
                          fill="transparent"
                          strokeWidth="10"
                          strokeDasharray={`${2 * Math.PI * 34}`}
                          strokeDashoffset={`${2 * Math.PI * 34 * (1 - (lc?.hookRate ?? 0) / 100)}`}
                          strokeLinecap="round"
                          r="34"
                          cx="42"
                          cy="42"
                        />
                      </svg>
                      
                      <span className={`absolute text-[13.5px] xl:text-[12.5px] font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {waiting ? '…' : showRate(lc?.hookRate ?? null, 1)}
                      </span>
                    </div>
                  </div>

                  {/* L-Shape Continuous Body */}
                  <div className="flex flex-col gap-0 w-full relative">
                    
                    {/* Head */}
                    <div
                      style={{ minHeight: `${Math.round(108 * VarSection2HeightAdjuster)}px` }}
                      className={`relative inline-flex items-center justify-between gap-3 p-3.5 rounded-t-[12px] w-[57%] transition-all z-10 ${
                        isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                      }`}
                    >
                      <div className="flex flex-col flex-shrink-0 self-start">
                        <span className={`text-[15px] xl:text-[16px] font-voda-exb uppercase tracking-wider leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          TARGET
                        </span>
                        <span className={`text-[15px] xl:text-[16px] font-voda-exb uppercase tracking-wider leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          LOCATIONS
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1 min-w-0 pr-1">
                        {locations.length === 0 && (
                          <span className={`text-[9px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {waiting ? 'Loading…' : 'No locations yet'}
                          </span>
                        )}
                        {locations.map((loc) => (
                          <div
                            key={loc.name}
                            className={`w-full px-2.5 py-1 rounded-md border flex items-center justify-start text-[9px] font-bold transition-all ${
                              isDark 
                                ? 'bg-[#15161a] border-white/10 text-slate-200' 
                                : 'bg-white border-slate-200/50 text-slate-800 shadow-2xs'
                            }`}
                          >
                            <span className="truncate">{loc.name} - Hook Rate {showRate(loc.hookRate, 1)}</span>
                          </div>
                        ))}
                      </div>

                      <svg
                        className="absolute -bottom-px -right-4 w-4 h-4 pointer-events-none z-20"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <path
                          d="M 0,0 A 16,16 0 0 0 16,16 H 0 Z"
                          fill={isDark ? "#202127" : "#f1f3f7"}
                        />
                      </svg>
                    </div>

                    {/* World Map Foot */}
                    <div
                      style={{ height: `${Math.round(120 * VarSection2HeightAdjuster)}px` }}
                      className={`w-full p-2 rounded-b-xl rounded-tr-xl overflow-hidden [mask-image:linear-gradient(white,white)] relative flex items-center justify-center -mt-px transition-all z-0 ${
                        isDark ? 'bg-[#202127]' : 'bg-[#f1f3f7]'
                      }`}
                    >
                      <ComposableMap
                        projection="geoMercator"
                        projectionConfig={{
                          scale: 500,
                          center: [10, 38]
                        }}
                        style={{ 
                          width: "100%", 
                          height: "100%", 
                          borderRadius: "12px 12px 12px 12px",
                          overflow: "hidden" 
                        }}
                      >
                        <Geographies geography={geoUrl}>
                          {({ geographies }) =>
                            geographies.map((geo) => (
                              <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill={isDark ? "#454d4d" : "#cbd5e1"}
                                stroke={isDark ? "#1a1c22" : "#ffffff"}
                                strokeWidth={0.4}
                                style={{
                                  default: { outline: "none" },
                                  hover: { fill: isDark ? "#3e424f" : "#94a3b8", outline: "none" }
                                }}
                              />
                            ))
                          }
                        </Geographies>

                        {locations.filter((loc) => COUNTRY_COORDINATES[loc.name]).map(({ name }) => (
                          <Marker key={name} coordinates={COUNTRY_COORDINATES[name]}>
                            <circle r={20} fill="#E60000" className="animate-ping opacity-60" />
                            <circle r={10} fill="#E60000" />
                          </Marker>
                        ))}
                      </ComposableMap>
                    </div>

                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
};

export default HomeScreen;