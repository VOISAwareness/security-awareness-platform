import { Play, Settings } from "lucide-react";

import { VideoThumbnail } from "../shared/VideoThumbnail";

export const TrainingVideoCard = ({
  video,
  isDark,
  onPreview,
  onEdit,
  isSelected = false,
  onSelect,
}) => {
  const videoSrc = video.TrainingVideo;

  return (
    <div
      onClick={() => onSelect ? onSelect() : onPreview(video)}
      className={`rounded-3xl flex flex-col h-[350px] transition-all duration-200 relative overflow-hidden select-none text-left cursor-pointer group ${
        isSelected
          ? isDark
            ? "border-transparent bg-[#15161A] text-white hover:bg-[#15161A]"
            : "border-transparent bg-white text-slate-900 hover:bg-white"
          : isDark
          ? "bg-[#4A2D08] text-white border-white/10 hover:shadow-lg"
          : "bg-[#FFEFCE] text-black hover:border-[#FB9296] hover:shadow-md"
      }`}
    >
      {/* 16:9 Native Video Thumbnail Preview with floating overlay ID badge */}
      <div className="relative w-full aspect-video bg-black rounded-t-3xl overflow-hidden flex-shrink-0 border-b border-black/5 dark:border-white/5">
        <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[8.5px] font-black bg-white text-slate-800 shadow-md z-20 uppercase tracking-wider flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
          {video.TrainingVideoID}
        </div>

        {isSelected && (
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-white border border-white/20 z-30 shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
        )}

        <VideoThumbnail videoSrc={videoSrc} />

        <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
            <Play className="w-4 h-4 fill-current" />
          </div>
        </div>
      </div>

      {/* Card Content Area */}
      <div className="p-4 flex flex-col justify-between flex-1 min-h-0">
        <div className="flex flex-col gap-1.5 min-h-0">
          <h3 className="text-[12.5px] font-black tracking-tight text-slate-900 dark:text-white line-clamp-1 leading-snug">
            {video.TrainingVideoName}
          </h3>
          <p className="text-[9.5px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {video.Description}
          </p>
        </div>

        <div className="flex items-center justify-end">
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(video);
                }}
                className="h-8 w-8 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/15 border border-black/5 dark:border-white/5 text-slate-500 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                title="Edit / Manage Video"
              >
                <Settings className="w-3.5 h-3.5 hover:rotate-45 transition-transform duration-300" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreview(video);
              }}
              className="h-8 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-[9.5px] font-bold text-slate-700 dark:text-white flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              Preview <Play className="w-3.5 h-3.5 text-[#E60000] fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
