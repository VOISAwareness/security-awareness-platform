import React, { useEffect, useMemo, useState, useRef } from "react";

import { useParams } from "react-router-dom";

import {
  Star,
  PlayCircle,
  CalendarDays,
  BookOpen,
  Target,
  Lightbulb,
  RotateCcw,
  Award,
  Check,
  X,
  Quote,
  Eye,
  Download,
  Clock,
  Trophy,
  ClipboardCheck,
  UserCheck,
  AlertCircle,
  LockKeyhole,
  CirclePlay,
  ClipboardList,
  Pause,
  Volume2,
  Maximize,
} from "lucide-react";

import { useUserType } from "../../../UserTypeContext/UserTypeContext";

import trainingVideoData from "../TrainingVideos.json";

import trainingData from "../data/TrainingAllocationData.json";

import trainingPathData from "../TrainingPath.json";

import campaignsData from "../../Campaigns/CampaignsData.json";

const TARGET_SCORE = 80;

const GREEN = "#0D9B77";

const RED = "#E11D48";

const AMBER = "#E6A700";

const WIDE_SHORT_QUERY = "(min-width: 1280px) and (max-height: 840px)";

const THEMES = {
  light: {
    shellBg: "#F1F5F7",

    cardBg: "#FFFFFF",

    primaryText: "#1E293B",

    secondaryText: "#64748B",

    borderColor: "#E2E8F0",

    track: "#CBD5E1",

    chipBg: "#DDF8ED",

    chipText: "#087F5B",
  },

  dark: {
    shellBg: "#1C1E24",

    cardBg: "#252830",

    primaryText: "#F8FAFC",

    secondaryText: "#AAB4C3",

    borderColor: "#383C47",

    track: "#41444F",

    chipBg: "#18372F",

    chipText: "#9CE8CD",
  },
};

const STATUS_FIELDS = ["trainingStatus", "TrainingStatus", "status", "Status"];

const RESULT_FIELDS = [
  "evalutionStatus",

  "evaluationStatus",

  "EvaluationStatus",

  "assessmentStatus",

  "AssessmentStatus",

  "result",

  "Result",
];

const SCORE_FIELDS = [
  "currentScore",

  "CurrentScore",

  "Score",

  "score",

  "Percentage",

  "percentage",
];

const CERTIFICATE_FIELDS = [
  "CertificateURL",

  "CertificateUrl",

  "certificateURL",

  "certificateUrl",

  "CertificateLink",

  "CertificatePath",

  "Certificate",
];

const VIDEO_URL_FIELDS = [
  "TrainingVideoURL",

  "trainingVideoURL",

  "VideoURL",

  "videoURL",

  "VideoUrl",

  "videoUrl",

  "TrainingVideo",

  "URL",

  "Url",

  "url",
];

const LEARNING_FIELDS = [
  "LearningPoints",

  "learningPoints",

  "WhatYouWillLearn",

  "whatYouWillLearn",

  "LearningOutcomes",

  "learningOutcomes",
];

const DEFAULT_LEARNING_POINTS = [
  "Understand the key concepts covered in this training.",

  "Recognize important scenarios and potential risks.",

  "Learn practical steps and recommended best practices.",

  "Apply the knowledge in relevant workplace situations.",
];

/* -------------------------------------------------------------------------- */

/* Status configuration                                                       */

/* -------------------------------------------------------------------------- */

