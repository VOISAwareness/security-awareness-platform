/* eslint-disable no-unused-vars */
import { useState, useEffect, useRef } from "react";
import {
  Check,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Eye,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertCircle,
  X
} from "lucide-react";

import { useIsDarkMode } from "../../components/modals/helpers";
import { useTraining } from "../../TrainingContext";
import ExcelJS from "exceljs";
import quizTemplateUrl from "@/assets/Training(LMS)/samples/Quiz Template - Awareness App.xlsx?url";

// Helper to safely extract clean text string from various ExcelJS cell value formats
const extractCellText = (cellVal) => {
  if (cellVal == null) return "";
  if (typeof cellVal === "string") return cellVal.trim();
  if (typeof cellVal === "number" || typeof cellVal === "boolean") return String(cellVal).trim();
  if (typeof cellVal === "object") {
    if (Array.isArray(cellVal.richText)) {
      return cellVal.richText.map((rt) => rt.text || "").join("").trim();
    }
    if (cellVal.result != null) return String(cellVal.result).trim();
    if (cellVal.text != null) return String(cellVal.text).trim();
  }
  return String(cellVal).trim();
};

// Robust normalizer for correct answer column to handle all edge cases:
// e.g. "optionA", "optiona", "OPTION A", "Option A", "option-a", "A", "a", "(A)", "1",
// or when user puts the actual text of the correct option in the answer column.
const normalizeAnswer = (rawAnswer, optA = "", optB = "", optC = "", optD = "") => {
  const rawText = extractCellText(rawAnswer).trim();
  if (!rawText) return "optionA";

  const cleanRaw = rawText.toLowerCase();

  // 1. Direct text match against the option content itself
  const textA = extractCellText(optA).trim().toLowerCase();
  const textB = extractCellText(optB).trim().toLowerCase();
  const textC = extractCellText(optC).trim().toLowerCase();
  const textD = extractCellText(optD).trim().toLowerCase();

  if (textA && cleanRaw === textA) return "optionA";
  if (textB && cleanRaw === textB) return "optionB";
  if (textC && cleanRaw === textC) return "optionC";
  if (textD && cleanRaw === textD) return "optionD";

  // 2. Alphanumeric token normalization
  const alphanumeric = cleanRaw.replace(/[^a-z0-9]/g, "");

  if (/^(option|opt|choice|ans|answer)?a$/.test(alphanumeric)) return "optionA";
  if (/^(option|opt|choice|ans|answer)?b$/.test(alphanumeric)) return "optionB";
  if (/^(option|opt|choice|ans|answer)?c$/.test(alphanumeric)) return "optionC";
  if (/^(option|opt|choice|ans|answer)?d$/.test(alphanumeric)) return "optionD";

  // Numeric index representations: 1 -> A, 2 -> B, 3 -> C, 4 -> D
  if (alphanumeric === "1") return "optionA";
  if (alphanumeric === "2") return "optionB";
  if (alphanumeric === "3") return "optionC";
  if (alphanumeric === "4") return "optionD";

  // 3. Fallback regex checks for phrases like "Option A: ...", "Choice A", "Ans: A"
  if (/\b(option|opt|choice)\s*a\b/i.test(rawText) || /^(\(|\[)?\s*a\s*(\)|\]|\.|,|:|-)?$/i.test(rawText)) return "optionA";
  if (/\b(option|opt|choice)\s*b\b/i.test(rawText) || /^(\(|\[)?\s*b\s*(\)|\]|\.|,|:|-)?$/i.test(rawText)) return "optionB";
  if (/\b(option|opt|choice)\s*c\b/i.test(rawText) || /^(\(|\[)?\s*c\s*(\)|\]|\.|,|:|-)?$/i.test(rawText)) return "optionC";
  if (/\b(option|opt|choice)\s*d\b/i.test(rawText) || /^(\(|\[)?\s*d\s*(\)|\]|\.|,|:|-)?$/i.test(rawText)) return "optionD";

  if (/^(answer|ans|correct)[:\s-]*a\b/i.test(rawText)) return "optionA";
  if (/^(answer|ans|correct)[:\s-]*b\b/i.test(rawText)) return "optionB";
  if (/^(answer|ans|correct)[:\s-]*c\b/i.test(rawText)) return "optionC";
  if (/^(answer|ans|correct)[:\s-]*d\b/i.test(rawText)) return "optionD";

  return "optionA";
};

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
  const { showToast } = useTraining?.() || {};

  const fileInputRef = useRef(null);
  const step2FileInputRef = useRef(null);

  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [localToast, setLocalToast] = useState(null);

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

  // Centralized toast dispatcher using the training module toast system
  const notify = (title, message, isError = false) => {
    if (showToast) {
      showToast({
        title,
        message,
        type: isError ? "error" : "success"
      });
    } else {
      setLocalToast({ title, message, isError });
      setTimeout(() => setLocalToast(null), 4000);
    }
  };

  // Process Excel spreadsheet upload
  const processFile = async (file) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      notify("Invalid File", "Please upload a valid .xlsx Excel workbook.", true);
      return;
    }

    setIsParsing(true);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        notify("Empty Workbook", "No worksheet was found in this Excel file.", true);
        setIsParsing(false);
        return;
      }

      // Check header row and dynamically detect column mappings
      const firstRow = worksheet.getRow(1);
      let colQuestion = 1;
      let colOptionA = 2;
      let colOptionB = 3;
      let colOptionC = 4;
      let colOptionD = 5;
      let colAnswer = 6;
      let hasHeaders = false;

      firstRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        const text = extractCellText(cell.value).toLowerCase();
        if (text.includes("question")) {
          colQuestion = colNumber;
          hasHeaders = true;
        } else if (text.includes("option a") || text.includes("option 1") || text.includes("choice a") || text === "a") {
          colOptionA = colNumber;
          hasHeaders = true;
        } else if (text.includes("option b") || text.includes("option 2") || text.includes("choice b") || text === "b") {
          colOptionB = colNumber;
          hasHeaders = true;
        } else if (text.includes("option c") || text.includes("option 3") || text.includes("choice c") || text === "c") {
          colOptionC = colNumber;
          hasHeaders = true;
        } else if (text.includes("option d") || text.includes("option 4") || text.includes("choice d") || text === "d") {
          colOptionD = colNumber;
          hasHeaders = true;
        } else if (text.includes("answer") || text.includes("correct") || text.includes("key")) {
          colAnswer = colNumber;
          hasHeaders = true;
        }
      });

      const parsedQuestions = [];

      worksheet.eachRow((row, rowNumber) => {
        if (hasHeaders && rowNumber === 1) return;

        const qText = extractCellText(row.getCell(colQuestion).value);
        const optA = extractCellText(row.getCell(colOptionA).value);
        const optB = extractCellText(row.getCell(colOptionB).value);
        const optC = extractCellText(row.getCell(colOptionC).value);
        const optD = extractCellText(row.getCell(colOptionD).value);
        const rawAns = row.getCell(colAnswer).value;

        // Skip blank rows where question text is missing
        if (!qText.trim()) return;

        const normalizedAns = normalizeAnswer(rawAns, optA, optB, optC, optD);

        parsedQuestions.push({
          question: qText.trim(),
          optionA: optA.trim() || "Option A",
          optionB: optB.trim() || "Option B",
          optionC: optC.trim() || "Option C",
          optionD: optD.trim() || "Option D",
          Answer: normalizedAns,
          answer: normalizedAns
        });
      });

      if (parsedQuestions.length === 0) {
        notify("Import Error", "No valid questions found. Ensure columns include Question, Option A-D, and Answer.", true);
        setIsParsing(false);
        return;
      }

      setQuestions(parsedQuestions);
      setActiveQuestionIdx(0);
      setPreviewIdx(0);
      setIsEditingQuestion(true);
      setUploadedFileInfo({
        name: file.name,
        count: parsedQuestions.length
      });

      // Auto-populate quiz title if empty
      if (!name.trim()) {
        const generatedTitle = file.name
          .replace(/\.xlsx$/i, "")
          .replace(/[-_]+/g, " ")
          .trim();
        if (generatedTitle) setName(generatedTitle);
      }

      notify(
        "Questions Added",
        `${parsedQuestions.length} ${parsedQuestions.length === 1 ? "question" : "questions"} added successfully from ${file.name}.`
      );
    } catch (err) {
      console.error("Failed to parse Excel file:", err);
      notify("Import Failed", "Unable to read Excel file. Please ensure it is a valid .xlsx spreadsheet.", true);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (step2FileInputRef.current) step2FileInputRef.current.value = "";
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDownloadTemplate = () => {
    try {
      const link = document.createElement("a");
      link.href = quizTemplateUrl;
      link.download = "Quiz Template - Awareness App.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify("Template Downloaded", "Downloaded 'Quiz Template - Awareness App.xlsx' successfully.");
    } catch (err) {
      console.error("Error downloading template:", err);
      notify("Download Error", "Could not download template file.", true);
    }
  };

  const [activeQuestionIdx, setActiveQuestionIdx] = useState(startQIdx);
  const [isEditingQuestion, setIsEditingQuestion] = useState(startIsEditing);
  const [editingFromPreview, setEditingFromPreview] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(startQIdx);

  // Sync state if editingQuiz changes dynamically
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
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

              {/* ── EXCEL BULK QUESTIONS IMPORT CONTAINER ── */}
              <div
                className={`rounded-xl border p-4 sm:p-5 flex flex-col gap-3.5 transition-all duration-200 ${
                  isDark
                    ? "bg-[#0B1121]/70 border-white/10"
                    : "bg-white border-slate-200/90 shadow-2xs"
                }`}
              >
                {/* Header: Title on left, 'Download Excel Template' button on right */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isDark ? "bg-[#0D9B77]/15 text-[#8ED973]" : "bg-[#ECFDF5] text-[#0D9B77]"
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                      Import Questions
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className={`h-7 px-3.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                      isDark
                        ? "bg-white/5 border-white/15 text-white hover:bg-white/10 hover:border-white/30"
                        : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50 hover:border-slate-400"
                    }`}
                    title="Download Excel Template (Quiz Template - Awareness App.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0D9B77]" />
                    <span>Download Excel Template</span>
                  </button>
                </div>

                {/* Hidden native input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {/* 2-Column: Upload on Left, Instructions on Right */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
                  {/* Left: Dropzone Upload Area */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) processFile(droppedFile);
                    }}
                    className={`h-full min-h-[140px] border-2 border-dashed rounded-xl p-4 sm:p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                      isDragging
                        ? "border-[#0D9B77] bg-[#0D9B77]/10 scale-[1.005]"
                        : uploadedFileInfo
                        ? isDark
                          ? "border-[#0D9B77]/50 bg-[#18372F]/20 hover:bg-[#18372F]/30"
                          : "border-[#0D9B77]/40 bg-[#ECFDF5]/50 hover:bg-[#ECFDF5]/80"
                        : isDark
                        ? "border-white/15 bg-white/[0.015] hover:bg-white/[0.035] hover:border-white/30"
                        : "border-slate-300 bg-slate-50/60 hover:bg-slate-100/60 hover:border-slate-400"
                    }`}
                  >
                    {isParsing ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <div className="w-6 h-6 border-2 border-[#0D9B77] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Parsing spreadsheet questions...
                        </span>
                      </div>
                    ) : uploadedFileInfo ? (
                      <div className="w-full flex items-center justify-between gap-3 px-1 flex-wrap sm:flex-nowrap">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[#0D9B77]/20 text-[#0D9B77] dark:text-[#8ED973] flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                          </div>
                          <div className="flex flex-col text-left min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {uploadedFileInfo.name}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#0D9B77] text-white">
                                {uploadedFileInfo.count} {uploadedFileInfo.count === 1 ? "Question" : "Questions"}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Questions and answers loaded into quiz. Click or drag to replace.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            className="h-6 px-3 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 text-[10px] font-bold uppercase tracking-wider transition-colors"
                          >
                            Replace
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 py-1">
                        <UploadCloud className="w-7 h-7 text-slate-400 mb-0.5" />
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          <span className="text-[#0D9B77] font-semibold underline underline-offset-2">Click to browse</span> or drag & drop your Excel sheet
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Instructions Block */}
                  <div
                    className={`h-full p-4 rounded-xl border text-left flex flex-col justify-center gap-2 ${
                      isDark ? "bg-[#15161A] border-white/10" : "bg-[#F8FAFC] border-slate-200"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Instructions:
                    </span>
                    <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 font-medium leading-relaxed">
                      <li className="flex items-start gap-1.5">
                        <span className="font-bold text-[#0D9B77] flex-shrink-0">1)</span>
                        <span>Download the excel template using 'Download Excel Template' button.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="font-bold text-[#0D9B77] flex-shrink-0">2)</span>
                        <span>Add quiz question and answer in the format provided in the excel without any error.</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <span className="font-bold text-[#0D9B77] flex-shrink-0">3)</span>
                        <span>Upload that excel in the below section.</span>
                      </li>
                    </ol>
                  </div>
                </div>
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

                  {/* Action buttons: Import Excel + Dynamic [Done / Preview] + Prominent [Add Question] button */}
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={step2FileInputRef}
                      accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => step2FileInputRef.current?.click()}
                      className={`h-7 px-2.5 rounded-lg border text-[10px] font-voda font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors ${
                        isDark
                          ? "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
                          : "border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      title="Upload Excel to replace or load questions"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Import Excel</span>
                    </button>

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

  const toastElement = localToast && (
    <div
      role="status"
      className={`fixed top-5 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-slate-900 border ${
        localToast.isError ? "border-red-500/30" : "border-emerald-500/30"
      } shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm`}
    >
      <div
        className={`w-8 h-8 rounded-full ${
          localToast.isError ? "bg-red-100 text-[#E60000]" : "bg-emerald-100 text-[#16A34A]"
        } flex items-center justify-center flex-shrink-0`}
      >
        {localToast.isError ? (
          <AlertCircle className="w-4 h-4 stroke-[2.5]" />
        ) : (
          <Check className="w-4 h-4 stroke-[2.5]" />
        )}
      </div>
      <div className="flex flex-col text-left leading-tight flex-1">
        <span
          className={`text-[10px] font-voda font-bold ${
            localToast.isError ? "text-[#E60000]" : "text-[#16A34A]"
          } uppercase tracking-wider`}
        >
          {localToast.title}
        </span>
        <span className="text-[9.5px] font-medium text-slate-700 mt-0.5">
          {localToast.message}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setLocalToast(null)}
        className="p-1 rounded text-slate-400 hover:text-black cursor-pointer flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  if (isInline) {
    return (
      <>
        {creatorContent}
        {toastElement}
      </>
    );
  }

  return (
    <div className={`fixed inset-0 z-50 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto transition-all duration-300 ${
      isDark ? "bg-slate-950/45" : "bg-slate-500/15"
    }`}>
      {creatorContent}
      {toastElement}
    </div>
  );
};

export default CreateNewQuiz;
