
import { Search, Plus } from "lucide-react";
import { TrainingPathCard } from "../../components/cards/TrainingPathCard";

export const AllTrainingPathGallery = ({
  paths,
  filteredPaths,
  videos,
  quizzes,
  certificates,
  isDark,
  search,
  setSearch,
  handleLaunchPathway,
  onEdit,
  onSendForApproval,
  onCreateClick
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 mb-5 flex-shrink-0">
        <div className="flex items-center gap-4 text-left select-none">
          <span className="text-4xl text-[#7C3AED] dark:text-[#a78bfa] font-black tracking-tight leading-none">
            {paths.length < 10 ? `0${paths.length}` : paths.length}
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Training</span>
            <span className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tight mt-0.5">Paths Stored</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center h-[34px] rounded-lg border shadow-xs transition-colors px-2.5 gap-2 w-48 sm:w-64 ${
            isDark ? "bg-[#15161a] border-white/10" : "bg-white border-slate-200"
          }`}>
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Campaign ID or Campaign Name"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 min-w-0 text-[10px] font-medium bg-transparent outline-none ${
                isDark ? "text-white placeholder:text-white/30" : "text-slate-800 placeholder:text-slate-400"
              }`}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 pt-3 pb-24 overflow-x-visible custom-light-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12 items-start content-start">
          {filteredPaths.map((path) => (
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
            className="border-2 border-dashed border-white/10 hover:border-[#E60000]/40 bg-white/[0.01] hover:bg-[#E60000]/5 transition-all rounded-[24px] p-6 flex flex-col items-center justify-center text-center h-[250px] gap-2.5 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-voda">Construct Pathway</h4>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                Build training paths using videos, quizzes, and templates.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllTrainingPathGallery;
