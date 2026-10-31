import { useEffect, useMemo, useState } from "react";

import { useParams } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Flag,
  MinusCircle,
  Send,
  XCircle,
  Info,
} from "lucide-react";

import { useUserType } from "../../../../UserTypeContext/UserTypeContext";

import trainingAllocationData from "../../TrainingAllocationData.json";

import trainingQuizData from "../../TrainingQuiz.json";

import trainingPathData from "../../TrainingPath.json";

/* -------------------------------------------------------------------------- */

/* Configuration                                                              */

/* -------------------------------------------------------------------------- */

const MAX_QUESTIONS = 10;

const DEFAULT_PASSING_SCORE = 80;

const USE_QUIZ_THRESHOLD = true;

const REMOVE_DUPLICATE_QUESTIONS = false;

const GREEN = "#0D9B77";

const RED = "#E11D48";

const AMBER = "#E6A700";

const THEMES = {
  light: {
    shellBg: "#F1F5F7",

    cardBg: "#FFFFFF",

    primaryText: "#1E293B",

    secondaryText: "#64748B",

    borderColor: "#E2E8F0",

    track: "#CBD5E1",

    optionBg: "#FFFFFF",

    selectedBg: "#ECFDF5",

    selectedBorder: "#0D9B77",

    mutedBg: "#F8FAFC",

    modalOverlay: "rgba(15,23,42,0.55)",
  },

  dark: {
    shellBg: "#1C1E24",

    cardBg: "#252830",

    primaryText: "#F8FAFC",

    secondaryText: "#AAB4C3",

    borderColor: "#383C47",

    track: "#41444F",

    optionBg: "#20232B",

    selectedBg: "#18372F",

    selectedBorder: "#0D9B77",

    mutedBg: "#20232B",

    modalOverlay: "rgba(0,0,0,0.7)",
  },
};

/* -------------------------------------------------------------------------- */

/* Data helpers                                                               */

/* -------------------------------------------------------------------------- */

const toArray = (data, nestedKey) => {
  if (Array.isArray(data)) return data;

  if (nestedKey && Array.isArray(data?.[nestedKey])) {
    return data[nestedKey];
  }

  return [];
};

const sameId = (a, b) =>
  String(a ?? "")
    .trim()
    .toLowerCase() ===
  String(b ?? "")
    .trim()
    .toLowerCase();

const cleanText = (value) => String(value ?? "").trim();

const OPTION_KEY_PATTERN = /^option[a-z]$/i;

const normalizeQuestion = (questionKey, raw) => {
  if (!raw || typeof raw !== "object") return null;

  const question = cleanText(raw.question);

  if (!question) return null;

  const optionKeys = Object.keys(raw)

    .filter((key) => OPTION_KEY_PATTERN.test(key))

    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))

    .filter((key) => cleanText(raw[key]) !== "");

  if (optionKeys.length < 2) return null;

  const answerKey = cleanText(raw.Answer).toLowerCase();

  const correctAnswer = optionKeys.findIndex(
    (key) => key.toLowerCase() === answerKey,
  );

  if (correctAnswer === -1) return null;

  return {
    id: questionKey,

    question,

    options: optionKeys.map((key) => cleanText(raw[key])),

    optionKeys,

    correctAnswer,
  };
};

const getPassingScore = (quiz) => {
  if (!USE_QUIZ_THRESHOLD) return DEFAULT_PASSING_SCORE;

  const threshold = Number(quiz?.TrainingCompletionThreshold);

  return Number.isFinite(threshold) && threshold > 0 && threshold <= 100
    ? threshold
    : DEFAULT_PASSING_SCORE;
};

const buildQuestions = (quiz) => {
  const quizData = quiz?.QuizData;

  if (!quizData || typeof quizData !== "object" || Array.isArray(quizData)) {
    return [];
  }

  const seen = new Set();

  const questions = [];

  Object.keys(quizData)

    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

    .forEach((key) => {
      const normalized = normalizeQuestion(key, quizData[key]);

      if (!normalized) {
        console.warn(
          `[TrainingQuiz] ${quiz.TrainingQuizID}: skipped ${key} because the question, options, or answer is invalid.`,
        );

        return;
      }

      if (REMOVE_DUPLICATE_QUESTIONS) {
        const fingerprint = [normalized.question, ...normalized.options]

          .join("|")

          .toLowerCase();

        if (seen.has(fingerprint)) return;

        seen.add(fingerprint);
      }

      questions.push(normalized);
    });

  return questions.slice(0, MAX_QUESTIONS);
};

