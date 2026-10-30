import React from "react";
import { Play, HelpCircle, Award, Settings, ExternalLink, UploadCloud } from "lucide-react";

const getCoverImage = (imgName) => {
  try {
    return new URL(`../../../Scenarios/` + imgName, import.meta.url).href;
  } catch { /* ignore */ 
    return `/assets/Scenarios/${imgName}`;
  }
};

export const TrainingPathCard = ({
  path,
  videos,
  quizzes,
    isDark,
  onLaunch,
  onEdit,
  onSendForApproval
}) => {
  const { pathVideos, questionCount, passingScore } = React.useMemo(() => {
    const pathVideos = (path.TrainingVideoAttached || []).map(
      (vidId) =>
        videos.find((v) => v.TrainingVideoID === vidId) || {
          TrainingVideoID: vidId,
          TrainingVideoName: "Security Awareness Module",
          Description: "Comprehensive training video module on identifying phishing lures.",
        }
    );

    const quiz =
      quizzes.find(
        (q) => q.TrainingQuizID === (path.TrainingQuizAttached?.[0] || "TQ-00001")
      ) || quizzes[0];

    const questionCount = quiz?.QuizData ? Object.keys(quiz.QuizData).length : 10;
    const passingScore = quiz?.TrainingCompletionThreshold || 80;

    return { pathVideos, questionCount, passingScore };
  }, [path, videos, quizzes]);

  const coverSrc = getCoverImage(path["Thumbnail(CoverImage)"] || "CovImg-001.png");

  return (
    <div className="relative group w-full h-[220px] cursor-pointer hover:z-30 transition-all duration-300">
      {/* 1. Underlying Drawer*/}
      <div
        className={`absolute inset-0 rounded-[24px] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-0 border overflow-hidden translate-x-[10px] translate-y-[10px] group-hover:translate-x-[10px] group-hover:translate-y-[50px] group-hover:shadow-xl ${
          isDark
            ? "bg-[#070B14] border-white/5 text-slate-300"
            : "bg-[#EBF1F5] border-slate-200 text-slate-700 shadow-xs"
        }`}
      >
        {/* Stats items docked at bottom of the open drawer */}
        <div className="absolute bottom-0 left-0 right-0 h-[50px] flex items-center justify-between px-4 py-1.5 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300 delay-75 pointer-events-none group-hover:pointer-events-auto">
          {!path.isZipPath ? (
            <>
              {/* Item 1: Videos */}
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-2xs ${
                  isDark ? "bg-white/10 text-white" : "bg-slate-200 text-slate-800"
                }`}>
                  <Play className="w-3.5 h-3.5 text-[#E60000] fill-current" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className={`text-[10px] font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                    {pathVideos.length} Videos
                  </span>
                  <span className="text-[8.5px] text-slate-400">
                    Total: {path.UsedTime}m
                  </span>
                </div>
              </div>

              {/* Item 2: Quiz */}
              <div className="flex items-center gap-1.5 -ml-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-2xs ${
                  isDark ? "bg-white/10 text-white" : "bg-slate-200 text-slate-800"
                }`}>
                  <HelpCircle className="w-3.5 h-3.5 text-[#7C3AED]" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className={`text-[10px] font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                    1 Quiz
                  </span>
                  <span className="text-[8.5px] text-slate-400">
                    {questionCount} Qs
                  </span>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Item 1: Sandbox package */}
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-2xs ${
                  isDark ? "bg-white/10 text-white" : "bg-slate-200 text-slate-800"
                }`}>
                  <UploadCloud className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className={`text-[10px] font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                    Zip Sandbox
                  </span>
                  <span className="text-[8.5px] text-slate-400">
                    Interactive Package
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Item 3: Certificate */}
          <div className="flex items-center gap-1.5 mr-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-2xs ${
              isDark ? "bg-white/10 text-white" : "bg-slate-200 text-slate-800"
            }`}>
              <Award className="w-3.5 h-3.5 text-[#16A34A]" />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className={`text-[10px] font-bold ${isDark ? "text-white" : "text-slate-800"}`}>
                {path.TrainingCertificateAttached?.length || 0} Cert
              </span>
              <span className="text-[8.5px] text-slate-400">
                Pass: {passingScore}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/*  2. Main Card Layer */}
      <div
        onClick={() => onLaunch(path)}
        className={`relative p-5 rounded-[24px] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col justify-between overflow-hidden select-none w-full h-[220px] shadow-md z-10 hover:scale-[1.015] hover:-translate-y-1 ${
          isDark
            ? "bg-[#0C111A] text-white border border-white/5"
            : "bg-white text-slate-800 border border-slate-200 shadow-xs"
        }`}
      >
        {/* Top row */}
        <div className="flex items-center justify-between z-10 flex-shrink-0">
          <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${
            isDark ? "bg-white/10 text-slate-300" : "bg-slate-100 text-slate-600"
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>{path.TrainingPathID}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-black tracking-wider uppercase text-slate-400">
            <span>Created on: {path.CreatedOn}</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </div>
        </div>

        {/* Middle Content */}
        <div className="flex-1 flex flex-col justify-center gap-1.5 z-10 py-2 text-left">
          <h3 className={`text-[14.5px] font-voda font-extrabold leading-snug tracking-tight line-clamp-1 ${
            isDark ? "text-white" : "text-slate-800"
          }`}>
            {path.TrainingPathName}
          </h3>
          <p className={`text-[11px] font-semibold leading-normal line-clamp-2 max-w-[85%] ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}>
            {path.Description}
          </p>
        </div>

        {/* Bottom row actions */}
        <div className={`flex items-center justify-between z-10 flex-shrink-0 pt-2 border-t ${
          isDark ? "border-white/5" : "border-slate-100"
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
              {path.isAlwaysAvailable ? "Always Available" : "Interactive Sequence"}
            </span>
            {path.status === 'Pending' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-500 text-[8.5px] font-bold uppercase tracking-wide animate-pulse">
                Pending
              </span>
            )}
            {path.status === 'Rejected' && (
              <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-500 text-[8.5px] font-bold uppercase tracking-wide" title={path.rejectionMessage}>
                Rejected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {path.status === 'Rejected' && onSendForApproval && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSendForApproval(path);
                }}
                className="h-8 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[9.5px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Resubmit Pathway for Manager Approval"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Resubmit</span>
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(path);
                }}
                className={`h-8 w-8 rounded-xl flex items-center justify-center cursor-pointer transition-colors border ${
                  isDark
                    ? "bg-white/10 hover:bg-white/15 border-white/10 text-slate-300"
                    : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                }`}
                title="Edit / Manage Path"
              >
                <Settings className="w-3.5 h-3.5 hover:rotate-45 transition-transform duration-300" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLaunch(path);
              }}
              className="h-8 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-600 dark:text-[#FF5F5F] text-[10px] font-bold cursor-pointer shadow-sm transition-colors"
            >
              Open
            </button>
          </div>
        </div>

        {/* Absolute graphics element overlay bottom-right slightly cut off */}
        <div className="absolute right-[-10px] top-[40px] w-[100px] h-[105px] pointer-events-none select-none flex items-center justify-center z-0 opacity-20">
          <img
            src={coverSrc}
            alt={path.TrainingPathName}
            className="w-full h-full object-contain filter drop-shadow-md"
            onError={(e) => {
              e.currentTarget.src = `/assets/Scenarios/${path["Thumbnail(CoverImage)"] || "CovImg-001.png"}`;
            }}
          />
        </div>
      </div>
    </div>
  );
};
