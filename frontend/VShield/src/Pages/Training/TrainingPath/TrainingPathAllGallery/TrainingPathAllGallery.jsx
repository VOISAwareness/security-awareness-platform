import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { TrainingPathCard } from "../../components/cards/TrainingPathCard";
import TrainingGalleryHeader from "../../components/shared/TrainingGalleryHeader";

export const AllTrainingPathGallery = ({
  paths,
  videos,
  quizzes,
  certificates,
  isDark,
  search,
  setSearch,
  handleLaunchPathway,
  onEdit,
  onSendForApproval,
  onCreateClick,
  isCourseTab = false
}) => {
  const [sortChoice, setSortBy] = useState(null);
  const sortBy = sortChoice || "Latest Created Date";

  const displayPaths = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const sourceList = paths || [];
    let list = sourceList.filter((p) => {
      if (!q) return true;
      const matchName = (p.TrainingPathName || "").toLowerCase().includes(q);
      const matchId = (p.TrainingPathID || "").toLowerCase().includes(q);
      return matchName || matchId;
    });

    return [...list].sort((a, b) => {
      const dateA = new Date(a.CreatedOn || a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.CreatedOn || b.createdAt || b.updatedAt || 0).getTime();
      const expA = new Date(a.ExpiryDate || a.ExpiresOn || a.CampaignExpiringDate || 0).getTime();
      const expB = new Date(b.ExpiryDate || b.ExpiresOn || b.CampaignExpiringDate || 0).getTime();

      if (sortBy === "Shortest Expiring Date") return expA - expB;
      if (sortBy === "Latest Updated") {
        const upA = new Date(a.updatedAt || a.CreatedOn || 0).getTime();
        const upB = new Date(b.updatedAt || b.CreatedOn || 0).getTime();
        return upB - upA;
      }
      if (sortBy === "Oldest Created Date") {
        return (dateA - dateB) || String(a.TrainingPathID || "").localeCompare(String(b.TrainingPathID || ""), undefined, { numeric: true });
      }
      // Latest Created Date
      return (dateB - dateA) || String(b.TrainingPathID || "").localeCompare(String(a.TrainingPathID || ""), undefined, { numeric: true });
    });
  }, [paths, search, sortBy]);

  const actionButton = (
    <button
      type="button"
      onClick={onCreateClick}
      className={`h-6 px-3 rounded-lg text-[8.5px] font-voda font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
        isDark ? "bg-white text-[#0B1121] hover:bg-slate-200" : "bg-[#06080D] text-white hover:bg-slate-800"
      }`}
    >
      <span>{isCourseTab ? "Add Course" : "Add Training Path"}</span>
      <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center ${isDark ? "bg-[#0B1121]/10" : "bg-white/15"}`}>
        <Plus className="w-2.5 h-2.5" strokeWidth={3} />
      </span>
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <TrainingGalleryHeader
        count={displayPaths.length}
        title={isCourseTab ? "Courses" : "Training Paths"}
        counterColor={isCourseTab ? "#8ED973" : "#818CF8"}
        search={search}
        setSearch={setSearch}
        searchPlaceholder={isCourseTab ? "Search by Course ID or Course Name" : "Search by Path ID or Path Name"}
        sortBy={sortBy}
        setSortBy={setSortBy}
        actionButton={actionButton}
      />

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 pt-3 pb-24 overflow-x-visible custom-light-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-x-6 gap-y-6 items-start content-start">
          {displayPaths.map((path) => (
            <TrainingPathCard
              key={path.TrainingPathID}
              path={path}
              videos={videos}
              quizzes={quizzes}
              certificates={certificates}
              isDark={isDark}
              onLaunch={handleLaunchPathway}
              onEdit={(editing) => {
                onEdit(editing);
              }}
              onSendForApproval={onSendForApproval}
            />
          ))}
          <button
            type="button"
            onClick={onCreateClick}
            className="border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100/50 dark:hover:bg-[#E60000]/5 transition-all rounded-3xl p-6 flex flex-col items-center justify-center text-center h-[220px] gap-2.5 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-slate-200/60 dark:bg-white/5 flex items-center justify-center">
              <Plus className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider font-voda">
                {isCourseTab ? "Create Course" : "Create Training Path"}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                {isCourseTab
                  ? "Build always available courses using videos, quizzes, and templates."
                  : "Build training paths using videos, quizzes, and templates."}
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllTrainingPathGallery;
