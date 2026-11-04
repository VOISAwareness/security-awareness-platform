
import { useTraining } from "../TrainingContext";

import videoIcon from "@/assets/Training(LMS)/ui/VideoIcon.png";
import reportsIcon from "@/assets/Training(LMS)/ui/ReportsIcon.png";
import tiltedVideoIcon from "@/assets/Training(LMS)/ui/TiltedVideoIcon.png";
import tiltedQuizIcon from "@/assets/Training(LMS)/ui/TiltedQuizIcon.png";
import packageIcon from "@/assets/Training(LMS)/ui/PackageIcon.png";
import certificateIcon from "@/assets/Training(LMS)/ui/CertificateIcon.png";

export const LmsLeftSidebar = () => {
  const {
    isDark,
    currentView,
    setCurrentView,
    pathsSubTab,
    setPathsSubTab,
    setEditingPath,
    individualSubTab,
    setIndividualSubTab,
    setShowPathCreator,
    setActiveVideo,
    setActiveQuiz,
    setActiveCert,
    setLaunchStandalonePkg,
    setShowVideoUploader,
    setShowQuizCreator,
    setShowCertCreator,
    setEditingVideo,
    setEditingQuiz,
    setEditingCert
  } = useTraining();

  const handlePathsClick = (subTab) => {
    setPathsSubTab(subTab);
    setEditingPath(null);
    if (setShowPathCreator) setShowPathCreator(false);
    setCurrentView("paths");
  };

  const handleIndClick = (subTab) => {
    if (subTab !== individualSubTab) {
      if (setActiveVideo) setActiveVideo(null);
      if (setActiveQuiz) setActiveQuiz(null);
      if (setActiveCert) setActiveCert(null);
      if (setLaunchStandalonePkg) setLaunchStandalonePkg(null);
      if (setShowVideoUploader) setShowVideoUploader(false);
      if (setShowQuizCreator) setShowQuizCreator(false);
      if (setShowCertCreator) setShowCertCreator(false);
      if (setEditingVideo) setEditingVideo(null);
      if (setEditingQuiz) setEditingQuiz(null);
      if (setEditingCert) setEditingCert(null);
    }
    setIndividualSubTab(subTab);
    setCurrentView("individual");
  };

  return (
    <div className="flex flex-col gap-3.5 min-w-[240px] w-full lg:w-[22%] flex-shrink-0 text-left">
      {currentView === "paths" ? (
        <>
          <div
            onClick={() => handlePathsClick("all")}
            style={{ height: "80px", borderRadius: "14px" }}
            className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
              pathsSubTab === "all"
                ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                : (isDark ? "bg-[#0B1121] text-white hover:bg-[#151a2d] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
            }`}
          >
            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">All Training Paths</h3>
            </div>
            <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
              pathsSubTab === "all" ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
            }`}>
              Every created training paths are stored here
            </p>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
              <img src={videoIcon} alt="All Paths" className="w-full h-full object-contain" />
            </div>
          </div>

          <div
            onClick={() => handlePathsClick("courses")}
            style={{ height: "80px", borderRadius: "14px" }}
            className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
              pathsSubTab === "courses"
                ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                : (isDark ? "bg-[#0B1121] text-white hover:bg-[#151a2d] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
            }`}
          >
            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">All Courses</h3>
            </div>
            <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
              pathsSubTab === "courses" ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
            }`}>
              Always available elective courses stored here
            </p>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
              <img src={reportsIcon} alt="Courses" className="w-full h-full object-contain" />
            </div>
          </div>
        </>
      ) : (
        <>
          <div
            onClick={() => handleIndClick("videos")}
            style={{ height: "80px", borderRadius: "14px" }}
            className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
              individualSubTab === "videos"
                ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                : (isDark ? "bg-[#0B1121] text-white hover:bg-[#151a2d] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
            }`}
          >
            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">Individual Videos</h3>
            </div>
            <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
              individualSubTab === "videos" ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
            }`}>
              Upload new videos to add in your training paths
            </p>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
              <img src={tiltedVideoIcon} alt="Videos" className="w-full h-full object-contain" />
            </div>
          </div>

          <div
            onClick={() => handleIndClick("quizzes")}
            style={{ height: "80px", borderRadius: "14px" }}
            className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
              individualSubTab === "quizzes"
                ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                : (isDark ? "bg-[#0B1121] text-white hover:bg-[#151a2d] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
            }`}
          >
            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">Individual Quizzes</h3>
            </div>
            <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
              individualSubTab === "quizzes" ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
            }`}>
              Create interactive quizzes and test the knowledge of your users.
            </p>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
              <img src={tiltedQuizIcon} alt="Quizzes" className="w-full h-full object-contain" />
            </div>
          </div>

          <div
            onClick={() => handleIndClick("certificates")}
            style={{ height: "80px", borderRadius: "14px" }}
            className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
              individualSubTab === "certificates"
                ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                : (isDark ? "bg-[#0B1121] text-white hover:bg-[#151a2d] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
            }`}
          >
            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">Certificates</h3>
            </div>
            <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
              individualSubTab === "certificates" ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
            }`}>
              Create and Award certifications on successful completions.
            </p>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
              <img src={certificateIcon} alt="Certificates" className="w-full h-full object-contain" />
            </div>
          </div>

          <div
            onClick={() => handleIndClick("packages")}
            style={{ height: "80px", borderRadius: "14px" }}
            className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
              individualSubTab === "packages"
                ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                : (isDark ? "bg-[#0B1121] text-white hover:bg-[#151a2d] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
            }`}
          >
            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">Training Packages</h3>
            </div>
            <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
              individualSubTab === "packages" ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
            }`}>
              Upload and deploy Imported Packages.
            </p>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
              <img src={packageIcon} alt="Training Packages" className="w-full h-full object-contain" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LmsLeftSidebar;
