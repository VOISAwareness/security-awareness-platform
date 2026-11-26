import { useState, useEffect, useMemo } from "react";
import { Search, ChevronDown, Eye, X, ArrowLeft } from "lucide-react";
import { useUserType } from "../../../UserTypeContext/UserTypeContext";
import { PAGE_SCALE } from "../../../shared/SharedStyles";
import { useNavigate } from "react-router-dom";

// 👇 Adjust these two paths to where your JSON files live
import { useRollouts } from "../../../services/announcements";
import PageLoading from "../../../GlobalComponents/PageLoading";
import DraftDialog from "../../../GlobalComponents/DraftDialog";
import Toast from "../../../GlobalComponents/Toast";
import { api } from "../../../services/api";
import { currentActor } from "../../../services/identity";
import outcomeData from "../AnnouncementOutcomeData.json";

import AnnouncementGalleryCard, {
  parseDate,
} from "./Components/AnnouncementGalleryCard";
import ViewAnalyticsModal from "./Components/ViewAnalyticsModal";

//Constant Tab Code
import { TAB_CONFIG } from "./Components/AnnouncementHostoryTabConstant";

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS
// =========================================================================
export const VarTrainingScale = 0.94;
export const VarOverallCornerRoundednessAdjuster = 0.5;
export const VarLeftSectionWidth = "22%";
export const VarRightSectionWidth = "78%";
export const VarSectionGap = 10; // in px
export const VarRightGalleryBaseHeight = 465; // in px
export const VarThreeButtonsHeightAdjuster = 80; // Height of the category capsules in px

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

// Global modulo-3 color series rule with Dark Mode Inversion Support
const getCardBgColor = (index, isDark) => {
  const remainder = index % 3;
  if (isDark) {
    if (remainder === 0) return "#2E200C"; // Dark Warm Peach / Amber
    if (remainder === 1) return "#22193E"; // Dark Lavender / Purple
    return "#0D271E"; // Dark Mint / Emerald
  }
  if (remainder === 0) return "#FFEFCE"; // Warm Peach
  if (remainder === 1) return "#ECE8FF"; // Lavender
  return "#CEFBEA"; // Soft Mint
};

// Pure white in light mode, dark tone in dark mode
const getLCardBg = (isDark) => (isDark ? "#1C1E24" : "#FFFFFF");

const TAB_ORDER = ["ongoing", "scheduled", "historical", "cancelled"];

const isCancelled = (a) =>
  a.AnnouncementStatus === "Cancelled" ||
  (a.AnnouncementReasonForCancel &&
    a.AnnouncementReasonForCancel.trim().toUpperCase() !== "NA");

