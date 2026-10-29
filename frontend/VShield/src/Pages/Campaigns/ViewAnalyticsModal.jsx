import { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

// Data sources: sample results drawn from the people directory, until the
// API serves tracking results per campaign.
import masterUsersData from '../../MasterUserData.json';
import { sampleCampaignResults } from '../../services/sampleCampaignResults';

// =========================================================================
// 🎛️ SCALE CONTROL & ADJUSTER CONSTANTS
// =========================================================================
export const VarAnalyticsModalScale = 0.82;
export const VarOverallRoundednessScale = 0.6;
export const VarAnalyticsModalMaxWidth = 1300; // in px
export const VarAnalyticsModalPadding = 18;    // in px
export const VarColumnsGap = 10;               // in px between left and right column
export const VarRowsGap = 8;                  // in px between top sections and bottom row

// Left Column L-Shape & Metric Cards
export const VarCampaignDetailsMinHeight = 124;  // in px for top header
export const VarMetricCardMinHeight = 96;        // in px for metric boxes

// Right Column Cards & Max Visible Bars Constants
export const VarTargetLocationsCardHeight = 162;   // in px
export const VarTargetDepartmentsCardHeight = 162; // in px
export const VarTargetCountryChartMaxBarVisible = 4;
export const VarTargetDepartmentChartMaxBarVisible = 4;
export const VarTargetLocationsChartEachBarHeight = 28;   // in px per location bar
export const VarTargetDepartmentsChartEachBarHeight = 28; // in px per department bar

// Bottom Row Cards
export const VarBottomDonutsCardHeight = 128; // in px
export const VarBottomRateCardHeight = 128;   // in px
export const VarGaugeDonutSize = 64;          // in px
export const VarBigDonutSize = 82;            // in px

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
`;

// Modulo-3 color series matching OnGoingCampaignsGallery.jsx
const getCardBgColor = (index, isDark) => {
  const safeIdx = Math.max(0, index);
  const remainder = safeIdx % 3;
  if (isDark) {
    if (remainder === 0) return '#2E200C'; // Dark Amber / Peach
    if (remainder === 1) return '#22193E'; // Dark Purple / Lavender
    return '#0D271E';                      // Dark Mint
  }
  if (remainder === 0) return '#FFEFCE';   // Warm Peach / Yellowish (As shown in screenshot)
  if (remainder === 1) return '#ECE8FF';   // Soft Lavender
  return '#CEFBEA';                        // Soft Mint
};

// Pastel bar color configurations for Recharts pill rendering
const BAR_COLOR_CONFIG = [
  { bg: '#E9D5FF', text: '#581c87' }, // Lavender / Purple
  { bg: '#DCFCE7', text: '#14532d' }, // Mint / Green
  { bg: '#FFEDD5', text: '#7c2d12' }, // Peach / Warm Cream
  { bg: '#E0F2FE', text: '#0c4a6e' }, // Soft Blue
  { bg: '#FEE2E2', text: '#881337' }  // Soft Rose
];

// Circular SVG Ring Component
const DonutRing = ({ percentage = 0, color = '#22c55e', size = VarGaugeDonutSize, strokeWidth = 8, label, isDark }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const numPct = typeof percentage === 'number' ? percentage : parseFloat(percentage) || 0;
  const validPct = Math.min(Math.max(numPct, 0), 100);
  const strokeDashoffset = circumference - (validPct / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <span className="absolute font-voda font-bold text-[12px] text-slate-900 dark:text-white">
        {label !== undefined ? label : `${Math.round(validPct)}%`}
      </span>
    </div>
  );
};

// Recharts Horizontal Bar Component for each location/department item
const RechartsPillBar = ({ count, maxCount, rate, colorConfig, barHeight = 20 }) => {
  const chartData = useMemo(() => [{ value: count }], [count]);

  return (
    <div className="flex-1 min-w-0 relative flex items-center" style={{ height: `${barHeight}px` }}>
      <ResponsiveContainer width="100%" height={barHeight}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <XAxis type="number" domain={[0, maxCount]} hide />
          <YAxis type="category" hide />
          <Bar
            dataKey="value"
            isAnimationActive={false}
            shape={(props) => {
              const { x, y, width, height } = props;
              const barWidth = Math.max(width || 0, 110);
              const rx = height / 2;
              return (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    rx={rx}
                    ry={rx}
                    fill={colorConfig.bg}
                  />
                  <text
                    x={x + 10}
                    y={y + height / 2 + 3.5}
                    fill={colorConfig.text}
                    fontSize="9"
                    fontFamily='Montserrat'
                    fontWeight="Extrabold"
                  >
                    Hook Rate <tspan fill="#e11d48" fontWeight="900">{rate}%</tspan>
                  </text>
                </g>
              );
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// "10/05/2026 09:00 AM", as the sent date was drawn
const formatSentDate = (value) => {
  const d = new Date(value);
  if (!value || isNaN(d.getTime())) return 'N/A';
  const pad = (n) => String(n).padStart(2, '0');
  const hours = d.getHours() % 12 || 12;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(hours)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
};

const ViewAnalyticsModal = ({
  campaign = {},
  campaignIndex = 0,
  isDark = false,
  ended = false,
  onClose
}) => {
  // Dynamic modal background color based on active campaign modulo-3
  const modalBg = useMemo(() => {
    return getCardBgColor(campaignIndex, isDark);
  }, [campaignIndex, isDark]);

  // Card background color
  const innerCardBg = isDark ? '#161820' : '#FFFFFF';
  const campaignId = campaign?.campaignId || '';
  // Ended campaigns use slimmer bars, as their pop-up was drawn
  const locationBarHeight = ended ? 22 : VarTargetLocationsChartEachBarHeight;
  const departmentBarHeight = ended ? 22 : VarTargetDepartmentsChartEachBarHeight;

  // One row per recipient (sample figures, see sampleCampaignResults)
  const recipients = useMemo(() => sampleCampaignResults(campaignId, masterUsersData), [campaignId]);

  // Compute 100% dynamic analytics strictly derived from data
  const analytics = useMemo(() => {
    const allUserEmailsMap = new Map(recipients.map((r) => [r.email, r]));

    const totalEmailsSent = allUserEmailsMap.size;

    let openedCount = 0;
    let trappedCount = 0;
    let reportedCount = 0;
    let compromisedCount = 0;
    let trainedCount = 0;

    allUserEmailsMap.forEach((user) => {
      if (user.opened) openedCount += 1;
      if (user.trapped) trappedCount += 1;
      if (user.reported) reportedCount += 1;
      if (user.compromised) compromisedCount += 1;
      if (user.trained) trainedCount += 1;
    });

    const noResponseCount = Math.max(0, totalEmailsSent - (trappedCount + reportedCount));

    const openRatePct = totalEmailsSent > 0 ? Math.round((openedCount / totalEmailsSent) * 100) : 0;
    const noResponsePct = totalEmailsSent > 0 ? Math.round((noResponseCount / totalEmailsSent) * 100) : 0;
    const compromisedPct = trappedCount > 0 ? Math.round((compromisedCount / trappedCount) * 100) : 0;
    const trainedPct = trappedCount > 0 ? Math.round((trainedCount / trappedCount) * 100) : 0;

    const overallHookRate = totalEmailsSent > 0 ? ((trappedCount / totalEmailsSent) * 100).toFixed(1) : '0.0';
    const overallReportRate = totalEmailsSent > 0 ? ((reportedCount / totalEmailsSent) * 100).toFixed(1) : '0.0';

    // Group Locations and Departments from each recipient's directory entry
    const locationMap = {};
    const departmentMap = {};

    allUserEmailsMap.forEach((user) => {
      const loc = user.country;
      const dept = user.department;

      if (!locationMap[loc]) locationMap[loc] = { usersCount: 0, trappedCount: 0 };
      if (!departmentMap[dept]) departmentMap[dept] = { usersCount: 0, trappedCount: 0 };

      locationMap[loc].usersCount += 1;
      if (user.trapped) locationMap[loc].trappedCount += 1;

      departmentMap[dept].usersCount += 1;
      if (user.trapped) departmentMap[dept].trappedCount += 1;
    });

    const locations = Object.entries(locationMap)
      .map(([name, data]) => ({
        name,
        count: data.usersCount,
        rate: data.usersCount > 0 ? ((data.trappedCount / data.usersCount) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.count - a.count);

    const departments = Object.entries(departmentMap)
      .map(([name, data]) => ({
        name,
        count: data.usersCount,
        rate: data.usersCount > 0 ? ((data.trappedCount / data.usersCount) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.count - a.count);

    const maxLocationCount = Math.max(...locations.map((l) => l.count), 1);
    const maxDepartmentCount = Math.max(...departments.map((d) => d.count), 1);

    return {
      totalEmailsSent,
      openedCount,
      trappedCount,
      reportedCount,
      openRatePct,
      noResponsePct,
      compromisedPct,
      trainedPct,
      overallHookRate,
      overallReportRate,
      locations,
      departments,
      maxLocationCount,
      maxDepartmentCount
    };
  }, [recipients]);

  if (!campaign || Object.keys(campaign).length === 0) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* 🌟 ROOT MODAL CONTAINER WITH DYNAMIC PALETTE */}
      <div
        style={{
          zoom: VarAnalyticsModalScale,
          backgroundColor: modalBg,
          maxWidth: `${VarAnalyticsModalMaxWidth}px`,
          padding: `${VarAnalyticsModalPadding}px`,
          borderRadius: `${Math.round(24 * VarOverallRoundednessScale)}px`
        }}
        className="w-full flex flex-col gap-3 shadow-2xl border border-black/10 dark:border-white/10 text-slate-900 dark:text-white transition-all overflow-hidden relative max-h-[96vh]"
      >
        {/* ========================================================================= */}
        {/* ── 🌟 TOP BAR: ID BADGE + REFRESH TIME + LIVE BADGE + GO BACK BUTTON ── */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between flex-shrink-0">
          {/* Left: Campaign ID Pill with Red Dot */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-voda font-bold bg-white/95 dark:bg-black/60 text-slate-900 dark:text-white shadow-2xs border border-black/5 dark:border-white/10">
            <span className="w-2 h-2 rounded-full bg-[#E60000]" />
            <span>{campaignId}</span>
          </div>

          {/* Right: Data Source + Live/Ended Pill + Go Back Button */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-voda font-bold text-slate-700 dark:text-slate-300">
              Sample figures: per-campaign results are not served by the API yet
            </span>

            {ended ? (
              <div className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-voda font-bold bg-[#F43F5E] text-white shadow-2xs">
                <span>Campaign Ended</span>
              </div>
            ) : (
              /* Live Pill with Green Pulse */
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-voda font-bold bg-[#D4EAD6] text-[#16A34A] shadow-2xs border border-emerald-300/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                <span>Live</span>
              </div>
            )}

            {/* Go Back Button */}
            <button
              type="button"
              onClick={onClose}
              className="h-7 px-5 rounded-full bg-[#3D3F45] hover:bg-black text-white text-[10.5px] font-voda font-bold tracking-tight shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              Go Back
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 MAIN WORKSPACE: 2 COLUMNS (LEFT L-SHAPE vs RIGHT TARGET BARS) ───── */}
        {/* ========================================================================= */}
        <div 
          style={{ gap: `${VarColumnsGap}px` }}
          className="grid grid-cols-1 lg:grid-cols-12 items-stretch flex-shrink-0"
        >
          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* 👈 LEFT COLUMN: CONTINUOUS L-SHAPED BENTO CONTAINER + ROW 2 METRICS ── */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-2.5 relative">
            
            {/* 🌟 1. CONTINUOUS L-SHAPED CONTAINER (CAMPAIGN DETAILS + EMAILS SENT) */}
            <div className="flex flex-col w-full relative">
              
              {/* L-Shape Header: CAMPAIGN DETAILS */}
              <div
                style={{
                  minHeight: `${VarCampaignDetailsMinHeight}px`,
                  backgroundColor: innerCardBg,
                  borderTopLeftRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
                  borderTopRightRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
                  borderBottomRightRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`
                }}
                className="w-full p-3.5 sm:p-4 flex items-start gap-4 transition-colors relative z-10 shadow-2xs border-t border-l border-r border-black/5 dark:border-white/5"
              >
                <div className="flex flex-col flex-shrink-0 pt-0.5">
                  <span className="text-[15px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                    CAMPAIGN
                  </span>
                  <span className="text-[15px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                    DETAILS
                  </span>
                </div>

                <div className="flex flex-col gap-1 text-[11px] min-w-0 flex-1 leading-snug">
                  <p className="truncate font-semibold text-slate-700 dark:text-slate-300">
                    <strong className="font-bold text-slate-900 dark:text-white">Campaign Name: </strong>
                    {campaign.CampaignTitle || 'N/A'}
                  </p>
                  <p className="truncate font-semibold text-slate-700 dark:text-slate-300">
                    <strong className="font-bold text-slate-900 dark:text-white">Recipient List Name: </strong>
                    <span className="underline font-medium text-slate-900 dark:text-white">
                      {campaign.UserList || 'N/A'}
                    </span>
                  </p>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 pt-0.5">
                    <strong className="font-bold text-slate-900 dark:text-white">Sent date : </strong>
                    {formatSentDate(campaign.sentAt || campaign.StartTime)}
                  </p>
                </div>
              </div>

              {/* Row 1 Metrics: Emails Sent (Left L-Base) + Opened/Read (Right Detached Box) */}
              <div className="grid grid-cols-2 gap-3 items-stretch relative">
                
                {/* 🌟 Left: Emails Sent (Physically Continuous with Header Above) */}
                <div
                  style={{
                    minHeight: `${VarMetricCardMinHeight}px`,
                    backgroundColor: innerCardBg,
                    borderBottomLeftRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
                    borderBottomRightRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`
                  }}
                  className="p-3.5 flex flex-col justify-between relative transition-colors shadow-2xs border-b border-l border-r border-black/5 dark:border-white/5"
                >
                  <span className="text-[11.5px] font-voda font-bold text-slate-800 dark:text-slate-200">
                    Emails Sent
                  </span>
                  <div className="my-1">
                    <span className="text-[16px] font-voda font-bold text-slate-950 dark:text-white">
                      {analytics.totalEmailsSent}
                    </span>
                    <span className="text-[9.5px] font-bold text-slate-500 ml-1.5">
                      out of {analytics.totalEmailsSent} (100%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                    <div className="bg-[#22c55e] h-full rounded-full" style={{ width: '100%' }} />
                  </div>

                  {/* 🌟 Concave Arc Fillet in the Re-entrant Inner Corner */}
                  <svg
                    className="absolute top-0 -right-4 w-4 h-4 pointer-events-none z-20 overflow-hidden"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M 0,0 H 16 A 16,16 0 0 0 0,16 Z"
                      fill={innerCardBg}
                    />
                  </svg>
                </div>

                {/* 🌟 Right: Opened/Read (Detached Card with Margin-Top into Background Cutout) */}
                <div
                  style={{
                    minHeight: `${VarMetricCardMinHeight}px`,
                    backgroundColor: innerCardBg,
                    borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`
                  }}
                  className="p-3.5 flex flex-col justify-between mt-2.5 transition-colors shadow-2xs border border-black/5 dark:border-white/5"
                >
                  <span className="text-[11.5px] font-voda font-bold text-slate-800 dark:text-slate-200">
                    Opened/Read
                  </span>
                  <div className="my-1">
                    <span className="text-[16px] font-voda font-bold text-slate-950 dark:text-white">
                      {analytics.openedCount}
                    </span>
                    <span className="text-[9.5px] font-bold text-slate-500 ml-1.5">
                      out of {analytics.totalEmailsSent} ({analytics.openRatePct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                    <div
                      className="bg-[#fb7185] h-full rounded-full"
                      style={{ width: `${analytics.openRatePct}%` }}
                    />
                  </div>
                </div>

              </div>
            </div>

            {/* 🌟 2. ROW 2 METRICS: PHISHED/TRAPPED + REPORTED */}
            <div className="grid grid-cols-2 gap-3">
              {/* Phished/Trapped */}
              <div
                style={{
                  minHeight: `${VarMetricCardMinHeight}px`,
                  backgroundColor: innerCardBg,
                  borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`
                }}
                className="p-3.5 flex flex-col justify-between shadow-2xs border border-black/5 dark:border-white/5 transition-colors"
              >
                <span className="text-[11.5px] font-voda font-bold text-slate-800 dark:text-slate-200">
                  Phished/Trapped
                </span>
                <div className="my-1">
                  <span className="text-[16px] font-voda font-bold text-slate-950 dark:text-white">
                    {analytics.trappedCount}
                  </span>
                  <span className="text-[9.5px] font-bold text-slate-500 ml-1.5">
                    out of {analytics.openedCount}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                  <div
                    style={{ width: `${Math.round((analytics.trappedCount / (analytics.openedCount || 1)) * 100)}%` }}
                    className="bg-[#fb7185] h-full rounded-full"
                  />
                </div>
              </div>

              {/* Reported */}
              <div
                style={{
                  minHeight: `${VarMetricCardMinHeight}px`,
                  backgroundColor: innerCardBg,
                  borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`
                }}
                className="p-3.5 flex flex-col justify-between shadow-2xs border border-black/5 dark:border-white/5 transition-colors"
              >
                <span className="text-[11.5px] font-voda font-bold text-slate-800 dark:text-slate-200">
                  Reported
                </span>
                <div className="my-1">
                  <span className="text-[16px] font-voda font-bold text-slate-950 dark:text-white">
                    {analytics.reportedCount}
                  </span>
                  <span className="text-[9.5px] font-bold text-slate-500 ml-1.5">
                    out of {analytics.openedCount}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                  <div
                    style={{ width: `${Math.round((analytics.reportedCount / (analytics.openedCount || 1)) * 100)}%` }}
                    className="bg-[#22c55e] h-full rounded-full"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* ═════════════════════════════════════════════════════════════════════ */}
          {/* 👉 RIGHT COLUMN: TARGET LOCATIONS & TARGET DEPARTMENTS (RECHARTS) ─── */}
          {/* ═════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-3">
            
            {/* 1. TARGET LOCATIONS CARD */}
            <div
              style={{
                backgroundColor: innerCardBg,
                borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
                height: `${VarTargetLocationsCardHeight}px`
              }}
              className="p-3.5 sm:p-4 flex items-start gap-4 shadow-2xs border border-black/5 dark:border-white/5 overflow-hidden"
            >
              <div className="flex flex-col flex-shrink-0 pt-0.5">
                <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                  TARGET
                </span>
                <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                  LOCATIONS
                </span>
              </div>

              {/* Scrollable list bounded by VarTargetCountryChartMaxBarVisible with thin scrollbar */}
              <div 
                style={{ maxHeight: `${VarTargetCountryChartMaxBarVisible * (locationBarHeight + 6)}px` }}
                className="flex-1 overflow-y-auto pr-5 ml-8 flex flex-col gap-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                {analytics.locations.length === 0 ? (
                  <span className="text-[10px] text-slate-400 font-medium italic my-auto">
                    No recipient location data available
                  </span>
                ) : (
                  analytics.locations.map((loc, idx) => {
                    const colorConfig = BAR_COLOR_CONFIG[idx % BAR_COLOR_CONFIG.length];
                    return (
                      <div key={loc.name} className="flex items-center justify-between gap-2.5 text-[10.5px]">
                        <span className="font-voda font-bold text-slate-800 dark:text-slate-200 w-20 break-words leading-tight text-right flex-shrink-0">
                          {loc.name}
                        </span>

                        {/* Recharts Bar Component using dedicated bar height */}
                        <RechartsPillBar
                          count={loc.count}
                          maxCount={analytics.maxLocationCount}
                          rate={loc.rate}
                          colorConfig={colorConfig}
                          barHeight={locationBarHeight}
                        />

                        <span className="font-voda font-bold text-slate-900 dark:text-white w-8 text-right flex-shrink-0">
                          {loc.count}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* 2. TARGET DEPARTMENTS CARD */}
            <div
              style={{
                backgroundColor: innerCardBg,
                borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
                height: `${VarTargetDepartmentsCardHeight}px`
              }}
              className="p-3.5 sm:p-4 flex items-start gap-4 shadow-2xs border border-black/5 dark:border-white/5 overflow-hidden"
            >
              <div className="flex flex-col flex-shrink-0 pt-0.5">
                <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                  TARGET
                </span>
                <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                  DEPARTMENTS
                </span>
              </div>

              {/* Scrollable list bounded by VarTargetDepartmentChartMaxBarVisible with thin scrollbar */}
              <div 
                style={{ maxHeight: `${VarTargetDepartmentChartMaxBarVisible * (departmentBarHeight + 6)}px` }}
                className="flex-1 overflow-y-auto pr-5 mr-3 -ml-4 flex flex-col gap-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                {analytics.departments.length === 0 ? (
                  <span className="text-[10px] text-slate-400 font-medium italic my-auto">
                    No recipient department data available
                  </span>
                ) : (
                  analytics.departments.map((dept, idx) => {
                    const colorConfig = BAR_COLOR_CONFIG[idx % BAR_COLOR_CONFIG.length];
                    return (
                      <div key={dept.name} className="flex items-center justify-between gap-2.5 text-[10.5px]">
                        <span className="font-voda font-bold text-slate-800 dark:text-slate-200 w-28 break-words leading-tight text-right flex-shrink-0">
                          {dept.name}
                        </span>

                        {/* Recharts Bar Component using dedicated bar height */}
                        <RechartsPillBar
                          count={dept.count}
                          maxCount={analytics.maxDepartmentCount}
                          rate={dept.rate}
                          colorConfig={colorConfig}
                          barHeight={departmentBarHeight}
                        />

                        <span className="font-voda font-bold text-slate-900 dark:text-white w-8 text-right flex-shrink-0">
                          {dept.count}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 BOTTOM ROW: [4 DONUT RINGS] + [OVERALL HOOK] + [OVERALL REPORT] ─── */}
        {/* ========================================================================= */}
        <div 
          style={{ gap: `${VarRowsGap}px` }}
          className="grid grid-cols-1 lg:grid-cols-12 items-stretch flex-shrink-0"
        >
          {/* 1. FOUR CIRCULAR GAUGE DONUTS (6 cols - aligns under Left Column) */}
          <div
            style={{
              backgroundColor: innerCardBg,
              borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
              minHeight: `${VarBottomDonutsCardHeight}px`
            }}
            className="lg:col-span-6 grid grid-cols-4 gap-2 items-center justify-items-center p-3 shadow-2xs border border-black/5 dark:border-white/5"
          >
            {/* Open Rate */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-[11px] font-voda font-bold text-slate-800 dark:text-slate-200">
                Open Rate
              </span>
              <DonutRing percentage={analytics.openRatePct} color="#22c55e" isDark={isDark} />
            </div>

            {/* No Response */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-[11px] font-voda font-bold text-slate-800 dark:text-slate-200">
                No Response
              </span>
              <DonutRing percentage={analytics.noResponsePct} color="#c084fc" isDark={isDark} />
            </div>

            {/* Compromised Rate */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-[11px] font-voda font-bold text-slate-800 dark:text-slate-200">
                Compromised Rate
              </span>
              <DonutRing percentage={analytics.compromisedPct} color="#fb7185" isDark={isDark} />
            </div>

            {/* Trained Rate */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <span className="text-[11px] font-voda font-bold text-slate-800 dark:text-slate-200">
                Trained Rate
              </span>
              <DonutRing percentage={analytics.trainedPct} color="#22c55e" isDark={isDark} />
            </div>
          </div>

          {/* 2. OVERALL HOOK RATE % CARD (3 cols) */}
          <div
            style={{
              backgroundColor: innerCardBg,
              borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
              minHeight: `${VarBottomRateCardHeight}px`
            }}
            className="lg:col-span-3 p-4 flex items-center justify-between gap-3 shadow-2xs border border-black/5 dark:border-white/5"
          >
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white uppercase leading-tight tracking-tight">
                OVERALL
              </span>
              <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white uppercase leading-tight tracking-tight">
                HOOK RATE %
              </span>
              <p className="text-[9.5px] font-medium text-slate-600 dark:text-slate-300 leading-snug mt-1.5 max-w-[140px]">
                Percentage of recipients who got phished in this campaigns
              </p>
            </div>

            <DonutRing
              percentage={analytics.overallHookRate}
              color="#fb7185"
              size={VarBigDonutSize}
              strokeWidth={10}
              label={`${analytics.overallHookRate}%`}
              isDark={isDark}
            />
          </div>

          {/* 3. OVERALL REPORT RATE % CARD (3 cols) */}
          <div
            style={{
              backgroundColor: innerCardBg,
              borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
              minHeight: `${VarBottomRateCardHeight}px`
            }}
            className="lg:col-span-3 p-4 flex items-center justify-between gap-3 shadow-2xs border border-black/5 dark:border-white/5"
          >
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white uppercase leading-tight tracking-tight">
                OVERALL
              </span>
              <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white uppercase leading-tight tracking-tight">
                REPORT RATE %
              </span>
              <p className="text-[9.5px] font-medium text-slate-600 dark:text-slate-300 leading-snug mt-1.5 max-w-[140px]">
                Percentage of recipients who successfully reported the phishing email
              </p>
            </div>

            <DonutRing
              percentage={analytics.overallReportRate}
              color="#22c55e"
              size={VarBigDonutSize}
              strokeWidth={10}
              label={`${analytics.overallReportRate}%`}
              isDark={isDark}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default ViewAnalyticsModal;