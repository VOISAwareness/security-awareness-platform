import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle2,
  ClipboardList,
  Download,
  Flag,
  RotateCcw,
  Trophy,
  Target,
} from "lucide-react";
import { useUserType } from "../../../../UserTypeContext/UserTypeContext";
import trainingAllocationData from "../../TrainingAllocationData.json";

const LEADERBOARD_ROUTE = "/leaderboard";
const RING_DURATION = 1400;
const RING_DELAY = 250;

const PASS_GREEN = "#22C55E";
const PASS_TEAL = "#14B8A6";
const FAIL_RED = "#E11D48";
const AMBER = "#F59E0B";

const CONFETTI_COLORS = [
  "#22C55E",
  "#14B8A6",
  "#F59E0B",
  "#EF4444",
  "#60A5FA",
  "#C084FC",
];

const THEMES = {
  light: {
    shellBg: "#FFFFFF",
    cardBg: "#FFFFFF",
    primaryText: "#172033",
    secondaryText: "#64748B",
    borderColor: "#E2E8F0",
    track: "#E2E8F0",
    mutedBg: "#F8FAFC",
    successBg: "#F0FDF4",
    successBorder: "#BBF7D0",
    failBg: "#FFF1F2",
    failBorder: "#FECDD3",
    panelShadow: "0 12px 40px rgba(15, 23, 42, 0.06)",
  },
  dark: {
    shellBg: "#101827",
    cardBg: "#172235",
    primaryText: "#F8FAFC",
    secondaryText: "#B6C2D2",
    borderColor: "#334155",
    track: "#334155",
    mutedBg: "#111D2E",
    successBg: "rgba(34,197,94,0.10)",
    successBorder: "rgba(34,197,94,0.35)",
    failBg: "rgba(225,29,72,0.10)",
    failBorder: "rgba(225,29,72,0.35)",
    panelShadow: "0 12px 40px rgba(0, 0, 0, 0.20)",
  },
};

const CERTIFICATE_FIELDS = [
  "CertificateURL",
  "CertificateUrl",
  "certificateURL",
  "certificateUrl",
  "CertificateLink",
  "CertificatePath",
  "Certificate",
];