const STATUS_CONFIG = {
  pending: {
    pill: "Pending",

    headline: "Your training has not started",

    icon: Clock,

    accent: "#64748B",

    gradient: ["#475569", "#64748B"],

    light: {
      bg: "#F1F5F9",

      border: "#CBD5E1",

      text: "#334155",
    },

    dark: {
      bg: "#262B33",

      border: "#414854",

      text: "#E2E8F0",
    },

    message:
      "This training is assigned to you, but you have not started it yet. Begin with the training video and review the learning points before taking the assessment.",

    actions: [
      "Start the assigned training video.",

      "Review the learning points.",

      "Complete the assessment before the due date.",
    ],

    videoHint: "Assigned to you — not started",

    learningHint: "Prepare before beginning",

    journeyLabels: ["Assigned", "Not started", "Learn", "Assess", "Complete"],

    journey: ["done", "current", "todo", "todo", "todo"],
  },

  ongoing: {
    pill: "Ongoing",

    headline: "Keep up your progress",

    icon: PlayCircle,

    accent: "#2563EB",

    gradient: ["#1D4ED8", "#3B82F6"],

    light: {
      bg: "#EFF6FF",

      border: "#BFDBFE",

      text: "#1D4ED8",
    },

    dark: {
      bg: "#1E2B40",

      border: "#304A70",

      text: "#BFDBFE",
    },

    message:
      "You have already started this training. Continue with the learning material, review the key points, and complete the assessment to reach the passing score.",

    actions: [
      "Continue your training video.",

      "Review the key learning points.",

      "Complete the assessment and aim for at least 80%.",
    ],

    videoHint: "Continue your training",

    learningHint: "Review as you progress",

    journeyLabels: ["Assigned", "Learn", "Assess", "Complete", "Next"],

    journey: ["done", "current", "todo", "todo", "todo"],
  },

  completed: {
    pill: "Completed",

    headline: "Successfully completed",

    icon: Award,

    accent: GREEN,

    gradient: ["#047857", GREEN],

    light: {
      bg: "#DDF8ED",

      border: "#A7F3D0",

      text: "#065F46",
    },

    dark: {
      bg: "#18372F",

      border: "#245B4A",

      text: "#9CE8CD",
    },

    message:
      "Congratulations! You have passed this training. Review your final score and continue with your next assigned module.",

    actions: [
      "Review your final score.",

      "Revisit the learning points to reinforce your knowledge.",

      "Continue to your next assigned training.",
    ],

    videoHint: "Rewatch anytime",

    learningHint: "Key points to remember",

    journeyLabels: ["Assigned", "Learn", "Assess", "Passed", "Next"],

    journey: ["done", "done", "done", "done", "current"],
  },

  failed: {
    pill: "Not passed",

    headline: "Review and try again",

    icon: RotateCcw,

    accent: RED,

    gradient: ["#9F1239", RED],

    light: {
      bg: "#FFF1F2",

      border: "#FECDD3",

      text: "#9F1239",
    },

    dark: {
      bg: "#3A2025",

      border: "#633039",

      text: "#FECDD3",
    },

    message:
      "Your assessment result is below the required passing score. Review the training material and learning points before retrying the assessment.",

    actions: [
      "Review your score against the 80% passing threshold.",

      "Rewatch the training video.",

      "Focus on topics that need improvement.",

      "Retake the assessment if another attempt is available.",
    ],

    videoHint: "Review before your next attempt",

    learningHint: "Revisit these before your retake",

    journeyLabels: ["Assigned", "Learn", "Assess", "Not passed", "Retake"],

    journey: ["done", "done", "done", "failed", "current"],
  },
};

/* -------------------------------------------------------------------------- */

/* Helpers                                                                    */

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

const pickFirst = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];

    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    return value;
  }

  return "";
};

const normalize = (value) =>
  String(value ?? "")
    .trim()

    .toLowerCase()

    .replace(/[\s_-]+/g, " ");

/*

 * IMPORTANT:

 * trainingStatus is checked first.

 *

 * This ensures:

 * trainingStatus: "pending"  -> pending design

 * trainingStatus: "ongoing"  -> ongoing design

 * trainingStatus: "failed"   -> failed design

 *

 * Your JSON also contains "evaluted" and "evalutad".

 * These are handled as completed when evaluation status is passed.

 */

const resolveStatus = (allocation) => {
  const trainingStatus = normalize(pickFirst(allocation, STATUS_FIELDS));

  const evaluationStatus = normalize(pickFirst(allocation, RESULT_FIELDS)); // Explicit training status takes priority.

  if (
    ["pending", "not started", "assigned", "upcoming"].includes(trainingStatus)
  ) {
    return "pending";
  }

  if (
    ["ongoing", "in progress", "started", "learning"].includes(trainingStatus)
  ) {
    return "ongoing";
  }

  if (["failed", "fail", "failure", "not passed"].includes(trainingStatus)) {
    return "failed";
  } // Your JSON uses these misspelled values for evaluated training.

  if (
    ["completed", "complete", "evaluated", "evaluted", "evalutad"].includes(
      trainingStatus,
    )
  ) {
    if (
      ["failed", "fail", "failure", "not passed"].includes(evaluationStatus)
    ) {
      return "failed";
    }

    return "completed";
  } // Use evaluation status if trainingStatus is missing or unknown.

  if (["failed", "fail", "failure", "not passed"].includes(evaluationStatus)) {
    return "failed";
  }

  if (
    ["passed", "pass", "successful", "completed", "complete"].includes(
      evaluationStatus,
    )
  ) {
    return "completed";
  }

  if (["ongoing", "in progress", "started"].includes(evaluationStatus)) {
    return "ongoing";
  }

  return "pending";
};

