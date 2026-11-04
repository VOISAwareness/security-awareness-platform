import { useState, useRef } from "react";
import { GlassmorphicBackdrop } from "../shared/GlassmorphicBackdrop";
import {
  X
} from "lucide-react";

import { useIsDarkMode } from "./helpers";

export const VideoPlayerModal = ({
  video,
  onClose,
  isInline = false
}) => {
  const isDark = useIsDarkMode();
  const [, setIsVideoPlaying] = useState(true);
  const videoRef = useRef(null);

  const content = (
    <div className={`w-full overflow-hidden flex flex-col select-none font-sans text-left ${
      isInline
        ? `flex-1 h-full justify-between ${isDark ? "bg-[#0B1121] text-white" : "bg-white text-slate-800"}`
        : `bg-[#0B1121] border border-white/10 rounded-2xl shadow-2xl max-w-4xl`
    }`}>
      {/* ── DOCKED TOP HEADER BAR ── */}
      <div className={`w-full h-12 flex items-stretch justify-between flex-shrink-0 select-none border-b ${
        isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200/90 bg-white"
      }`}>
        <div className="px-6 h-full flex items-center gap-2.5 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#E60000] animate-pulse" />
          <span className="font-voda font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            {video.TrainingVideoName}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`px-4 h-full flex items-center justify-center border-l hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer ${
            isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"
          }`}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── SCROLLABLE VIDEO & INFO BODY ── */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Player Container */}
        <div className="relative bg-black flex flex-col items-center justify-center flex-1 min-h-[300px]">
          <video
            ref={videoRef}
            src={video.TrainingVideo}
            className="w-full h-full max-h-[50vh] object-contain"
            autoPlay
            controls
            onPlay={() => setIsVideoPlaying(true)}
            onPause={() => setIsVideoPlaying(false)}
            onError={(e) => {
              console.log("Video source error", e);
            }}
          />
        </div>

        {/* Info Area */}
        <div className={`p-6 flex flex-col gap-2 ${
          isDark ? "bg-[#0B1121]/90 text-white" : "bg-slate-50/90 text-slate-800"
        }`}>
          <h2 className="text-lg font-bold font-voda leading-tight">
            {video.TrainingVideoName}
          </h2>
          <p className={`text-xs leading-relaxed max-w-3xl text-left ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}>
            {video.Description}
          </p>
          <div className={`mt-3 flex items-center justify-between text-[11px] font-semibold border-t pt-3 ${
            isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"
          }`}>
            <span>Video Format: MP4 / H.264</span>
            <span>Created On: {video.CreatedOn}</span>
          </div>
        </div>
      </div>

      {/* ── DOCKED FOOTER BAR ── */}
      <div className={`w-full px-6 py-3 border-t flex items-center justify-end gap-2.5 flex-shrink-0 select-none ${
        isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200 bg-white"
      }`}>
        <button
          type="button"
          onClick={onClose}
          className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
        >
          CLOSE
        </button>
      </div>
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <GlassmorphicBackdrop isDark={isDark} onClose={onClose}>
      {content}
    </GlassmorphicBackdrop>
  );
};