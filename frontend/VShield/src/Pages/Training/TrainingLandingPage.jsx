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
    <div className="flex-1 mb-6 pr-2 custom-light-scrollbar flex flex-col justify-start min-h-0 text-left">
      {/* 2x2 Grid of horizontal rectangular cards matching User List (DLs) bento cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 w-full max-w-none">
        {/* Card 1: Training Path */}
        <HubClayCard
          onClick={() => {
            setCurrentView("paths");
            setPathsSubTab("all");
            setActiveTab("paths");
          }}
          squareBgClass="bg-[#E5E6FF] dark:bg-[#1E1F45]"
          squareTitle={<>Training<br />Path</>}
          squareSubtitle="All about Training Paths required to run any campaign"
          squareImage={tiltedPathIcon}
          title="Create New / Track Created Training Paths"
          description="Here you can Create new Training Path using stored individual elements as complete end to end path which will be available to attach as training path for any new campaign. You can also Check, Track, Edit or Delete those Created Training Paths."
          badgeImages={[
            videoIcon,
            quizIcon,
            certificateIcon,
            packageIcon
          ]}
          badgeText="Use these Individual Elements to create a Training Path"
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
          squareSubtitle="It's the storage space for your all training elements"
          squareImage={tiltedStorageIcon}
          title="Add New / Track Individual Training Materials"
          description="Here you can 'Add New and Track' Individual Training Video, Quiz, Certificate and Packages and use these space as storage room. Storing elements individually helps in structuring pathways."
          badgeImages={[
            tiltedPathIcon
          ]}
          badgeText="Storing individual elements helps you in creating Training Paths in future"
          buttonText="Go here"
        />

        {/* Card 3: Reports & Dashboard */}
        <HubClayCard
          onClick={() => {
            setCurrentView("reports");
          }}
          squareBgClass="bg-[#E5F7EB] dark:bg-[#1E4528]"
          squareTitle={<>Reports &<br />Dashboard</>}
          squareSubtitle="All about Training progress and Tracking updates on Training"
          squareImage={tiltedReportIcon}
          title="View Reports of Overall / By Campaign Training Progress"
          description="Here you can view detailed training progress reports for all users, with both overall and campaign-wise tracking capabilities. Monitor completion status, certifications achieve and pending activities."
          badgeImages={[
            reportsIcon
          ]}
          badgeText="Track Individual Campaigns Training Completion Rate for Each User"
          buttonText="Go here"
        />

        {/* Card 4: Requests & Approvals */}
        <HubClayCard
          onClick={() => {
            setCurrentView("requests");
          }}
          squareBgClass="bg-[#E5F5F7] dark:bg-[#1E3F45]"
          squareTitle={<>Requests &<br />Approvals</>}
          squareSubtitle="All about approvals and request for newly created Traning Paths."
          squareImage={tiltedApprovalIcon}
          title="Content Creators can Request & Content Managers can Approve those Requests."
          description="Here Campaign Creators can view and submit created Training Paths for approval before they are made available for campaign assignment. Campaign Managers can review pending requests, approve or reject submitted trainings, and monitor approval status. Users can also access dedicated sections to track their Approved Trainings, Rejected Trainings, and Pending Approval Requests, ensuring complete visibility of the training approval lifecycle."
          customBadgeRow={
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1">
                  <img src={approvalQueueImg} alt="Approval Queue" className="w-5 h-5 object-contain" />
                  <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300">Approval Queue</span>
                </div>
                <div className="flex items-center gap-1">
                  <img src={myApprovedCampaignsImg} alt="Approved" className="w-5 h-5 object-contain" />
                  <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300">Approved</span>
                </div>
                <div className="flex items-center gap-1">
                  <img src={rejectedCampaignsImg} alt="Rejected" className="w-5 h-5 object-contain" />
                  <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300">Rejected</span>
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