const toScore = (value) => {
  if (value === "" || value == null) return null;

  const parsed = parseFloat(String(value).replace("%", "").trim());

  if (!Number.isFinite(parsed)) return null;

  return Math.min(100, Math.max(0, parsed));
};

const formatValue = (value, suffix = "") => {
  if (value === "" || value == null) {
    return "Not available";
  }

  return `${value}${suffix}`;
};

const getLearningPoints = (video) => {
  const raw = pickFirst(video, LEARNING_FIELDS);

  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(/\n|;/)
      : [];

  const cleaned = list

    .map((point) => String(point).trim())

    .filter(Boolean)

    .slice(0, 4);

  return cleaned.length ? cleaned : DEFAULT_LEARNING_POINTS;
};

/* -------------------------------------------------------------------------- */

/* Certificate actions                                                        */

/* -------------------------------------------------------------------------- */

const openCertificate = (url) => {
  if (!url) {
    window.alert(
      "Certificate URL is not available. Add a certificate URL to your training data.",
    );

    return;
  }

  const openedWindow = window.open(
    url,

    "_blank",

    "noopener,noreferrer",
  );

  if (!openedWindow) {
    window.alert(
      "The certificate could not be opened. Please allow pop-ups and try again.",
    );
  }
};

const downloadCertificate = async (url, baseName) => {
  if (!url) {
    window.alert(
      "Certificate URL is not available. Add a certificate URL to your training data.",
    );

    return;
  }

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
    openCertificate(url);
  }
};

/* -------------------------------------------------------------------------- */

/* Responsive hook                                                            */

/* -------------------------------------------------------------------------- */

const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;

    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(query);

    const onChange = (event) => setMatches(event.matches);

    setMatches(mediaQuery.matches);

    mediaQuery.addEventListener("change", onChange);

    return () => {
      mediaQuery.removeEventListener("change", onChange);
    };
  }, [query]);

  return matches;
};

/* -------------------------------------------------------------------------- */

/* Status pill                                                                */

/* -------------------------------------------------------------------------- */

const StatusPill = ({ cfg, tone }) => {
  const Icon = cfg.icon;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold"
      style={{
        backgroundColor: tone.bg,

        color: tone.text,

        border: `1px solid ${tone.border}`,
      }}
    >
            <Icon size={12} aria-hidden="true" />      {cfg.pill}   {" "}
    </span>
  );
};

/* -------------------------------------------------------------------------- */

/* Score ring                                                                 */

/* -------------------------------------------------------------------------- */

const ScoreRing = ({
  value,

  color,

  track,

  showMarker,

  label,

  children,
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
      role="img"
      aria-label={label}
      className="relative w-[72px] h-[72px] shrink-0"
    >
      {" "}
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        {" "}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth="9"
        />{" "}
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
        />{" "}
        {showMarker && (
          <line
            x1="50"
            y1="1"
            x2="50"
            y2="16"
            stroke={AMBER}
            strokeWidth="3.5"
            strokeLinecap="round"
            transform={`rotate(${TARGET_SCORE * 3.6} 50 50)`}
          />
        )}{" "}
      </svg>{" "}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}{" "}
      </div>{" "}
    </div>
  );
};

/* -------------------------------------------------------------------------- */

/* Certificate buttons                                                        */

/* -------------------------------------------------------------------------- */

const CertificateActions = ({ onView, onDownload }) => (
  <div
    role="group"
    aria-label="Certificate actions"
    className="ml-auto flex items-center gap-1 shrink-0"
  >
       {" "}
    <button
      type="button"
      onClick={onView}
      title="View certificate"
      aria-label="View certificate"
      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 text-white hover:bg-white/35"
    >
            <Eye size={16} />   {" "}
    </button>
       {" "}
    <button
      type="button"
      onClick={onDownload}
      title="Download certificate"
      aria-label="Download certificate"
      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20 text-white hover:bg-white/35"
    >
            <Download size={16} />   {" "}
    </button>
     {" "}
  </div>
);

/* -------------------------------------------------------------------------- */

