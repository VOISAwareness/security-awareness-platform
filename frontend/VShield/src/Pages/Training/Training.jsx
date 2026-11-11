
import './Training.css'

import { VarMySpaceScale } from "@/shared/SharedStyles";
import { TrainingProvider, useTraining } from "./TrainingContext";

// Modularized Components
import LmsLeftSidebar from "./components/LmsLeftSidebar";
import LmsMainContent from "./components/LmsMainContent";
import TrainingLandingPage from "./TrainingLandingPage";
import RequestsAndApprovalsLandingPage from "./RequestsAndApprovals/RequestsAndApprovalsLandingPage";
import ReportsLandingPage from "./TrainingReport/TrainingReportLandingPage";

import { VideoPlayerModal, QuizTakerModal, CertificateViewerModal, PackageViewerModal } from "./components/modals/Modals";
import PathwaySequencePlayerModal from "./components/modals/PathwaySequencePlayerModal";
import TrainingToast from "./components/shared/TrainingToast";

import { savePath } from "./components/utility/db";

export const VarLmsHeaderClass = (isDark) =>
  `w-full h-[38px] py-2.5 px-6 -mt-1 rounded-[10px] border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm select-none ${
    isDark ? 'bg-white text-black border-white/10' : 'bg-[#000000] text-white border-black/10'
  }`;

export const VarLmsPagePadding = "pt-2 sm:pt-2.5 pb-2 sm:pb-2.5 px-3 sm:px-3.5";
export const VarLmsPageGap = "gap-2.5";

