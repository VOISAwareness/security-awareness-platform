import { useState, useEffect } from "react";
import {
  X,
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Eye
} from "lucide-react";

import { useIsDarkMode } from "../../components/modals/helpers";

export const CreateNewQuiz = ({
  onSave,
  onClose,
  editingQuiz,
  onDelete,
  isInline = false,
  initialQuestionIdx = 0,
  initialIsEditing = true,
  initialStep = 1
}) => {
  const isDark = useIsDarkMode();

  const startQIdx = editingQuiz?._startQuestionIdx ?? initialQuestionIdx ?? 0;
  const startIsEditing = editingQuiz?._startIsEditing ?? initialIsEditing ?? true;
  const startStep = editingQuiz?._startIsEditing ? 2 : (initialStep || 1);

  const [step, setStep] = useState(startStep);
  const [name, setName] = useState(editingQuiz ? editingQuiz.TrainingQuizName : "");
  const [description, setDescription] = useState(editingQuiz ? editingQuiz.Description : "");
  const [threshold, setThreshold] = useState(editingQuiz ? editingQuiz.TrainingCompletionThreshold : 80);

  const [questions, setQuestions] = useState(() => {
    if (editingQuiz && editingQuiz.QuizData) {
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

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(startQIdx);
  const [isEditingQuestion, setIsEditingQuestion] = useState(startIsEditing);
  const [editingFromPreview, setEditingFromPreview] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(startQIdx);

  // Sync state if editingQuiz changes dynamically
  useEffect(() => {
    if (editingQuiz) {
      setName(editingQuiz.TrainingQuizName || "");
      setDescription(editingQuiz.Description || "");
      setThreshold(editingQuiz.TrainingCompletionThreshold ?? 80);
      if (editingQuiz.QuizData) {
        const sortedKeys = Object.keys(editingQuiz.QuizData).sort();
        setQuestions(sortedKeys.map((key) => ({ ...editingQuiz.QuizData[key] })));
      }
      if (editingQuiz._startQuestionIdx !== undefined) {
        setActiveQuestionIdx(editingQuiz._startQuestionIdx);
        setPreviewIdx(editingQuiz._startQuestionIdx);
      }
      if (editingQuiz._startIsEditing !== undefined) {
        setIsEditingQuestion(editingQuiz._startIsEditing);
        if (editingQuiz._startIsEditing) {
          setStep(2);
        }
      }
    }
  }, [editingQuiz]);

  // Questions addition helper
  const addQuestion = () => {
    const newQ = {
      question: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      Answer: "optionA"
    };
    const nextIdx = questions.length;
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionIdx(nextIdx);
    setIsEditingQuestion(true);
  };

  const updateQuestionText = (index, text) => {
    setQuestions((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], question: text };
      }
      return updated;
    });
  };

  const updateQuestionOption = (index, opt, text) => {
    setQuestions((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [opt]: text };
      }
      return updated;
    });
  };

  const updateQuestionAnswer = (index, ans) => {
    setQuestions((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], Answer: ans };
      }
      return updated;
    });
  };

  const removeQuestion = (index) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, idx) => idx !== index));
    if (activeQuestionIdx >= questions.length - 1) {
      setActiveQuestionIdx(Math.max(0, questions.length - 2));
    } else if (activeQuestionIdx === index) {
      setActiveQuestionIdx(Math.max(0, index - 1));
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
      quizDataObj[qKey] = {
        question: q.question,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        Answer: q.Answer
      };
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

  const totalQuestions = questions.length;
  const currentQ = questions[activeQuestionIdx] || questions[0];
  const previewQ = questions[previewIdx] || questions[0];

  const creatorContent = (
    <div className={`w-full overflow-hidden flex flex-col select-none font-sans text-left ${
      isInline
        ? `flex-1 h-full min-h-0 justify-between ${isDark ? "bg-[#0B1121] text-white" : "bg-white text-slate-800"}`
        : `bg-[#0B1121] border border-white/10 rounded-2xl shadow-2xl max-w-4xl h-[85vh]`
    }`}>
      {/* ── DOCKED CONTINUOUS STEPPER STRIP ── */}
      <div
        className={`w-full h-12 flex items-stretch flex-shrink-0 select-none border-b ${
          isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200/90 bg-white"
        }`}
      >
        <div className="flex-1 flex items-stretch">
          {[
            { id: 1, step: 1, titleLine1: "Quiz", titleLine2: "Details" },
            { id: 2, step: 2, titleLine1: "Quiz", titleLine2: "Questions" },
            { id: 3, step: 3, titleLine1: "Quiz", titleLine2: "Preview" }
          ].map((s) => {
            const isCompleted = s.step < step;
            const isCurrent = s.step === step;
            const isFilled = s.step <= step;
            const isAllowed = s.step === 1 || (s.step === 2 && name.trim()) || (s.step === 3 && name.trim() && questions.length > 0);

            return (
              <button
                type="button"
                key={s.id}
                onClick={() => {
                  if (s.step === 1) {
                    setEditingFromPreview(false);
                    setStep(1);
                  } else if (s.step === 2 && name.trim()) {
                    setStep(2);
                  } else if (s.step === 3 && name.trim() && questions.length > 0) {
                    setEditingFromPreview(false);
                    setPreviewIdx(activeQuestionIdx);
                    setStep(3);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2.5 px-4 h-full transition-colors duration-200 select-none ${
                  isAllowed ? "cursor-pointer" : "cursor-default"
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

          {/* Step 1 Footer (Right Aligned Bottom Buttons) */}
          <div className={`w-full px-6 py-3 border-t flex items-center justify-between gap-3 flex-shrink-0 select-none ${
            isDark ? "bg-[#12141A] border-white/10" : "bg-white border-slate-200"
          }`}>
            <div className="flex-1 text-left">
              {editingQuiz && onDelete && (
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
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
              >
                BACK
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

      {/* ── STEP 2: QUESTIONS (EDITING MODE BY DEFAULT) ── */}
      {step === 2 && (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(0,7.5fr)_minmax(240px,2.5fr)]">
            {/* Center Section: Question & Options */}
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
                      Question {String(activeQuestionIdx + 1).padStart(2, "0")} of {totalQuestions}
                    </span>
                  </div>

                  {/* Action buttons: Dynamic [Done / Preview] + Prominent [Add Question] button */}
                  <div className="flex items-center gap-2">
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(activeQuestionIdx)}
                        className="h-7 px-2.5 rounded-lg border text-[10px] font-voda font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors border-red-500/30 text-red-500 hover:bg-red-500/10"
                        title="Delete this question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    )}

                    {/* Dynamic Button: If user came from Step 3, displays "Done" and returns directly to Step 3. Otherwise displays "Preview" */}
                    {editingFromPreview ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFromPreview(false);
                          setPreviewIdx(activeQuestionIdx);
                          setStep(3);
                        }}
                        className="h-7 px-3 rounded-lg bg-[#0D9B77] hover:bg-[#0b8465] text-white text-[10px] font-voda font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                        title="Done editing, return to preview"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Done</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewIdx(activeQuestionIdx);
                          setStep(3);
                        }}
                        className="h-7 px-3 rounded-lg border text-[10px] font-voda font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors border-[#0D9B77] text-[#0D9B77] hover:bg-[#0D9B77]/10"
                        title="Preview quiz assessment"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Preview</span>
                      </button>
                    )}

                    {/* Prominent Goto "Add Question" button */}
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="h-7 px-3.5 rounded-lg bg-[#0D9B77] hover:bg-[#0b8465] text-white text-[10px] font-voda font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                      title="Add a new question"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Add Question</span>
                    </button>
                  </div>
                </div>

                {/* Question title (Editing inputs by default) */}
                <div className="mb-3 flex items-start gap-2">
                  <span
                    className="text-xs sm:text-sm font-bold font-voda leading-snug pt-2 flex-shrink-0"
                    style={{ color: "#E60000" }}
                  >
                    Question {String(activeQuestionIdx + 1).padStart(2, "0")}:
                  </span>
                  <textarea
                    rows={2}
                    value={currentQ?.question || ""}
                    onChange={(e) => updateQuestionText(activeQuestionIdx, e.target.value)}
                    className={`flex-1 p-2 rounded-lg border text-xs sm:text-sm font-bold font-voda leading-snug resize-none focus:outline-none focus:border-[#0D9B77] focus:ring-1 focus:ring-[#0D9B77] transition-all ${
                      isDark
                        ? "bg-[#20232B] border-[#0D9B77]/80 text-white placeholder-slate-500"
                        : "bg-white border-[#0D9B77] text-slate-900 placeholder-slate-400"
                    }`}
                    placeholder={
                      activeQuestionIdx === 0
                        ? "e.g., Which of the following describes a key phishing indicator?"
                        : "Enter question..."
                    }
                  />
                </div>

                {/* Options List (In-place Inputs by default) */}
                <div className="mt-1 flex min-h-0 flex-col gap-2">
                  {(["optionA", "optionB", "optionC", "optionD"]).map((optKey, index) => {
                    const text = currentQ?.[optKey] ?? "";
                    const isCorrect = currentQ?.Answer === optKey;

                    return (
                      <div
                        key={optKey}
                        className={`flex w-full min-w-0 items-center gap-2.5 rounded-lg border px-3 py-1.5 text-left transition-colors ${
                          isCorrect
                            ? isDark
                              ? "bg-[#18372F]/80 border-[#0D9B77] text-white shadow-xs"
                              : "bg-[#ECFDF5] border-[#0D9B77] text-[#1E293B] shadow-xs"
                            : isDark
                            ? "bg-[#20232B] border-[#383C47] text-slate-200"
                            : "bg-white border-[#E2E8F0] text-slate-800"
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

                        <input
                          type="text"
                          value={text}
                          onChange={(e) => updateQuestionOption(activeQuestionIdx, optKey, e.target.value)}
                          className={`flex-1 h-8 px-2.5 rounded-md border text-xs sm:text-sm font-voda focus:outline-none focus:border-[#0D9B77] focus:ring-1 focus:ring-[#0D9B77] transition-all ${
                            isDark
                              ? "bg-[#15161A] border-white/10 text-white placeholder-slate-500"
                              : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                          }`}
                          placeholder={
                            activeQuestionIdx === 0
                              ? (
                                  optKey === "optionA" ? "e.g., Expected invoice statement from a known contact" :
                                  optKey === "optionB" ? "e.g., Urgent call-to-action requesting credentials with mismatched domain" :
                                  optKey === "optionC" ? "e.g., A generic newsletter subscription confirmation" :
                                  "e.g., An encryption notice on a company repository"
                                )
                              : `Enter option ${String.fromCharCode(65 + index)}...`
                          }
                        />

                        <button
                          type="button"
                          onClick={() => updateQuestionAnswer(activeQuestionIdx, optKey)}
                          className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-[10px] font-bold font-voda uppercase tracking-wider transition-all cursor-pointer flex-shrink-0 ${
                            isCorrect
                              ? "bg-[#0D9B77] text-white shadow-xs"
                              : isDark
                              ? "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10"
                              : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 border border-slate-200"
                          }`}
                          title={isCorrect ? "Correct answer" : "Click to mark as correct answer"}
                        >
                          <Check className={`w-3.5 h-3.5 ${isCorrect ? "stroke-[3]" : "opacity-40"}`} />
                          <span>{isCorrect ? "Correct Answer" : "Mark Correct"}</span>
                        </button>
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
                  Passing requirement: {threshold}%
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeQuestionIdx > 0) {
                        setActiveQuestionIdx(activeQuestionIdx - 1);
                      }
                    }}
                    disabled={activeQuestionIdx === 0}
                    className="px-3 h-[24px] rounded-3xl border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 font-voda font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    PREVIOUS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeQuestionIdx < totalQuestions - 1) {
                        setActiveQuestionIdx(activeQuestionIdx + 1);
                      }
                    }}
                    disabled={activeQuestionIdx === totalQuestions - 1}
                    className="px-3 h-[24px] rounded-3xl bg-[#0D9B77] hover:bg-[#0b8465] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    NEXT
                  </button>
                </div>
              </footer>
            </section>

            {/* Right Section: Questions List */}
            <aside className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border p-3 ${
              isDark ? "bg-[#15161A] border-white/10" : "bg-white border-slate-200"
            }`}>
              <div className={`mb-2 flex shrink-0 items-center justify-between gap-2 border-b pb-2 ${
                isDark ? "border-white/10" : "border-slate-200"
              }`}>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-bold font-voda uppercase tracking-wider text-slate-900 dark:text-white">
                    Questions List
                  </h2>
                  <span className="text-[10px] text-slate-400">
                    ({totalQuestions})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="h-6 px-2.5 rounded-full bg-[#0D9B77]/15 hover:bg-[#0D9B77]/25 border border-[#0D9B77]/30 text-[9px] font-bold text-[#0D9B77] flex items-center gap-1 cursor-pointer transition-colors font-voda uppercase"
                  title="Add new question"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Add</span>
                </button>
              </div>

              <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 custom-light-scrollbar">
                {questions.map((_, index) => {
                  const isActive = index === activeQuestionIdx;

                  return (
                    <li key={index} className="flex items-center gap-1 group">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveQuestionIdx(index);
                          setIsEditingQuestion(true);
                        }}
                        className={`flex min-h-[36px] flex-1 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold font-voda transition-colors cursor-pointer ${
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
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeQuestion(index);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                          title={`Delete question ${index + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>

          {/* Step 2 Docked Footer (Right Aligned Bottom Buttons matching wizard conventions) */}
          <div className={`w-full px-6 py-3 border-t flex items-center justify-between gap-3 flex-shrink-0 select-none ${
            isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200 bg-white"
          }`}>
            <div className="flex-1 text-left" />

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEditingFromPreview(false);
                  setStep(1);
                }}
                className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
              >
                BACK
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingFromPreview(false);
                  setPreviewIdx(activeQuestionIdx);
                  setStep(3);
                }}
                disabled={questions.length === 0}
                className="min-w-[90px] px-5 h-[24px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                NEXT
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── STEP 3: PREVIEW (BASE PREVIEW QUIZ DESIGN WITH AUTO-SELECTED CORRECT ANSWERS) ── */}
      {step === 3 && (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-3 lg:grid-cols-[minmax(0,7.5fr)_minmax(240px,2.5fr)]">
            {/* Center Section: Preview Question & Answers */}
            <section className={`flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border p-4 sm:p-5 ${
              isDark ? "bg-[#15161A] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
            }`}>
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-light-scrollbar">
                {/* Top metadata strip: In Step 3, the Add button is gone and only Edit Question is available */}
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
                      Question {String(previewIdx + 1).padStart(2, "0")} of {totalQuestions}
                    </span>
                  </div>

                  {/* Edit Question: Seamlessly opens this exact question in Step 2 with "Done" button */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveQuestionIdx(previewIdx);
                      setIsEditingQuestion(true);
                      setEditingFromPreview(true);
                      setStep(2);
                    }}
                    className="h-7 px-3 rounded-lg border text-[10px] font-voda font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors border-[#0D9B77] text-[#0D9B77] hover:bg-[#0D9B77]/10"
                    title="Edit this question in Step 2"
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
                  {previewQ?.question}
                </h2>

                {/* Options List with Auto-Selected / Highlighted Correct Answer */}
                <div className="mt-1 flex min-h-0 flex-col gap-2">
                  {(["optionA", "optionB", "optionC", "optionD"]).map((optKey, index) => {
                    const text = previewQ?.[optKey];
                    if (!text) return null;
                    const isCorrect = previewQ?.Answer === optKey;

                    return (
                      <div
                        key={optKey}
                        className={`flex w-full min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors ${
                          isCorrect
                            ? isDark
                              ? "bg-[#18372F] border-[#0D9B77] text-white shadow-xs"
                              : "bg-[#ECFDF5] border-[#0D9B77] text-[#1E293B] shadow-xs"
                            : isDark
                            ? "bg-[#20232B] border-[#383C47] text-slate-200"
                            : "bg-white border-[#E2E8F0] text-slate-800"
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
                        {isCorrect && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[#0D9B77] uppercase tracking-wider font-voda mt-1.5 flex-shrink-0">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Correct Answer</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Center Column Bottom Navigation (Exact Preview Layout) */}
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
                    onClick={() => setPreviewIdx(Math.min(totalQuestions - 1, previewIdx + 1))}
                    disabled={previewIdx === totalQuestions - 1}
                    className="px-3 h-[24px] rounded-3xl bg-[#0D9B77] hover:bg-[#0b8465] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    NEXT
                  </button>
                </div>
              </footer>
            </section>

            {/* Right Section: Questions List (Exact Preview Layout) */}
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
                {questions.map((_, index) => {
                  const isActive = index === previewIdx;

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
                        <CheckCircle2 className="w-4 h-4 text-[#0D9B77]" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>
          </div>

          {/* Step 3 Docked Footer (Right Aligned Bottom Buttons matching wizard conventions) */}
          <div className={`w-full px-6 py-3 border-t flex items-center justify-between gap-3 flex-shrink-0 select-none ${
            isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200 bg-white"
          }`}>
            <div className="flex-1 text-left" />

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
              >
                BACK
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