/* Main page                                                                  */

/* -------------------------------------------------------------------------- */

const GetTrainedDetail = ({ onVideoCompleted }) => {
  const { isDark = false } = useUserType() || {};

  const { trainingPathID } = useParams();

  const t = isDark ? THEMES.dark : THEMES.light;

  const threeColumns = useMediaQuery(WIDE_SHORT_QUERY);

  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const maxWatchedTimeRef = useRef(0);
  const isSeekingRef = useRef(false);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    maxWatchedTimeRef.current = 0;
    isSeekingRef.current = false;
    setVideoCompleted(false);
    setIsPlaying(false);
    setVideoDuration(0);
    setCurrentTime(0);
  }, [trainingPathID]);

const handleVideoLoadedMetadata = (event) => {
    const videoElement = event.currentTarget;
    setVideoDuration(
      Number.isFinite(videoElement.duration) ? videoElement.duration : 0,
    );
    videoElement.volume = volume;
  };

const handleVideoTimeUpdate = (event) => {
    const videoElement = event.currentTarget;
    if (!videoElement.paused && !videoElement.seeking) {
      maxWatchedTimeRef.current = Math.max(
        maxWatchedTimeRef.current,
        videoElement.currentTime,
      );
    }
    setCurrentTime(videoElement.currentTime);
  };

  const handleVideoSeeking = (event) => {
    const videoElement = event.currentTarget;
    if (
      !videoCompleted &&
      videoElement.currentTime > maxWatchedTimeRef.current + 0.5
    ) {
      isSeekingRef.current = true;
      videoElement.currentTime = maxWatchedTimeRef.current;
    }
  };

  const handleVideoSeeked = () => {
    isSeekingRef.current = false;
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleVideoEnded = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    setCurrentTime(videoElement.duration || videoDuration);
    setVideoCompleted(true);
    setIsPlaying(false);
    onVideoCompleted?.();
  };

  const handlePlayPause = async () => {
    const videoElement = videoRef.current;
    if (!videoElement || videoCompleted) return;
    try {
      if (videoElement.paused) await videoElement.play();
      else videoElement.pause();
    } catch (error) {
      console.error("Unable to play training video:", error);
    }
  };

  const handleVolumeChange = (event) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    if (videoRef.current) {
      videoRef.current.volume = nextVolume;
      videoRef.current.muted = nextVolume === 0;
    }
  };

  const handleFullscreen = async () => {
    const container = videoContainerRef.current;
    if (!container) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (container.requestFullscreen) await container.requestFullscreen();
    } catch (error) {
      console.error("Unable to open training video fullscreen:", error);
    }
  };

