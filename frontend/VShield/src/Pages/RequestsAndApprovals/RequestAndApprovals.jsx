import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { useCampaigns } from '../../services/useCampaigns';
import { setActiveCampaignId } from '../../services/useCampaignDraft';
import { toDesignCampaign } from '../../services/campaignDesign';
import { actorFor } from '../../services/identity';

// Gallery Components
import ApprovalQueueGallery from './components/ApprovalQueueGallery';
import RequestedQueueGallery from './components/RequestedQueueGallery';
import RejectedCampaignsGallery from './components/RejectedCampaignsGallery';
import NotifiedCampaignsGallery from './components/NotifiedCampaignsGallery';
import ExpiredCampaignsGallery from './components/ExpiredCampaignsGallery';
import ApprovedCampaignsGallery from './components/ApprovedCampaignsGallery';
import NotifyForChangeWindow from './components/NotifyForChangeWindow';

// Assets
import ApprovalQueueImg from '../../assets/RequestAndApprovalsAssets/ApprovalQueueImage.png';
import RequestQueueImg from '../../assets/RequestAndApprovalsAssets/RequestQueueImage.png';
import RejectedImg from '../../assets/RequestAndApprovalsAssets/RejectedCampaignsImage.png';
import MegaphoneImg from '../../assets/RequestAndApprovalsAssets/NotifyForChangeImage.png';
import ExpiredImg from '../../assets/RequestAndApprovalsAssets/ExpiredCampaignsBeforeApproval.png';
import MyApprovedImg from '../../assets/RequestAndApprovalsAssets/MyApprovedCampaignsImage.png';


// =========================================================================
// 🎛️ ADJUSTER CONSTANTS
// =========================================================================
export const VarRequestsScale = 0.90;
export const VarOverallCornerRoundednessAdjuster = 0.7;
export const VarLeftSectionWidth = '22%';
export const VarRightSectionWidth = '77%';
export const VarSectionGap = 12; // in px
export const VarNavButtonsHeightAdjuster = 80; // Height in px for each of the 5 nav buttons
export const VarButtonsPopAnimationAdjuster = 1; // Hover pop scale multiplier (e.g. 1.02 = 102%, 1.04 = 104%)
export const VarAppToCreRatioVisualHeight = 142; // Height in px for the ratio visual card
export const VarAppToCreRatioVisualBarScale = 1; // Scale multiplier for the ratio bar

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

  .nav-capsule-btn {
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, background-color 0.2s ease, border-color 0.2s ease;
  }
  .nav-capsule-btn:hover {
    transform: scale(${VarButtonsPopAnimationAdjuster});
  }
  .nav-capsule-btn:active {
    transform: scale(0.97);
  }