const loadQuizForPath = (trainingPathID) => {
  if (!cleanText(trainingPathID)) {
    return {
      error: {
        title: "No training selected",

        message: "A training ID is required to load the quiz.",
      },
    };
  }

  const allocation = toArray(
    trainingAllocationData,

    "trainings",
  ).find((item) => sameId(item.TrainingPathID, trainingPathID));

  if (!allocation) {
    return {
      error: {
        title: "Training not found",

        message: `No training allocation was found for ID: ${trainingPathID}.`,
      },
    };
  }

  const quizId = cleanText(allocation.TrainingQuizID);

  if (!quizId) {
    return {
      error: {
        title: "No quiz assigned",

        message: `Training ${allocation.TrainingPathID} does not have a quiz assigned yet.`,
      },
    };
  }

  const quiz = toArray(trainingQuizData).find((item) =>
    sameId(item.TrainingQuizID, quizId),
  );

  if (!quiz) {
    return {
      error: {
        title: "Quiz not found",

        message: `The assigned quiz (${quizId}) could not be found in the quiz data.`,
      },
    };
  }

  const questions = buildQuestions(quiz);

  if (!questions.length) {
    return {
      error: {
        title: "No questions available",

        message: `Quiz ${quizId} does not contain any valid questions.`,
      },
    };
  }

  return {
    trainingPathId: allocation.TrainingPathID,

    quizId: quiz.TrainingQuizID,

    quizName: cleanText(quiz.TrainingQuizName),

    passingScore: getPassingScore(quiz),

    questions,
  };
};

const getTrainingPathDetails = (trainingPathID) => {
  const trainingPath = toArray(
    trainingPathData,

    "trainingPaths",
  ).find((item) => sameId(item.TrainingPathID, trainingPathID));

  return {
    trainingName: cleanText(trainingPath?.TrainingPathName),

    trainingDescription: cleanText(trainingPath?.Description),
  };
};

/* -------------------------------------------------------------------------- */

/* Score ring                                                                 */

/* -------------------------------------------------------------------------- */

