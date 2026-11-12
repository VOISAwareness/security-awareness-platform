import { useState, useMemo } from "react";
import { useUserType } from '@/UserTypeContext/UserTypeContext';
import { useTraining } from '../TrainingContext';

// Ported Galleries
import ApprovalQueueGallery from './components/ApprovalQueueGallery';
import RequestedQueueGallery from './components/RequestedQueueGallery';
import RejectedPathsGallery from './components/RejectedPathsGallery';
import ApprovedPathsGallery from './components/ApprovedPathsGallery';

// Assets
import ApprovalQueueImg from '@/assets/RequestAndApprovalsAssets/ApprovalQueueImage.png';
import RequestQueueImg from '@/assets/RequestAndApprovalsAssets/RequestQueueImage.png';
import RejectedImg from '@/assets/RequestAndApprovalsAssets/RejectedCampaignsImage.png';
import MyApprovedImg from '@/assets/RequestAndApprovalsAssets/MyApprovedCampaignsImage.png';

// DB & Types
import { savePath } from '../components/utility/db';

// =========================================================================
//  CONSTANTS
// =========================================================================
export const VarRequestsScale = 0.90;
export const VarOverallCornerRoundednessAdjuster = 0.7;
export const VarLeftSectionWidth = '22%';
export const VarRightSectionWidth = '77%';
export const VarSectionGap = 12; // in px
export const VarNavButtonsHeightAdjuster = 80; // Height in px for each of the 4 nav buttons
export const VarButtonsPopAnimationAdjuster = 1; // Hover pop scale multiplier
export const VarAppToCreRatioVisualHeight = 142; // Height in px for the ratio visual card
export const VarAppToCreRatioVisualBarScale = 1; // Scale multiplier for the ratio bar

