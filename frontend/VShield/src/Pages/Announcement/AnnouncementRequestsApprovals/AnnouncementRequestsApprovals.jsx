import { useState, useEffect } from "react";
import { useUserType } from "../../../UserTypeContext/UserTypeContext";
// 👇 Adjust this path to where your JSON lives
import data from "../AnnouncementMasterData.json";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
// Ported Galleries
import ApprovalQueueGallery from "./Components/ApprovalQueueGallery";
import RequestedQueueGallery from "./Components/RequestedQueueGallery";
import RejectedPathsGallery from "./Components/RejectedPathsGallery";
import ApprovedPathsGallery from "./Components/ApprovedPathsGallery";
import NotifyForChangeWindow from "./Components/NotifyForChangeWindow";
import { ROLE_MANAGER, APPROVER_KEY } from "./Components/announcementHelpers";

// Assets (same as RequestsAndApprovals.jsx)
import ApprovalQueueImg from "@/assets/RequestAndApprovalsAssets/ApprovalQueueImage.png";
import RequestQueueImg from "@/assets/RequestAndApprovalsAssets/RequestQueueImage.png";
import RejectedImg from "@/assets/RequestAndApprovalsAssets/RejectedCampaignsImage.png";
import MyApprovedImg from "@/assets/RequestAndApprovalsAssets/MyApprovedCampaignsImage.png";

// =========================================================================
// 🎛️ ADJUSTER CONSTANTS
// =========================================================================
export const VarTrainingScale = 0.94;
export const VarOverallCornerRoundednessAdjuster = 0.5;
export const VarLeftSectionWidth = "22%";
export const VarRightSectionWidth = "77.3%";
export const VarSectionGap = 10; // in px
export const VarRightGalleryBaseHeight = 465; // in px
export const VarThreeButtonsHeightAdjuster = 80; // Height of the top three category capsules in px

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