const ANIMATION_STYLE = `
  @keyframes tqc-rise {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes tqc-pop {
    0% { opacity: 0; transform: scale(.3) rotate(-15deg); }
    65% { opacity: 1; transform: scale(1.18) rotate(5deg); }
    100% { opacity: 1; transform: scale(1) rotate(0); }
  }

  @keyframes tqc-glow {
    0%, 100% { opacity: .25; transform: scale(.94); }
    50% { opacity: .65; transform: scale(1.08); }
  }

  @keyframes tqc-confetti {
    0% {
      opacity: 1;
      transform: translate(0,0) rotate(0) scale(1);
    }
    100% {
      opacity: 0;
      transform: translate(var(--tx),var(--ty)) rotate(var(--rot)) scale(.5);
    }
  }

  @keyframes tqc-shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-4px); }
    40% { transform: translateX(4px); }
    60% { transform: translateX(-2px); }
    80% { transform: translateX(2px); }
  }

  @keyframes tqc-ring-pulse {
    0%,100% { filter: drop-shadow(0 0 3px var(--ring-color)); }
    50% { filter: drop-shadow(0 0 12px var(--ring-color)); }
  }

  @keyframes tqc-float {
    0%,100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }

  @keyframes tqc-shine {
    0%,60% { transform: translateX(-160%) skewX(-20deg); }
    100% { transform: translateX(300%) skewX(-20deg); }
  }

  @keyframes tqc-card-glow {
    0%,100% { box-shadow: 0 0 0 rgba(34,197,94,0); }
    50% { box-shadow: 0 0 22px rgba(34,197,94,.13); }
  }

  @keyframes tqc-fail-glow {
    0%,100% { box-shadow: 0 0 0 rgba(225,29,72,0); }
    50% { box-shadow: 0 0 20px rgba(225,29,72,.12); }
  }

  .tqc-rise {
    animation: tqc-rise .65s cubic-bezier(.22,1,.36,1) backwards;
    animation-delay: var(--tqc-delay, 0ms);
  }

  .tqc-pop {
    display: inline-flex;
    animation: tqc-pop .65s cubic-bezier(.34,1.56,.64,1) backwards;
    animation-delay: var(--tqc-delay, 0ms);
  }

  .tqc-glow {
    animation: tqc-glow 2.8s ease-in-out infinite;
    animation-delay: 1s;
  }

  .tqc-confetti {
    animation: tqc-confetti 1.8s cubic-bezier(.12,.8,.3,1) forwards;
    animation-delay: var(--tqc-delay, 0ms);
  }

  .tqc-shake {
    display: inline-flex;
    animation: tqc-shake .55s ease-in-out backwards;
    animation-delay: var(--tqc-delay, 0ms);
  }

  .tqc-float {
    display: inline-flex;
    animation: tqc-float 3s ease-in-out infinite;
  }

  .tqc-shine {
    position: relative;
    overflow: hidden;
    isolation: isolate;
  }

  .tqc-shine::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 38%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255,255,255,.45),
      transparent
    );
    animation: tqc-shine 4s ease-in-out infinite;
    animation-delay: 1.5s;
    pointer-events: none;
  }

  .tqc-score-ring {
    animation: tqc-ring-pulse 3s ease-in-out 1.3s infinite;
  }

  .tqc-success-card {
    animation: tqc-card-glow 3s ease-in-out 1.4s infinite;
    transition: transform .25s ease, border-color .25s ease;
  }

  .tqc-success-card:hover {
    transform: translateY(-3px);
  }

  .tqc-failed-card {
    animation: tqc-fail-glow 3s ease-in-out 1.4s infinite;
  }

  .tqc-btn {
    transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
  }

  .tqc-btn:hover {
    transform: translateY(-2px);
    filter: brightness(1.06);
    box-shadow: 0 7px 20px rgba(0,0,0,.15);
  }

  .tqc-btn:active {
    transform: translateY(0) scale(.98);
  }

  @media (max-width: 640px) {
    .tqc-main-layout {
      flex-direction: column;
    }

    .tqc-score-column {
      width: 100% !important;
      border-right: none !important;
      border-bottom: 1px solid var(--tqc-divider);
      padding: 10px 0 20px !important;
    }

    .tqc-detail-column {
      width: 100% !important;
      padding: 8px 0 0 !important;
    }

    .tqc-score-ring-container {
      width: 155px !important;
      height: 155px !important;
    }

    .tqc-actions {
      flex-direction: column;
    }

    .tqc-actions button {
      width: 100% !important;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tqc-rise,
    .tqc-pop,
    .tqc-glow,
    .tqc-confetti,
    .tqc-shake,
    .tqc-float,
    .tqc-shine::after,
    .tqc-score-ring,
    .tqc-success-card,
    .tqc-failed-card {
      animation: none !important;
      transition: none !important;
    }

    .tqc-confetti {
      display: none !important;
    }
  }
`;

const delay = (ms) => ({ "--tqc-delay": `${ms}ms` });

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const update = () => setReduced(media.matches);

    update();
    media.addEventListener?.("change", update);

    return () => media.removeEventListener?.("change", update);
  }, []);

  return reduced;
};


const useCountUp = (
  target,
  { duration = 1400, delayMs = 0, disabled = false } = {}
) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    // Do not start the animation when it is disabled.
    // The returned value below will display the target directly.
    if (disabled) {
      return undefined;
    }

    let frame;
    let startTime;

    const tick = (now) => {
      if (startTime === undefined) {
        startTime = now;
      }

      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setValue(Math.round(target * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    const timer = window.setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);

      if (frame) {
        cancelAnimationFrame(frame);
      }
    };
  }, [target, duration, delayMs, disabled]);

  // Display the final value immediately when animation is disabled.
  return disabled ? target : value;
};


