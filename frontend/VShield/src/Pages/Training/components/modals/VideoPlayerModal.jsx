import { useState, useRef } from "react";
import { GlassmorphicBackdrop } from "../shared/GlassmorphicBackdrop";
import {
  X
} from "lucide-react";

import { useIsDarkMode } from "./helpers";

export const VideoPlayerModal = ({
  video,
  onClose
}) => {
  const isDark = useIsDarkMode();
  const [isPlaying, setIsVideoPlaying] = useState(true);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsVideoPlaying(!isPlaying);
    }
  };

  return (
    <GlassmorphicBackdrop isDark={isDark} onClose={onClose}>
      <div className="w-full max-w-4xl bg-[#0B1121] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E60000] animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              {video.TrainingVideoName}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Container */}
        <div className="relative bg-black flex flex-col items-center justify-center group aspect-video">
          <video
            ref={videoRef}
            src={video.TrainingVideo}
            className="w-full h-full object-cover"
            autoPlay
            controls
            onPlay={() => setIsVideoPlaying(true)}
            onPause={() => setIsVideoPlaying(false)}
            onError={(e) => {
              // Handle fallback if mp4 is missing or not playable
              console.log("Video source error", e);
            }}
          />
        </div>

        {/* Info Area */}
        <div className="p-6 bg-black/60 flex flex-col gap-2">
          <h2 className="text-xl font-bold font-voda text-white leading-tight">
            {video.TrainingVideoName}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            {video.Description}
          </p>
          <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 font-semibold border-t border-white/5 pt-4">
            <span>Video Format: MP4 / H.264</span>
            <span>Created On: {video.CreatedOn}</span>
          </div>
        </div>
      </div>
    </GlassmorphicBackdrop>
  );
};