function TrainingDashboardInner() {
  const {
    isDark,
    currentView,
    setCurrentView,
    setActiveTab,
    setPaths,
    setEditingPath,
    setPathsSubTab,
    pathsSubTab,
    paths,
    videos,
    quizzes,
    certificates,
    setEditingQuiz,
    setIndividualSubTab,
    handleLaunchPathway,
    showToast,
    activeVideo,
    setActiveVideo,
    activeQuiz,
    setActiveQuiz,
    activeCert,
    setActiveCert,
    activeInteractivePath,
    setActiveInteractivePath,
    launchStandalonePkg,
    setLaunchStandalonePkg,
    launchHtmlUrl,
    zipError,
    packages
  } = useTraining();

  return (
    <>
      <div
        style={{ zoom: VarMySpaceScale }}
        className={`w-full max-w-[1780px] mx-auto ${VarLmsPagePadding} -mt-2 select-none font-sans flex flex-col ${VarLmsPageGap} h-[calc(104vh-3.5px)] overflow-hidden`}
      >
        {/* PAGE HEADER TOOLBAR */}
        <div className={VarLmsHeaderClass(isDark)}>
          <div className="flex items-center gap-3 w-full">
            <h1 className="text-[13.5px] font-bold tracking-tight uppercase flex items-center justify-between w-full">
              <span>
                LMS {
                  activeInteractivePath ? "– Training Path" :
                  currentView === "individual" ? "– Storage Room" :
                  activeVideo ? "– Videos" :
                  activeQuiz ? "– Assessment" :
                  activeCert ? "– Certificate Preview" :
                  launchStandalonePkg ? "– Simulation Sandbox" : (
                    currentView === "paths" ? (pathsSubTab === "courses" ? "– Courses" : "– Training Path") :
                    currentView === "add-package" ? "– Configure Package" :
                    currentView === "requests" ? "– Requests & Approvals" :
                    currentView === "reports" ? "– Learning Progress" : ""
                  )
                }
              </span>
              {(currentView !== "hub" || activeVideo || activeQuiz || activeCert || activeInteractivePath || launchStandalonePkg) && (
                <button
                  type="button"
                  onClick={() => {
                    if (activeVideo) setActiveVideo(null);
                    else if (activeQuiz) setActiveQuiz(null);
                    else if (activeCert) setActiveCert(null);
                    else if (activeInteractivePath) setActiveInteractivePath(null);
                    else if (launchStandalonePkg) setLaunchStandalonePkg(null);
                    else {
                      setCurrentView("hub");
                      setActiveTab("paths");
                    }
                  }}
                  className={`h-6 px-3.5 rounded-lg text-[9px] font-voda font-black uppercase tracking-wider ${
                    isDark ? 'bg-black/10 hover:bg-black/20 text-black' : 'bg-white hover:bg-gray-200 text-black'
                  } cursor-pointer transition-all scale-100 active:scale-98`}
                >
                  { (activeVideo || activeQuiz || activeCert || activeInteractivePath || launchStandalonePkg) ?
                   "Exit Viewer" :
                   "Back to Hub"
                  }
                </button>
              )}
            </h1>
          </div>
        </div>

        {/* UNIFIED TRAINING SHELL */}
        <div
          className={`w-full flex-1 min-h-0 overflow-hidden flex flex-col ${
            (currentView === "hub" && !activeVideo && !activeQuiz && !activeCert && !activeInteractivePath && !launchStandalonePkg)
              ? (isDark ? "bg-[#0F1015] border border-white/10 shadow-xl p-4 sm:p-5 gap-4 rounded-xl" : "bg-white border border-slate-200 shadow-sm p-4 sm:p-5 gap-4 rounded-xl")
              : "bg-transparent border-none shadow-none p-0 gap-0"
          }`}
        >
          {(activeVideo && currentView !== "individual") ? (
            <VideoPlayerModal
              video={activeVideo}
              onClose={() => setActiveVideo(null)}
              isInline={true}
            />
          ) : (activeQuiz && currentView !== "individual") ? (
            <QuizTakerModal
              quiz={activeQuiz}
              onClose={() => setActiveQuiz(null)}
              onEdit={(q, qIdx) => {
                setActiveQuiz(null);
                setEditingQuiz(
                  qIdx !== undefined
                    ? { ...q, _startQuestionIdx: qIdx, _startIsEditing: true }
                    : q
                );
                setCurrentView("individual");
                setIndividualSubTab("quizzes");
              }}
              isInline={true}
            />
          ) : (activeCert && currentView !== "individual") ? (
            <CertificateViewerModal
              certificate={activeCert}
              onClose={() => setActiveCert(null)}
              isInline={true}
            />
          ) : activeInteractivePath ? (
            <PathwaySequencePlayerModal
              path={activeInteractivePath}
              videos={videos}
              quizzes={quizzes}
              certificates={certificates}
              packages={packages}
              isDark={isDark}
              onClose={() => setActiveInteractivePath(null)}
              isInline={true}
              onSendForApproval={async (pToSubmit) => {
                const submittedPath = {
                  ...pToSubmit,
                  status: 'Pending'
                };
                try {
                  await savePath(submittedPath);
                  setPaths(prev => prev.map(item => item.TrainingPathID === pToSubmit.TrainingPathID ? submittedPath : item));
                } catch (err) {
                  console.error("Failed to submit path for approval", err);
                }
              }}
            />
          ) : (launchStandalonePkg && currentView !== "individual") ? (
            <PackageViewerModal
              pkg={launchStandalonePkg}
              launchHtmlUrl={launchHtmlUrl}
              zipError={zipError}
              onClose={() => setLaunchStandalonePkg(null)}
              isInline={true}
            />
          ) : currentView === "hub" ? (
            <TrainingLandingPage />
          ) : currentView === "requests" ? (
            <RequestsAndApprovalsLandingPage
              paths={paths}
              setPaths={setPaths}
              isDark={isDark}
              videos={videos}
              quizzes={quizzes}
              certificates={certificates}
              onLaunch={handleLaunchPathway}
              onEdit={(path) => {
                setEditingPath(path);
                setPathsSubTab(path.isAlwaysAvailable ? "courses" : "all");
                setCurrentView("paths");
              }}
              onSendForApproval={async (pToSubmit) => {
                const submittedPath = {
                  ...pToSubmit,
                  status: 'Pending'
                };
                try {
                  await savePath(submittedPath);
                  setPaths(prev => prev.map(item => item.TrainingPathID === pToSubmit.TrainingPathID ? submittedPath : item));
                  showToast("Learning path pathway submitted successfully to manager approvals queue.");
                  setCurrentView("requests");
                } catch (err) {
                  console.error("Failed to submit path for approval", err);
                }
              }}
            />
          ) : currentView === "reports" ? (
            <ReportsLandingPage isDark={isDark} />
          ) : (
            /* SUB-VIEW SIDEBAR + CONTAINER SHELL */
            <div className="flex-1 flex flex-col lg:flex-row items-stretch gap-2 min-h-0 select-none w-full text-left">
              <LmsLeftSidebar />
              <LmsMainContent />
            </div>
          )}
        </div>
      </div>

      {/* Feedback from the Training screen (uploads, submissions) */}
      <TrainingToast />
    </>
  );
}

export default function TrainingDashboard() {
  return (
    <TrainingProvider>
      <TrainingDashboardInner />
    </TrainingProvider>
  );
}
