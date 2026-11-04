import { useState } from "react";
import {
  X,
  Check,
  CheckCircle2,
  MinusCircle,
  Plus,
  Trash2,
  Edit3
} from "lucide-react";

import { useIsDarkMode } from "../../components/modals/helpers";

export const CreateNewQuiz = ({
  onSave,
  onClose,
  editingQuiz,
  onDelete,
  isInline = false
}) => {
  const isDark = useIsDarkMode();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(editingQuiz ? editingQuiz.TrainingQuizName : "");
  const [description, setDescription] = useState(editingQuiz ? editingQuiz.Description : "");
  const [threshold, setThreshold] = useState(editingQuiz ? editingQuiz.TrainingCompletionThreshold : 80);
  const [questions, setQuestions] = useState(() => {
    if (editingQuiz && editingQuiz.QuizData) {
      // Map dictionary back to list sorted by question key Q01, Q02, etc.
      const sortedKeys = Object.keys(editingQuiz.QuizData).sort();
      return sortedKeys.map((key) => ({ ...editingQuiz.QuizData[key] }));
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
    if (previewIdx >= questions.length - 1) {
      setPreviewIdx(Math.max(0, questions.length - 2));
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
    <div className={`w-full flex flex-col text-left select-none font-sans ${
      isInline 
        ? "h-full min-h-0 border-none bg-transparent shadow-none" 
        : `max-w-4xl border rounded-2xl overflow-hidden shadow-2xl h-[90vh] ${
            isDark ? "bg-[#0B1121] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
          }`
    }`}>
      {/* ── DOCKED CONTINUOUS STEPPER STRIP ── */}
      <div
        className={`w-full h-12 flex items-stretch flex-shrink-0 select-none border-b ${
          isDark ? 'border-white/10 bg-[#12141A]' : 'border-slate-200/90 bg-white'
        }`}
      >
        <div className="flex-1 flex items-stretch">
          {[
            { id: 1, step: 1, titleLine1: "Quiz", titleLine2: "Details" },
            { id: 2, step: 2, titleLine1: "Quiz", titleLine2: "Questions" }
          ].map((s) => {
            const isCompleted = s.step < step;
            const isCurrent = s.step === step;
            const isFilled = s.step <= step;

            return (
              <button
                type="button"
                key={s.id}
                onClick={() => {
                  if (s.step === 1) {
                    setIsPreviewMode(false);
                    setStep(1);
                  } else if (s.step === 2 && name.trim()) {
                    setStep(2);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2.5 px-4 h-full transition-colors duration-200 select-none ${
                  s.step <= step || (s.step === 2 && name.trim()) ? "cursor-pointer" : "cursor-default"
                } ${
                  isFilled ? "bg-black dark:bg-white text-white dark:text-black" : "bg-transparent"
                }`}
              >
                {/* Step Icon */}
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-[#8ED973] dark:bg-[#74D054] text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-6 h-6 rounded-full bg-white dark:bg-black text-black dark:text-white font-bold flex items-center justify-center text-[11px] flex-shrink-0 shadow-2xs">
                    {s.step}
                  </div>
                ) : (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                      isDark ? "bg-white text-black" : "bg-black text-white"
                    }`}
                  >
                    {s.step}
                  </div>
                )}

                {/* Step Label */}
                <div
                  className={`flex flex-col text-left leading-tight text-[11.5px] font-bold ${
                    isCompleted
                      ? "text-[#8ED973] dark:text-[#74D054]"
                      : isCurrent
                      ? "text-white dark:text-black"
                      : isDark
                      ? "text-white opacity-85"
                      : "text-slate-900 opacity-85"
                  }`}
                >
                  <span>{s.titleLine1}</span>
                  {s.titleLine2 && <span>{s.titleLine2}</span>}
                </div>
              </button>
            );
          })}
        </div>

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

      {/* ── STEP 1: QUIZ DETAILS ── */}
      {step === 1 && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 custom-light-scrollbar">
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
                  className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#0D9B77] focus:ring-1 focus:ring-[#0D9B77] transition-all shadow-2xs ${
                    isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
                  }`}
                  placeholder="e.g., Domain Analysis & Phishing Clues"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className={`w-full p-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#0D9B77] focus:ring-1 focus:ring-[#0D9B77] resize-none transition-all shadow-2xs ${
                    isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
                  }`}
                  placeholder="Assess employee mastery on threat signals and reporting procedures..."
                />
              </div>

              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2 text-left">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Passing Score Threshold: <span className="text-[#0D9B77] font-extrabold">{threshold}%</span>
                  </label>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  step="5"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#0D9B77]"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 1 Footer */}
          <div className={`w-full px-6 py-3 border-t flex items-center justify-between gap-3 flex-shrink-0 select-none ${
            isDark ? "bg-[#12141A] border-white/10" : "bg-white border-slate-200"
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
                className="h-[24px] px-4 rounded-3xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-xs transition-all font-voda uppercase text-[10px] tracking-wider"
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
                className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
              >
                CLOSE
              </button>
              <button
                type="button"
                onClick={() => {
                  if (name.trim()) setStep(2);
                }}
                disabled={!name.trim()}
                className="min-w-[90px] px-5 h-[24px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                NEXT
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── STEP 2: QUESTIONS (EDITING MODE) ── */}
      {step === 2 && !isPreviewMode && (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 custom-light-scrollbar">
            {/* Questions List Panel */}
            <div className={`p-5 rounded-2xl border flex flex-col gap-3.5 ${
              isDark ? "bg-[#15161A] border-white/10" : "bg-[#F8FAFC] border-slate-200"
            }`}>
              <div className="flex justify-between items-center border-b pb-3 border-black/5 dark:border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 font-voda">
                  Quiz Questions ({questions.length})
                </span>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="h-7 px-3 rounded-full bg-[#0D9B77]/15 hover:bg-[#0D9B77]/25 border border-[#0D9B77]/30 text-[9.5px] font-bold text-[#0D9B77] flex items-center gap-1 cursor-pointer transition-colors font-voda uppercase"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Question
                </button>
              </div>

              <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-1.5 custom-light-scrollbar">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveQuestionIdx(idx)}
                    className={`p-3 border rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      activeQuestionIdx === idx
                        ? isDark
                          ? "bg-[#18372F] border-[#0D9B77] text-white shadow-2xs"
                          : "bg-[#ECFDF5] border-[#0D9B77] text-[#1E293B] shadow-2xs"
                        : isDark
                        ? "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] text-slate-300"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <span className="text-xs font-bold text-[#0D9B77]">Q{idx + 1}</span>
                    <span className="text-xs font-semibold truncate flex-1">{q.question}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQuestion(idx);
                      }}
                      disabled={questions.length <= 1}
                      className="text-slate-400 hover:text-red-500 disabled:opacity-20 cursor-pointer p-1 rounded-md transition-colors"
                      title="Delete question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Question Editor */}
            <div className={`p-5 rounded-2xl border flex flex-col gap-4 text-left ${
              isDark ? "bg-[#15161A] border-white/10" : "bg-[#F8FAFC] border-slate-200"
            }`}>
              <span className="text-[10px] font-bold tracking-widest text-[#0D9B77] uppercase block border-b border-black/5 dark:border-white/10 pb-2 font-voda">
                QUESTION (Q{activeQuestionIdx + 1})
              </span>

              {questions[activeQuestionIdx] && (() => {
                const q = questions[activeQuestionIdx];
                return (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                        Question Text
                      </label>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => updateQuestionText(activeQuestionIdx, e.target.value)}
                        className={`w-full h-10 px-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#0D9B77] focus:ring-1 focus:ring-[#0D9B77] transition-all shadow-2xs ${
                          isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
                        }`}
                      />
                    </div>

                    {/* Options */}
                    <div className="flex flex-col">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                        Answer Options <span className="text-[10px] font-normal text-slate-400">(Select the radio button for the correct answer)</span>
                      </label>
                      <div className="grid grid-cols-1 gap-2.5">
                        {(["optionA", "optionB", "optionC", "optionD"]).map((opt, optIndex) => (
                          <div key={opt} className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => updateQuestionAnswer(activeQuestionIdx, opt)}
                              className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors ${
                                q.Answer === opt ? "bg-[#0D9B77] border-transparent text-white" : "border-slate-400 text-transparent"
                              }`}
                              title="Mark as correct answer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold font-voda text-slate-400 w-3">
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <input
                              type="text"
                              value={q[opt]}
                              onChange={(e) => updateQuestionOption(activeQuestionIdx, opt, e.target.value)}
                              className={`flex-1 h-9 px-3.5 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#0D9B77] focus:ring-1 focus:ring-[#0D9B77] transition-all shadow-2xs ${
                                isDark ? "border-white/10 bg-[#0B1121] text-white placeholder-slate-500" : "border-slate-200 bg-white text-slate-900 placeholder-slate-400"
                              }`}
                              placeholder={`Enter option ${String.fromCharCode(65 + optIndex)}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Step 2 Editing Footer */}
          <div className={`w-full px-6 py-3 border-t flex items-center justify-between gap-3 flex-shrink-0 select-none ${
            isDark ? "bg-[#12141A] border-white/10" : "bg-white border-slate-200"
          }`}>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
            >
              BACK
            </button>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPreviewIdx(activeQuestionIdx);
                  setIsPreviewMode(true);
                }}
                className="px-4 h-[24px] rounded-3xl bg-transparent border border-[#0D9B77] text-[#0D9B77] hover:bg-[#0D9B77]/10 font-voda font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center"
              >
                PREVIEW QUIZ
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!name.trim() || questions.length === 0}
                className="min-w-[90px] px-5 h-[24px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {editingQuiz ? "SAVE CHANGES" : "CREATE QUIZ"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── STEP 2: QUESTIONS (PREVIEW MODE - MATCHING MY TRAINING) ── */}
      {step === 2 && isPreviewMode && (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(0,7.5fr)_minmax(240px,2.5fr)]">
            {/* Center Section: Question & Options */}
            <section className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border p-4 sm:p-5 ${
              isDark ? "bg-[#15161A] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-light-scrollbar">
                {/* Top badges strip */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-black/5 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-bold font-voda"
                      style={{
                        backgroundColor: isDark ? "#18372F" : "#DCFCE7",
                        color: isDark ? "#86EFAC" : "#166534",
                      }}
                    >
                      Total Questions: {questions.length}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Question {String(previewIdx + 1).padStart(2, "0")} of {questions.length}
                    </span>
                  </div>

                  {/* Edit Question button -> takes directly to this active question in edit mode */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveQuestionIdx(previewIdx);
                      setIsPreviewMode(false);
                    }}
                    className="h-7 px-3 rounded-lg border text-[10px] font-voda font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors border-[#0D9B77] text-[#0D9B77] hover:bg-[#0D9B77]/10"
                    title="Edit this question"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Question</span>
                  </button>
                </div>

                {/* Question title */}
                <h2 className="mb-3 text-xs sm:text-sm font-bold font-voda leading-snug">
                  <span style={{ color: "#E60000" }}>
                    Question {String(previewIdx + 1).padStart(2, "0")}:
                  </span>{" "}
                  {questions[previewIdx]?.question}
                </h2>

                {/* Options List */}
                <div className="mt-1 flex min-h-0 flex-col gap-2">
                  {(["optionA", "optionB", "optionC", "optionD"]).map((optKey, index) => {
                    const optionText = questions[previewIdx]?.[optKey];
                    if (!optionText) return null;
                    const isSelected = previewAnswers[previewIdx] === optKey;
                    const isCorrectAnswer = questions[previewIdx]?.Answer === optKey;

                    return (
                      <button
                        type="button"
                        key={optKey}
                        onClick={() => setPreviewAnswers({ ...previewAnswers, [previewIdx]: optKey })}
                        className={`flex w-full min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? isDark
                              ? "bg-[#18372F] border-[#0D9B77] text-white shadow-xs"
                              : "bg-[#ECFDF5] border-[#0D9B77] text-[#1E293B] shadow-xs"
                            : isDark
                            ? "bg-[#20232B] border-[#383C47] text-slate-200 hover:border-slate-500"
                            : "bg-white border-[#E2E8F0] text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold font-voda ${
                            isSelected || isCorrectAnswer
                              ? "bg-[#0D9B77] text-white"
                              : isDark
                              ? "bg-[#20232B] text-slate-400"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="min-w-0 flex-1 break-words text-xs font-voda leading-tight sm:text-sm py-1">
                          {optionText}
                        </span>
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 mt-1.5 ${
                            isSelected ? "border-[#0D9B77]" : isDark ? "border-slate-600" : "border-slate-300"
                          }`}
                        >
                          {isSelected && <span className="h-2 w-2 rounded-full bg-[#0D9B77]" />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Center Footer Navigation */}
              <footer className={`flex shrink-0 items-center justify-between border-t pt-3 mt-3 ${
                isDark ? "border-white/10" : "border-slate-200"
              }`}>
                <span className="text-[11px] text-slate-400 font-medium">
                  Passing requirement: {threshold}%
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewIdx(Math.max(0, previewIdx - 1))}
                    disabled={previewIdx === 0}
                    className="px-3 h-[24px] rounded-3xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-voda font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    PREVIOUS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewIdx(Math.min(questions.length - 1, previewIdx + 1))}
                    disabled={previewIdx === questions.length - 1}
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
                  {questions.length} Questions
                </span>
              </div>
              <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 custom-light-scrollbar">
                {questions.map((_, index) => {
                  const isActive = index === previewIdx;
                  const isAnswered = previewAnswers[index] !== undefined;

                  return (
                    <li key={index}>
                      <button
                        type="button"
                        onClick={() => setPreviewIdx(index)}
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
                        {isAnswered ? (
                          <CheckCircle2 className="w-4 h-4 text-[#0D9B77]" />
                        ) : (
                          <MinusCircle className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>

          {/* Step 2 Preview Footer */}
          <div className={`w-full px-6 py-3 border-t flex items-center justify-between gap-3 flex-shrink-0 select-none ${
            isDark ? "bg-[#12141A] border-white/10" : "bg-white border-slate-200"
          }`}>
            <button
              type="button"
              onClick={() => setIsPreviewMode(false)}
              className="px-4 h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
            >
              BACK TO EDITING
            </button>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-[90px] h-[24px] rounded-3xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 text-slate-800 dark:text-white font-voda font-bold text-[10px] uppercase transition-all cursor-pointer flex items-center justify-center"
              >
                CLOSE
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="min-w-[90px] px-5 h-[24px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center"
              >
                {editingQuiz ? "SAVE CHANGES" : "CREATE QUIZ"}
              </button>
            </div>
          </div>
        </>
      )}
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
