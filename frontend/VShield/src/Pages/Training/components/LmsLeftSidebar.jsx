
import { useTraining } from "../TrainingContext";

import side11Img from "@/assets/Training(LMS)/ui/side_1_1.png";
import side31Img from "@/assets/Training(LMS)/ui/side_3_1.png";
import soloVidsImg from "@/assets/Training(LMS)/ui/solo_vids.png";
import soloQuizImg from "@/assets/Training(LMS)/ui/solo_quiz.png";
import side14Img from "@/assets/Training(LMS)/ui/side_1_4.png";
import certificateIconImg from "@/assets/Training(LMS)/ui/cretificate_icon.png";

export const LmsLeftSidebar = () => {
  const {
    isDark,
    currentView,
    setCurrentView,
    pathsSubTab,
    setPathsSubTab,
    editingPath,
    setEditingPath,
    individualSubTab,
    setIndividualSubTab
  } = useTraining();

  const VideoCardImg = soloVidsImg;
  const QuizIconImg = soloQuizImg;
  const CertificateCardImg = side14Img;

  const handlePathsClick = (subTab) => {
    setPathsSubTab(subTab);
    setEditingPath(null);
    setCurrentView("paths");
  };

  const handleIndClick = (subTab) => {
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
              pathsSubTab === "all" && !editingPath
                ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                : (isDark ? "bg-[#0B1121] text-white hover:bg-[#151a2d] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
            }`}
          >
            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">All Training Paths</h3>
            </div>
            <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
              pathsSubTab === "all" && !editingPath ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
            }`}>
              Every created training paths are stored here
            </p>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
              <img src={side11Img} alt="All Paths" className="w-full h-full object-contain" />
            </div>
          </div>

          <div
            onClick={() => handlePathsClick("create")}
            style={{ height: "80px", borderRadius: "14px" }}
            className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
              pathsSubTab === "create" || editingPath
                ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                : (isDark ? "bg-[#0B1121] text-white hover:bg-[#151a2d] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
            }`}
          >
            <div className="flex justify-between items-start relative z-10">
              <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">Create New Training Path</h3>
            </div>
            <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
              pathsSubTab === "create" || editingPath ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
            }`}>
              Start here to create a new training path
            </p>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
              <img src={side31Img} alt="Create Path" className="w-full h-full object-contain" />
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
              <img src={VideoCardImg} alt="Videos" className="w-full h-full object-contain" />
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
              <img src={QuizIconImg} alt="Quizzes" className="w-full h-full object-contain" />
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
              <img src={CertificateCardImg} alt="Certificates" className="w-full h-full object-contain" />
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
              Upload and deploy scorm packages.
            </p>
            <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
              <img src={certificateIconImg} alt="Standalone Zip" className="w-full h-full object-contain" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LmsLeftSidebar;
