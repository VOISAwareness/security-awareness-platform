 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useState, useMemo } from "react";
import { useUserType } from '@/UserTypeContext/UserTypeContext';

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
  const { user } = _optionalChain([useUserType, 'optionalCall', _ => _()]) || { isDark: false };

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

  const isCampaignCreator = _optionalChain([user, 'optionalAccess', _2 => _2.role]) === 'Campaign Creator';

  // Active view tab state: 'queue' | 'rejected' | 'expired' | 'approved'
  const [activeTab, setActiveTab] = useState('queue');

  // Trigger for rejection note window modal
  const [rejectingPath, setRejectingPath] = useState(null);

  const handleApprove = async (path) => {
    const updatedPath = {
      ...path,
      status: 'Published',
      approvedBy: activeUserEmail || 'abhay.hs1@vodafone.com',
    };
    try {
      await savePath(updatedPath);
      setPaths(prev => prev.map(p => p.TrainingPathID === path.TrainingPathID ? updatedPath : p));
    } catch (e) {
      console.error("Failed to approve learning path", e);
    }
  };

  const handleRejectSubmit = async (path, message) => {
    const updatedPath = {
      ...path,
      status: 'Rejected',
      approvedBy: activeUserEmail || 'abhay.hs1@vodafone.com',
      rejectionMessage: message,
    };
    try {
      await savePath(updatedPath);
      setPaths(prev => prev.map(p => p.TrainingPathID === path.TrainingPathID ? updatedPath : p));
    } catch (e) {
      console.error("Failed to reject learning path", e);
    }
    setRejectingPath(null);
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
      ? 'bg-[#1C1E24] text-white hover:bg-[#252830] border-white/10 shadow-xs hover:shadow-md'
      : 'bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs hover:shadow-md';
  };

  // =========================================================================
  // RATIO OF APPROVERS TO CREATORS CALCULATION
  // =========================================================================
  const { creatorsCount, approversCount, creatorsPct, approversPct } = useMemo(() => {
    const creatorsSet = new Set();
    const approversSet = new Set();

    paths.forEach(p => {
      if (p.createdBy) {
        creatorsSet.add(p.createdBy.trim().toLowerCase());
      }
      if (p.approvedBy) {
        approversSet.add(p.approvedBy.trim().toLowerCase());
      }
    });

    const cCount = creatorsSet.size > 0 ? creatorsSet.size : 5;
    const aCount = approversSet.size > 0 ? approversSet.size : 8;
    const total = cCount + aCount;

    return {
      creatorsCount: cCount,
      approversCount: aCount,
      creatorsPct: total > 0 ? (cCount / total) * 100 : 38.5,
      approversPct: total > 0 ? (aCount / total) * 100 : 61.5
    };
  }, [paths]);

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
            <div
              style={{
                height: `${VarAppToCreRatioVisualHeight}px`,
                borderRadius: `${Math.round(20 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full p-4 flex flex-col justify-between bg-black text-white dark:bg-white dark:text-black border border-black/10 dark:border-white/10 shadow-xs select-none transition-colors duration-200"
            >
              {/* Card Title */}
              <h4 className="text-[15px] font-voda font-bold tracking-tight leading-tight text-left -mt-1">
                Total Approvers to Creators Ratio
              </h4>

              {/* Labels Row */}
              <div className="flex items-center justify-between text-[12px] font-voda font-bold px-7 pt-1">
                <span className="text-white dark:text-black">Creators</span>
                <span className="text-white dark:text-black">Approvers</span>
              </div>

              {/* Segmented Bar */}
              <div 
                style={{ transform: `scale(${VarAppToCreRatioVisualBarScale})` }}
                className="w-full h-7 mb-2 rounded-full p-[1px] bg-white dark:bg-black/15 flex items-center overflow-hidden border border-white/40 dark:border-black/30 shadow-2xs"
              >
                {/* Creators Segment (Left) */}
                <div 
                  style={{ width: `${creatorsPct}%` }}
                  className="h-full rounded-l-full bg-[#93A5EC] border-r-2 border-white flex items-center justify-center text-white text-[11px] font-black font-voda tracking-wide transition-all"
                >
                  {creatorsCount}
                </div>

                {/* Approvers Segment (Right) */}
                <div 
                  style={{ width: `${approversPct}%` }}
                  className="h-full rounded-r-full bg-[#A7DB98] flex items-center justify-center text-white text-[11px] font-black font-voda tracking-wide transition-all"
                >
                  {approversCount}
                </div>
              </div>
            </div>

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
                  onReject={handleRejectSubmit}
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
      </div>
    </>
  );
};

export default RequestsAndApprovals;
