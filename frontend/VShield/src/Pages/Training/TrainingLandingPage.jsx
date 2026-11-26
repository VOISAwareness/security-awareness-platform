import { useTraining } from "./TrainingContext";
import { HubClayCard } from "./components/cards/HubClayCard";

import tiltedPathIcon from "@/assets/Training(LMS)/ui/TiltedPathIcon.png";
import tiltedStorageIcon from "@/assets/Training(LMS)/ui/TiltedStorageIcon.png";
import tiltedReportIcon from "@/assets/Training(LMS)/ui/TiltedReportIcon.png";
import tiltedApprovalIcon from "@/assets/Training(LMS)/ui/TiltedApprovalIcon.png";
import videoIcon from "@/assets/Training(LMS)/ui/VideoIcon.png";
import quizIcon from "@/assets/Training(LMS)/ui/QuizIcon.png";
import certificateIcon from "@/assets/Training(LMS)/ui/CertificateIcon.png";
import packageIcon from "@/assets/Training(LMS)/ui/PackageIcon.png";
import reportsIcon from "@/assets/Training(LMS)/ui/ReportsIcon.png";
import approvalQueueImg from "@/assets/Training(LMS)/ui/ApprovalQueueImage.png";
import myApprovedCampaignsImg from "@/assets/Training(LMS)/ui/MyApprovedCampaignsImage.png";
import rejectedCampaignsImg from "@/assets/Training(LMS)/ui/RejectedCampaignsImage.png";

export const TrainingLandingPage = () => {
  const {
    setCurrentView,
    setPathsSubTab,
    setActiveTab,
    setIndividualSubTab
  } = useTraining();

  return (
    <div className="flex-1 custom-light-scrollbar flex flex-col justify-start min-h-0 text-left">
      {/* 2x2 Grid of horizontal rectangular cards matching User List (DLs) bento cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 w-full max-w-none flex-1 auto-rows-fr">
        {/* Card 1: Training Path */}
        <HubClayCard
          onClick={() => {
            setCurrentView("paths");
            setPathsSubTab("all");
            setActiveTab("paths");
          }}
          squareBgClass="bg-[#E5E6FF] dark:bg-[#1E1F45]"
          squareTitle={<>Training<br />Path</>}
          squareSubtitle="Training Paths needed to run campaigns"
          squareImage={tiltedPathIcon}
          title="Create New / Track Created Training Paths"
          description="Build end-to-end Training Paths from the elements in your Storage Room, ready to attach to any new campaign. You can also check, track, edit or delete the paths you have already created."
          badgeImages={[
            videoIcon,
            quizIcon,
            certificateIcon,
            packageIcon
          ]}
          badgeText="Use these elements to build a Training Path"
          buttonText="Go here"
        />

        {/* Card 2: Storage Room */}
        <HubClayCard
          onClick={() => {
            setCurrentView("individual");
            setIndividualSubTab("videos");
            setActiveTab("videos");
          }}
          squareBgClass="bg-[#FFE5EC] dark:bg-[#451E28]"
          squareTitle={<>Storage<br />Room</>}
          squareSubtitle="Storage space for all training elements"
          squareImage={tiltedStorageIcon}
          title="Add New / Track Individual Training Materials"
          description="Add and track individual training videos, quizzes, certificates and packages. Keeping each element stored on its own makes it easy to reuse when structuring new Training Paths."
          badgeImages={[
            tiltedPathIcon
          ]}
          badgeText="Stored elements help you build Training Paths later"
          buttonText="Go here"
        />

        {/* Card 3: Reports & Dashboard */}
        <HubClayCard
          onClick={() => {
            setCurrentView("reports");
          }}
          squareBgClass="bg-[#E5F7EB] dark:bg-[#1E4528]"
          squareTitle={<>Reports &<br />Dashboard</>}
          squareSubtitle="Progress and tracking of all training"
          squareImage={tiltedReportIcon}
          title="View Reports of Overall / By Campaign Training Progress"
          description="See detailed training progress for every user, overall or campaign by campaign. Monitor completion status, certificates earned and any activities still pending, so you can follow up early."
          badgeImages={[
            reportsIcon
          ]}
          badgeText="Track each user's completion rate, campaign by campaign"
          buttonText="Go here"
        />

        {/* Card 4: Requests & Approvals */}
        <HubClayCard
          onClick={() => {
            setCurrentView("requests");
          }}
          squareBgClass="bg-[#E5F5F7] dark:bg-[#1E3F45]"
          squareTitle={<>Requests &<br />Approvals</>}
          squareSubtitle="Approvals and requests for new paths"
          squareImage={tiltedApprovalIcon}
          title="Request / Approve New Training Paths"
          description="Campaign Creators submit Training Paths for approval before they can be assigned to campaigns. Campaign Managers review, approve or reject them, and everyone can track their requests."
          customBadgeRow={
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                <div className="flex items-center gap-1.5">
                  <img src={approvalQueueImg} alt="Approval Queue" className="w-[clamp(20px,3cqw,24px)] h-[clamp(20px,3cqw,24px)] object-contain" />
                  <span className="text-[clamp(9.5px,1.4cqw,10.5px)] font-bold text-slate-700 dark:text-slate-300">Approval Queue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <img src={myApprovedCampaignsImg} alt="Approved" className="w-[clamp(20px,3cqw,24px)] h-[clamp(20px,3cqw,24px)] object-contain" />
                  <span className="text-[clamp(9.5px,1.4cqw,10.5px)] font-bold text-slate-700 dark:text-slate-300">Approved</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <img src={rejectedCampaignsImg} alt="Rejected" className="w-[clamp(20px,3cqw,24px)] h-[clamp(20px,3cqw,24px)] object-contain" />
                  <span className="text-[clamp(9.5px,1.4cqw,10.5px)] font-bold text-slate-700 dark:text-slate-300">Rejected</span>
                </div>
              </div>
            </div>
          }
          buttonText="Go here"
        />
      </div>
    </div>
  );
};

export default TrainingLandingPage;
