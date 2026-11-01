
import './Training.css'

import { VarMySpaceScale } from "@/shared/SharedStyles";
import { TrainingProvider, useTraining } from "./TrainingContext";

// Modularized Components
import LmsLeftSidebar from "./components/LmsLeftSidebar";
import LmsMainContent from "./components/LmsMainContent";
import TrainingLandingPage from "./TrainingLandingPage";
import RequestsAndApprovalsLandingPage from "./RequestsAndApprovals/RequestsAndApprovalsLandingPage";
import ReportsLandingPage from "./TrainingReport/TrainingReportLandingPage";

import { VideoPlayerModal, QuizTakerModal, CertificateViewerModal } from "./components/modals/Modals";
import PathwaySequencePlayerModal from "./components/modals/PathwaySequencePlayerModal";
import { X } from "lucide-react";

import { savePath } from "./components/utility/db";

export const VarLmsHeaderClass = (isDark) =>
  `w-full h-[40px] py-2.5 px-6 -mt-2 rounded-2xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm select-none ${
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
    paths,
    videos,
    quizzes,
    certificates,
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
        className={`w-full max-w-[1780px] mx-auto ${VarLmsPagePadding} -mt-2 select-none font-sans flex flex-col ${VarLmsPageGap} h-[calc(104vh-0px)] overflow-hidden animate-clay-stagger-1`}
      >
        {/* PAGE HEADER TOOLBAR */}
        <div className={VarLmsHeaderClass(isDark)}>
          <div className="flex items-center gap-3 w-full">
            <h1 className="text-[13.5px] font-voda font-bold tracking-tight uppercase flex items-center justify-between w-full">
              <span>
                LMS {activeVideo ? "– Video Lesson" : activeQuiz ? "– Assessment Quiz" : activeCert ? "– Certificate Preview" : activeInteractivePath ? "– Pathway Sequence" : launchStandalonePkg ? "– Simulation Sandbox" : (currentView === "paths" ? "– Training Path" : currentView === "individual" ? "– Storage Room" : currentView === "add-package" ? "– Configure SCORM Package" : currentView === "requests" ? "– Requests & Approvals" : currentView === "reports" ? "– Learning Progress" : "")}
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
                  className={`h-7 px-3.5 rounded-lg text-[9px] font-voda font-black uppercase tracking-wider ${
                    isDark ? 'bg-black/10 hover:bg-black/20 text-black' : 'bg-white/10 hover:bg-white/20 text-white'
                  } cursor-pointer transition-all scale-100 active:scale-98`}
                >
                  ← { (activeVideo || activeQuiz || activeCert || activeInteractivePath || launchStandalonePkg) ? "Exit Viewer" : "Back to Hub" }
                </button>
              )}
            </h1>
          </div>
        </div>

        {/* UNIFIED TRAINING SHELL */}
        <div
          className={`w-full flex-1 min-h-0 transition-all duration-300 overflow-hidden flex flex-col ${
            (currentView === "hub" && !activeVideo && !activeQuiz && !activeCert && !activeInteractivePath && !launchStandalonePkg)
              ? (isDark ? "bg-[#0B1121] border border-white/10 shadow-xl p-4 sm:p-5 gap-4 rounded-xl" : "bg-white border border-slate-200 shadow-sm p-4 sm:p-5 gap-4 rounded-xl")
              : "bg-transparent border-none shadow-none p-0 gap-0"
          }`}
        >
          {activeVideo ? (
            <VideoPlayerModal
              video={activeVideo}
              onClose={() => setActiveVideo(null)}
              isInline={true}
            />
          ) : activeQuiz ? (
            <QuizTakerModal
              quiz={activeQuiz}
              onClose={() => setActiveQuiz(null)}
              isInline={true}
            />
          ) : activeCert ? (
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
          ) : launchStandalonePkg ? (
            <div className="flex-1 h-full min-h-[500px] bg-[#090D1A] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-white/10 text-left">
              <div className="px-6 py-4 bg-black/40 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                    {launchStandalonePkg.PackageName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setLaunchStandalonePkg(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 bg-black relative flex items-center justify-center">
                {zipError ? (
                  <div className="p-6 text-center max-w-md">
                    <p className="text-red-400 text-sm font-bold uppercase">Compilation Error</p>
                    <p className="text-xs text-slate-400 mt-2">{zipError}</p>
                  </div>
                ) : launchHtmlUrl ? (
                  <iframe
                    src={launchHtmlUrl}
                    title={launchStandalonePkg.PackageName}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-same-origin allow-modals"
                  />
                ) : (
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Extracting files and launching the package...
                    </p>
                  </div>
                )}
              </div>
            </div>
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
                setPathsSubTab("create");
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
            <div className="flex-1 flex flex-col lg:flex-row items-stretch gap-6 min-h-0 select-none w-full animate-clay-stagger-2 text-left">
              <LmsLeftSidebar />
              <LmsMainContent />
            </div>
          )}
        </div>
      </div>
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