const Ring = ({
  value,
  color,
  label,
  marker = false,
  passingScore = 80,
  track,
  caption,
  compact = false,
  isDark = false,
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));

    return () => cancelAnimationFrame(id);
  }, []);

  const radius = 42;

  const circumference = 2 * Math.PI * radius;

  const offset = circumference * (1 - (ready ? value : 0) / 100);

  return (
    <div
      className={
        compact
          ? "relative h-[100px] w-[100px] shrink-0"
          : "relative h-[100px] w-[100px] shrink-0"
      }
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth="9"
        />

        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000"
        />

        {marker && (
          <line
            x1="50"
            y1="1"
            x2="50"
            y2="14"
            stroke={isDark ? "#FFFFFF" : "#8ED973"}
            strokeWidth="5"
            strokeLinecap="round"
            transform={`rotate(${passingScore * 3.6} 50 50)`}
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-voda leading-none">
          {Math.round(value)}%
        </span>
        {caption && (
          <span className="mt-1 text-[9px] font-semibold leading-tight text-center">
            {caption}
          </span>
        )}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */

/* Reusable buttons                                                           */

/* -------------------------------------------------------------------------- */

const Button = ({
  children,

  onClick,

  disabled = false,

  primary = false,

  className = "",

  type = "button",
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={[
      "inline-flex w-[150px] h-[28px] items-center justify-center gap-2 rounded-3xl px-3 py-1 text-xs font-bold font-voda transition-colors",

      "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",

      "disabled:cursor-not-allowed disabled:opacity-40",

      primary
        ? "bg-[#E60000] text-white hover:bg-[#C90000]"
        : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-[#41444F] dark:bg-[#252830] dark:text-slate-100 dark:hover:bg-[#30343D]",

      className,
    ].join(" ")}
  >
    {children}
  </button>
);

/* -------------------------------------------------------------------------- */

/* Quiz session                                                               */

/* -------------------------------------------------------------------------- */

function QuizSession({
  trainingName,

  trainingId,

  trainingQuizId,

  questions,

  passingScore,

  isDark,

  onComplete,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState({});

  const [submitted, setSubmitted] = useState({});

  const [skipped, setSkipped] = useState([]);

  const [finished, setFinished] = useState(false);

  const [showConfirmation, setShowConfirmation] = useState(false);

  const t = isDark ? THEMES.dark : THEMES.light;

  const currentQuestion = questions[currentIndex];

  const currentAnswer = answers[currentQuestion?.id];

  const currentSubmitted = Boolean(submitted[currentQuestion?.id]);

  const answeredCount = questions.filter(
    (question) => submitted[question.id],
  ).length;

  const skippedCount = skipped.filter((id) => !submitted[id]).length;

  const unansweredCount = questions.length - answeredCount - skippedCount;

  const correctCount = questions.filter(
    (question) =>
      submitted[question.id] && answers[question.id] === question.correctAnswer,
  ).length;

  const score = questions.length
    ? Math.round((correctCount / questions.length) * 100)
    : 0;

  const passed = score >= passingScore;

  const isLast = currentIndex === questions.length - 1;

  const scoreColor = passed ? GREEN : AMBER;

  const selectAnswer = (optionIndex) => {
    if (currentSubmitted) return;

    setAnswers((previous) => ({
      ...previous,

      [currentQuestion.id]: optionIndex,
    }));
  };

  const goNext = () => {
    setCurrentIndex((previous) => Math.min(previous + 1, questions.length - 1));
  };

  const submitAnswer = () => {
    if (currentAnswer === undefined || currentSubmitted) return;

    const nextSubmitted = { ...submitted, [currentQuestion.id]: true };

    const nextSkipped = skipped.filter((id) => id !== currentQuestion.id);

    setSubmitted(nextSubmitted);

    setSkipped(nextSkipped);

    // Every question is answered -> finish and open the Completion tab.

    if (questions.every((question) => nextSubmitted[question.id])) {
      finishQuiz(nextSubmitted, nextSkipped);

      return;
    }

    if (!isLast) goNext();
  };

  const finishQuiz = (submittedMap = submitted, skippedList = skipped) => {
    setShowConfirmation(false);

    const finalCorrectCount = questions.filter(
      (question) =>
        submittedMap[question.id] &&
        answers[question.id] === question.correctAnswer,
    ).length;

    const finalAnsweredCount = questions.filter(
      (question) => submittedMap[question.id],
    ).length;

    const finalSkippedCount = skippedList.filter(
      (id) => !submittedMap[id],
    ).length;

    const finalScore = questions.length
      ? Math.round((finalCorrectCount / questions.length) * 100)
      : 0;

    const result = {
      trainingId,
      trainingQuizId,
      trainingName,
      totalQuestions: questions.length,
      answered: finalAnsweredCount,
      skipped: finalSkippedCount,
      unanswered: questions.length - finalAnsweredCount - finalSkippedCount,
      correctAnswers: finalCorrectCount,
      incorrectAnswers: finalAnsweredCount - finalCorrectCount,
      score: finalScore,
      passingScore,
      status: finalScore >= passingScore ? "passed" : "failed",
      answers: questions.map((question) => {
        const selected = answers[question.id];
        const isSubmitted = Boolean(submittedMap[question.id]);

        return {
          questionId: question.id,
          selectedAnswer: selected ?? null,
          selectedOption:
            selected !== undefined ? question.optionKeys[selected] : null,
          correctOption: question.optionKeys[question.correctAnswer],
          isSubmitted,
          isCorrect: isSubmitted && selected === question.correctAnswer,
        };
      }),
    };

    setFinished(true);
    onComplete?.(result);
  };

  const getListState = (question) => {
    if (submitted[question.id]) {
      return answers[question.id] === question.correctAnswer
        ? "correct"
        : "incorrect";
    }

    if (skipped.includes(question.id)) return "skipped";

    return "pending";
  };

  /* ------------------------------------------------------------------------ */

  /* Quiz screen                                                               */

  /* ------------------------------------------------------------------------ */

  return (
    <div
      className="h-[calc(90dvh-120px)] min-h-[420px] w-full overflow-hidden"
      style={{ color: t.primaryText }}
    >
      <div
        className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl"
        style={{ backgroundColor: t.shellBg }}
      >
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden p-2 sm:p-3 lg:grid-cols-[minmax(0,8fr)_minmax(230px,2fr)]">
          {/* Left: question and answers (70%) */}
          <section
            aria-live="polite"
            className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border"
            style={{ backgroundColor: t.cardBg, borderColor: t.borderColor }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2 sm:p-3">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span
                  className="inline-flex items-center rounded-lg px-3 py-2 text-xs font-bold font-voda"
                  style={{
                    backgroundColor: isDark ? "#18372F" : "#DCFCE7",
                    color: isDark ? "#86EFAC" : "#166534",
                  }}
                >
                  Total Questions: {questions.length}
                </span>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: t.secondaryText }}
                >
                  Question {String(currentIndex + 1).padStart(2, "0")} of{" "}
                  {questions.length}
                </span>
              </div>

              <h2 className="mb-2 text-xs font-bold font-voda leading-snug sm:text-sm">
                <span style={{ color: "#E60000" }}>
                  Question {String(currentIndex + 1).padStart(2, "0")}:
                </span>{" "}
                {currentQuestion.question}
              </h2>

              <div
                className="mt-1 flex min-h-0 flex-col gap-1.5"
                role="radiogroup"
                aria-label={currentQuestion.question}
              >
                {currentQuestion.options.map((option, index) => {
                  const isSelected = currentAnswer === index;
                  return (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      key={currentQuestion.optionKeys[index]}
                      disabled={currentSubmitted}
                      onClick={() => selectAnswer(index)}
                      className="flex w-full min-w-0 items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors disabled:cursor-not-allowed"
                      style={{
                        backgroundColor: isSelected ? t.selectedBg : t.optionBg,
                        borderColor: isSelected
                          ? t.selectedBorder
                          : t.borderColor,
                        color: t.primaryText,
                      }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold font-voda"
                        style={{
                          backgroundColor: isSelected
                            ? t.selectedBorder
                            : t.mutedBg,
                          color: isSelected ? "#FFFFFF" : t.secondaryText,
                        }}
                      >
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="min-w-0 flex-1 break-words whitespace-normal text-xs font-voda leading-tight sm:text-sm">
                        {option}
                      </span>
                      <span
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                        style={{
                          borderColor: isSelected ? t.selectedBorder : t.track,
                        }}
                      >
                        {isSelected && (
                          <span className="h-2 w-2 rounded-full bg-[#0D9B77]" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              {currentSubmitted && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-[#18372F] dark:text-emerald-200">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>
                    Your answer is submitted. You can revisit this question.
                  </span>
                </div>
              )}
            </div>

            <footer
              className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t p-3 sm:px-4"
              style={{ borderColor: t.borderColor }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="group relative inline-flex"
                  title="Answer all questions and score a minimum of 80% final score to successfully complete the training."
                  aria-label="Quiz navigation help"
                  tabIndex={0}
                >
                  <span
                    className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border text-xs font-bold font-voda"
                    style={{
                      borderColor: t.borderColor,
                      color: t.secondaryText,
                    }}
                  >
                    <Info style={{ backgroundColor: "#fff" }} />
                  </span>
                  <span className="pl-2 flex items-center justify-center text-[11px] font-voda">
                    {" "}
                    Answer all questions and score a minimum of 80% final score
                    to successfully complete the training.
                  </span>
                </span>
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                {!currentSubmitted ? (
                  <Button
                    primary
                    onClick={submitAnswer}
                    disabled={currentAnswer === undefined}
                  >
                    Submit answer <Send size={14} />
                  </Button>
                ) : !isLast ? (
                  <Button primary onClick={goNext}>
                    Next question <ArrowRight size={14} />
                  </Button>
                ) : (
                  <Button primary onClick={() => setShowConfirmation(true)}>
                    Finish assessment <Check size={15} />
                  </Button>
                )}
              </div>
            </footer>
          </section>

          {/* Right: score and scoring progress (30%) */}
          <aside
            aria-label="Score and question progress"
            className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden"
          >
            <section
              className="flex shrink-0 flex-col items-center rounded-xl border p-3"
              style={{ backgroundColor: t.cardBg, borderColor: t.borderColor }}
            >
              <Ring
                value={score}
                color={scoreColor}
                track={t.track}
                marker
                passingScore={passingScore}
                caption="Current score"
                compact
                label={`Current score ${score} percent. Pass mark ${passingScore} percent.`}
              />
            </section>

            <section
              className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border p-3"
              style={{ backgroundColor: t.cardBg, borderColor: t.borderColor }}
            >
              <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                <h2 className="text-sm font-bold font-voda">Questions List</h2>
                <span
                  className="text-[10px]"
                  style={{ color: t.secondaryText }}
                >
                  {answeredCount}/{questions.length}
                </span>
              </div>
              <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
                {questions.map((question, index) => {
                  const state = getListState(question);
                  const isActive = index === currentIndex;
                  const StateIcon =
                    state === "correct"
                      ? CheckCircle2
                      : state === "incorrect"
                        ? XCircle
                        : MinusCircle;
                  const stateColor =
                    state === "correct"
                      ? GREEN
                      : state === "incorrect"
                        ? RED
                        : state === "skipped"
                          ? AMBER
                          : t.secondaryText;
                  return (
                    <li key={question.id}>
                      <button
                        type="button"
                        onClick={() => setCurrentIndex(index)}
                        aria-current={isActive ? "step" : undefined}
                        aria-label={`Question ${index + 1}, ${state}`}
                        className="flex min-h-[36px] w-full items-center justify-between gap-2 rounded-lg border px-2 py-2 text-left text-xs font-bold font-voda transition-colors"
                        style={{
                          backgroundColor: isActive ? t.selectedBg : t.cardBg,
                          borderColor: isActive
                            ? t.selectedBorder
                            : t.borderColor,
                          color: isActive ? t.primaryText : t.secondaryText,
                        }}
                      >
                        <span>
                          Question {String(index + 1).padStart(2, "0")}
                        </span>
                        <StateIcon
                          size={15}
                          color={stateColor}
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </aside>
        </div>
      </div>

      {/* Finish confirmation modal */}

      {showConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
          style={{ backgroundColor: t.modalOverlay }}
          role="presentation"
          onClick={() => setShowConfirmation(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tq-confirm-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl border p-5 shadow-2xl sm:p-6"
            style={{
              backgroundColor: t.cardBg,

              borderColor: t.borderColor,

              color: t.primaryText,
            }}
          >
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
              style={{
                backgroundColor: `${AMBER}20`,

                color: AMBER,
              }}
            >
              <Flag size={24} />
            </div>

            <h2 id="tq-confirm-title" className="text-lg font-bold font-voda">
              Submit assessment?
            </h2>

            <p
              className="mt-3 text-sm leading-relaxed"
              style={{ color: t.secondaryText }}
            >
              You answered {answeredCount} of {questions.length} questions.{" "}
              {skippedCount} skipped and {unansweredCount} not answered.
            </p>

            <p className="mt-2 text-xs" style={{ color: t.secondaryText }}>
              Your score is calculated from submitted answers only.
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button onClick={() => setShowConfirmation(false)}>
                Continue quiz
              </Button>

              <Button primary onClick={() => finishQuiz()}>
                Submit assessment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/* Main component                                                             */

/* -------------------------------------------------------------------------- */

export default function TrainingQuizDetails({
  trainingPathID: trainingPathIDProp,

  trainingName,

  trainingId,

  isDark: isDarkProp,

  onBack,

  onComplete,
}) {
  const params = useParams();

  const { isDark: isDarkContext = false } = useUserType() || {};

  const isDark = isDarkProp ?? isDarkContext;

  const trainingPathID =
    trainingPathIDProp ?? params?.trainingPathID ?? params?.trainingPathId;

  const quizSetup = useMemo(
    () => loadQuizForPath(trainingPathID),

    [trainingPathID],
  );

  const trainingPathDetails = useMemo(
    () => getTrainingPathDetails(trainingPathID),

    [trainingPathID],
  );

  const t = isDark ? THEMES.dark : THEMES.light;

  if (quizSetup.error) {
    return (
      <div
        className="flex min-h-[420px] w-full flex-col items-center justify-center gap-3 rounded-2xl p-6 text-center"
        style={{
          backgroundColor: t.shellBg,

          color: t.primaryText,
        }}
        role="alert"
      >
        <ClipboardList size={38} color="#E60000" />

        <h2 className="text-xl font-bold font-voda">{quizSetup.error.title}</h2>

        <p className="max-w-xl text-sm" style={{ color: t.secondaryText }}>
          {quizSetup.error.message}
        </p>

        {onBack && (
          <Button onClick={onBack}>
            <ArrowLeft size={15} />
            Back to training
          </Button>
        )}
      </div>
    );
  }

  return (
    <QuizSession
      key={`${quizSetup.trainingPathId}-${quizSetup.quizId}`}
      trainingId={trainingId || quizSetup.trainingPathId}
      trainingQuizId={quizSetup.quizId}
      trainingName={
        trainingPathDetails.trainingName ||
        trainingName ||
        quizSetup.quizName ||
        "Training assessment"
      }
      trainingDescription={trainingPathDetails.trainingDescription}
      questions={quizSetup.questions}
      passingScore={quizSetup.passingScore}
      isDark={isDark}
      onBack={onBack}
      onComplete={onComplete}
    />
  );
}