const AnnouncementRequestsApprovals = ({ isDark: propIsDark, onEdit }) => {
  const userContext = useUserType?.() || {};
  const user = userContext.user || {};
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

  // ---- Who is logged in ----
  const userEmail = (
    user.email ||
    user.userEmail ||
    user.UserEmailD_Admin ||
    user.UserEmailD_CamapignManager ||
    user.UserEmailD_CamapignCreator ||
    user.UserEMailID ||
    user.userEmailId ||
    ""
  )
    .trim()
    .toLowerCase();
  const isManager = user.role === ROLE_MANAGER;

  // ---- State: starts from your JSON; changes live in memory until the DB is added ----
  const [announcements, setAnnouncements] = useState(data.announcement);
  const [activeTab, setActiveTab] = useState("queue");
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");
  const [notifyingItem, setNotifyingItem] = useState(null);

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 3000);
  };

  // In-memory update. When the DB is ready, call your API here before setAnnouncements.
  const updateItem = (a, patch, msg) => {
    const updated = {
      ...a,
      ...patch,
      AnnouncementLastModified: new Date().toLocaleString("en-US"),
    };
    setAnnouncements((prev) =>
      prev.map((x) => (x.announcementId === a.announcementId ? updated : x)),
    );
    showToast(msg);
  };

  const handleApprove = (a) => {
    if (!isManager) return; // creators can never approve
    updateItem(
      a,
      {
        AnnouncementStatus: "Published",
        [APPROVER_KEY]: userEmail,
        AnnouncementNotificationMessage: "Approved",
      },
      `"${a.AnnouncementTitle}" approved and published.`,
    );
  };

  const handleNotifySubmit = (a, message) => {
    if (!isManager) return; // only managers can request changes
    updateItem(
      a,
      {
        AnnouncementNotifiedBy: userEmail,
        AnnouncementNotificationMessage: message,
      },
      `Change request sent for "${a.AnnouncementTitle}".`,
    );
    setNotifyingItem(null);
  };

  const handleRejectOpen = (a) => {
    if (!isManager) return;
    setRejectReason("");
    setActionError("");
    setRejectingItem(a);
  };

  const confirmReject = () => {
    if (!isManager || !rejectingItem) return;
    if (!rejectReason.trim()) {
      setActionError("Please provide a reason so the creator knows why.");
      return;
    }
    updateItem(
      rejectingItem,
      {
        AnnouncementStatus: "Rejected",
        [APPROVER_KEY]: userEmail,
        AnnouncementNotificationMessage: rejectReason.trim(),
      },
      `"${rejectingItem.AnnouncementTitle}" has been rejected.`,
    );
    setRejectingItem(null);
    setRejectReason("");
  };

  const handleSendForApproval = (a) =>
    updateItem(
      a,
      {
        AnnouncementStatus: "Pending",
        [APPROVER_KEY]: null,
        AnnouncementNotificationMessage: null,
      },
      `"${a.AnnouncementTitle}" sent for approval.`,
    );

  // Switcher navigation items configuration
  const navTabs = [
    {
      id: "queue",
      title: isManager ? "My Approvals" : "My Requests",
      subtitle: isManager
        ? "Announcements submitted that haven't been reviewed yet"
        : "Announcements submitted and awaiting manager review",
      activeTitleColor: isManager ? "text-[#8ED973]" : "text-[#A8B7E6]",
      img: isManager ? ApprovalQueueImg : RequestQueueImg,
    },
    {
      id: "rejected",
      title: "Rejected Announcements",
      subtitle: "Announcements that were reviewed and rejected after review",
      activeTitleColor: "text-[#F43F5E]",
      img: RejectedImg,
    },
    {
      id: "approved",
      title: "My Approved Announcements",
      subtitle: isManager
        ? "Announcements you reviewed, approved, and cleared for launch"
        : "Announcements you created that have been approved and published",
      activeTitleColor: "text-[#8ED973]",
      img: MyApprovedImg,
    },
  ];

  // Same helper as RequestsAndApprovals.jsx
  const getTabButtonClasses = (tabId) => {
    const isSelected = activeTab === tabId;
    if (isSelected) {
      return isDark
        ? "bg-white text-black shadow-md border-transparent"
        : "bg-black text-white shadow-md border-transparent";
    }
    return isDark
      ? "bg-[#0B1121] text-white hover:bg-[#151a2d] border-white/10 shadow-xs hover:shadow-md"
      : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs hover:shadow-md";
  };

  const inputBg = isDark
    ? "bg-[#12141A] text-white placeholder:text-slate-500"
    : "bg-[#EEF2F6] text-slate-900 placeholder:text-slate-400";

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* 🌟 ROOT CONTAINER */}
      <div
        style={{ zoom: VarTrainingScale }}
        className="w-full max-w-[1780px] mx-auto p-3.5 -mt-2 select-none font-sans flex flex-col gap-3"
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
              Announcement Requests And Approvals
            </h1>
          </div>
        </div>

        {/* ── 2-COLUMN MAIN WORKSPACE ── */}
        <div
          style={{ gap: `${VarSectionGap}px` }}
          className="w-full flex flex-col lg:flex-row items-start"
        >
          {/* 👈 LEFT COLUMN: SWITCHER CAPSULES */}
          <div
            style={{
              width: VarLeftSectionWidth,
              flex: `0 0 ${VarLeftSectionWidth}`,
            }}
            className="flex flex-col gap-2.5 min-w-[270px]"
          >
            {navTabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ")
                      setActiveTab(tab.id);
                  }}
                  style={{
                    height: `${VarThreeButtonsHeightAdjuster}px`,
                    borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`,
                  }}
                  className={`nav-capsule-btn relative p-3 flex flex-col justify-between cursor-pointer overflow-hidden border ${getTabButtonClasses(tab.id)}`}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <h3
                      className={`text-[15.5px] font-voda font-bold tracking-tight leading-tight ${isSelected ? (isDark ? "text-black" : tab.activeTitleColor) : ""}`}
                    >
                      {tab.title}
                    </h3>
                  </div>

                  <p
                    className={`text-[9px] font-medium leading-tight relative z-10 max-w-[170px] ${
                      isSelected
                        ? isDark
                          ? "text-slate-700"
                          : "text-slate-300"
                        : isDark
                          ? "text-slate-400"
                          : "text-slate-500"
                    }`}
                  >
                    {tab.subtitle}
                  </p>

                  <div className="absolute -bottom-2 -right-2 w-14 h-14 pointer-events-none select-none z-0">
                    <img
                      src={tab.img}
                      alt={tab.title}
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

          {/* 👉 RIGHT COLUMN: GALLERY VIEW */}
          <div
            style={{
              width: VarRightSectionWidth,
              flex: `0 0 ${VarRightSectionWidth}`,
            }}
            className="flex flex-col min-w-0 h-full"
          >
            {activeTab === "queue" &&
              (isManager ? (
                <ApprovalQueueGallery
                  announcements={announcements}
                  isDark={isDark}
                  minHeight={VarRightGalleryBaseHeight}
                  onApprove={handleApprove}
                  onReject={handleRejectOpen}
                  onNotify={(a) => setNotifyingItem(a)}
                />
              ) : (
                <RequestedQueueGallery
                  announcements={announcements}
                  isDark={isDark}
                  minHeight={VarRightGalleryBaseHeight}
                  userEmail={userEmail}
                />
              ))}

            {activeTab === "rejected" && (
              <RejectedPathsGallery
                announcements={announcements}
                isDark={isDark}
                minHeight={VarRightGalleryBaseHeight}
                userEmail={userEmail}
                isManager={isManager}
                onEdit={onEdit}
                onSendForApproval={handleSendForApproval}
              />
            )}

            {activeTab === "approved" && (
              <ApprovedPathsGallery
                announcements={announcements}
                isDark={isDark}
                minHeight={VarRightGalleryBaseHeight}
                userEmail={userEmail}
                isManager={isManager}
              />
            )}
          </div>
        </div>

        {/* Plain reject: popup modal with the reason the creator will see */}
        {rejectingItem && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50"
          >
            <div
              className={`w-full max-w-md rounded-2xl p-6 shadow-2xl border flex flex-col gap-3 ${isDark ? "bg-[#161820] text-white border-white/10" : "bg-white text-slate-900 border-black/10"}`}
            >
              <h2 className="text-[16px] font-voda font-black tracking-tight">
                Reject this campaign?
              </h2>
              <p className="text-[11.5px] font-medium text-slate-500 leading-snug">
                <span
                  className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                >
                  {rejectingItem.AnnouncementTitle}
                </span>{" "}
                ({rejectingItem.announcementId}) will move to Rejected
                Announcements.
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-bold">
                  Reason for rejecting <span className="text-[#EF4444]">*</span>
                </span>
                <textarea
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    setActionError("");
                  }}
                  rows={3}
                  maxLength={500}
                  placeholder="The creator sees this on the Rejected tab"
                  className={`w-full rounded-xl px-3 py-2 text-[11px] font-medium outline-none resize-none ${inputBg}`}
                />
              </label>
              {actionError && (
                <p className="text-[10.5px] font-bold text-rose-500">
                  {actionError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActionError("");
                    setRejectingItem(null);
                    setRejectReason("");
                  }}
                  className="px-5 py-1.5 rounded-xl bg-black hover:bg-slate-900 text-white text-[10px] font-voda font-bold uppercase tracking-wider cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  className="px-5 py-1.5 rounded-xl bg-[#F87171] hover:bg-[#EF4444] text-white text-[10px] font-voda font-bold uppercase tracking-wider cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
        <NotifyForChangeWindow
          key={notifyingItem?.announcementId || "closed"}
          isOpen={Boolean(notifyingItem)}
          announcement={notifyingItem}
          onClose={() => setNotifyingItem(null)}
          onSubmit={handleNotifySubmit}
        />

        {toast && (
          <div
            role="status"
            className="fixed bottom-6 right-6 z-[130] rounded-xl bg-black px-4 py-3 text-[12px] font-medium text-white shadow-xl"
          >
            {toast}
          </div>
        )}
      </div>
    </>
  );
};

export default AnnouncementRequestsApprovals;
