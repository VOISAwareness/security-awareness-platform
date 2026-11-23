import { useMemo } from "react";
import { createPortal } from "react-dom";
import { parseDate } from "./AnnouncementGalleryCard";

// =========================================================================
// 🎛️ SCALE CONTROL & ADJUSTER CONSTANTS (same as the campaign analytics pop-up)
// =========================================================================
export const VarAnalyticsModalScale = 0.82;
export const VarOverallRoundednessScale = 0.6;
export const VarAnalyticsModalMaxWidth = 1300; // in px
export const VarAnalyticsModalPadding = 18; // in px
export const VarColumnsGap = 10; // in px between left and right column
export const VarRowsGap = 8; // in px between top sections and bottom row

export const VarCampaignDetailsMinHeight = 124; // in px for top header
export const VarMetricCardMinHeight = 96; // in px for metric boxes

export const VarRecipientListCardHeight = 162; // in px
export const VarRecipientDetailsCardHeight = 162; // in px
export const VarRecipientRowHeight = 26; // in px per recipient row
export const VarRecipientMaxRowsVisible = 4;

export const VarBottomDonutsCardHeight = 128; // in px
export const VarBottomRateCardHeight = 128; // in px
export const VarGaugeDonutSize = 64; // in px
export const VarBigDonutSize = 82; // in px

// Modulo-3 color series matching the gallery cards
const getCardBgColor = (index, isDark) => {
  const remainder = Math.max(0, index) % 3;
  if (isDark) {
    if (remainder === 0) return "#2E200C";
    if (remainder === 1) return "#22193E";
    return "#0D271E";
  }
  if (remainder === 0) return "#FFEFCE";
  if (remainder === 1) return "#ECE8FF";
  return "#CEFBEA";
};

