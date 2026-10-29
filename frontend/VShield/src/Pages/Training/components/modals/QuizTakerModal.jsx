 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useState, } from "react";
import { GlassmorphicBackdrop } from "../shared/GlassmorphicBackdrop";
import {
  X,
  HelpCircle,
  Award,
  Check,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

import { useIsDarkMode } from "./helpers";

export const QuizTakerModal = ({
  quiz,
  onClose
}) => {
  const isDark = useIsDarkMode();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isCompleted, setIsCompleted] = useState(false);

  const questionsKeys = Object.keys(quiz.QuizData || {}).sort();
  const totalQuestions = questionsKeys.length;
  const currentKey = questionsKeys[currentIdx];
  const questionItem = quiz.QuizData[currentKey];

  const handleSelectOption = (option) => {
    setAnswers({
      ...answers,
      [currentKey]: option
    });
  };

  const nextQuestion = () => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const prevQuestion = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  // Compute stats
  let correctCount = 0;
  questionsKeys.forEach((key) => {
    if (answers[key] === quiz.QuizData[key].Answer) {
      correctCount++;
    }
  });
  const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = scorePct >= quiz.TrainingCompletionThreshold;

  return (
    <GlassmorphicBackdrop isDark={isDark} onClose={onClose}>
      <div className="w-full max-w-2xl bg-[#0B1121] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
              {quiz.TrainingQuizName}
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

        {!isCompleted ? (
          <>
            {/* Progress */}
            <div className="w-full bg-white/5 h-1">
              <div
                className="bg-gradient-to-r from-[#E60000] to-[#7C3AED] h-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
              />
            </div>

            {/* Question Body */}
            <div className="p-6 flex-1 flex flex-col gap-6 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold bg-[#7C3AED]/20 text-[#a78bfa] border border-[#7C3AED]/30 px-2.5 py-0.5 rounded-full">
                  QUESTION {currentIdx + 1} OF {totalQuestions}
                </span>
                <span className="text-[10px] font-bold text-slate-400">
                  Passing Score: {quiz.TrainingCompletionThreshold}%
                </span>
              </div>

              <h3 className="text-base font-bold text-white leading-snug">
                {_optionalChain([questionItem, 'optionalAccess', _ => _.question])}
              </h3>

              {/* Options */}
              <div className="flex flex-col gap-2.5">
                {(["optionA", "optionB", "optionC", "optionD"] ).map((optKey) => {
                  const text = _optionalChain([questionItem, 'optionalAccess', _2 => _2[optKey]]);
                  if (!text) return null;
                  const isSelected = answers[currentKey] === optKey;

                  return (
                    <button
                      key={optKey}
                      type="button"
                      onClick={() => handleSelectOption(optKey)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 flex items-center justify-between text-xs font-semibold cursor-pointer ${
                        isSelected
                          ? "bg-[#7C3AED]/15 border-[#7C3AED] text-slate-900 dark:text-white"
                          : isDark 
                          ? "bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-300 hover:text-white"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900"
                      }`}
                    >
                      <span className="flex-1 pr-2">{text}</span>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? "bg-[#7C3AED] border-transparent" : "border-slate-500"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 bg-black/40 border-t border-white/10 flex items-center justify-between">
              <button
                type="button"
                onClick={prevQuestion}
                disabled={currentIdx === 0}
                className="h-9 px-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] disabled:opacity-25 disabled:cursor-not-allowed text-xs font-bold text-slate-300 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>

              <button
                type="button"
                onClick={nextQuestion}
                disabled={!answers[currentKey]}
                className="h-9 px-4 rounded-lg bg-[#E60000] hover:bg-[#c40000] transition-colors disabled:opacity-40 disabled:hover:bg-[#E60000] disabled:cursor-not-allowed text-xs font-bold text-white flex items-center gap-1 cursor-pointer shadow-md"
              >
                {currentIdx === totalQuestions - 1 ? "Finish Assessment" : "Next"}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          /* Results Screen */
          <div className="p-8 flex flex-col items-center justify-center text-center gap-6">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg ${
                passed
                  ? "bg-[#16A34A]/20 border-2 border-[#16A34A] text-[#22c55e]"
                  : "bg-[#E60000]/20 border-2 border-[#E60000] text-[#ff4d4d]"
              }`}
            >
              {passed ? <Award className="w-8 h-8" /> : <X className="w-8 h-8" />}
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-bold font-voda text-white uppercase">
                {passed ? "Assessment Passed" : "Assessment Failed"}
              </h2>
              <p className="text-xs text-slate-400">
                Course: {quiz.TrainingQuizName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm bg-white/[0.02] border border-white/5 p-4 rounded-xl text-left mt-2">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Your Score
                </span>
                <span
                  className={`text-2xl font-black ${
                    passed ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {scorePct}%
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">
                  Requirement
                </span>
                <span className="text-2xl font-black text-slate-300">
                  {quiz.TrainingCompletionThreshold}%
                </span>
              </div>
              <div className="col-span-2 border-t border-white/5 pt-2 flex justify-between text-xs text-slate-400 font-semibold">
                <span>Total Questions: {totalQuestions}</span>
                <span>Correct: {correctCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              {!passed && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentIdx(0);
                    setAnswers({});
                    setIsCompleted(false);
                  }}
                  className="h-10 px-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white cursor-pointer"
                >
                  Retry Assessment
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-5 rounded-xl bg-white text-[#0B1121] hover:bg-slate-200 text-xs font-bold cursor-pointer shadow-sm"
              >
                Close Portal
              </button>
            </div>
          </div>
        )}
      </div>
    </GlassmorphicBackdrop>
  );
};