const toArray = (data, nestedKey) => {
  if (Array.isArray(data)) return data;
  if (nestedKey && Array.isArray(data?.[nestedKey])) {
    return data[nestedKey];
  }
  return [];
};

const sameId = (a, b) =>
  String(a ?? "").trim().toLowerCase() ===
  String(b ?? "").trim().toLowerCase();

const normalize = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");

const pickFirst = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return "";
};

const toScore = (value) => {
  if (value === "" || value == null) return null;

  const parsed = Number.parseFloat(
    String(value).replace("%", "").trim()
  );

  return Number.isFinite(parsed)
    ? Math.min(100, Math.max(0, Math.round(parsed)))
    : null;
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getPointsEarned = (allocation, passed) => {
  if (!passed || !allocation) return 0;

  const total = toNumber(
    allocation.trainingTotalPoints ?? allocation.TrainingTotalPoints
  );

  if (total > 0) return total;

  return (
    toNumber(allocation.trainingPoints ?? allocation.TrainingPoints) +
    toNumber(allocation.evaluationPoints ?? allocation.EvaluationPoints)
  );
};

const buildSummary = (
  result,
  allocation,
  defaultPassingScore = 80
) => {
  if (result && typeof result === "object") {
    const score = toScore(
      pickFirst(result, [
        "score",
        "currentScore",
        "CurrentScore",
        "percentage",
        "percent",
      ])
    );

    if (score !== null) {
      const passingScore =
        toScore(
          pickFirst(result, [
            "passingScore",
            "passMark",
            "targetScore",
          ])
        ) ?? defaultPassingScore;

      const rawStatus = normalize(
        pickFirst(result, [
          "status",
          "evaluationStatus",
          "evalutionStatus",
          "result",
        ])
      );

      const passedStatuses = [
        "passed",
        "pass",
        "successful",
        "completed",
      ];

      const failedStatuses = [
        "failed",
        "fail",
        "failure",
        "not passed",
      ];

      // Prefer an explicit evaluation status.
      // If no status is supplied, determine pass/fail from the score.
      const passed = passedStatuses.includes(rawStatus)
        ? true
        : failedStatuses.includes(rawStatus)
          ? false
          : score >= passingScore;

      const total = pickFirst(result, [
        "totalQuestions",
        "total",
        "questionCount",
      ]);

      const correct = pickFirst(result, [
        "correctAnswers",
        "correct",
        "correctCount",
      ]);

      const incorrect = pickFirst(result, [
        "incorrectAnswers",
        "incorrect",
        "incorrectCount",
      ]);

      const skippedValue = pickFirst(result, [
        "skipped",
        "skippedQuestions",
        "unanswered",
      ]);

      return {
        source: "quiz",
        passed,
        score,
        passingScore,
        total: total === "" ? null : toNumber(total),
        correct: correct === "" ? null : toNumber(correct),
        incorrect: incorrect === "" ? null : toNumber(incorrect),
        notAnswered: toNumber(skippedValue),
        title: pickFirst(result, [
          "trainingName",
          "title",
          "TrainingPathName",
        ]),
      };
    }
  }

  if (!allocation) return null;

  const status = normalize(
    pickFirst(allocation, [
      "evalutionStatus",
      "evaluationStatus",
      "EvaluationStatus",
      "result",
    ])
  );

  const score = toScore(
    pickFirst(allocation, [
      "currentScore",
      "CurrentScore",
      "score",
    ])
  );

  const passed = ["passed", "pass", "successful"].includes(status);
  const failed = [
    "failed",
    "fail",
    "failure",
    "not passed",
  ].includes(status);

  if ((!passed && !failed) || score === null) return null;

  return {
    source: "saved",
    passed,
    score,
    passingScore: defaultPassingScore,
    total: null,
    correct: null,
    incorrect: null,
    notAnswered: null,
    title: pickFirst(allocation, [
      "TrainingPathName",
      "trainingName",
      "title",
    ]),
  };
};

const downloadCertificate = async (url, baseName) => {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Certificate download failed");
    }

    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = href;
    link.download = `${baseName}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

const seeded = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const CONFETTI_PIECES = Array.from({ length: 30 }, (_, index) => {
  const angle =
    (index / 30) * Math.PI * 2 + seeded(index) * 0.5;

  const distance = 100 + seeded(index + 40) * 100;

  return {
    id: index,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    tx: Math.cos(angle) * distance,
    ty: Math.sin(angle) * distance - 30,
    rot:
      (seeded(index + 80) > 0.5 ? 1 : -1) *
      (240 + seeded(index + 20) * 360),
    delay: 650 + Math.round(seeded(index + 60) * 250),
    wide: index % 3 === 0,
  };
});

const Confetti = () => (
  <div
    className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-0 w-0"
    aria-hidden="true"
  >
    {CONFETTI_PIECES.map((piece) => (
      <span
        key={piece.id}
        className="tqc-confetti absolute block rounded-sm opacity-0"
        style={{
          width: piece.wide ? 10 : 6,
          height: piece.wide ? 5 : 10,
          backgroundColor: piece.color,
          "--tx": `${piece.tx}px`,
          "--ty": `${piece.ty}px`,
          "--rot": `${piece.rot}deg`,
          "--tqc-delay": `${piece.delay}ms`,
        }}
      />
    ))}
  </div>
);

const ScoreRing = ({
  value,
  display,
  color,
  track,
  reduced,
  passed,
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset =
    circumference * (1 - (ready ? value : 0) / 100);

  return (
    <div
      className="tqc-score-ring-container relative h-[190px] w-[190px] shrink-0"
      role="img"
      aria-label={`Final score ${value} percent. ${
        passed ? "Passed" : "Failed"
      }`}
    >
      <span
        className="tqc-glow absolute -inset-4 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}55 0%, transparent 68%)`,
          animationPlayState: reduced ? "paused" : "running",
        }}
        aria-hidden="true"
      />

      <svg
        viewBox="0 0 100 100"
        className="tqc-score-ring relative h-full w-full"
        style={{
          "--ring-color": color,
          animationPlayState: reduced ? "paused" : "running",
        }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="tqcScoreGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor={color} />
            <stop
              offset="100%"
              stopColor={passed ? PASS_TEAL : AMBER}
            />
          </linearGradient>
        </defs>

        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth="7"
        />

        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="url(#tqcScoreGradient)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{
            transition: reduced
              ? "none"
              : `stroke-dashoffset ${RING_DURATION}ms cubic-bezier(.22,1,.36,1) ${RING_DELAY}ms`,
          }}
        />

        <circle
          cx="50"
          cy="50"
          r="33"
          fill={color}
          opacity="0.045"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        

        <span className="text-[38px] font-bold leading-none tabular-nums">
          {display}%
        </span>

        <span className="mt-2 text-xs font-semibold">
          Final Score
        </span>
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, t, isDark }) => (
  <div
    className="tqc-rise flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl border px-2 py-3 text-center"
    style={{
      backgroundColor: isDark ? t.mutedBg : "#FFFFFF",
      borderColor: t.borderColor,
    }}
  >
    <span
      className="text-xl font-bold leading-tight tabular-nums"
      style={{ color }}
    >
      {value}
    </span>

    <span
      className="mt-1 text-[11px] font-medium"
      style={{ color: t.secondaryText }}
    >
      {label}
    </span>
  </div>
);

