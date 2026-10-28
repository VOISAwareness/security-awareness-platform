import { Play } from "lucide-react";

export const VideoThumbnail = ({
  videoSrc,
  className = "w-full h-full object-cover",
}) => {
  const thumbnailSrc = videoSrc
    ? videoSrc.includes("#t=")
      ? videoSrc
      : `${videoSrc}#t=3`
    : "";

  if (videoSrc) {
    return (
      <video
        src={thumbnailSrc}
        className={className}
        preload="metadata"
        muted
        playsInline
      />
    );
  }

  return (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center">
      <Play className="w-8 h-8 text-[#E60000]" />
    </div>
  );
};
