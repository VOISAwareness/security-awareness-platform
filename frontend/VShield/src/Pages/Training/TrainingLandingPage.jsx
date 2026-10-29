// the hub's images, imported so the build ships them (a "/src/..." path only works in dev)
import uiApprovalQueueImage from "@/assets/Training(LMS)/ui/ApprovalQueueImage.png";
import uiMyApprovedCampaignsImage from "@/assets/Training(LMS)/ui/MyApprovedCampaignsImage.png";
import uiRejectedCampaignsImage from "@/assets/Training(LMS)/ui/RejectedCampaignsImage.png";
import uiMainLeftBottom from "@/assets/Training(LMS)/ui/main_left_bottom.png";
import uiMainLeftTop from "@/assets/Training(LMS)/ui/main_left_top.png";
import uiMainRightBottom from "@/assets/Training(LMS)/ui/main_right_bottom.png";
import uiMainRightTop from "@/assets/Training(LMS)/ui/main_right_top.png";
import uiSide11 from "@/assets/Training(LMS)/ui/side_1_1.png";
import uiSide12 from "@/assets/Training(LMS)/ui/side_1_2.png";
import uiSide13 from "@/assets/Training(LMS)/ui/side_1_3.png";
import uiSide14 from "@/assets/Training(LMS)/ui/side_1_4.png";
import uiSide31 from "@/assets/Training(LMS)/ui/side_3_1.png";
import { HubClayCard } from "./components/cards/HubClayCard";

export const TrainingLandingPage = ({
  setCurrentView,
  setPathsSubTab,
  setActiveTab,
  setIndividualSubTab,
  svgPath,
  VarLWallX
}) => {
  return (
    <div className="flex-1 mb-6 pr-2 custom-light-scrollbar flex flex-col justify-start min-h-0 text-left">

      {/* 2x2 Grid of horizontal rectangular cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 w-full max-w-none">
        {/* Card 1: Training Path */}
        <HubClayCard
          onClick={() => {
            setCurrentView("paths");
            setPathsSubTab("all");
            setActiveTab("paths");
          }}
          svgPath={svgPath}
          squareBgClass="bg-[#E5E6FF] dark:bg-[#1E1F45]"
          squareBorderClass="border-violet-200/20"
          squareTitle="Training Path"
          squareSubtitle="All about Training Paths required to run any campaign"
          squareImage={uiMainLeftTop}
          title="Create New / Track Created Training Paths"
          description="Here you can Create new Training Path using stored individual elements as complete end to end path which will be available to attach as training path for any new campaign. You can also Check, Track, Edit or Delete those Created Training Paths."
          badgeImages={[
            uiSide11,
            uiSide12,
            uiSide13,
            uiSide14
          ]}
          badgeText="Use these Individual Elements to create a Training Path"
          buttonText="Go here"
          lWallX={VarLWallX}
        />

        {/* Card 2: Storage Room */}
        <HubClayCard
          onClick={() => {
            setCurrentView("individual");
            setIndividualSubTab("videos");
            setActiveTab("videos");
          }}
          svgPath={svgPath}
          squareBgClass="bg-[#FFE5EC] dark:bg-[#451E28]"
          squareBorderClass="border-pink-200/20"
          squareTitle="Storage Room"
          squareSubtitle="It's the storage space for your all training elements"
          squareImage={uiMainRightTop}
          title="Add New / Track Individual Training Materials"
          description="Here you can 'Add New and Track' Individual Training Video, Quiz, Certificate and Packages and use these space as storage room. Storing elements individually helps in structuring pathways."
          badgeImages={[
            uiMainLeftTop
          ]}
          badgeText="Storing individual elements helps you in creating Training Paths in future"
          buttonText="Go here"
          lWallX={VarLWallX}
        />

        {/* Card 3: Reports & Dashboard */}
        <HubClayCard
          onClick={() => {
            setCurrentView("reports");
          }}
          svgPath={svgPath}
          squareBgClass="bg-[#E5F7EB] dark:bg-[#1E4528]"
          squareBorderClass="border-green-200/20"
          squareTitle="Reports & Dashboard"
          squareSubtitle="All about Training progress and Tracking updates on Training"
          squareImage={uiMainLeftBottom}
          title="View Reports of Overall / By Campaign Training Progress"
          description="Here you can view detailed training progress reports for all users, with both overall and campaign-wise tracking capabilities. Monitor completion status, certifications achieve and pending activities."
          badgeImages={[
            uiSide31
          ]}
          badgeText="Track Individual Campaigns Training Completion Rate for Each User"
          buttonText="Go here"
          lWallX={VarLWallX}
        />

        {/* Card 4: Requests & Approvals */}
        <HubClayCard
          onClick={() => {
            setCurrentView("requests");
          }}
          svgPath={svgPath}
          squareBgClass="bg-[#E5F5F7] dark:bg-[#1E3F45]"
          squareBorderClass="border-cyan-200/20"
          squareTitle="Requests & Approvals"
          squareSubtitle="All about approvals and request for any newly created Traning Paths."
          squareImage={uiMainRightBottom}
          title="Content Creators can Request & Content Managers can Approve those Requests."
          description="Here Campaign Creators can view and submit created Training Paths for approval before they are made available for campaign assignment. Campaign Managers can review pending requests, approve or reject submitted trainings, and monitor approval status. Users can also access dedicated sections to track their Approved Trainings, Rejected Trainings, and Pending Approval Requests, ensuring complete visibility of the training approval lifecycle."
          customBadgeRow={
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1.5 items-center">
                <img src={uiApprovalQueueImage} className="badge" />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">Approval Queue</span>
                <img src={uiMyApprovedCampaignsImage} className="badge" />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">Approved</span>
                <img src={uiRejectedCampaignsImage} className="badge" />
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">Rejected</span>
              </div>
            </div>
          }
          buttonText="Go here"
          lWallX={VarLWallX}
        />
      </div>
    </div>
  );
};

export default TrainingLandingPage;
