import React from "react";
import { Play, HelpCircle, Award, Settings, ExternalLink, UploadCloud } from "lucide-react";

const getCoverImage = (imgName) => {
  try {
    return new URL(`../../../Scenarios/` + imgName, import.meta.url).href;
  } catch {
    return `/assets/Scenarios/${imgName}`;
  }
};

export const TrainingPathCard = ({
  path,
  videos = [],
  quizzes = [],
  certificates = [],
  isDark,
  onLaunch,
  onEdit,
  onSendForApproval
}) => {
  const { pathVideos, questionCount, passingScore } = React.useMemo(() => {
    const vids = (path.TrainingVideoAttached || []).map(
      (vidId) =>
        videos.find((v) => v.TrainingVideoID === vidId) || {
          TrainingVideoID: vidId,
          TrainingVideoName: "Security Awareness Module",
          Description: "Comprehensive training video module on identifying phishing lures."
        }
    );

    const quiz =
      quizzes.find(
        (q) => q.TrainingQuizID === (path.TrainingQuizAttached?.[0] || "TQ-00001")
      ) || quizzes[0];

    const questionCount = quiz?.QuizData ? Object.keys(quiz.QuizData).length : 10;
    const passingScore = quiz?.TrainingCompletionThreshold || 80;

    return { pathVideos: vids, questionCount, passingScore };
  }, [path, videos, quizzes]);

  const coverSrc = getCoverImage(path["Thumbnail(CoverImage)"] || "CovImg-001.png");

  return (
    <div
      key={path.TrainingPathID}
      className="relative group w-full h-[220px] cursor-pointer hover:z-30 transition-all duration-300"
      onClick={() => onLaunch && onLaunch(path)}
    >
      {/* 🌟 1. Underlying Peeking Drawer (Exact 1-2px Peek at Rest, Slides Smoothly on Hover) */}
      <div
        className={`absolute inset-0 rounded-3xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-0 border overflow-hidden ${
          isDark
            ? "bg-[#E4ECF0] border-white/10 text-white"
            : "bg-[#EBF1F5] border-slate-300 text-slate-800"
        } translate-x-[10px] translate-y-[10px] group-hover:translate-x-[10px] group-hover:translate-y-[50px] group-hover:shadow-xl`}
      >
        {/* Stats items docked at bottom of the open drawer */}
        <div className="absolute bottom-0 left-0 right-0 h-[50px] flex items-center justify-between px-3.5 py-1.5 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 transition-all duration-300 delay-75 pointer-events-none group-hover:pointer-events-auto">
          {!path.isZipPath ? (
            <>
              {/* Item 1: Videos */}
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[10px] font-bold text-slate-900">
                    {pathVideos.length} Videos
                  </span>
                  <span className="text-[8.5px] text-slate-500">
                    Total: {path.UsedTime ? `${path.UsedTime}m` : "10s"}
                  </span>
                </div>
              </div>

              {/* Item 2: Quiz */}
              <div className="flex items-center gap-1.5 -ml-3">
                <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[10px] font-bold text-slate-900">
                    1 Quiz
                  </span>
                  <span className="text-[8.5px] text-slate-500">
                    {questionCount} Qs
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                <UploadCloud className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex flex-col text-left leading-tight">
                <span className="text-[10px] font-bold text-slate-900">
                  Zip Sandbox
                </span>
                <span className="text-[8.5px] text-slate-500">
                  Interactive Package
                </span>
              </div>
            </div>
          )}

          {/* Item 3: Certificate */}
          <div className="flex items-center gap-1.5 mr-2">
            <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Award className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="text-[10px] font-bold text-slate-900">
                {path.TrainingCertificateAttached?.length || 1} Cert
              </span>
              <span className="text-[8.5px] text-slate-500">
                Pass: {passingScore}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 2. Main Card Layer */}
      <div
        className={`relative p-4 rounded-3xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col justify-between overflow-hidden select-none w-full h-[220px] shadow-sm z-10 ${
          isDark
            ? "bg-[#15161A] text-white border border-white/10"
            : "bg-black text-white border border-black/10"
        } group-hover:-translate-y-0.5`}
      >
        {/* Top Bar: Badge (Left) + Creation Date & Expand Sheet / Player Button (Right) */}
        <div className="flex items-center justify-between mb-1 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10.5px] font-bold bg-white/75 text-black/75 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
            <span>{path.TrainingPathID}</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] font-bold text-white/70">
            <span>Created on: {path.CreatedOn}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onLaunch) onLaunch(path);
              }}
              className="p-1 rounded hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Open Details"
            >
              <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <div className="flex flex-col gap-1 text-left z-10 max-w-[70%]">
          <h3 className="text-[14.5px] font-voda font-bold text-white leading-tight tracking-tight mb-3">
            {path.TrainingPathName}
          </h3>
          <p className="text-[9px] text-white/75 font-medium line-clamp-4 leading-relaxed -mt-0.5">
            <strong>Description: </strong>
            {path.Description}
          </p>
        </div>

        {/* Bottom Left Button + Cog Icon + Status Tags */}
        <div className="pt-2 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onLaunch) onLaunch(path);
            }}
            className="px-3.5 py-1 rounded-md bg-[#E2E8F0] hover:bg-white text-slate-900 text-[10.5px] font-bold transition-all shadow-2xs cursor-pointer"
          >
            Open
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(path);
              }}
              className="p-1 rounded-md hover:bg-white/15 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Edit / Manage Path"
            >
              <Settings className="w-3.5 h-3.5 hover:rotate-45 transition-transform duration-300" />
            </button>
          )}

          {path.status === "Pending" && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[8.5px] font-bold uppercase tracking-wide animate-pulse">
              Pending
            </span>
          )}
          {path.status === "Rejected" && (
            <span
              className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 text-[8.5px] font-bold uppercase tracking-wide"
              title={path.rejectionMessage}
            >
              Rejected
            </span>
          )}
          {path.status === "Rejected" && onSendForApproval && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSendForApproval(path);
              }}
              className="px-2.5 py-1 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              title="Resubmit Pathway for Manager Approval"
            >
              <UploadCloud className="w-3 h-3" />
              <span>Resubmit</span>
            </button>
          )}
        </div>

        {/* 3D Asset cropped 10% bottom & right */}
        <div className="absolute -right-[5%] -bottom-[7%] w-[125px] h-[125px] pointer-events-none select-none flex items-center justify-center overflow-hidden z-0">
          <img
            src={coverSrc}
            alt={path.TrainingPathName}
            className="w-full h-full object-contain filter drop-shadow-md"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TrainingPathCard;
