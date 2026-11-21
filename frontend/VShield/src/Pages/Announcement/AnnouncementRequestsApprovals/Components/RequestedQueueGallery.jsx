import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  ExternalLink,
  User,
  Send,
  Users,
  CalendarClock,
  Eye,
  X,
} from "lucide-react";
import { parseDate, norm } from "./announcementHelpers";

export const VarOverallCornerRoundednessAdjuster = 0.6;
export const VarGallaryCardLenghtAdjuster = 1.0;
export const VarGallaryCardsScaleAdjuster = 0.99;
export const VarGalleryLowerBaseHeightAdjuster = 420;

const getLCardBg = (isDark) => (isDark ? "#0B1121" : "#FFFFFF");

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

const CAPSULE_THEME_COLOR = "#D9D7F9";
const CAPSULE_COUNTER_COLOR = "#8B8BF5";

// "10/12/2026 09:00 AM" -> "12-Oct-26"
const formatShortDate = (dateStr) => {
  if (!dateStr) return "N/A";
  const d = parseDate(dateStr);
  if (d.getTime() === 0) return dateStr.split(" ")[0] || "N/A";
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${d.getDate()}-${month}-${String(d.getFullYear()).slice(-2)}`;
};

const RequestedQueueGallery = ({
  announcements = [],
  isDark,
  userEmail = "",
  onLaunch,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("Latest Request Date");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [detailModalIndex, setDetailModalIndex] = useState(0);
  const [previewEmailHtml, setPreviewEmailHtml] = useState(null);

  const lCardBg = getLCardBg(isDark);

  const handleDetailsClick = (e, item, idx) => {
    e.stopPropagation();
    if (onLaunch) {
      onLaunch(item);
    } else {
      setDetailModalItem(item);
      setDetailModalIndex(idx);
    }
  };

  const processedItems = useMemo(() => {
    const me = norm(userEmail);
    const q = searchTerm.trim().toLowerCase();

    const list = announcements.filter((a) => {
      // My Requests = pending campaigns that I created
      const isPending = a.AnnouncementStatus === "Pending";
      const matchesSearch =
        q === "" ||
        (a.announcementId && a.announcementId.toLowerCase().includes(q)) ||
        (a.AnnouncementTitle && a.AnnouncementTitle.toLowerCase().includes(q));
      return isPending && matchesSearch;
    });

    list.sort((a, b) => {
      const dateA = parseDate(a.AnnouncementCreationDate).getTime();
      const dateB = parseDate(b.AnnouncementCreationDate).getTime();
      if (sortBy === "Oldest Request Date") return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [announcements, userEmail, searchTerm, sortBy]);

  // Robust HTML formatter for Email Body preview
  const formatEmailPayload = (rawBody) => {
    if (!rawBody)
      return '<p class="text-slate-400 italic">No email payload defined.</p>';

    let processed = String(rawBody)
      .replace(/{{department}}/g, "AI & Data Analytics")
      .replace(/{{phishLink}}/g, "#simulated-phish-link");

    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(processed);
    if (hasHtmlTags) {
      return processed;
    }

    const lines = processed
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines
      .map((line, idx) => {
        if (idx === 0 && lines.length > 1) {
          return `<h3 class="text-base font-bold text-slate-900 mb-2">${line}</h3>`;
        }
        if (
          line.toLowerCase().includes("authenticate") ||
          line.toLowerCase().includes("click here") ||
          line.toLowerCase().includes("verify") ||
          line.toLowerCase().includes("login")
        ) {
          return `<div class="my-4"><a href="#phish" class="inline-block px-5 py-2.5 bg-[#E60000] text-white font-bold text-xs rounded-md shadow-sm no-underline hover:bg-[#cc0000] transition-colors">${line}</a></div>`;
        }
        return `<p class="text-sm text-slate-700 leading-relaxed mb-2.5">${line}</p>`;
      })
      .join("");
  };

  return (
    <>
      <div className="gallery-wrapper relative flex flex-col w-full select-none font-sans pb-2">
        {/* 1. CAPSULE HEADER (TOP-LEFT) */}
        <div
          style={{
            backgroundColor: CAPSULE_THEME_COLOR,
            borderRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
          }}
          className="absolute top-0 left-0 w-[176px] h-[126px] p-3 flex flex-col justify-between shadow-xs z-20 text-slate-900 select-none overflow-hidden flex-shrink-0 text-left"
        >
          <div className="flex justify-between items-start relative z-10">
            <h3 className="text-[15.5px] font-voda font-bold tracking-tight leading-tight">
              My Requests
              <br />
              Queue
            </h3>
          </div>
          <p className="text-[9px] font-bold text-slate-700 leading-tight relative z-10 max-w-[125px] mb-1">
            Announcements created and submitted for manager approval
          </p>
        </div>

        {/* 2. Concave Arc Fillet */}
        <div className="absolute top-[118px] left-[166px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
          </svg>
        </div>

        {/* 3. TOP-RIGHT ARM OF L-SHAPE CONTAINER */}
        <div
          style={{
            backgroundColor: lCardBg,
            borderTopRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderTopLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
          }}
          className="w-[calc(100%-182px)] ml-auto h-[133px] px-4 py-2.5 flex items-center justify-between relative z-30 select-none transition-colors border-t border-r border-black/5 dark:border-white/5 flex-shrink-0"
        >
          <div className="flex flex-col -mt-8 gap-2 max-w-[340px] w-full text-left">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search by Announcement ID or Title"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-7 pl-3 pr-8 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] font-bold text-slate-800 dark:text-slate-200 text-[9px] placeholder-slate-400 outline-none border border-black/5 dark:border-white/5"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
            </div>

            <div className="relative w-48">
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="w-full h-6 px-2.5 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] text-slate-700 dark:text-slate-300 text-[8px] font-bold flex items-center justify-between border border-black/5 dark:border-white/5 cursor-pointer shadow-2xs"
              >
                <span className="truncate">Sort: {sortBy}</span>
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 ml-1" />
              </button>

              {showSortDropdown && (
                <div className="absolute top-7 left-0 w-full bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-[100] flex flex-col">
                  {["Latest Request Date", "Oldest Request Date"].map(
                    (option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSortBy(option);
                          setShowSortDropdown(false);
                        }}
                        className={`px-3 py-1 text-left text-[9.5px] font-bold cursor-pointer transition-colors ${
                          sortBy === option
                            ? "bg-[#D9D7F9] text-indigo-950 dark:bg-indigo-950 dark:text-indigo-300"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {option}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Big Counter */}
          <div className="flex flex-col items-end justify-center text-right pr-2">
            <span
              style={{ color: CAPSULE_COUNTER_COLOR }}
              className="text-5xl font-black leading-none tracking-tight font-voda-exb"
            >
              {String(processedItems.length).padStart(2, "0")}
            </span>
            <span className="text-[13.5px] font-voda font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight">
              Total Approvals
              <br />
              Pending
            </span>
          </div>
        </div>

        {/* 4. CONTINUOUS LOWER L-BASE */}
        <div
          style={{
            backgroundColor: lCardBg,
            height: `${VarGalleryLowerBaseHeightAdjuster}px`,
            borderTopLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderTopRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderBottomLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderBottomRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
          }}
          className="w-full p-5 pb-6 flex flex-col gap-4 overflow-y-auto z-10 border-b border-l border-r border-black/5 dark:border-white/5 transition-colors [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md"
        >
          {processedItems.length === 0 ? (
            <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-400">
                No campaigns currently waiting in your request queue.
              </p>
            </div>
          ) : (
            processedItems.map((item, idx) => {
              const cardBgColor = getCardBgColor(idx, isDark);
              const isScenario = item.AnnouncementStartType === "Scenario";

              return (
                <div
                  key={item.announcementId}
                  onClick={(e) => handleDetailsClick(e, item, idx)}
                  style={{
                    backgroundColor: cardBgColor,
                    borderRadius: `${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px`,
                    transform: `scale(${VarGallaryCardsScaleAdjuster})`,
                    width: `${100 * VarGallaryCardLenghtAdjuster}%`,
                  }}
                  className="mx-auto px-3 pt-1 pb-2 text-slate-900 shadow-2xs flex flex-col gap-2 relative overflow-hidden transition-all hover:shadow-xs hover:scale-[1.01] cursor-pointer border border-black/5 origin-top flex-shrink-0"
                >
                  {/* Top Meta Line */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-black/60 text-[8.5px] font-black text-slate-800 dark:text-slate-100 tracking-wide flex items-center gap-1.5 shadow-2xs font-mono-tech border border-black/5 dark:border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                        {item.announcementId}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 mt-1 rounded-full text-[8.5px] font-black tracking-wide shadow-2xs border ${
                          isScenario
                            ? "bg-violet-100 text-violet-800 border-violet-300/40"
                            : "bg-amber-100 text-amber-800 border-amber-300/40"
                        }`}
                      >
                        {isScenario ? "Scenario Email" : "Custom Email"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="dark:text-slate-300 px-2.5 py-0.5 rounded-full bg-slate-400/25 text-slate-800 text-[8.5px] font-voda font-bold uppercase tracking-wider">
                        Pending
                      </span>
                      <div className="dark:text-slate-300 flex items-center gap-1.5 text-[8.5px] font-bold text-slate-600">
                        <span>
                          Created on:{" "}
                          {formatShortDate(item.AnnouncementCreationDate)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDetailsClick(e, item, idx)}
                          className="text-slate-700 hover:text-black cursor-pointer ml-1"
                          title="View Full Specifications"
                        >
                          <ExternalLink className="w-3 h-3 stroke-[2.2] dark:text-slate-300" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 items-center">
                    <h4 className="text-[13px] font-voda font-bold tracking-tight text-slate-950 dark:text-white leading-tight">
                      {item.AnnouncementTitle}
                    </h4>
                    <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 leading-snug mt-1 max-w-xl line-clamp-2">
                      <strong className="font-bold text-slate-900 dark:text-white">
                        Description:{" "}
                      </strong>
                      {item.AnnouncementDescription}
                    </p>
                  </div>

                  <div className="flex items-center text-[10px] text-slate-800 flex-wrap gap-x-3 pt-0.5 dark:text-slate-300">
                    <span className="font-bold flex items-center gap-1">
                      <User className="w-2.5 h-2.5 text-slate-600 dark:text-slate-300" />
                      Created By:{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.AnnouncementCreatedBy || "Editor"}
                      </span>
                    </span>
                    <span className="text-slate-400 font-bold">&bull;</span>
                    <span className="font-bold flex items-center gap-1">
                      <Send className="w-2.5 h-2.5 text-red-500" />
                      Sender:{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.AnnouncementSenderName}
                      </span>
                    </span>
                    <span className="text-slate-400 font-bold">&bull;</span>
                    <span className="font-bold flex items-center gap-1">
                      <Users className="w-2.5 h-2.5 text-[#7C3AED]" />
                      Recipients:{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {item.AnnouncementUserListID}
                      </span>
                    </span>
                    <span className="text-slate-400 font-bold">&bull;</span>
                    <span className="font-bold flex items-center gap-1">
                      <CalendarClock className="w-2.5 h-2.5 text-slate-600 dark:text-slate-300" />
                      Created On:{" "}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatShortDate(item.AnnouncementStartTime)} to{" "}
                        {formatShortDate(item.AnnouncementEndTime)}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FULL SPECIFICATIONS MODAL */}
        {detailModalItem && (
          <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              style={{
                backgroundColor: getCardBgColor(detailModalIndex, isDark),
                borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`,
              }}
              className="w-full max-w-3xl border border-black/10 dark:border-white/10 p-6 relative overflow-hidden shadow-2xl flex flex-col gap-3.5 text-slate-900 dark:text-white transition-colors"
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
                    setPreviewEmailHtml(null);
                  }}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-voda font-bold text-[9px] uppercase cursor-pointer transition-colors shadow-2xs"
                >
                  Close
                </button>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-voda font-bold tracking-tight text-slate-950 dark:text-white">
                  {detailModalItem.AnnouncementTitle}
                </h3>
                <p className="text-[12px] font-medium text-slate-800 dark:text-slate-200 leading-relaxed">
                  <strong>Description: </strong>
                  {detailModalItem.AnnouncementDescription}
                </p>
                <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  Created on:{" "}
                  {formatShortDate(
                    detailModalItem.AnnouncementCreationDate,
                    true,
                  )}{" "}
                  &bull; Created By: {detailModalItem.AnnouncementCreatedBy}
                </div>
              </div>

              <div className="w-full h-px bg-black/10 dark:bg-white/10" />

              {/* Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-[12px] font-medium text-slate-800 dark:text-slate-200">
                <div>
                  <strong>Start Type: </strong>
                  <span>{detailModalItem.AnnouncementStartType}</span>
                </div>
                <div>
                  <strong>User List: </strong>
                  <span className="font-mono-tech text-[#E60000] font-bold">
                    {detailModalItem.AnnouncementRecipientGroupType}
                  </span>
                </div>
                <div>
                  <strong>Scheduled Start: </strong>
                  <span className="font-semibold">
                    {formatShortDate(
                      detailModalItem.AnnouncementStartTime,
                      true,
                    )}
                  </span>
                </div>
                <div>
                  <strong>Scheduled End: </strong>
                  <span className="font-semibold">
                    {formatShortDate(detailModalItem.AnnouncementEndTime, true)}
                  </span>
                </div>
              </div>

              {/* Email & Target Setup Box */}
              <div className="p-4 rounded-xl bg-white/70 dark:bg-black/30 border border-black/5 dark:border-white/10 flex flex-col gap-2 shadow-2xs">
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
                        setPreviewEmailHtml(
                          detailModalItem.AnnouncementEmailBody,
                        )
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

        {previewEmailHtml && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div
              style={{
                backgroundColor: getCardBgColor(detailModalIndex, isDark),
              }}
              className="w-full max-w-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/20 flex flex-col transition-colors"
            >
              {/* Modal Window Header */}
              <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <span className="text-xs font-voda font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  Simulated Email Payload Preview
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewEmailHtml(null)}
                  className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Email Envelope Header Bar */}
              {detailModalItem && (
                <div className="px-5 py-2.5 border-b border-slate-200 dark:border-white/5 flex flex-col gap-1 text-[11px] text-slate-600 dark:text-slate-300">
                  <div>
                    <strong className="text-slate-900 dark:text-white">
                      Subject:{" "}
                    </strong>
                    <span className=" dark:text-slate-300">
                      {detailModalItem.AnnouncementEmailSubject ||
                        "Gateway TLS Certificate Refresh"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4">
                    <div>
                      <strong className="text-slate-900 dark:text-white">
                        From:{" "}
                      </strong>
                      <span>
                        {detailModalItem.AnnouncementSenderName || "Not set"}
                      </span>
                      <span className="text-slate-400 font-mono text-[10px] ml-1">
                        {"<"}
                        {detailModalItem.AnnouncementSenderEmailID || "Not set"}
                        {">"}
                      </span>
                    </div>
                    <div>
                      <strong className="text-slate-900 dark:text-white">
                        To:{" "}
                      </strong>
                      <span>Null</span>
                      <span className="text-slate-400 font-mono text-[10px] ml-1">
                        {" "}
                        {"<>"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rendered Email Body with Preserved Headings & Button Styles */}
              <div className="p-5 overflow-y-auto max-h-[60vh] bg-slate-100/70 dark:bg-black/50">
                <div className="bg-white text-slate-900 p-6 rounded-xl shadow-xs border border-slate-200/80 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mb-2 [&_p]:mb-2.5 [&_p]:leading-relaxed [&_a]:text-[#E60000] [&_a]:underline [&_a]:font-semibold [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: formatEmailPayload(previewEmailHtml),
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RequestedQueueGallery;