// "mm/dd/yyyy" or, with time, "mm/dd/yyyy hh:mm AM"
const formatDisplayDate = (dateStr, includeTime = false) => {
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return dateStr || "N/A";
  const pad = (n) => String(n).padStart(2, "0");
  const base = `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
  if (!includeTime) return base;
  const hours = d.getHours() % 12 || 12;
  return `${base} ${pad(hours)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? "PM" : "AM"}`;
};

const AnnouncementHistory = ({ isDark: propIsDark }) => {
  const userContext = useUserType?.() || {};
  const navigate = useNavigate();

  // Theme check: Reactive Pipeline with HTML class and MutationObserver
  const [isDark, setIsDark] = useState(() => {
    if (typeof propIsDark === "boolean") return propIsDark;
    if (typeof document !== "undefined") {
      return (
        document.documentElement.classList.contains("dark") ||
        !!userContext.isDark
      );
    }
    return !!userContext.isDark;
  });

  useEffect(() => {
    if (typeof propIsDark === "boolean") {
      setIsDark(propIsDark);
      return;
    }
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    const obs = new MutationObserver(() =>
      setIsDark(el.classList.contains("dark")),
    );
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [propIsDark]);

  const [activeTab, setActiveTab] = useState("ongoing");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("Shortest Expiring Date");
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Modals
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [previewEmail, setPreviewEmail] = useState(null); // { item, cardIdx }
  const [analyticsItem, setAnalyticsItem] = useState(null); // { camp, idx }

  const lCardBg = getLCardBg(isDark);

  // The roll-outs from the backend (GET /announcements?kind=ROLLOUT), in the
  // shape the cards were written for. A roll-out past its retention (a year
  // after it ends) is no longer returned, so it leaves Historical by itself.
  const rollouts = useRollouts();

  // Cancel: an approved roll-out that has not ended (On Going or Scheduled),
  // by its creator, an Admin or a Campaign Manager, with a reason; it then
  // shows on the Cancelled tab.
  const role = userContext.user?.role || "";
  const me = currentActor();
  const canCancel = (camp) =>
    role === "Admin" || role === "Campaign Manager" || (Boolean(me) && camp.AnnouncementCreatorEmail === me.toLowerCase());
  const [cancelling, setCancelling] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [toast, setToast] = useState(null);
  const openCancel = (camp) => {
    setCancelReason("");
    setCancelError("");
    setCancelling(camp);
  };
  const confirmCancel = () => {
    if (!cancelReason.trim()) {
      setCancelError("Please give a reason; it shows on the Cancelled tab.");
      return;
    }
    const camp = cancelling;
    setCancelling(null);
    api.announcements
      .cancel(camp.announcementId, me, cancelReason.trim(), role)
      .then((row) => {
        if (row?.announcementId) rollouts.replace(row);
        setToast({ type: "success", title: "Announcement cancelled", message: `"${camp.AnnouncementTitle}" was cancelled.` });
      })
      .catch((err) => setToast({ type: "error", title: "Couldn't cancel the announcement", message: err?.message || "Please try again." }));
  };

  // Everyone sees every announcement. Published ones split on their schedule;
  // a cancelled one goes to the Cancelled tab. Pending and rejected requests
  // live on Requests & Approvals.
  const categorized = useMemo(() => {
    const now = Date.now();
    const ongoing = [];
    const scheduled = [];
    const historical = [];
    const cancelled = [];

    rollouts.items.forEach((a) => {
      if (isCancelled(a)) {
        cancelled.push(a);
      } else if (a.AnnouncementStatus === "Published") {
        // the server's instants when it has them (its times are UK time),
        // else the times as written
        const start = a.startMs ?? parseDate(a.AnnouncementStartTime).getTime();
        const end = a.endMs ?? parseDate(a.AnnouncementEndTime).getTime();
        if (end < now) historical.push(a);
        else if (start <= now) ongoing.push(a);
        else scheduled.push(a);
      }
    });

    return { ongoing, scheduled, historical, cancelled };
  }, [rollouts.items]);

  // Active category list filtered by search and sorted
  const currentCategoryList = useMemo(() => {
    let list = categorized[activeTab] || [];
    const q = searchTerm.trim().toLowerCase();

    if (q) {
      list = list.filter(
        (a) =>
          (a.announcementId && a.announcementId.toLowerCase().includes(q)) ||
          (a.AnnouncementTitle &&
            a.AnnouncementTitle.toLowerCase().includes(q)) ||
          (a.AnnouncementCreatedBy &&
            a.AnnouncementCreatedBy.toLowerCase().includes(q)),
      );
    }

    const t = (v) => parseDate(v).getTime() || 0;
    return [...list].sort((a, b) => {
      if (sortBy === "Latest Updated")
        return t(b.AnnouncementLastModified) - t(a.AnnouncementLastModified);
      if (sortBy === "Shortest Expiring Date")
        return t(a.AnnouncementEndTime) - t(b.AnnouncementEndTime);
      if (sortBy === "Latest Created Date")
        return t(b.AnnouncementCreationDate) - t(a.AnnouncementCreationDate);
      if (sortBy === "Oldest Created Date")
        return t(a.AnnouncementCreationDate) - t(b.AnnouncementCreationDate);
      return 0;
    });
  }, [categorized, activeTab, searchTerm, sortBy]);

  const activeTabConfig = TAB_CONFIG[activeTab];

  // Helper for the category capsules styling
  const getTabButtonClasses = (tabId) => {
    const isSelected = activeTab === tabId;
    if (isSelected) {
      return isDark
        ? "bg-white text-black shadow-md border-transparent"
        : "bg-black text-white shadow-md border-transparent";
    }
    return isDark
      ? "bg-[#1C1E24] text-white hover:bg-[#252830] border-white/10 shadow-xs"
      : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs";
  };

  const detailModalBg =
    detailModalItem != null
      ? getCardBgColor(detailModalItem._cardIdx ?? 0, isDark)
      : null;
  const previewModalBg =
    previewEmail != null
      ? getCardBgColor(previewEmail.cardIdx ?? 0, isDark)
      : null;

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* 🌟 ROOT CONTAINER */}
      <div
        style={{ zoom: PAGE_SCALE }}
        className="w-full max-w-[2560px] mx-auto p-3.5 -mt-2 select-none font-sans flex flex-col gap-3 h-full"
      >
        {/* ── TOP HEADER BAR ── */}
        <div
          className={`w-full h-[40px] py-2.5 px-6 -mt-2 rounded-2xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${
            isDark
              ? "bg-white text-black border-white/10"
              : "bg-[#000000] text-white border-black/10"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/announcements")}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              title="Back to Catalogue"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5] rounded-md text-white dark:text-black" />
            </button>
            <h1 className="text-[13.5px] font-bold tracking-tight uppercase">
              Announcement Template History
            </h1>
          </div>
        </div>

        {/* ── 2-COLUMN MAIN WORKSPACE ── */}
        <div
          style={{ gap: `${VarSectionGap}px` }}
          className="relative grow min-h-0 w-full flex flex-col lg:flex-row items-start lg:items-stretch"
        >
          {/* 👈 LEFT COLUMN: SWITCHER CAPSULES */}
          <div
            style={{
              width: VarLeftSectionWidth,
              flex: `0 0 ${VarLeftSectionWidth}`,
            }}
            className="flex flex-col gap-3.5 min-w-[280px]"
          >
            {TAB_ORDER.map((tabId) => {
              const cfg = TAB_CONFIG[tabId];
              const isSelected = activeTab === tabId;
              return (
                <div
                  key={tabId}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveTab(tabId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setActiveTab(tabId);
                  }}
                  style={{
                    height: `${VarThreeButtonsHeightAdjuster}px`,
                    borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
                  }}
                  className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${getTabButtonClasses(tabId)}`}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <h3 className="text-[14px] font-voda font-bold tracking-tight leading-tight">
                      {cfg.title}
                    </h3>
                  </div>
                  <p
                    className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                      isSelected
                        ? isDark
                          ? "text-slate-700"
                          : "text-slate-300"
                        : isDark
                          ? "text-slate-400"
                          : "text-slate-500"
                    }`}
                  >
                    {cfg.subtitle}
                  </p>
                  <div className="absolute -bottom-1 -right-1 w-14 h-14 pointer-events-none select-none z-0">
                    <img
                      src={cfg.img}
                      alt={cfg.title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 👉 RIGHT COLUMN: DYNAMIC GALLERY */}
          <div
            style={{
              width: VarRightSectionWidth,
              flex: `0 0 ${VarRightSectionWidth}`,
            }}
            className="flex flex-col min-w-0"
          >
            {/* 1. TOP-RIGHT ARM: CONTROLS & DYNAMIC BIG COUNTER */}
            <div
              style={{
                backgroundColor: lCardBg,
                borderTopRightRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
                borderTopLeftRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
              }}
              className="w-full h-[100px] px-6 py-3 flex items-center justify-between border-t border-l border-r border-black/5 dark:border-white/5 transition-colors relative z-30"
            >
              {/* Left Side: Dynamic Big Counter + Category Headline */}
              <div className="flex items-center gap-4">
                <span
                  style={{ color: activeTabConfig.counterColor }}
                  className="text-5xl leading-none tracking-tight font-voda font-bold"
                >
                  {String(currentCategoryList.length).padStart(2, "0")}
                </span>
                <span className="text-[15px] font-voda font-bold text-slate-900 dark:text-white leading-tight tracking-tight text-left">
                  Total <br /> {activeTabConfig.title}
                </span>
              </div>

              {/* Right Side: Search Input & Sort Dropdown */}
              <div className="flex flex-col gap-2 max-w-[340px] w-full">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="Search by Announcement ID or Name"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-7 pl-3 pr-8 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] font-bold text-slate-800 dark:text-slate-200 text-[9px] placeholder-slate-400 outline-none border border-black/5 dark:border-white/5"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
                </div>

                <div className="relative w-40">
                  <button
                    type="button"
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="w-full h-6 px-2.5 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] text-slate-700 dark:text-slate-300 text-[8px] font-bold flex items-center justify-between border border-black/5 dark:border-white/5 cursor-pointer shadow-2xs"
                  >
                    <span className="truncate">
                      Sort By: {sortBy.split(" ").slice(0, 2).join(" ")}
                    </span>
                    <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 ml-1" />
                  </button>

                  {showSortDropdown && (
                    <div className="absolute top-7 left-0 w-44 bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-[100] flex flex-col">
                      {[
                        "Latest Updated",
                        "Shortest Expiring Date",
                        "Latest Created Date",
                        "Oldest Created Date",
                      ].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => {
                            setSortBy(option);
                            setShowSortDropdown(false);
                          }}
                          className={`px-3 py-1 text-left text-[9px] font-bold cursor-pointer transition-colors ${
                            sortBy === option
                              ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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

            {/* 2. CONTINUOUS LOWER L-BASE: ANNOUNCEMENTS FEED */}
            <div
              style={{
                backgroundColor: lCardBg,
                flex: "1 1 0", // fills the column to the foot of the page
                minHeight: 320,
                borderBottomLeftRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
                borderBottomRightRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
              }}
              className="w-full p-4 flex flex-col gap-3 overflow-y-auto border-b border-l border-r border-black/5 dark:border-white/5 transition-colors [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md"
            >
              {rollouts.loading ? (
                <div className="relative w-full h-full min-h-[160px]">
                  <PageLoading show isDark={isDark} />
                </div>
              ) : rollouts.error ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-slate-400">
                    Couldn&apos;t load the announcements. Please try again.
                  </p>
                </div>
              ) : currentCategoryList.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-slate-400">
                    No {activeTabConfig.title.toLowerCase()} found matching
                    criteria.
                  </p>
                </div>
              ) : (
                /* One announcement per row: its details beside its start-to-end timeline */
                <div className="flex flex-col gap-3.5 w-full">
                  {currentCategoryList.map((camp, idx) => (
                    <AnnouncementGalleryCard
                      key={camp.announcementId}
                      camp={camp}
                      tab={activeTab}
                      actions={
                        (activeTab === "ongoing" || activeTab === "scheduled") && canCancel(camp) ? (
                          <button
                            type="button"
                            data-ins-cancel={camp.announcementId}
                            onClick={() => openCancel(camp)}
                            className="h-6 px-3 rounded-full text-[9px] font-voda font-bold tracking-tight shadow-2xs flex items-center gap-1.5 bg-white/90 text-[#E60000] border border-[#E60000]/30 hover:bg-[#E60000] hover:text-white transition-colors cursor-pointer dark:bg-black/40"
                          >
                            Cancel
                          </button>
                        ) : null
                      }
                      background={getCardBgColor(idx, isDark)}
                      roundness={VarOverallCornerRoundednessAdjuster}
                      onDetails={(c) =>
                        setDetailModalItem({ ...(c || camp), _cardIdx: idx })
                      }
                      onAnalytics={
                        activeTab === "scheduled" || activeTab === "cancelled"
                          ? null
                          : () => setAnalyticsItem({ camp, idx })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 FULL SPECIFICATIONS MODAL ──                                        */}
        {/* ========================================================================= */}
        {detailModalItem && (
          <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              style={{
                backgroundColor: detailModalBg,
                borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`,
              }}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-black/10 dark:border-white/10 p-6 relative shadow-2xl flex flex-col gap-3.5 text-slate-900 dark:text-white transition-colors"
            >
              {/* Top Bar: ID Pill (Left) + Close Button (Right) */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/90 dark:bg-black/60 text-slate-900 dark:text-white shadow-2xs border border-black/5 dark:border-white/10">
                  <span className="w-2 h-2 rounded-full bg-[#E60000]" />
                  <span>{detailModalItem.announcementId}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDetailModalItem(null);
                    setPreviewEmail(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-voda font-bold text-[9px] uppercase cursor-pointer transition-colors shadow-2xs"
                >
                  Close
                </button>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1 text-left">
                <h3 className="text-xl font-voda font-bold tracking-tight text-slate-950 dark:text-white">
                  {detailModalItem.AnnouncementTitle}
                </h3>
                <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  <strong>Description: </strong>
                  {detailModalItem.AnnouncementDescription}
                </p>
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  Created on:{" "}
                  {formatDisplayDate(
                    detailModalItem.AnnouncementCreationDate,
                    true,
                  )}{" "}
                  &bull; Created By: {detailModalItem.AnnouncementCreatedBy}
                </div>
              </div>

              <div className="w-full h-px bg-black/10 dark:bg-white/10" />

              {/* Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-[12px] font-medium text-slate-800 dark:text-slate-200 text-left">
                <div>
                  <strong>Start Type: </strong>
                  <span>{detailModalItem.AnnouncementStartType}</span>
                </div>
                <div>
                  <strong>Recipient Type: </strong>
                  <span className="font-mono-tech text-[#E60000] font-bold">
                    {detailModalItem.AnnouncementRecipientGroupType}
                  </span>
                </div>
                <div>
                  <strong>Scheduled Start: </strong>
                  <span className="font-semibold">
                    {formatDisplayDate(
                      detailModalItem.AnnouncementStartTime,
                      true,
                    )}
                  </span>
                </div>
                <div>
                  <strong>Scheduled End: </strong>
                  <span className="font-semibold">
                    {formatDisplayDate(
                      detailModalItem.AnnouncementEndTime,
                      true,
                    )}
                  </span>
                </div>
              </div>

              {/* Email & Target Setup Box */}
              <div className="p-4 rounded-xl bg-white/70 dark:bg-black/30 border border-black/5 dark:border-white/10 flex flex-col gap-2 shadow-2xs text-left">
                <h4 className="text-[12.5px] font-voda font-bold uppercase text-slate-900 dark:text-white">
                  Email Dispatch Details & Payloads
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 text-[11.5px] text-slate-800 dark:text-slate-200 font-medium">
                  <div>
                    <strong>Sender Name: </strong>
                    <span>
                      {detailModalItem.AnnouncementSenderName || "Not set"}
                    </span>
                  </div>
                  <div>
                    <strong>Sender Email: </strong>
                    <span className="font-mono-tech">
                      {detailModalItem.AnnouncementSenderEmailID || "Not set"}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <strong>Email Subject: </strong>
                    <span>{detailModalItem.AnnouncementEmailSubject}</span>
                  </div>
                  <div>
                    <strong>Template ID: </strong>
                    <span className="font-mono-tech text-[#E60000] font-bold">
                      {detailModalItem.AnnouncementTemplateID || "Not set"}
                    </span>
                  </div>
                  <div>
                    <strong>User List ID: </strong>
                    <span className="font-mono-tech text-[#E60000] font-bold">
                      {detailModalItem.AnnouncementUserListID || "Not set"}
                    </span>
                  </div>
                  <div>
                    <strong>Training Path ID: </strong>
                    <span className="font-mono-tech text-[#E60000] font-bold">
                      {detailModalItem.AnnouncementTrainingPathID || "Not set"}
                    </span>
                  </div>
                </div>

                {/* Preview Email Body Button */}
                {detailModalItem.AnnouncementEmailBody && (
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewEmail({
                          item: detailModalItem,
                          cardIdx: detailModalItem._cardIdx ?? 0,
                        })
                      }
                      className="px-3 py-1 rounded-lg bg-white dark:bg-black text-slate-800 dark:text-white border border-slate-300 dark:border-white/15 text-[10.5px] font-bold flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-zinc-900 shadow-2xs cursor-pointer w-fit transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#E60000]" />
                      <span>Preview Email Body</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS POP-UP ── */}
        {analyticsItem && (
          <ViewAnalyticsModal
            announcement={analyticsItem.camp}
            outcome={
              (outcomeData.announcementOutcome || []).find(
                (o) => o.AnnouncementID === analyticsItem.camp.announcementId,
              ) || null
            }
            campaignIndex={analyticsItem.idx}
            isDark={isDark}
            ended={activeTab === "historical"}
            onClose={() => setAnalyticsItem(null)}
          />
        )}

        {/* ========================================================================= */}
        {/* ── 🌟 SIMULATED EMAIL BODY PREVIEW POPUP ──                               */}
        {/* ========================================================================= */}
        {previewEmail && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div
              style={{
                backgroundColor: previewModalBg,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
              }}
              className="w-full max-w-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/20 flex flex-col transition-colors"
            >
              <div className="px-5 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-white/40 dark:bg-black/30 backdrop-blur-xs">
                <span className="text-xs font-voda font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  Simulated Email Payload Preview
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewEmail(null)}
                  aria-label="Close email preview"
                  className="p-1 rounded text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 bg-black/5 dark:bg-black/40">
                {/* sandbox="" blocks scripts, forms and navigation inside the email HTML */}
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={(previewEmail.item.AnnouncementEmailBody || "")
                    .replaceAll("{{userName}}", "Alex Morgan")
                    .replaceAll("{{phishLink}}", "#simulated-phish-link")}
                  className="w-full h-[55vh] rounded-xl border border-slate-200/80 bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <DraftDialog
        open={Boolean(cancelling)}
        isDark={isDark}
        tone="warning"
        title="Cancel this announcement?"
        body="It stops here and moves to Cancelled Announcements. This can't be undone."
        detail={
          cancelling && (
            <label className="flex flex-col gap-1.5 text-left font-normal">
              <span className="text-[11px] font-bold">
                {cancelling.announcementId} · {cancelling.AnnouncementTitle}
              </span>
              <span className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
                Reason for cancelling <span className="text-[#E60000]">*</span>
              </span>
              <textarea
                value={cancelReason}
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  setCancelError("");
                }}
                rows={3}
                maxLength={500}
                placeholder="Shown on the Cancelled tab"
                className="w-full rounded-lg px-2.5 py-2 text-[11px] bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 outline-none focus:border-[#E60000]/50"
              />
              {cancelError && <span className="text-[10.5px] font-semibold text-[#E60000]">{cancelError}</span>}
            </label>
          )
        }
        primaryLabel="Cancel announcement"
        onPrimary={confirmCancel}
        secondaryLabel="Keep it"
        onSecondary={() => setCancelling(null)}
      />

      {toast && (
        <Toast message={toast.message} type={toast.type} title={toast.title} duration={3500} onClose={() => setToast(null)} />
      )}
    </>
  );
};

export default AnnouncementHistory;