// Circular SVG Ring Component
const DonutRing = ({
  percentage = 0,
  color = "#22c55e",
  size = VarGaugeDonutSize,
  strokeWidth = 8,
  label,
  isDark,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const numPct = typeof percentage === "number" ? percentage : parseFloat(percentage) || 0;
  const validPct = Math.min(Math.max(numPct, 0), 100);
  const strokeDashoffset = circumference - (validPct / 100) * circumference;

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0"}
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

// "10/05/2026 09:00 AM"
const formatSentDate = (value) => {
  const d = parseDate(value);
  if (isNaN(d.getTime())) return "N/A";
  const pad = (n) => String(n).padStart(2, "0");
  const hours = d.getHours() % 12 || 12;
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(hours)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? "PM" : "AM"}`;
};

// Yes / No / anything else (Null, empty, or a template value like "Yes/No")
const answer = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "yes" ? "yes" : s === "no" ? "no" : "unknown";
};

const CHIP = {
  yes: "bg-emerald-100 text-emerald-900",
  no: "bg-rose-100 text-rose-900",
  unknown: "bg-slate-200 text-slate-700",
};

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);

const ViewAnalyticsModal = ({
  announcement = {},
  outcome = null, // the matching entry of AnnouncementOutcomeData.json, or null
  campaignIndex = 0,
  isDark = false,
  ended = false,
  onClose,
}) => {
  const modalBg = useMemo(() => getCardBgColor(campaignIndex, isDark), [campaignIndex, isDark]);
  const innerCardBg = isDark ? "#161820" : "#FFFFFF";
  const announcementId = announcement?.announcementId || "";

  // Everything below comes from the outcome JSON's recipient rows
  const analytics = useMemo(() => {
    const rows = outcome?.AnnouncementDetails || [];
    const total = rows.length;
    const sent = rows.filter((r) => answer(r.SuccessfullySent) === "yes").length;
    const trained = rows.filter((r) => answer(r.Trained) === "yes").length;
    const trainingApplicable = rows.filter((r) => answer(r.Trained) !== "unknown").length;
    const acknowledged = rows.filter((r) => answer(r.Acknowledge) === "yes").length;
    const acknowledgeApplicable = rows.filter((r) => answer(r.Acknowledge) !== "unknown").length;
    const trainingDataAvailable = trainingApplicable > 0;
    const acknowledgeDataAvailable = acknowledgeApplicable > 0;

    return {
      rows,
      total,
      sent,
      trained,
      acknowledged,
      acknowledgeApplicable,
      acknowledgeDataAvailable,
      trainingApplicable,
      trainingDataAvailable,
      sentPct: pct(sent, total),
      trainedPct: pct(trained, trainingApplicable),
      overallAcknowledge: acknowledgeApplicable > 0
        ? ((acknowledged / acknowledgeApplicable) * 100).toFixed(1)
        : "0.0",
      overallTrained: total > 0 ? ((trained / total) * 100).toFixed(1) : "0.0",
    };
  }, [outcome]);

  if (!announcement || Object.keys(announcement).length === 0) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none">
      {/* 🌟 ROOT MODAL CONTAINER WITH DYNAMIC PALETTE */}
      <div
        style={{
          zoom: VarAnalyticsModalScale,
          backgroundColor: modalBg,
          maxWidth: `${VarAnalyticsModalMaxWidth}px`,
          padding: `${VarAnalyticsModalPadding}px`,
          borderRadius: `${Math.round(24 * VarOverallRoundednessScale)}px`,
        }}
        className="w-full flex flex-col gap-3 shadow-2xl border border-black/10 dark:border-white/10 text-slate-900 dark:text-white transition-all overflow-hidden relative max-h-[96vh]"
      >
        {/* ── TOP BAR: ID BADGE + DATA STATUS + LIVE/ENDED PILL + GO BACK ── */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-voda font-bold bg-white/95 dark:bg-black/60 text-slate-900 dark:text-white shadow-2xs border border-black/5 dark:border-white/10">
            <span className="w-2 h-2 rounded-full bg-[#E60000]" />
            <span>{announcementId}</span>
          </div>

          <div className="flex items-center gap-3">
            <span role="status" className="text-[11px] font-voda font-bold text-slate-700 dark:text-slate-300">
              {outcome
                ? `${analytics.total} ${analytics.total === 1 ? "recipient" : "recipients"} • Refreshed ${outcome.AnnouncementLastDataRefreshTime || "N/A"}`
                : "No outcome data yet"}
            </span>

            {ended ? (
              <div className="inline-flex items-center px-3 py-0.5 rounded-full text-[11px] font-voda font-bold bg-[#F43F5E] text-white shadow-2xs">
                <span>Announcement Ended</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-voda font-bold bg-[#D4EAD6] text-[#16A34A] shadow-2xs border border-emerald-300/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                <span>Live</span>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="h-7 px-5 rounded-full bg-[#3D3F45] hover:bg-black text-white text-[10.5px] font-voda font-bold tracking-tight shadow-xs transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            >
              Go Back
            </button>
          </div>
        </div>

        {/* ── MAIN WORKSPACE: LEFT ANALYTICS + RIGHT RECIPIENT DETAILS ── */}
        <div
          style={{ gap: `${VarColumnsGap}px` }}
          className="grid grid-cols-1 lg:grid-cols-12 items-stretch flex-shrink-0"
        >
          {/* LEFT COLUMN: ANNOUNCEMENT DETAILS + METRICS */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 min-w-0">
            {/* ANNOUNCEMENT DETAILS */}
            <div
              style={{
                minHeight: `${VarCampaignDetailsMinHeight}px`,
                backgroundColor: innerCardBg,
                borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
              }}
              className="w-full p-3.5 sm:p-4 flex items-start gap-4 shadow-2xs border border-black/5 dark:border-white/5"
            >
              <div className="flex flex-col flex-shrink-0 pt-0.5">
                <span className="text-[15px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                  ANNOUNCEMENT
                </span>
                <span className="text-[15px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                  DETAILS
                </span>
              </div>

              <div className="flex flex-col gap-1 text-[11px] min-w-0 flex-1 leading-snug text-left">
                <p className="truncate font-semibold text-slate-700 dark:text-slate-300">
                  <strong className="font-bold text-slate-900 dark:text-white">Announcement Name: </strong>
                  {announcement.AnnouncementTitle || "N/A"}
                </p>
                <p className="truncate font-semibold text-slate-700 dark:text-slate-300">
                  <strong className="font-bold text-slate-900 dark:text-white">Recipient List Name: </strong>
                  <span className="underline font-medium text-slate-900 dark:text-white">
                    {outcome?.AnnouncementRecipientListName || announcement.AnnouncementUserListID || "N/A"}
                  </span>
                </p>
                <p className="font-semibold text-slate-700 dark:text-slate-300 pt-0.5">
                  <strong className="font-bold text-slate-900 dark:text-white">Sent date: </strong>
                  {formatSentDate(announcement.AnnouncementStartTime)}
                </p>
              </div>
            </div>

            {/* EMAILS SENT + TRAINED */}
            <div className="grid grid-cols-2 gap-3 items-stretch">
              {/* EMAILS SENT */}
              <div
                style={{
                  minHeight: `${VarMetricCardMinHeight}px`,
                  backgroundColor: innerCardBg,
                  borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
                }}
                className="p-3.5 flex flex-col justify-between shadow-2xs border border-black/5 dark:border-white/5 text-left"
              >
                <span className="text-[11.5px] font-voda font-bold text-slate-800 dark:text-slate-200">
                  Emails Sent
                </span>
                <div className="my-1">
                  <span className="text-[16px] font-voda font-bold text-slate-950 dark:text-white">
                    {analytics.sent}
                  </span>
                  <span className="text-[9.5px] font-bold text-slate-500 ml-1.5">
                    out of {analytics.total} ({analytics.sentPct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                  <div className="bg-[#22c55e] h-full rounded-full" style={{ width: `${analytics.sentPct}%` }} />
                </div>
              </div>

              {/* TRAINED */}
              <div
                style={{
                  minHeight: `${VarMetricCardMinHeight}px`,
                  backgroundColor: innerCardBg,
                  borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
                }}
                className="p-3.5 flex flex-col justify-between shadow-2xs border border-black/5 dark:border-white/5 text-left"
              >
                <span className="text-[11.5px] font-voda font-bold text-slate-800 dark:text-slate-200">
                  Trained
                </span>

                {analytics.trainingDataAvailable ? (
                  <>
                    <div className="my-1">
                      <span className="text-[16px] font-voda font-bold text-slate-950 dark:text-white">
                        {analytics.trained}
                      </span>
                      <span className="text-[9.5px] font-bold text-slate-500 ml-1.5">
                        out of {analytics.trainingApplicable}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                      <div
                        className="bg-[#22c55e] h-full rounded-full"
                        style={{ width: `${analytics.trainedPct}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-[10px] leading-snug font-semibold text-slate-500 dark:text-slate-400 my-1">
                    Training status is not available for these recipients.
                  </p>
                )}
              </div>
            </div>

            {/* OVERALL ACKNOWLEDGE RATE + OVERALL TRAINED RATE */}
            <div className="grid grid-cols-2 gap-3 items-stretch">
              {/* OVERALL ACKNOWLEDGE RATE */}
              <div
                style={{
                  backgroundColor: innerCardBg,
                  borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
                  minHeight: `${VarBottomRateCardHeight}px`,
                }}
                className="p-3.5 flex items-center justify-between gap-2 shadow-2xs border border-black/5 dark:border-white/5 text-left"
              >
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[13px] font-voda font-bold text-slate-900 dark:text-white uppercase leading-tight tracking-tight">
                    OVERALL
                  </span>
                  <span className="text-[13px] font-voda font-bold text-slate-900 dark:text-white uppercase leading-tight tracking-tight">
                    ACKNOWLEDGE RATE %
                  </span>
                  <p className="text-[9px] font-medium text-slate-600 dark:text-slate-300 leading-snug mt-1">
                    Percentage of recipients who acknowledged the announcement
                  </p>
                </div>
                <DonutRing
                  percentage={analytics.overallAcknowledge}
                  color="#22c55e"
                  size={VarBigDonutSize}
                  strokeWidth={10}
                  label={analytics.acknowledgeDataAvailable ? `${analytics.overallAcknowledge}%` : "N/A"}
                  isDark={isDark}
                />
              </div>

              {/* OVERALL TRAINED RATE */}
              <div
                style={{
                  backgroundColor: innerCardBg,
                  borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
                  minHeight: `${VarBottomRateCardHeight}px`,
                }}
                className="p-3.5 flex items-center justify-between gap-2 shadow-2xs border border-black/5 dark:border-white/5 text-left"
              >
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[13px] font-voda font-bold text-slate-900 dark:text-white uppercase leading-tight tracking-tight">
                    OVERALL
                  </span>
                  <span className="text-[13px] font-voda font-bold text-slate-900 dark:text-white uppercase leading-tight tracking-tight">
                    TRAINED RATE %
                  </span>
                  <p className="text-[9px] font-medium text-slate-600 dark:text-slate-300 leading-snug mt-1">
                    Percentage of recipients who completed training
                  </p>
                </div>
                <DonutRing
                  percentage={analytics.overallTrained}
                  color="#22c55e"
                  size={VarBigDonutSize}
                  strokeWidth={10}
                  label={analytics.trainingDataAvailable ? `${analytics.overallTrained}%` : "N/A"}
                  isDark={isDark}
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: RECIPIENT STATUS + RECIPIENT LIST */}
          <div className="lg:col-span-6 flex flex-col gap-3 min-w-0">
            {/* RECIPIENT STATUS */}
            <div
              style={{
                backgroundColor: innerCardBg,
                borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
              }}
              className="p-3.5 sm:p-4 flex flex-col flex-1 min-h-[150px] shadow-2xs border border-black/5 dark:border-white/5 overflow-hidden text-left"
            >
              <div className="flex items-start gap-4 flex-shrink-0">
                <div className="flex flex-col flex-shrink-0 pt-0.5">
                  <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                    RECIPIENT
                  </span>
                  <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                    STATUS
                  </span>
                </div>
                <div className="flex-1 ml-4 flex items-center justify-end gap-2 flex-wrap text-[8px] font-bold text-slate-500 dark:text-slate-400">
                  <span>EMAIL</span>
                  <span>TRAINING</span>
                  <span>ACKNOWLEDGE</span>
                </div>
              </div>

              <div
                style={{
                  maxHeight: `${VarRecipientMaxRowsVisible * (VarRecipientRowHeight + 6)}px`,
                }}
                className="flex-1 overflow-y-auto pr-2 mt-2 flex flex-col gap-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full"
              >
                {analytics.rows.length === 0 ? (
                  <span className="text-[10px] text-slate-400 font-medium italic my-auto">
                    No recipient outcome data available
                  </span>
                ) : (
                  analytics.rows.map((r, idx) => {
                    const sentA = answer(r.SuccessfullySent);
                    const trainedA = answer(r.Trained);
                    const acknowledgeA = answer(r.Acknowledge);

                    return (
                      <div
                        key={`${r.EmailIDs}-${idx}`}
                        style={{ minHeight: `${VarRecipientRowHeight}px` }}
                        className="flex items-center justify-between gap-2 text-[10px]"
                      >
                        <span className="font-voda font-bold text-slate-800 dark:text-slate-200 truncate min-w-0 flex-1">
                          {r.EmailIDs}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold whitespace-nowrap ${CHIP[sentA]}`}>
                          {sentA === "yes" ? "Sent" : sentA === "no" ? "Failed" : "Sent: ?"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold whitespace-nowrap ${CHIP[trainedA]}`}>
                          {trainedA === "yes"
                            ? "Trained"
                            : trainedA === "no"
                              ? "Training Pending"
                              : "Training N/A"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-bold whitespace-nowrap ${CHIP[acknowledgeA]}`}>
                          {acknowledgeA === "yes"
                            ? "Acknowledged"
                            : acknowledgeA === "no"
                              ? "Not Acknowledged"
                              : "Acknowledge N/A"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RECIPIENT LIST */}
            <div
              style={{
                backgroundColor: innerCardBg,
                borderRadius: `${Math.round(18 * VarOverallRoundednessScale)}px`,
              }}
              className="p-3.5 sm:p-4 flex flex-col flex-1 min-h-[150px] shadow-2xs border border-black/5 dark:border-white/5 overflow-hidden text-left"
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col flex-shrink-0 pt-0.5">
                  <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                    RECIPIENT
                  </span>
                  <span className="text-[14px] font-voda font-bold text-slate-900 dark:text-white leading-tight uppercase tracking-tight">
                    LIST
                  </span>
                </div>

                <div className="flex-1 ml-4 flex flex-col gap-1 text-[10.5px] text-slate-700 dark:text-slate-300 font-medium min-w-0">
                  <p className="truncate">
                    <strong className="text-slate-900 dark:text-white">List ID: </strong>
                    <span className="font-mono-tech">
                      {outcome?.AnnouncementRecipientListID || announcement.AnnouncementUserListID || "N/A"}
                    </span>
                  </p>
                  <p className="truncate">
                    <strong className="text-slate-900 dark:text-white">Upload Type: </strong>
                    {outcome?.AnnouncementRecipientListUploadType || announcement.AnnouncementRecipientGroupType || "N/A"}
                  </p>
                  <p className="truncate">
                    <strong className="text-slate-900 dark:text-white">Scheduled Start: </strong>
                    {formatSentDate(announcement.AnnouncementStartTime)}
                  </p>
                  <p className="truncate">
                    <strong className="text-slate-900 dark:text-white">Scheduled End: </strong>
                    {formatSentDate(announcement.AnnouncementEndTime)}
                  </p>
                  <p className="truncate">
                    <strong className="text-slate-900 dark:text-white">Status: </strong>
                    {outcome?.AnnouncementCurrentStatus || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};

export default ViewAnalyticsModal;