`;

const RequestAndApprovals = () => {
  const { isDark, user } = useUserType?.() || { isDark: false };
  const navigate = useNavigate();

  // Lower-cased profile email: the audit identity sent with every action and
  // used for "created by me" / "approved by me".
  const activeUserEmail = actorFor(user);

  const isCampaignCreator = user?.role === 'Campaign Creator';

  // Active view tab state: 'queue' | 'rejected' | 'notified' | 'expired' | 'approved'
  const [activeTab, setActiveTab] = useState('queue');

  // Trigger for notify window modal, and the plain-reject confirmation
  const [notifyingCampaign, setNotifyingCampaign] = useState(null);
  const [rejectingCampaign, setRejectingCampaign] = useState(null);
  const [actionError, setActionError] = useState('');

  const {
    campaigns: liveCampaigns,
    loading,
    error,
    pendingAction,
    refresh,
    approve,
    reject,
    notify,
    reschedule,
  } = useCampaigns({ actor: activeUserEmail });

  // Live campaigns, in the field names the galleries were drawn with.
  const campaigns = useMemo(() => liveCampaigns.map((c) => toDesignCampaign(c)), [liveCampaigns]);

  // Every action reports failure the same way and leaves the list refreshed.
  const runAction = async (fn, fallbackMessage) => {
    // One transition at a time: a double click must not send it twice.
    if (pendingAction) return false;
    setActionError('');
    try {
      await fn();
      return true;
    } catch (e) {
      setActionError(e?.message || fallbackMessage);
      return false;
    }
  };

  // Approvers approve, reject, or reject with a notification. They never edit.
  const handleApprove = (camp) =>
    runAction(() => approve(camp.campaignId), 'Could not approve that campaign.');

  const handleNotifySubmit = async (camp, message) => {
    const done = await runAction(
      () => notify(camp.campaignId, message),
      'Could not send that notification.'
    );
    if (done) setNotifyingCampaign(null);
  };

  const handleReject = (camp) => setRejectingCampaign(camp);

  const confirmReject = async () => {
    const camp = rejectingCampaign;
    const done = await runAction(() => reject(camp.campaignId), 'Could not reject that campaign.');
    if (done) setRejectingCampaign(null);
  };

  // Creator only: open a campaign that came back with a notification in the wizard.
  const handleEditCampaign = (camp) => {
    setActiveCampaignId(camp.campaignId);
    navigate('/start-campaign/details');
  };

  // Creator only: an expired request goes back to DRAFT with its new start
  // time, then opens in the wizard to be checked and resubmitted.
  const handleExtendAndInvoke = async (camp, newStartTime) => {
    const done = await runAction(
      () => reschedule(camp.campaignId, newStartTime),
      'Could not reschedule that campaign.'
    );
    if (done) handleEditCampaign(camp);
    return done;
  };

  // Switcher navigation items configuration
  const navTabs = [
    {
      id: 'queue',
      title: isCampaignCreator ? 'Request Queue' : 'Approval Queue',
      subtitle: isCampaignCreator
        ? 'Campaigns submitted and awaiting approver review'
        : "Campaigns submitted that haven't been reviewed yet",
      activeTitleColor:  isCampaignCreator ? 'text-[#A8B7E6]' : 'text-[#8ED973]',
      img: isCampaignCreator ? RequestQueueImg : ApprovalQueueImg
    },
    {
      id: 'rejected',
      title: 'Rejected Campaigns',
      subtitle: 'Campaigns that were reviewed and rejected after review',
      activeTitleColor: 'text-[#F43F5E]',
      img: RejectedImg
    },
    {
      id: 'notified',
      title: 'Notified Campaigns',
      subtitle: 'Campaigns flagged with change requests from approvers',
      activeTitleColor: 'text-[#A09ECE]',
      img: MegaphoneImg
    },
    {
      id: 'expired',
      title: 'Expired Campaigns',
      subtitle: 'Campaigns that expired before receiving approval',
      activeTitleColor: 'text-[#E57A44]',
      img: ExpiredImg
    },
    {
      id: 'approved',
      title: 'My Approved Campaigns',
      subtitle: isCampaignCreator
        ? 'Campaigns you created that have been approved and published'
        : 'Campaigns you reviewed, approved, and cleared for launch',
      activeTitleColor: 'text-[#8ED973]',
      img: MyApprovedImg
    }
  ];

  // Helper for 5-button styling
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
  // 📊 RATIO OF APPROVERS TO CREATORS CALCULATION
  // =========================================================================
  const { creatorsCount, approversCount, creatorsPct, approversPct } = useMemo(() => {
    const creatorsSet = new Set();
    const approversSet = new Set();

    campaigns.forEach(c => {
      if (c.CreatedBy) {
        creatorsSet.add(c.CreatedBy.trim().toLowerCase());
      }
      if (c.Approver) {
        c.Approver.split(',').forEach(email => {
          if (email.trim()) approversSet.add(email.trim().toLowerCase());
        });
      }
      if (c['Approved/RejectedBy']) {
        approversSet.add(c['Approved/RejectedBy'].trim().toLowerCase());
      }
      if (c.ApprovedBy) {
        approversSet.add(c.ApprovedBy.trim().toLowerCase());
      }
    });

    const cCount = creatorsSet.size;
    const aCount = approversSet.size;
    const total = cCount + aCount;

    return {
      creatorsCount: cCount,
      approversCount: aCount,
      creatorsPct: total > 0 ? (cCount / total) * 100 : 0,
      approversPct: total > 0 ? (aCount / total) * 100 : 0
    };
  }, [campaigns]);

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* 🌟 ROOT CONTAINER */}
      <div 
        style={{ zoom: VarRequestsScale }}
        className="w-full max-w-[1780px] mx-auto p-3.5 -mt-2 select-none font-sans flex flex-col gap-3 min-h-[calc(108vh-0px)]"
      >
        {/* ── TOP HEADER STRIP ── */}
        <div
          className={`w-full h-[42px] py-2.5 px-6 -mt-2 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${
            isDark ? 'bg-white text-black border-white/10' : 'bg-[#000000] text-white border-black/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-[14.5px] font-bold tracking-tight uppercase font-voda">
              Requests & Approvals
            </h1>
          </div>
        </div>

        {/* ── 2-COLUMN MAIN WORKSPACE ── */}
        <div 
          style={{ gap: `${VarSectionGap}px` }}
          className="w-full flex flex-col lg:flex-row items-start"
        >
          {/* ========================================================================= */}
          {/* 👈 LEFT COLUMN: 5 SWITCHER CAPSULES WITH HOVER POP ANIMATION              */}
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
            {/* 📊 TOTAL APPROVERS TO CREATORS RATIO VISUAL CARD                         */}
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
          {/* 👉 RIGHT COLUMN: DYNAMIC GALLERY VIEW                                     */}
          {/* ========================================================================= */}
          <div 
            style={{ width: VarRightSectionWidth, flex: `0 0 ${VarRightSectionWidth}` }}
            className="flex flex-col min-w-0 h-full"
          >
            {(error || actionError) && (
              <div className="mb-2 px-4 py-2 rounded-xl flex items-center justify-between gap-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-400/20 text-rose-700 dark:text-rose-300 text-[10.5px] font-bold">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {actionError || `Could not load campaigns: ${error.message}`}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setActionError('');
                    refresh();
                  }}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-black/40 border border-rose-200 dark:border-rose-400/30 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            {loading && liveCampaigns.length === 0 && !error && (
              <p className="mb-2 text-[10.5px] font-bold text-slate-400">Loading campaigns…</p>
            )}

            {activeTab === 'queue' && (
              isCampaignCreator ? (
                <RequestedQueueGallery
                  campaigns={campaigns}
                  onOpenNotifiedModal={() => setActiveTab('notified')}
                  isDark={isDark}
                />
              ) : (
                <ApprovalQueueGallery
                  campaigns={campaigns}
                  currentUserEmail={activeUserEmail}
                  onApprove={handleApprove}
                  onNotify={(camp) => setNotifyingCampaign(camp)}
                  onReject={handleReject}
                  onOpenNotifiedModal={() => setActiveTab('notified')}
                  isDark={isDark}
                />
              )
            )}

            {activeTab === 'rejected' && (
              <RejectedCampaignsGallery
                campaigns={campaigns}
                isDark={isDark}
              />
            )}

            {activeTab === 'notified' && (
              <NotifiedCampaignsGallery
                isOpen={true}
                isInlineView={true}
                campaigns={campaigns}
                currentUserEmail={activeUserEmail}
                onEdit={handleEditCampaign}
                isDark={isDark}
              />
            )}

            {activeTab === 'expired' && (
              <ExpiredCampaignsGallery
                campaigns={campaigns}
                currentUserEmail={activeUserEmail}
                onExtendAndInvoke={handleExtendAndInvoke}
                isDark={isDark}
              />
            )}

            {activeTab === 'approved' && (
              <ApprovedCampaignsGallery
                isOpen={true}
                isInlineView={true}
                campaigns={campaigns}
                currentUserEmail={activeUserEmail}
                isDark={isDark}
              />
            )}
          </div>
        </div>

        {/* 🌟 Notify For Change Feedback Modal Window 🌟 */}
        {/* Keyed per campaign so a note typed for one never carries over to the next. */}
        <NotifyForChangeWindow
          key={notifyingCampaign?.campaignId || 'closed'}
          isOpen={Boolean(notifyingCampaign)}
          campaign={notifyingCampaign}
          busy={Boolean(notifyingCampaign) && pendingAction === notifyingCampaign.campaignId}
          error={notifyingCampaign ? actionError : ''}
          onClose={() => {
            setActionError('');
            setNotifyingCampaign(null);
          }}
          onSubmit={handleNotifySubmit}
        />

        {/* Plain reject: one confirmation, no message to the creator. */}
        {rejectingCampaign && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161820] text-slate-900 dark:text-white p-6 shadow-2xl border border-black/10 dark:border-white/10 flex flex-col gap-3">
              <h2 className="text-[16px] font-black tracking-tight">Reject this campaign?</h2>
              <p className="text-[11.5px] font-medium text-slate-600 dark:text-slate-300 leading-snug">
                <span className="font-bold text-slate-900 dark:text-white">{rejectingCampaign.CampaignTitle}</span>{' '}
                ({rejectingCampaign.campaignId}) will move to Rejected Campaigns. To ask the creator for
                changes instead, use Notify For Changes.
              </p>
              {actionError && (
                <p className="text-[10.5px] font-bold text-rose-600 dark:text-rose-300">{actionError}</p>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActionError('');
                    setRejectingCampaign(null);
                  }}
                  className="px-5 py-1.5 rounded-xl bg-black hover:bg-slate-900 text-white text-[10.5px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={confirmReject}
                  disabled={pendingAction === rejectingCampaign.campaignId}
                  className="px-5 py-1.5 rounded-xl bg-[#F87171] hover:bg-[#EF4444] disabled:opacity-50 text-white text-[10.5px] font-black uppercase tracking-wider cursor-pointer"
                >
                  {pendingAction === rejectingCampaign.campaignId ? 'Rejecting…' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default RequestAndApprovals;