const formatVideoTime = (time) => {
    if (!Number.isFinite(time) || time < 0) return "0:00";
    return `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
  };

  useEffect(() => {
    maxWatchedTimeRef.current = 0;

    setVideoCompleted(false);
  }, [trainingPathID]);

  // Get the training allocation for the selected training and user
  const currentTrainingAllocation = trainingData.trainings.find(
    (training) => training.TrainingPathID === trainingPathID,
  );

  // Get the Campaign ID from the training allocation
  const campaignId = currentTrainingAllocation?.campaignId;

  // Find the matching campaign and get its title
  const currentCampaign = campaignsData.campaigns.find(
    (campaign) => campaign.campaignId === campaignId,
  );

  const campaignTitle = currentCampaign?.CampaignTitle || "Campaign not found";
 

  const { allocation, path, video } = useMemo(() => {
    if (!trainingPathID) {
      return {
        allocation: undefined,

        path: undefined,

        video: undefined,
      };
    }

    const foundAllocation = toArray(
      trainingData,

      "trainings",
    ).find((item) => sameId(item.TrainingPathID, trainingPathID));

    if (!foundAllocation) {
      return {
        allocation: undefined,

        path: undefined,

        video: undefined,
      };
    }

    const foundPath = toArray(
      trainingPathData,

      "trainingPaths",
    ).find((item) =>
      sameId(
        item.TrainingPathID,

        foundAllocation.TrainingPathID,
      ),
    );

    const foundVideo = foundAllocation.TrainingVideoID
      ? toArray(trainingVideoData, "videos").find((item) =>
          sameId(
            item.TrainingVideoID,

            foundAllocation.TrainingVideoID,
          ),
        )
      : undefined;

    return {
      allocation: foundAllocation,

      path: foundPath,

      video: foundVideo,
    };
  }, [trainingPathID]);

  if (!allocation) {
    return (
      <div
        className="w-full lg:h-[calc(100dvh-120px)] min-h-[300px] flex flex-col items-center justify-center rounded-2xl gap-3 p-6"
        style={{
          backgroundColor: t.shellBg,

          color: t.primaryText,
        }}
      >
                <BookOpen size={38} color="#E60000" />       {" "}
        <h2 className="text-xl font-bold">
                    Training not found        {" "}
        </h2>
               {" "}
        <p className="text-sm text-center" style={{ color: t.secondaryText }}>
                    No training allocation was found for ID:          {" "}
          {trainingPathID || "Unknown"}.        {" "}
        </p>
             {" "}
      </div>
    );
  } /* ------------------------------------------------------------------------ */ /* Status and training data                                                 */ /* ------------------------------------------------------------------------ */

  const statusKey = resolveStatus(allocation);

  const cfg = STATUS_CONFIG[statusKey];

  const tone = isDark ? cfg.dark : cfg.light;

  const score = toScore(pickFirst(allocation, SCORE_FIELDS));

  const hasScore = score !== null;

  const assignedDate =
    allocation.assignedDate || allocation.AssignedDate || "Not recorded";

  const dueDate = allocation.dueDate || allocation.DueDate || "Not recorded";

  const dueInDays =
    allocation.dueInDays || allocation.DueInDays || "Not available";

  const attemptsValue = allocation.attemptCount ?? allocation.AttemptCount ?? 0;

  const trainingPointsValue =
    allocation.trainingPoints ?? allocation.TrainingPoints ?? 0;

  const evaluationPointsValue =
    allocation.evaluationPoints ?? allocation.EvaluationPoints ?? 0;

  const totalPointsValue =
    allocation.trainingTotalPoints ??
    allocation.TrainingTotalPoints ??
    allocation.totalPoints ??
    0;

  const evaluationStatus = pickFirst(
    allocation,

    RESULT_FIELDS,
  );

  const certificateUrl = String(
    pickFirst(allocation, CERTIFICATE_FIELDS) || "",
  ).trim();

  const videoSrc = video ? pickFirst(video, VIDEO_URL_FIELDS) : "";

  const learningPoints = getLearningPoints(video || {});

  const trainingName =
    path?.TrainingPathName ||
    allocation.TrainingPathName ||
    allocation.trainingPathName ||
    "Training name not found";

  const trainingDescription =
    path?.Description || "Training description not available";

  const videoName =
    video?.TrainingVideoName ||
    allocation.TrainingVideoName ||
    "Training video"; /* ------------------------------------------------------------------------ */ /* Score information                                                        */ /* ------------------------------------------------------------------------ */

  const ringValue = TARGET_SCORE;

  const ringColor = "#0D9B77";

  const pointsAway = hasScore ? Math.round(Math.abs(score - TARGET_SCORE)) : 0;

  const meetsTarget = hasScore && score >= TARGET_SCORE;

  const scoreTitle = statusKey === "pending" ? "Target Score" : "Target Score";

  const scoreDescription =
    statusKey === "pending"
      ? `Aim for at least ${TARGET_SCORE}% to pass.`
      : !hasScore
        ? `Score at least ${TARGET_SCORE}% to pass.`
        : pointsAway === 0
          ? `You have reached the ${TARGET_SCORE}% pass mark.`
          : `${pointsAway} ${
              pointsAway === 1 ? "point" : "points"
            } ${meetsTarget ? "above" : "below"} the ${TARGET_SCORE}% pass mark.`;

  const scoreChip =
    statusKey === "pending"
      ? "Required to pass"
      : !hasScore
        ? "Pass mark"
        : meetsTarget
          ? "Above pass mark"
          : "Below pass mark"; /* ------------------------------------------------------------------------ */ /* Dynamic result facts                                                     */ /* ------------------------------------------------------------------------ */

  const facts = [
    {
      label: "Training points",

      value: formatValue(trainingPointsValue),

      icon: Star,
    },

    {
      label: "Evaluation points",

      value: formatValue(evaluationPointsValue),

      icon: ClipboardCheck,
    },

    {
      label: "Total points",

      value: formatValue(totalPointsValue),

      icon: Trophy,
    },

    {
      label: "Attempts",

      value: formatValue(attemptsValue, " attempt(s)"),

      icon: RotateCcw,
    },

    {
      label: "Assigned date",

      value: formatValue(assignedDate),

      icon: CalendarDays,
    },

    {
      label: "Due date",

      value: formatValue(dueDate),

      icon: Clock,
    },
  ];

  if (statusKey === "completed" || statusKey === "failed") {
    facts.unshift({
      label: "Assessment score",

      value: hasScore ? `${score}%` : "Not available",

      icon: Target,
    });

    facts.push({
      label: "Evaluation status",

      value: formatValue(evaluationStatus),

      icon: UserCheck,
    });
  }

  if (statusKey === "pending" || statusKey === "ongoing") {
    facts.push({
      label: "Time remaining",

      value: formatValue(dueInDays),

      icon: Clock,
    });

    facts.push({
      label: "Evaluation status",

      value: formatValue(evaluationStatus || "Not started"),

      icon: ClipboardCheck,
    });
  }

  if (statusKey === "failed" && hasScore && score < TARGET_SCORE) {
    facts.push({
      label: "Points needed to pass",

      value: `${Math.ceil(TARGET_SCORE - score)} points`,

      icon: Target,
    });
  } /* ------------------------------------------------------------------------ */ /* Certificate actions                                                      */ /* ------------------------------------------------------------------------ */

  const certificate = {
    onView: () => openCertificate(certificateUrl),

    onDownload: () =>
      downloadCertificate(
        certificateUrl,

        `${allocation.TrainingPathID}-certificate`,
      ),
  }; /* ------------------------------------------------------------------------ */ /* Main UI                                                                   */ /* ------------------------------------------------------------------------ */

  return (
    <div
      className="w-full h-[calc(90dvh-120px)] min-h-[420px] overflow-hidden rounded-2xl"
      style={{ color: t.primaryText, backgroundColor: t.shellBg }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[30%_minmax(0,70%)] gap-3 h-full min-h-0 p-3">
        <aside
          className="min-w-0 min-h-0 flex flex-col gap-3 pr-1 [scrollbar-width:thin] lg:h-full lg:overflow-y-auto lg:overflow-x-hidden"
          aria-label="Training information"
        >
          <section
            className="rounded-xl p-4 shrink-0 lg:flex-1 lg:min-h-0"
            style={{
              backgroundColor: t.cardBg,
              border: `1px solid ${t.borderColor}`,
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[10px] font-bold font-voda uppercase tracking-wider"
                style={{ color: t.secondaryText }}
              >
                Training overview
              </span>
              <StatusPill cfg={cfg} tone={tone} />
            </div>
            <p
              className="text-[10px] font-semibold font-voda uppercase tracking-wide mb-1"
              style={{ color: t.secondaryText }}
            >
              Training Name
            </p>
            <h1
              className="text-base font-bold leading-snug break-words mb-4"
              title={trainingName}
            >
              {trainingName}
            </h1>
            <p
              className="text-[10px] font-semibold font-voda uppercase tracking-wide mb-1"
              style={{ color: t.secondaryText }}
            >
              Training Description
            </p>
            <p
              className="text-xs leading-5 break-words mb-4 h-[150px] overflow-hidden"
              style={{ color: t.secondaryText }}
              title={trainingDescription}
            >
              {trainingDescription}
            </p>
            <div
              className="rounded-lg p-5"
              style={{ backgroundColor: t.shellBg }}
            >
              <p
                className="text-[10px] font-semibold font-voda uppercase tracking-wide mb-1"
                style={{ color: t.secondaryText }}
              >
                Campaign Name
              </p>
              <p className="text-sm font-bold leading-snug break-words">
                {campaignTitle}
              </p>
            </div>
          </section>
        </aside>

        <main className="min-w-0 min-h-0 flex flex-col gap-3 overflow-hidden">
          <section
            className="rounded-xl p-3 sm:p-4 flex flex-col flex-1 min-h-0"
            style={{
              backgroundColor: t.cardBg,
              border: `1px solid ${statusKey === "pending" ? tone.border : t.borderColor}`,
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
              <div className="min-w-0">
                <p
                  className="text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: t.secondaryText }}
                >
                  {statusKey === "pending"
                    ? "Assigned training"
                    : "Training video"}
                </p>
                <h2
                  className="text-base sm:text-lg font-bold font-voda leading-snug mt-1 break-words"
                  title={videoName}
                >
                  {videoName}
                </h2>
              </div>
              <div
                className="shrink-0 flex items-center gap-2 rounded-lg px-3 py-2"
                style={{
                  backgroundColor: tone.bg,
                  color: tone.text,
                  border: `1px solid ${tone.border}`,
                }}
              >
                <cfg.icon size={15} aria-hidden="true" />
                <span className="text-xs font-bold">{cfg.pill}</span>
              </div>
            </div>
            <div
              className="flex-1 min-h-[220px] lg:min-h-0 rounded-lg overflow-hidden flex items-center justify-center"
              style={{ backgroundColor: "#090B10" }}
            >
              {videoSrc ? (
                <div
                  ref={videoContainerRef}
                  className="relative flex flex-col w-full h-full min-h-[220px] bg-[#090B10]"
                  onContextMenu={(event) => event.preventDefault()}
                >
                  <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                    <video
                      ref={videoRef}
                      controls={false}
                      preload="metadata"
                      playsInline
                      disablePictureInPicture
                      controlsList="nodownload noplaybackrate nofullscreen"
                      className="block w-full h-full object-contain"
                      aria-label={videoName}
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      onTimeUpdate={handleVideoTimeUpdate}
                      onSeeking={handleVideoSeeking}
                      onSeeked={handleVideoSeeked}
                      onEnded={handleVideoEnded}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onContextMenu={(event) => event.preventDefault()}
                      onKeyDown={(event) => {
                        if (
                          ["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                            event.key,
                          )
                        )
                          event.preventDefault();
                      }}
                    >
                      <source src={videoSrc} />
                      Your browser does not support video playback.
                    </video>
                    {!isPlaying && !videoCompleted && (
                      <button
                        type="button"
                        onClick={handlePlayPause}
                        aria-label="Play training video"
                        className="absolute inset-0 m-auto flex items-center justify-center w-16 h-16 rounded-full bg-white/15 text-white hover:bg-white/25 transition"
                      >
                        <PlayCircle size={42} />
                      </button>
                    )}
                    
                  </div>
                  <div className="shrink-0 px-3 py-2 bg-[#111318] text-white">
                    <div
                      className="h-1.5 rounded-full bg-white/20 overflow-hidden mb-2"
                      aria-label="Video progress"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={
                        videoDuration
                          ? Math.min(100, (currentTime / videoDuration) * 100)
                          : 0
                      }
                    >
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-[width] duration-150"
                        style={{
                          width: `${videoDuration ? Math.min(100, (currentTime / videoDuration) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handlePlayPause}
                        disabled={videoCompleted}
                        aria-label={isPlaying ? "Pause video" : "Play video"}
                        className="shrink-0 p-1 rounded hover:bg-white/10 disabled:opacity-60"
                      >
                        {isPlaying ? (
                          <Pause size={20} />
                        ) : (
                          <PlayCircle size={20} />
                        )}
                      </button>
                      <span className="text-[11px] tabular-nums whitespace-nowrap">
                        {formatVideoTime(currentTime)} /{" "}
                        {formatVideoTime(videoDuration)}
                      </span>
                      <div className="ml-auto flex items-center gap-2 min-w-0">
                        <Volume2 size={17} className="shrink-0" />
                        <input
                          aria-label="Video volume"
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-16 sm:w-24 accent-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={handleFullscreen}
                          aria-label="Toggle fullscreen"
                          className="shrink-0 p-1 rounded hover:bg-white/10"
                        >
                          <Maximize size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6">
                  {statusKey === "pending" ? (
                    <Clock size={42} color="#CBD5E1" aria-hidden="true" />
                  ) : (
                    <PlayCircle size={42} color="#D8CCFF" aria-hidden="true" />
                  )}
                  <p className="text-white text-sm font-bold mt-3">
                    {!video
                      ? "Training video unavailable"
                      : statusKey === "pending"
                        ? "Your training is ready"
                        : statusKey === "ongoing"
                          ? "Continue your training"
                          : statusKey === "completed"
                            ? "Review your training"
                            : "Prepare for your next attempt"}
                  </p>
                  <p className="text-slate-400 text-xs mt-2 max-w-xs">
                    {!video
                      ? `No video record was found for ${allocation.TrainingVideoID || "this training"}. Check TrainingVideos.json.`
                      : "Add a valid video URL to TrainingVideos.json to display the video."}
                  </p>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default GetTrainedDetail;