export default function TrainingCompletionDetails({
  result,
  trainingPathID: trainingPathIDProp,
  userId: userIdProp,
  isDark: isDarkProp,
  onRetake,
  leaderboardPath = LEADERBOARD_ROUTE,
  passingScore = 80,
}) {
  const params = useParams();
  const navigate = useNavigate();

  const userContext = useUserType() || {};

  const isDark = isDarkProp ?? userContext.isDark ?? false;
  const currentUserId =
    userIdProp ??
    userContext.userId ??
    userContext.userID ??
    userContext.UserID;

  const t = isDark ? THEMES.dark : THEMES.light;
  const reduced = usePrefersReducedMotion();

  const trainingPathID =
    trainingPathIDProp ??
    params?.trainingPathID ??
    params?.trainingPathId ??
    params?.id;

  const allocation = useMemo(() => {
    const records = toArray(trainingAllocationData, "trainings");

    if (!trainingPathID) return null;

    const matches = records.filter((item) =>
      sameId(item.TrainingPathID, trainingPathID)
    );

    if (currentUserId) {
      return (
        matches.find((item) =>
          sameId(item.userId ?? item.UserID, currentUserId)
        ) ?? null
      );
    }

    return matches[0] ?? null;
  }, [trainingPathID, currentUserId]);

  const summary = useMemo(
    () => buildSummary(result, allocation, passingScore),
    [result, allocation, passingScore]
  );

  const [certificateMessage, setCertificateMessage] = useState("");

  const passed = summary?.passed ?? false;
  const score = summary?.score ?? 0;
  const actualPassingScore = summary?.passingScore ?? passingScore;

  const points = getPointsEarned(allocation, passed);

  const animatedScore = useCountUp(score, {
    duration: RING_DURATION,
    delayMs: RING_DELAY,
    disabled: reduced,
  });

  const animatedPoints = useCountUp(points, {
    duration: 900,
    delayMs: 850,
    disabled: reduced,
  });

  const certificateUrl = String(
    pickFirst(allocation, CERTIFICATE_FIELDS) || ""
  ).trim();

  const handleCertificate = () => {
    if (!certificateUrl) {
      setCertificateMessage(
        "Your certificate is not available in TrainingAllocationData.json yet."
      );
      return;
    }

    setCertificateMessage("");

    downloadCertificate(
      certificateUrl,
      `${allocation?.TrainingPathID || "training"}-certificate`
    );
  };

  const panelStyle = {
    color: t.primaryText,
    backgroundColor: t.shellBg,
    borderColor: t.borderColor,
    "--tqc-divider": t.borderColor,
  };

  if (!summary) {
    return (
      <>
        <style>{ANIMATION_STYLE}</style>

        <div
          className="relative flex h-[calc(90dvh-120px)] min-h-[420px] w-full flex-1 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border p-6 text-center"
          style={panelStyle}
        >
          <span className="tqc-float" style={{ color: AMBER }}>
            <ClipboardList size={42} aria-hidden="true" />
          </span>

          <h2
            className="tqc-rise text-xl font-bold"
            style={delay(100)}
          >
            No completed result found
          </h2>

          <p
            className="tqc-rise max-w-md text-sm leading-relaxed"
            style={{ color: t.secondaryText, ...delay(200) }}
          >
            {trainingPathID
              ? `No passed or failed result was found for training ${trainingPathID}. Complete the quiz or verify the training ID and saved evaluation status.`
              : "The training ID was not provided. Pass trainingPathID to this component or ensure the route contains a trainingPathID parameter."}
          </p>

          {onRetake && (
            <button
              type="button"
              onClick={onRetake}
              className="tqc-rise tqc-btn tqc-shine inline-flex h-10 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold text-white"
              style={{
                backgroundColor: PASS_GREEN,
                ...delay(300),
              }}
            >
              <RotateCcw size={15} />
              Take the quiz
            </button>
          )}
        </div>
      </>
    );
  }

  const accent = passed ? PASS_GREEN : FAIL_RED;
  const celebrate =
    passed && summary.source === "quiz" && !reduced;

  const total = summary.total;
  const correct = summary.correct;

  const incorrect =
    summary.incorrect !== null && summary.incorrect !== undefined
      ? summary.incorrect
      : total !== null && correct !== null
        ? Math.max(0, total - correct - (summary.notAnswered ?? 0))
        : null;

  const skipped = summary.notAnswered;

  const showStats =
    total !== null &&
    correct !== null;

  return (
    <>
      <style>{ANIMATION_STYLE}</style>

      <div
        className="tqc-result-panel relative flex w-full flex-1 flex-col overflow-hidden rounded-2xl text-left sm:p-3 lg:p-2"
        style={{
          ...panelStyle,
          "--tqc-panel-bg": t.shellBg,
          "--tqc-panel-border": t.borderColor,
          "--tqc-accent-soft": passed
            ? "rgba(34,197,94,.12)"
            : "rgba(225,29,72,.10)",
          "--tqc-accent-faint": passed
            ? "rgba(20,184,166,.08)"
            : "rgba(245,158,11,.06)",
        }}
        aria-live="polite"
      >
        {/* Heading */}
        <div
          className="tqc-rise mb-3 flex items-center gap-3"
          style={delay(0)}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
            style={{
              color: "#FFFFFF",
              background: passed
                ? `linear-gradient(135deg, ${PASS_GREEN}, ${PASS_TEAL})`
                : `linear-gradient(135deg, ${FAIL_RED}, ${AMBER})`,
              boxShadow: `0 5px 18px ${accent}30`,
            }}
          >
            {passed ? (
              <Trophy size={17} aria-hidden="true" />
            ) : (
              <Flag size={17} aria-hidden="true" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            

            <h2 className=" text-xl font-bold font-voda tracking-tight sm:text-2xl">
              {passed ? "Celebration Time!" : "Assessment Result"}
            </h2>

           
          </div>

          <span
            className="hidden shrink-0 items-center gap-1.5 rounded-full border px-3  text-xs font-bold sm:inline-flex"
            style={{
              color: passed ? PASS_GREEN : FAIL_RED,
              borderColor: passed
                ? t.successBorder
                : t.failBorder,
              backgroundColor: passed ? t.successBg : t.failBg,
            }}
          >
            {passed ? (
              <CheckCircle2 size={14} />
            ) : (
              <Flag size={14} />
            )}
            {passed ? "PASSED" : "FAILED"}
          </span>
        </div>

        {/* Main design: score left, details right */}
        <div
          className="tqc-main-layout relative flex flex-col gap-2 rounded-2xl border lg:flex-row lg:items-stretch lg:gap-6 lg:p-6"
          style={{
            borderColor: t.borderColor,
            background: isDark
              ? "linear-gradient(135deg, #101827, #172235 60%, #101827)"
              : "linear-gradient(135deg, #F0FDF4, #FFFFFF 45%, #F8FAFC)",
            "--tqc-divider": t.borderColor,
          }}
        >
          {celebrate && <Confetti />}

          {/* Left score column */}
          <div
            className="tqc-score-column relative z-10 flex w-full shrink-0 flex-col items-center justify-center gap-4 border-b pb-5 text-center lg:w-[34%] lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6"
            style={{ borderColor: t.borderColor }}
          >
            <div
              className="tqc-rise relative"
              style={delay(150)}
            >
              <ScoreRing
                value={score}
                display={animatedScore}
                color={accent}
                track={t.track}
                reduced={reduced}
                passed={passed}
              />
            </div>

            <div
              className="tqc-rise max-w-[260px]"
              style={delay(450)}
            >
              <p
                className="text-sm font-bold"
                style={{
                  color: passed ? PASS_GREEN : FAIL_RED,
                }}
              >
                {passed
                  ? "Great effort! Keep up the momentum."
                  : "Every attempt is a chance to improve."}
              </p>

              
            </div>

            <div
              className="tqc-rise flex items-center gap-2 rounded-full border px-3 py-2"
              style={{
                borderColor: passed
                  ? t.successBorder
                  : t.failBorder,
                backgroundColor: passed ? t.successBg : t.failBg,
                ...delay(550),
              }}
            >
              {passed ? (
                <CheckCircle2
                  size={15}
                  color={PASS_GREEN}
                  aria-hidden="true"
                />
              ) : (
                <Flag
                  size={15}
                  color={FAIL_RED}
                  aria-hidden="true"
                />
              )}

              <span
                className="text-xs font-bold"
                style={{ color: passed ? PASS_GREEN : FAIL_RED }}
              >
                {passed ? "Assessment Passed" : "Assessment Not Passed"}
              </span>
            </div>
          </div>

          {/* Right detail column */}
          <div className="tqc-detail-column relative z-10 flex min-w-0 flex-1 flex-col justify-center gap-3">
            <div
              className="tqc-rise flex items-start gap-3"
              style={delay(200)}
            >
              <span
                className={passed ? "tqc-pop" : "tqc-shake"}
                style={{
                  color: passed ? PASS_GREEN : FAIL_RED,
                  ...delay(400),
                }}
              >
                {passed ? (
                  <CheckCircle2
                    size={34}
                    fill={PASS_GREEN}
                    color={PASS_GREEN}
                    stroke="#FFFFFF"
                    aria-hidden="true"
                  />
                ) : (
                  <Flag
                    size={32}
                    color={FAIL_RED}
                    aria-hidden="true"
                  />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-bold leading-tight sm:text-2xl">
                  {passed ? "Well Done!" : "Keep Learning!"}
                </h3>

                <p
                  className="mt-1 text-sm leading-relaxed"
                  style={{ color: t.secondaryText }}
                >
                  {passed
                    ? "You've successfully completed the training."
                    : `You scored ${score}%. You need at least ${actualPassingScore}% to pass.`}
                </p>
              </div>
            </div>

            {/* Score statistics */}
            <div
              className="tqc-rise grid grid-cols-2 gap-2 sm:grid-cols-4"
              style={delay(450)}
            >
              {showStats && (
                <>
                  <StatCard
                    label="Correct Answers"
                    value={`${correct}/${total}`}
                    color={PASS_GREEN}
                    t={t}
                    isDark={isDark}
                  />

                  <StatCard
                    label="Incorrect"
                    value={incorrect ?? 0}
                    color={FAIL_RED}
                    t={t}
                    isDark={isDark}
                  />

                  <StatCard
                    label="Skipped"
                    value={skipped ?? 0}
                    color={AMBER}
                    t={t}
                    isDark={isDark}
                  />
                </>
              )}

              <StatCard
                label="Pass Mark"
                value={`${actualPassingScore}%`}
                color="#3B82F6"
                t={t}
                isDark={isDark}
              />

              {!showStats && summary.source === "saved" && (
                <StatCard
                  label="Attempts"
                  value={
                    allocation?.attemptCount ??
                    allocation?.AttemptCount ??
                    "—"
                  }
                  color={AMBER}
                  t={t}
                  isDark={isDark}
                />
              )}
            </div>

            {/* Points earned / improvement panel */}
            {passed ? (
              <section
                className="tqc-rise tqc-success-card flex items-center gap-3 rounded-xl border p-2 sm:p-3"
                style={{
                  background: isDark
                    ? "linear-gradient(100deg, rgba(34,197,94,.13), rgba(20,184,166,.07))"
                    : "linear-gradient(100deg, #DCFCE7, #CCFBF1)",
                  borderColor: isDark
                    ? "rgba(34,197,94,.35)"
                    : "#BBF7D0",
                  ...delay(600),
                }}
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(245,158,11,.12)"
                      : "#FFFFFF",
                    color: AMBER,
                  }}
                >
                  <Trophy
                    size={25}
                    fill={AMBER}
                    aria-hidden="true"
                  />
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: t.secondaryText }}
                  >
                    Points Earned
                  </p>

                  <p
                    className="mt-0.5 text-xl font-bold tabular-nums"
                    style={{ color: isDark ? "#86EFAC" : "#047857" }}
                  >
                    +{animatedPoints}
                  </p>
                </div>

                <CheckCircle2
                  size={21}
                  color={PASS_GREEN}
                  aria-hidden="true"
                />
              </section>
            ) : (
              <section
                className="tqc-rise tqc-failed-card rounded-xl border p-3 sm:p-3"
                style={{
                  backgroundColor: t.failBg,
                  borderColor: t.failBorder,
                  ...delay(600),
                }}
              >
                <div className="flex items-center gap-2">
                  <Target
                    size={20}
                    color={FAIL_RED}
                    aria-hidden="true"
                  />

                  <p
                    className="text-sm font-bold"
                    style={{ color: FAIL_RED }}
                  >
                    Your next goal: {actualPassingScore}% or higher
                  </p>
                </div>

                <p
                  className="mt-2 text-xs leading-relaxed"
                  style={{ color: t.secondaryText }}
                >
                  Review the training material, focus on the questions
                  you missed, and retake the assessment when you're ready.
                </p>
              </section>
            )}

            {/* Action buttons */}
            <div
              className="tqc-rise tqc-actions flex flex-col gap-2 sm:flex-row"
              style={delay(750)}
            >
              {passed ? (
                <>
                  <button
                    type="button"
                    onClick={handleCertificate}
                    className="tqc-btn tqc-shine inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{
                      color: "#172033",
                      backgroundColor: "#FFFFFF",
                      border: `1px solid ${t.borderColor}`,
                      "--tw-ring-color": PASS_GREEN,
                      "--tw-ring-offset-color": t.shellBg,
                    }}
                  >
                    <Download
                      size={17}
                      className="tqc-download-icon"
                      aria-hidden="true"
                    />
                    Download Certificate
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate(leaderboardPath)}
                    className="tqc-btn inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{
                      background: "linear-gradient(100deg, #EF4444, #DC2626)",
                      "--tw-ring-color": "#EF4444",
                      "--tw-ring-offset-color": t.shellBg,
                    }}
                  >
                    <Trophy
                      size={17}
                      className="tqc-lift"
                      aria-hidden="true"
                    />
                    Go to Leaderboard
                  </button>
                </>
              ) : (
                onRetake && (
                  <button
                    type="button"
                    onClick={onRetake}
                    className="tqc-btn tqc-shine inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{
                      background: "linear-gradient(100deg, #E11D48, #BE123C)",
                      "--tw-ring-color": FAIL_RED,
                      "--tw-ring-offset-color": t.shellBg,
                    }}
                  >
                    <RotateCcw
                      size={17}
                      className="tqc-lift"
                      aria-hidden="true"
                    />
                    Retake Assessment
                  </button>
                )
              )}
            </div>

            {certificateMessage && passed && (
              <p
                role="status"
                className="tqc-rise rounded-lg border px-3 py-2 text-xs leading-relaxed"
                style={{
                  color: AMBER,
                  borderColor: t.borderColor,
                  backgroundColor: t.mutedBg,
                }}
              >
                {certificateMessage}
              </p>
            )}

            
          </div>
        </div>

        {/* Bottom status */}
        <div
          className="tqc-rise mt-3 flex items-center justify-center gap-1 text-center text-xs"
          style={{ color: t.secondaryText, ...delay(850) }}
        >
          {passed ? (
            <>
              <CheckCircle2
                size={15}
                color={PASS_GREEN}
                aria-hidden="true"
              />
              <span>
                Congratulations on completing your training!
              </span>
            </>
          ) : (
            <>
              <RotateCcw
                size={15}
                color={AMBER}
                aria-hidden="true"
              />
              <span>
                Keep practicing. You can retake the assessment to improve
                your result.
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
}