const RequestsAndApprovals = ({
  paths,
  setPaths,
  isDark,
  videos,
  quizzes,
  certificates,
  onEdit,
  onSendForApproval,
  onLaunch
}) => {
  const { user } = useUserType?.() || { isDark: false };
  const { showToast } = useTraining?.() || {};

  // =========================================================================
  //  EMAIL RESOLVER
  // =========================================================================
  const activeUserEmail = useMemo(() => {
    if (!user) return '';
    return (
      user.email ||
      user.userEmail ||
      user.UserEmailD_Admin ||
      user.UserEmailD_CamapignManager ||
      user.UserEmailD_CamapignCreator ||
      user.UserEmailD_GMT ||
      user.UserEmailD_GamificationEngineManager ||
      user.UserEMailID ||
      user.userEmailId ||
      ''
    ).trim().toLowerCase();
  }, [user]);

  const isCampaignCreator = user?.role === 'Campaign Creator';

  // Active view tab state: 'queue' | 'rejected' | 'expired' | 'approved'
  const [activeTab, setActiveTab] = useState('queue');

  // Trigger for plain-reject confirmation popup modal
  const [rejectingPath, setRejectingPath] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  const handleApprove = async (path) => {
    const updatedPath = {
      ...path,
      status: 'Published',
      approvedBy: activeUserEmail || 'abhay.hs1@vodafone.com',
    };
    try {
      await savePath(updatedPath);
      setPaths(prev => prev.map(p => p.TrainingPathID === path.TrainingPathID ? updatedPath : p));
      showToast?.(`"${path.TrainingPathName}" approved and published successfully.`);
    } catch (e) {
      console.error("Failed to approve learning path", e);
    }
  };

  const executeReject = async (path, reason) => {
    const updatedPath = {
      ...path,
      status: 'Rejected',
      approvedBy: activeUserEmail || 'abhay.hs1@vodafone.com',
      rejectionMessage: reason,
      NotificationMessage: reason,
    };
    try {
      await savePath(updatedPath);
      setPaths(prev => prev.map(p => p.TrainingPathID === path.TrainingPathID ? updatedPath : p));
      showToast?.(`"${path.TrainingPathName}" has been rejected.`);
      return true;
    } catch (e) {
      console.error("Failed to reject learning path", e);
      return false;
    }
  };

  const handleRejectOpen = (path, message) => {
    if (typeof message === 'string' && message.trim()) {
      executeReject(path, message.trim());
      return;
    }
    setRejectReason("");
    setActionError("");
    setRejectingPath(path);
  };

  const confirmReject = async () => {
    const path = rejectingPath;
    if (!path) return;
    if (!rejectReason.trim()) {
      setActionError("Please provide a reason so the creator knows why.");
      return;
    }
    setPendingAction(path.TrainingPathID);
    setActionError("");
    const success = await executeReject(path, rejectReason.trim());
    if (success) {
      setRejectingPath(null);
      setRejectReason("");
    } else {
      setActionError("Could not reject that learning path.");
    }
    setPendingAction(null);
  };


  // Switcher navigation items configuration (Notified removed)
  const navTabs = [
    {
      id: 'queue',
      title: isCampaignCreator ? 'My Requests' : 'My Approvals',
      subtitle: isCampaignCreator
        ? 'Learning paths submitted and awaiting manager review'
        : "Learning paths submitted that haven't been reviewed yet",
      activeTitleColor: isCampaignCreator ? 'text-[#A8B7E6]' : 'text-[#8ED973]',
      img: isCampaignCreator ? RequestQueueImg : ApprovalQueueImg
    },
    {
      id: 'rejected',
      title: 'Rejected Paths',
      subtitle: 'Learning paths that were reviewed and rejected after review',
      activeTitleColor: 'text-[#F43F5E]',
      img: RejectedImg
    },
    {
      id: 'approved',
      title: 'My Approved Paths',
      subtitle: isCampaignCreator
        ? 'Learning paths you created that have been approved and published'
        : 'Learning paths you reviewed, approved, and cleared for launch',
      activeTitleColor: 'text-[#8ED973]',
      img: MyApprovedImg
    }
  ];

  // Helper for 4-button styling
  const getTabButtonClasses = (tabId) => {
    const isSelected = activeTab === tabId;
    if (isSelected) {
      return isDark
        ? 'bg-white text-black shadow-md border-transparent'
        : 'bg-black text-white shadow-md border-transparent';
    }
    return isDark
      ? 'bg-[#0B1121] text-white hover:bg-[#151a2d] border-white/10 shadow-xs hover:shadow-md'
      : 'bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs hover:shadow-md';
  };

  // =========================================================================
  // RATIO OF APPROVERS TO CREATORS CALCULATION
  // =========================================================================
  // const { creatorsCount, approversCount, creatorsPct, approversPct } = useMemo(() => {
  //   const creatorsSet = new Set();
  //   const approversSet = new Set();

  //   paths.forEach(p => {
  //     if (p.createdBy) {
  //       creatorsSet.add(p.createdBy.trim().toLowerCase());
  //     }
  //     if (p.approvedBy) {
  //       approversSet.add(p.approvedBy.trim().toLowerCase());
  //     }
  //   });

  //   const cCount = creatorsSet.size > 0 ? creatorsSet.size : 5;
  //   const aCount = approversSet.size > 0 ? approversSet.size : 8;
  //   const total = cCount + aCount;

  //   return {
  //     creatorsCount: cCount,
  //     approversCount: aCount,
  //     creatorsPct: total > 0 ? (cCount / total) * 100 : 38.5,
  //     approversPct: total > 0 ? (aCount / total) * 100 : 61.5
  //   };
  // }, [paths]);

  return (
    <>
      {/*  ROOT CONTAINER */}
      <div 
        className="requests-and-approvals-wrapper w-full select-none font-sans flex flex-col gap-3.5 text-left"
      >
        {/* ── 2-COLUMN MAIN WORKSPACE ── */}
        <div 
          style={{ gap: `${VarSectionGap}px` }}
          className="w-full flex flex-col lg:flex-row items-start"
        >
          {/* ========================================================================= */}
          {/* LEFT COLUMN: 4 SWITCHER CAPSULES            */}
          {/* ========================================================================= */}
          <div 
            style={{ width: VarLeftSectionWidth, flex: `0 0 ${VarLeftSectionWidth}` }}
            className="flex flex-col gap-2.5 min-w-[270px]"
          >
            {navTabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    height: `${VarNavButtonsHeightAdjuster}px`,
                    borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
                  }}
                  className={`nav-capsule-btn relative p-3 flex flex-col justify-between cursor-pointer overflow-hidden border ${getTabButtonClasses(tab.id)}`}
                >
                  <div className="flex justify-between items-start relative z-10">
                    <h3 className={`text-[15.5px] font-voda font-bold tracking-tight leading-tight ${isSelected ? (isDark ? 'text-black' : tab.activeTitleColor) : ''}`}>
                      {tab.title}
                    </h3>
                  </div>

                  <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[170px] ${
                    isSelected
                      ? (isDark ? 'text-slate-700' : 'text-slate-300')
                      : (isDark ? 'text-slate-400' : 'text-slate-500')
                  }`}>
                    {tab.subtitle}
                  </p>

                  <div className="absolute -bottom-2 -right-2 w-14 h-14 pointer-events-none select-none z-0">
                    <img 
                      src={tab.img} 
                      alt={tab.title} 
                      className="w-full h-full object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                </div>
              );
            })}

            {/* ========================================================================= */}
            {/* TOTAL APPROVERS TO CREATORS RATIO CARD                         */}
            {/* ========================================================================= */}
            {/* <div
              style={{
                height: `${VarAppToCreRatioVisualHeight}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full p-4 flex flex-col justify-between bg-black text-white dark:bg-white dark:text-black border border-black/10 dark:border-white/10 shadow-xs select-none transition-colors duration-200"
            >
              <h4 className="text-[15px] font-voda font-bold tracking-tight leading-tight text-left -mt-1">
                Total Approvers to Creators Ratio
              </h4>
              <div className="flex items-center justify-between text-[12px] font-voda font-bold px-7 pt-1">
                <span className="text-white dark:text-black">Creators</span>
                <span className="text-white dark:text-black">Approvers</span>
              </div>
              <div 
                style={{ transform: `scale(${VarAppToCreRatioVisualBarScale})` }}
                className="w-full h-7 mb-2 rounded-full p-[1px] bg-white dark:bg-black/15 flex items-center overflow-hidden border border-white/40 dark:border-black/30 shadow-2xs"
              >
                <div 
                  style={{ width: `${creatorsPct}%` }}
                  className="h-full rounded-l-full bg-[#93A5EC] border-r-2 border-white flex items-center justify-center text-white text-[11px] font-black font-voda tracking-wide transition-all"
                >
                  {creatorsCount}
                </div>
                <div 
                  style={{ width: `${approversPct}%` }}
                  className="h-full rounded-r-full bg-[#A7DB98] flex items-center justify-center text-white text-[11px] font-black font-voda tracking-wide transition-all"
                >
                  {approversCount}
                </div>
              </div>
            </div> */}

          </div>

          {/* ========================================================================= */}
          {/* RIGHT COLUMN: GALLERY VIEW                                     */}
          {/* ========================================================================= */}
          <div 
            style={{ width: VarRightSectionWidth, flex: `0 0 ${VarRightSectionWidth}` }}
            className="flex flex-col min-w-0 h-full"
          >
            {activeTab === 'queue' && (
              isCampaignCreator ? (
                <RequestedQueueGallery
                  paths={paths}
                  isDark={isDark}
                  videos={videos}
                  quizzes={quizzes}
                  certificates={certificates}
                  onLaunch={onLaunch}
                />
              ) : (
                <ApprovalQueueGallery
                  paths={paths}
                  onApprove={handleApprove}
                  onReject={handleRejectOpen}
                  isDark={isDark}
                  videos={videos}
                  quizzes={quizzes}
                  certificates={certificates}
                  onLaunch={onLaunch}
                />
              )
            )}

            {activeTab === 'rejected' && (
              <RejectedPathsGallery
                paths={paths}
                isDark={isDark}
                videos={videos}
                quizzes={quizzes}
                certificates={certificates}
                onEdit={onEdit}
                onSendForApproval={onSendForApproval}
                onLaunch={onLaunch}
              />
            )}

            {activeTab === 'approved' && (
              <ApprovedPathsGallery
                paths={paths}
                isDark={isDark}
                videos={videos}
                quizzes={quizzes}
                certificates={certificates}
                onLaunch={onLaunch}
              />
            )}
          </div>
        </div>

        {/* Plain reject: final popup modal, with the reason the creator will see. */}
        {rejectingPath && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161820] text-slate-900 dark:text-white p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-3">
              <h2 className="text-[16px] font-voda font-black tracking-tight">
                Reject this learning path?
              </h2>
              <p className="text-[11.5px] font-medium text-slate-600 dark:text-slate-300 leading-snug">
                <span className="font-bold text-slate-900 dark:text-white">
                  {rejectingPath.TrainingPathName}
                </span>{" "}
                ({rejectingPath.TrainingPathID}) will move to Rejected Paths
                and be closed.
              </p>
              <label className="flex flex-col gap-1">
                <span className="text-[10.5px] font-bold text-slate-800 dark:text-slate-200">
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
                  className="w-full rounded-xl px-3 py-2 text-[11px] font-medium bg-[#EEF2F6] dark:bg-[#12141A] text-slate-900 dark:text-white border border-black/5 dark:border-white/10 outline-none resize-none"
                />
              </label>
              {actionError && (
                <p className="text-[10.5px] font-bold text-rose-600 dark:text-rose-300">
                  {actionError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActionError("");
                    setRejectingPath(null);
                    setRejectReason("");
                  }}
                  className="px-5 py-1.5 rounded-xl bg-black hover:bg-slate-900 text-white text-[10px] font-voda font-bold uppercase tracking-wider cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  disabled={pendingAction === rejectingPath.TrainingPathID}
                  className="px-5 py-1.5 rounded-xl bg-[#F87171] hover:bg-[#EF4444] disabled:opacity-50 text-white text-[10px] font-voda font-bold uppercase tracking-wider cursor-pointer"
                >
                  {pendingAction === rejectingPath.TrainingPathID
                    ? "Rejecting…"
                    : "Reject"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RequestsAndApprovals;
