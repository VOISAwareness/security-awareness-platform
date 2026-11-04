import { useState } from "react";
import { GlassmorphicBackdrop } from "../shared/GlassmorphicBackdrop";
import {
  X,
  HelpCircle,
  Check,
  CheckCircle2,
  Edit3
} from "lucide-react";

import { useIsDarkMode } from "./helpers";

export const QuizTakerModal = ({
  quiz,
  onClose,
  onEdit,
  isInline = false
}) => {
  const isDark = useIsDarkMode();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});

  const questionsKeys = Object.keys(quiz.QuizData || {}).sort();
  const totalQuestions = questionsKeys.length;
  const currentKey = questionsKeys[currentIdx];
  const questionItem = quiz.QuizData?.[currentKey];

  const content = (
    <div className={`w-full overflow-hidden flex flex-col select-none font-sans text-left ${
      isInline
        ? `flex-1 h-full min-h-0 justify-between ${isDark ? "bg-[#0B1121] text-white" : "bg-white text-slate-800"}`
        : `bg-[#0B1121] border border-white/10 rounded-2xl shadow-2xl max-w-4xl h-[85vh]`
    }`}>
      {/* ── DOCKED TOP HEADER BAR ── */}
      <div className={`w-full h-12 flex items-stretch justify-between flex-shrink-0 select-none border-b ${
        isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200/90 bg-white"
      }`}>
        <div className="px-6 h-full flex items-center gap-2.5 flex-shrink-0">
          <HelpCircle className="w-4 h-4 text-[#0D9B77]" />
          <span className="font-voda font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            {quiz.TrainingQuizName}
          </span>
        </div>

        <div className="flex items-center h-full">
          {onEdit && (
            <div className="px-3 flex items-center">
              <button
                type="button"
                onClick={() => onEdit(quiz)}
                className="h-7 px-3.5 rounded-full bg-[#0D9B77] hover:bg-[#0b8465] text-white text-[9px] font-bold font-voda uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                title="Edit this quiz in builder"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Quiz</span>
              </button>
            </div>
          )}

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
      </div>

      {/* ── QUIZ PREVIEW BODY (MATCHING MY TRAINING) ── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(0,7.5fr)_minmax(240px,2.5fr)]">
        {/* Center Section: Question & Answer Options */}
        <section className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border p-4 sm:p-5 ${
          isDark ? "bg-[#15161A] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
        }`}>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-light-scrollbar">
            {/* Top metadata strip */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-black/5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold font-voda"
                  style={{
                    backgroundColor: isDark ? "#18372F" : "#DCFCE7",
                    color: isDark ? "#86EFAC" : "#166534",
                  }}
                >
                  Total Questions: {totalQuestions}
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Question {String(currentIdx + 1).padStart(2, "0")} of {totalQuestions}
                </span>
              </div>

              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(quiz, currentIdx)}
                  className="h-7 px-3 rounded-lg border text-[10px] font-voda font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors border-[#0D9B77] text-[#0D9B77] hover:bg-[#0D9B77]/10"
                  title="Edit this question"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Question</span>
                </button>
              )}
            </div>

            {/* Question title */}
            <h2 className="mb-3 text-xs sm:text-sm font-bold font-voda leading-snug">
              <span style={{ color: "#E60000" }}>
                Question {String(currentIdx + 1).padStart(2, "0")}:
              </span>{" "}
              {questionItem?.question}
            </h2>

            {/* Options List with Highlighted Correct Answer */}
            <div className="mt-1 flex min-h-0 flex-col gap-2">
              {(["optionA", "optionB", "optionC", "optionD"]).map((optKey, index) => {
                const text = questionItem?.[optKey];
                if (!text) return null;
                const isCorrect = questionItem?.Answer === optKey;
                const isSelected = selectedAnswers[currentIdx] === optKey;

                return (
                  <div
                    key={optKey}
                    onClick={() => setSelectedAnswers({ ...selectedAnswers, [currentIdx]: optKey })}
                    className={`flex w-full min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                      isCorrect
                        ? isDark
                          ? "bg-[#18372F] border-[#0D9B77] text-white shadow-xs"
                          : "bg-[#ECFDF5] border-[#0D9B77] text-[#1E293B] shadow-xs"
                        : isSelected
                        ? isDark
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-slate-100 border-slate-300 text-slate-900"
                        : isDark
                        ? "bg-[#20232B] border-[#383C47] text-slate-200 hover:border-slate-500"
                        : "bg-white border-[#E2E8F0] text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold font-voda ${
                        isCorrect
                          ? "bg-[#0D9B77] text-white"
                          : isDark
                          ? "bg-[#15161A] text-slate-400"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-xs font-voda leading-tight sm:text-sm py-1">
                      {text}
                    </span>
                    {isCorrect ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#0D9B77] uppercase tracking-wider font-voda mt-1.5 flex-shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        <span>Correct Answer</span>
                      </span>
                    ) : (
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 mt-1.5 ${
                          isSelected ? "border-slate-400" : isDark ? "border-slate-600" : "border-slate-300"
                        }`}
                      >
                        {isSelected && <span className="h-2 w-2 rounded-full bg-slate-400" />}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Center Column Bottom Navigation */}
          <footer className={`flex shrink-0 items-center justify-between border-t pt-3 mt-3 ${
            isDark ? "border-white/10" : "border-slate-200"
          }`}>
            <span className="text-[11px] text-slate-400 font-medium">
              Passing requirement: {quiz.TrainingCompletionThreshold}%
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0}
                className="px-3 h-[24px] rounded-3xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-voda font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                PREVIOUS
              </button>
              <button
                type="button"
                onClick={() => setCurrentIdx(Math.min(totalQuestions - 1, currentIdx + 1))}
                disabled={currentIdx === totalQuestions - 1}
                className="px-3 h-[24px] rounded-3xl bg-[#0D9B77] hover:bg-[#0b8465] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                NEXT
              </button>
            </div>
          </footer>
        </section>

        {/* Right Section: Questions List (matching My Training) */}
        <aside className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border p-3 ${
          isDark ? "bg-[#15161A] border-white/10" : "bg-white border-slate-200"
        }`}>
          <div className={`mb-2 flex shrink-0 items-center justify-between gap-2 border-b pb-2 ${
            isDark ? "border-white/10" : "border-slate-200"
          }`}>
            <h2 className="text-xs font-bold font-voda uppercase tracking-wider text-slate-900 dark:text-white">
              Questions List
            </h2>
            <span className="text-[10px] text-slate-400">
              {totalQuestions} Questions
            </span>
          </div>
          <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 custom-light-scrollbar">
            {questionsKeys.map((_, index) => {
              const isActive = index === currentIdx;

              return (
                <li key={index}>
                  <button
                    type="button"
                    onClick={() => setCurrentIdx(index)}
                    className={`flex min-h-[36px] w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold font-voda transition-colors cursor-pointer ${
                      isActive
                        ? isDark
                          ? "bg-[#18372F] border-[#0D9B77] text-white"
                          : "bg-[#ECFDF5] border-[#0D9B77] text-[#1E293B]"
                        : isDark
                        ? "bg-transparent border-white/5 text-slate-300 hover:bg-white/5"
                        : "bg-transparent border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>Question {String(index + 1).padStart(2, "0")}</span>
                    <CheckCircle2 className="w-4 h-4 text-[#0D9B77]" />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>

      {/* ── DOCKED FOOTER BAR ── */}
      <div className={`w-full px-6 py-3 border-t flex items-center justify-between gap-2.5 flex-shrink-0 select-none ${
        isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200 bg-white"
      }`}>
        <button
          type="button"
          onClick={() => {
            if (currentIdx === 0) {
              onClose();
            } else {
              setCurrentIdx(currentIdx - 1);
            }
          }}
          className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
        >
          BACK
        </button>

        <div className="flex items-center gap-2.5">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(quiz)}
              className="h-[24px] px-4 rounded-3xl bg-transparent border border-[#0D9B77] text-[#0D9B77] hover:bg-[#0D9B77]/10 font-voda font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit Quiz</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (currentIdx < totalQuestions - 1) {
                setCurrentIdx(currentIdx + 1);
              } else {
                onClose();
              }
            }}
            className="min-w-[90px] px-5 h-[24px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center"
          >
            {currentIdx === totalQuestions - 1 ? "CLOSE" : "NEXT"}
          </button>
        </div>
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

export default QuizTakerModal;
