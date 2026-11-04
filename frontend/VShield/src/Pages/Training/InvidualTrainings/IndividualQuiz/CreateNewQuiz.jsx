import { useState } from "react";
import {
  X,
  Check,
  Plus,
  Trash2
} from "lucide-react";

import { useIsDarkMode, } from "../../components/modals/helpers";

export const CreateNewQuiz = ({
  onSave,
  onClose,
  editingQuiz,
  onDelete,
  isInline = false
}) => {
  const isDark = useIsDarkMode();
  const [name, setName] = useState(editingQuiz ? editingQuiz.TrainingQuizName : "");
  const [description, setDescription] = useState(editingQuiz ? editingQuiz.Description : "");
  const [threshold, setThreshold] = useState(editingQuiz ? editingQuiz.TrainingCompletionThreshold : 80);
  const [questions, setQuestions] = useState(() => {
    if (editingQuiz && editingQuiz.QuizData) {
      // Map dictionary back to list sorted by question key Q01, Q02, etc.
      const sortedKeys = Object.keys(editingQuiz.QuizData).sort();
      return sortedKeys.map((key) => editingQuiz.QuizData[key]);
    }
    return [
      {
        question: "Which of the following describes a key phishing indicator?",
        optionA: "Expected invoice statement from a known contact",
        optionB: "Urgent call-to-action requesting credentials with mismatched domain",
        optionC: "A generic newsletter subscription confirmation",
        optionD: "An encryption notice on a company repository",
        Answer: "optionB"
      }
    ];
  });

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Live Student Preview State
  const [previewIdx, setPreviewIdx] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState({});
  const [previewFinished, setPreviewFinished] = useState(false);

  const togglePreviewMode = () => {
    setIsPreviewMode(!isPreviewMode);
    setPreviewIdx(0);
    setPreviewAnswers({});
    setPreviewFinished(false);
  };

  // Questions addition helper
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "New Question",
        optionA: "Option A text",
        optionB: "Option B text",
        optionC: "Option C text",
        optionD: "Option D text",
        Answer: "optionA"
      }
    ]);
    setActiveQuestionIdx(questions.length);
  };

  const updateQuestionText = (index, text) => {
    const updated = [...questions];
    updated[index].question = text;
    setQuestions(updated);
  };

  const updateQuestionOption = (index, opt, text) => {
    const updated = [...questions];
    updated[index][opt] = text;
    setQuestions(updated);
  };

  const updateQuestionAnswer = (index, ans) => {
    const updated = [...questions];
    updated[index].Answer = ans;
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, idx) => idx !== index));
    if (activeQuestionIdx >= questions.length - 1) {
      setActiveQuestionIdx(Math.max(0, questions.length - 2));
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    // Map questions list into standard object structure QuizData
    const quizDataObj = {};
    questions.forEach((q, idx) => {
      const qKey = `Question${String(idx + 1).padStart(2, "0")}`;
      quizDataObj[qKey] = q;
    });

    onSave({
      TrainingQuizID: editingQuiz ? editingQuiz.TrainingQuizID : `TQ-${Math.floor(10000 + Math.random() * 90000)}`,
      TrainingQuizName: name,
      "Thumbnail(CoverImage)": "",
      CreatedOn: editingQuiz ? editingQuiz.CreatedOn : "05-Oct-2026",
      Description: description || "Quiz assessment module.",
      TrainingCompletionThreshold: threshold,
      QuizData: quizDataObj
    });
    onClose();
  };

  const creatorContent = (
    <div className={`w-full flex flex-col text-left ${
      isInline 
        ? "h-full min-h-0 border-none bg-transparent shadow-none" 
        : `max-w-4xl border rounded-2xl overflow-hidden shadow-2xl h-[90vh] ${
            isDark ? "bg-[#0B1121] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
          }`
    }`}>
      {/* ── DOCKED TOP HEADER BAR ── */}
      <div className={`w-full h-12 flex items-stretch justify-between flex-shrink-0 select-none border-b ${
        isDark ? 'border-white/10 bg-[#12141A]' : 'border-slate-200/90 bg-white'
      }`}>
        <div className="px-6 h-full flex items-center gap-2.5 flex-shrink-0">
          <span className="font-voda font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            {editingQuiz ? "Edit Quiz" : "Add New Quiz"}
          </span>
        </div>

        <div className="flex items-center h-full">
          {questions.length > 0 && (
            <div className="px-3 flex items-center">
              <button
                type="button"
                onClick={togglePreviewMode}
                className={`h-7 px-3.5 rounded-full text-[9px] font-bold font-voda uppercase tracking-wider transition-all cursor-pointer shadow-2xs ${
                  isPreviewMode
                    ? "bg-[#7C3AED] text-white shadow-xs"
                    : isDark ? "bg-white/10 text-slate-200 hover:bg-white/15" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {isPreviewMode ? "Back to Editing" : "Preview Quiz"}
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

      <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 custom-light-scrollbar">
        {isPreviewMode ? (
          <div className={`col-span-2 flex flex-col gap-4 max-w-2xl mx-auto w-full border rounded-2xl p-6 relative ${
            isDark ? "border-white/10 bg-[#15161A] text-white" : "border-slate-200 bg-white text-slate-800 shadow-sm"
          }`}>
            <div className={`flex justify-between items-center border-b pb-3 mb-2 ${isDark ? "border-white/10" : "border-slate-200"}`}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-[#7C3AED]/20 text-[#a78bfa] border border-[#7C3AED]/30 px-2.5 py-0.5 rounded-full uppercase">
                  Question {previewIdx + 1} of {questions.length}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Passing: {threshold}%
                </span>
              </div>
              <button
                type="button"
                onClick={togglePreviewMode}
                className={`h-7 px-3 rounded-full text-[9.5px] font-bold font-voda cursor-pointer uppercase tracking-wider border transition-colors ${
                  isDark ? "border-white/10 bg-white/5 hover:bg-white/10 text-white" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                Edit Questions
              </button>
            </div>

            {!previewFinished ? (
              <div className="flex flex-col gap-6 text-left">
                {/* Progress bar */}
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/5" : "bg-slate-200"}`}>
                  <div
                    className="bg-gradient-to-r from-[#E60000] to-[#7C3AED] h-full transition-all duration-300"
                    style={{ width: `${((previewIdx + 1) / questions.length) * 100}%` }}
                  />
                </div>

                <h3 className={`text-base font-bold leading-snug ${isDark ? "text-white" : "text-slate-900"}`}>
                  {questions[previewIdx]?.question}
                </h3>

                {/* Options */}
                <div className="flex flex-col gap-2.5">
                  {(["optionA", "optionB", "optionC", "optionD"]).map((optKey) => {
                    const text = questions[previewIdx]?.[optKey];
                    if (!text) return null;
                    const isSelected = previewAnswers[previewIdx] === optKey;

                    return (
                      <button
                        key={optKey}
                        type="button"
                        onClick={() => setPreviewAnswers({ ...previewAnswers, [previewIdx]: optKey })}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 flex items-center justify-between text-xs font-semibold cursor-pointer ${
                          isSelected
                            ? "bg-[#7C3AED]/15 border-[#7C3AED] text-slate-900 dark:text-white"
                            : isDark 
                            ? "bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-300 hover:text-white"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        <span className="flex-1 pr-2">{text}</span>
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected ? "bg-[#7C3AED] border-transparent" : "border-slate-400"
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Preview Navigation */}
                <div className={`flex items-center justify-between mt-4 pt-4 border-t ${isDark ? "border-white/10" : "border-slate-200"}`}>
                  <button
                    type="button"
                    onClick={() => setPreviewIdx(Math.max(0, previewIdx - 1))}
                    disabled={previewIdx === 0}
                    className="w-[90px] h-[28px] sm:h-[30px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (previewIdx < questions.length - 1) {
                        setPreviewIdx(previewIdx + 1);
                      } else {
                        setPreviewFinished(true);
                      }
                    }}
                    className="px-6 h-[28px] sm:h-[30px] rounded-3xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center"
                  >
                    {previewIdx === questions.length - 1 ? "Finish" : "Next"}
                  </button>
                </div>
              </div>
            ) : (
              /* Preview Results Page */
              <div className="p-6 text-center flex flex-col items-center gap-5">
                <div className="w-16 h-10 flex items-center justify-center text-4xl mb-2">
                  {(() => {
                    let correct = 0;
                    questions.forEach((q, index) => {
                      if (previewAnswers[index] === q.Answer) correct++;
                    });
                    const score = Math.round((correct / questions.length) * 100);
                    return score >= threshold ? "🏆" : "⚡";
                  })()}
                </div>
                {(() => {
                  let correct = 0;
                  questions.forEach((q, index) => {
                    if (previewAnswers[index] === q.Answer) correct++;
                  });
                  const score = Math.round((correct / questions.length) * 100);
                  const passed = score >= threshold;
                  return (
                    <div className="flex flex-col gap-2">
                      <h4 className={`text-lg font-bold font-voda uppercase tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                        {passed ? "Assessment Passed!" : "Threshold Not Reached"}
                      </h4>
                      <p className={`text-xs max-w-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                        You scored <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{score}%</span> ({correct} of {questions.length} correct). Passing criteria is set at <span className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{threshold}%</span>.
                      </p>
                    </div>
                  );
                })()}
                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewIdx(0);
                      setPreviewAnswers({});
                      setPreviewFinished(false);
                    }}
                    className="w-[90px] h-[28px] sm:h-[30px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={togglePreviewMode}
                    className="px-6 h-[28px] sm:h-[30px] rounded-3xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center"
                  >
                    Exit Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Controls Panel */}
            <div className={`p-5 rounded-2xl border flex flex-col gap-5 ${
              isDark ? "bg-[#15161A] border-white/10" : "bg-[#F8FAFC] border-slate-200"
            }`}>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Quiz Title <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all shadow-2xs ${
                    isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
                  }`}
                  placeholder="e.g., Domain Analysis & Phishing Clues"
                />
              </div>

              <div className="flex flex-col mt-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className={`w-full p-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] resize-none transition-all shadow-2xs ${
                    isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
                  }`}
                  placeholder="Assess user mastery on threat signals..."
                />
              </div>

              <div className="flex flex-col mt-1.5">
                <div className="flex justify-between items-center mb-2 text-left">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Passing Score Threshold: {threshold}%
                  </label>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#7C3AED]"
                />
              </div>

              {/* Questions List */}
              <div className={`border-t pt-4 flex flex-col gap-3.5 ${isDark ? "border-white/10" : "border-slate-200"}`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Quiz Questions ({questions.length})
                  </span>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="h-7 px-3 rounded-full bg-[#7C3AED]/15 hover:bg-[#7C3AED]/25 border border-[#7C3AED]/30 text-[9.5px] font-bold text-[#7C3AED] flex items-center gap-1 cursor-pointer transition-colors font-voda uppercase"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[28vh] overflow-y-auto pr-1.5 custom-light-scrollbar">
                  {questions.map((q, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveQuestionIdx(idx)}
                      className={`p-3 border rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        activeQuestionIdx === idx
                          ? "bg-[#7C3AED]/10 border-[#7C3AED]/40 shadow-2xs"
                          : isDark ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04]" : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xs text-[#7C3AED] font-bold">Q{idx + 1}</span>
                      <span className={`text-xs font-semibold truncate flex-1 ${isDark ? "text-white" : "text-slate-800"}`}>{q.question}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeQuestion(idx);
                        }}
                        disabled={questions.length <= 1}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-20 cursor-pointer p-1 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Active Question Editor */}
            <div className={`p-5 rounded-2xl border flex flex-col gap-4 text-left ${
              isDark ? "bg-[#15161A] border-white/10" : "bg-[#F8FAFC] border-slate-200"
            }`}>
              <span className="text-[10px] font-bold tracking-widest text-[#7C3AED] uppercase block border-b border-black/5 dark:border-white/10 pb-2 font-voda">
                QUESTION (Q{activeQuestionIdx + 1})
              </span>

              {questions[activeQuestionIdx] && (() => {
                const q = questions[activeQuestionIdx];
                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col mt-1">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                        Question Text
                      </label>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => updateQuestionText(activeQuestionIdx, e.target.value)}
                        className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all shadow-2xs ${
                          isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
                        }`}
                      />
                    </div>

                    {/* Options */}
                    <div className="flex flex-col mt-1.5">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                        Answer Options (Select correct answer)
                      </label>
                      <div className="grid grid-cols-1 gap-2.5">
                      {(["optionA", "optionB", "optionC", "optionD"]).map((opt) => (
                        <div key={opt} className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => updateQuestionAnswer(activeQuestionIdx, opt)}
                            className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                              q.Answer === opt ? "bg-[#7C3AED] border-transparent text-white" : "border-slate-400 text-transparent"
                            }`}
                            title="Mark as correct answer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <input
                            type="text"
                            value={q[opt]}
                            onChange={(e) => updateQuestionOption(activeQuestionIdx, opt, e.target.value)}
                            className={`flex-1 h-9 px-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#7C3AED] focus:ring-1 focus:ring-[#7C3AED] transition-all shadow-2xs ${
                              isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
                            }`}
                            placeholder={`Enter ${opt}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
            </div>
          </>
        )}
      </div>

      {/* ── DOCKED FOOTER BAR ── */}
      <div className={`px-6 py-3 border-t flex items-center justify-between gap-3 flex-shrink-0 ${
        isDark ? "bg-[#12141A] border-white/10" : "bg-slate-50 border-slate-200"
      }`}>
        {editingQuiz && onDelete ? (
          <button
            type="button"
            onClick={() => {
              if (confirm("Are you sure you want to delete this assessment quiz? All pathways referencing it will keep templates but lack evaluation questions.")) {
                onDelete(editingQuiz.TrainingQuizID);
                onClose();
              }
            }}
            className="h-[28px] sm:h-[30px] px-4 rounded-3xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-all font-voda uppercase text-[10px] tracking-wider"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete Quiz
          </button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-[90px] h-[28px] sm:h-[30px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="min-w-[90px] px-5 h-[28px] sm:h-[30px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            {editingQuiz ? "Save Changes" : "Create Quiz"}
          </button>
        </div>
      </div>
    </div>
  );

  if (isInline) {
    return creatorContent;
  }

  return (
    <div className={`fixed inset-0 z-50 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto transition-all duration-300 ${
      isDark ? "bg-slate-950/45" : "bg-slate-500/15"
    }`}>
      {creatorContent}
    </div>
  );
};

export default CreateNewQuiz;
