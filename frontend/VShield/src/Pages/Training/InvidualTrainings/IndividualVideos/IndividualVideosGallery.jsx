import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { TrainingVideoCard } from "../../components/cards/TrainingVideoCard";
import TrainingGalleryHeader from "../../components/shared/TrainingGalleryHeader";

export const IndividualVideosGallery = ({
  videos,
  search,
  setSearch,
  isDark,
  setActiveVideo,
  setEditingVideo,
  setShowVideoUploader
}) => {
  const [sortChoice, setSortBy] = useState(null);
  const sortBy = sortChoice || "Latest Created Date";

  const displayVideos = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const sourceList = videos || [];
    let list = sourceList.filter((v) => {
      if (!q) return true;
      const matchName = (v.TrainingVideoName || "").toLowerCase().includes(q);
      const matchId = (v.TrainingVideoID || "").toLowerCase().includes(q);
      return matchName || matchId;
    });

    return [...list].sort((a, b) => {
      const dateA = new Date(a.CreatedOn || a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.CreatedOn || b.createdAt || b.updatedAt || 0).getTime();
      const expA = new Date(a.ExpiryDate || a.ExpiresOn || 0).getTime();
      const expB = new Date(b.ExpiryDate || b.ExpiresOn || 0).getTime();

      if (sortBy === "Shortest Expiring Date") return expA - expB;
      if (sortBy === "Latest Updated") {
        const upA = new Date(a.updatedAt || a.CreatedOn || 0).getTime();
        const upB = new Date(b.updatedAt || b.CreatedOn || 0).getTime();
        return upB - upA;
      }
      if (sortBy === "Oldest Created Date") {
        return (dateA - dateB) || String(a.TrainingVideoID || "").localeCompare(String(b.TrainingVideoID || ""), undefined, { numeric: true });
      }
      return (dateB - dateA) || String(b.TrainingVideoID || "").localeCompare(String(a.TrainingVideoID || ""), undefined, { numeric: true });
    });
  }, [videos, search, sortBy]);

  const actionButton = (
    <button
      type="button"
      onClick={() => setShowVideoUploader(true)}
      className={`h-6 px-3 rounded-lg text-[8.5px] font-voda font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
        isDark ? "bg-white text-[#0B1121] hover:bg-slate-200" : "bg-[#06080D] text-white hover:bg-slate-800"
      }`}
    >
      <span>Add Video</span>
      <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center ${isDark ? "bg-[#0B1121]/10" : "bg-white/15"}`}>
        <Plus className="w-2.5 h-2.5" strokeWidth={3} />
      </span>
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <TrainingGalleryHeader
        count={displayVideos.length}
        title="Video Modules"
        counterColor="#EF4444"
        search={search}
        setSearch={setSearch}
        searchPlaceholder="Search by Video ID or Video Name"
        sortBy={sortBy}
        setSortBy={setSortBy}
        actionButton={actionButton}
      />

      <div className="flex-1 overflow-y-auto pr-1 pb-12 custom-light-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start content-start">
          {displayVideos.map((vid) => (
            <TrainingVideoCard
              key={vid.TrainingVideoID}
              video={vid}
              isDark={isDark}
              onPreview={setActiveVideo}
              onEdit={setEditingVideo}
            />
          ))}
          <button
            type="button"
            onClick={() => setShowVideoUploader(true)}
            className="border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100/50 dark:hover:bg-[#E60000]/5 transition-all rounded-2xl p-6 flex flex-col items-center justify-center text-center h-[220px] gap-2.5 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-slate-200/60 dark:bg-white/5 flex items-center justify-center">
              <Plus className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white font-voda uppercase">Upload Video</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                Add new MP4 videos to the media library.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IndividualVideosGallery;
