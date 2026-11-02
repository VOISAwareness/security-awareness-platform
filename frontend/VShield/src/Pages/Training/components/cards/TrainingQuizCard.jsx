import { HelpCircle, Settings, Check } from "lucide-react";
import { CARD_THEME_COLORS, getDynamicButtonBg } from "../utility/colorHelpers";

export const TrainingQuizCard = ({
  quiz,
  isDark,
  onPreview,
  onEdit,
  isSelected = false,
  onSelect,
}) => {
  const lightBg = CARD_THEME_COLORS.quiz.parentBg;
  const lightBorder = CARD_THEME_COLORS.quiz.border;
  const lightButtonBg = getDynamicButtonBg(lightBg);

  return (
    <div
      onClick={() => onSelect ? onSelect() : onPreview(quiz)}
      style={!isDark && !isSelected ? { backgroundColor: lightBg, borderColor: lightBorder } : {}}
      className={`border rounded-3xl p-5 flex flex-col justify-between h-[220px] transition-all duration-200 relative overflow-hidden select-none text-left cursor-pointer group ${
        isSelected
          ? isDark
            ? "border-transparent bg-[#15161A] text-white hover:bg-[#15161A]"
            : "border-transparent bg-white text-slate-900 hover:bg-white"
          : isDark
          ? "bg-[#1A4A38] text-white border-white/10 hover:shadow-lg"
          : "text-black hover:shadow-md"
      }`}
    >
      <div className="flex flex-col gap-2 z-10">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[9px] font-bold bg-black/10 dark:bg-white/10 text-slate-500 dark:text-slate-300 shadow-2xs w-max">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
            {quiz.TrainingQuizID}
          </div>
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white shadow-md border border-white/20">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
          )}
        </div>
        <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white line-clamp-1 leading-snug">
          {quiz.TrainingQuizName}
        </h3>
        <p className="text-[10px] text-slate-950 dark:text-slate-300 line-clamp-2 leading-relaxed">
          {quiz.Description}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-3 mt-4 z-10">
        <span className="text-[10px] font-bold text-slate-400">
          Passing: {quiz.TrainingCompletionThreshold}%
        </span>
        <div className="flex items-center gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(quiz);
              }}
              className="h-8 w-8 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/15 border border-black/5 dark:border-white/5 text-slate-500 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              title="Edit / Manage Quiz"
            >
              <Settings className="w-3.5 h-3.5 hover:rotate-45 transition-transform duration-300" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(quiz);
            }}
            style={!isDark ? { backgroundColor: lightButtonBg, color: "#FFFFFF", borderColor: "transparent" } : {}}
            className={`h-8 px-4 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${
              isDark ? "bg-white/10 hover:bg-white/15 border-white/10 text-white" : ""
            }`}
          >
            Preview <HelpCircle className="w-3.5 h-3.5 text-inherit" />
          </button>
        </div>
      </div>
    </div>
  );
};
