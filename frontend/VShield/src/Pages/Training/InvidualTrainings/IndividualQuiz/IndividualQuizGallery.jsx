import { useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { TrainingQuizCard } from "../../components/cards/TrainingQuizCard";

export const IndividualQuizGallery = ({
  quizzes,
  search,
  setSearch,
  isDark,
  setActiveQuiz,
  setEditingQuiz,
  setShowQuizCreator
}) => {
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      const matchSearch = q.TrainingQuizName.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [quizzes, search]);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 mb-5 gap-3 flex-shrink-0">
        <div className="flex items-center gap-4 text-left select-none">
          <span className="text-4xl text-[#16A34A] font-black tracking-tight leading-none">
            {quizzes.length < 10 ? `0${quizzes.length}` : quizzes.length}
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
            <span className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tight mt-0.5">
              Assessments Stored
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className={`flex items-center h-[34px] rounded-lg border shadow-xs transition-colors px-2.5 gap-2 w-48 sm:w-64 ${
            isDark ? "bg-[#15161a] border-white/10" : "bg-white border-slate-200"
          }`}>
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 min-w-0 text-[10px] font-medium bg-transparent outline-none ${
                isDark ? "text-white placeholder:text-white/30" : "text-slate-800 placeholder:text-slate-400"
              }`}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowQuizCreator(true)}
            className={`h-[34px] pl-4 pr-3.5 rounded-full text-[9px] font-voda font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
              isDark ? "bg-white text-[#0B1121] hover:bg-slate-200" : "bg-[#06080D] text-white hover:bg-slate-800"
            }`}
          >
            Add Quiz
            <span className={`w-[18px] h-[18px] rounded-md flex items-center justify-center ${isDark ? "bg-[#0B1121]/10" : "bg-white/15"}`}>
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 pb-12 custom-light-scrollbar animate-clay-stagger-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start content-start">
          {filteredQuizzes.map((qz) => (
            <TrainingQuizCard
              key={qz.TrainingQuizID}
              quiz={qz}
              isDark={isDark}
              onPreview={setActiveQuiz}
              onEdit={setEditingQuiz}
            />
          ))}
          <button
            type="button"
            onClick={() => setShowQuizCreator(true)}
            className="border-2 border-dashed border-white/10 hover:border-[#E60000]/40 bg-white/[0.01] hover:bg-[#E60000]/5 transition-all rounded-2xl p-6 flex flex-col items-center justify-center text-center h-[220px] gap-2.5 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white font-voda uppercase">Create Quiz</h4>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">
                Draft evaluation questionnaires and establish completion criteria.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IndividualQuizGallery;
