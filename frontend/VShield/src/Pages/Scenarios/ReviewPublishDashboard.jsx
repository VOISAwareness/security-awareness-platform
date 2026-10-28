import React, { useState } from "react";
import { useUserType } from "../../UserTypeContext/UserTypeContext";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  CheckCircle2,
  FileText,
  Send,
  Link2,
  GraduationCap,
  X,
  ArrowLeft,
  Play,
  HelpCircle,
  Award,
} from "lucide-react";

import { createPortal } from "react-dom";
// ============================================================
// REVIEW CARD THEMES
// ============================================================
const REVIEW_SECTION_THEMES = {
  scenario: {
    bgLight: "#ECE8FF",
    bgDark: "#22193E",
  },
  email: {
    bgLight: "#CEFBEA",
    bgDark: "#0D271E",
  },
  landing: {
    bgLight: "#FFE4E8",
    bgDark: "#321820",
  },
  training: {
    bgLight: "#E8E4FF",
    bgDark: "#211B3A",
  },
};

 /* ==========================================================
     SHARED DESIGN
  ========================================================== */

  const OUTCOME_SECTION_THEMES = {
    coverImage: {
      bgLight: '#ECE8FF',
      bgDark: '#22193E',
    },

    landingPage: {
      bgLight: '#FFEFCE',
      bgDark: '#2E200C',
    },

    training: {
      bgLight: '#CEFBEA',
      bgDark: '#0D271E',
    },
  };

// ============================================================
// REUSABLE L-SHAPE CARD
//
// ============================================================
const LShapeCard = ({
  theme,
  isDark,
  shellBg,
  titleLine1,
  titleLine2,
  description,
  icon: Icon,
  armContent,
  children,
  minHeightClass = "min-h-[420px]",
}) => {
  const lShapeBg = isDark ? theme.bgDark : theme.bgLight;
  return (
    <div
      className={`relative flex flex-col h-full ${minHeightClass}`}
      style={{ fontFamily: "inherit" }}
    >
      {/* =====================================================
          1. TOP LEFT CAPSULE
      ===================================================== */}
      <div
        style={{
          backgroundColor: lShapeBg,
        }}
        className="
          absolute
          top-0
          left-0
          w-[164px]
          h-[122px]
          p-3.5
          rounded-2xl
          flex
          flex-col
          justify-between
          shadow-xs
          z-20
        "
      >
        <div>
          <h3
            className={`text-[14px] font-voda font-bold tracking-normal leading-tight ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            {titleLine1}
            <br />
            {titleLine2}
          </h3>
        </div>

        <p
          className={`text-[9.5px] font-medium leading-tight opacity-75 ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {description}
        </p>
      </div>

      {/* =====================================================
          2. CONCAVE ARC
      ===================================================== */}
      <div className="absolute top-[114px] left-[154px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
        <svg
          className="w-4 h-4"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z"
            fill={shellBg}
          />
        </svg>
      </div>

      {/* =====================================================
          3. TOP RIGHT ARM
      ===================================================== */}
      <div
        style={{
          backgroundColor: shellBg,
        }}
        className="
          w-[calc(100%-170px)]
          ml-auto
          h-[129px]
          rounded-t-xl
          px-4
          py-3
          flex
          items-center
          justify-center
          z-10
        "
      >
        {armContent ? (
          <div className="w-full">{armContent}</div>
        ) : (
          Icon && (
            <Icon
              className={`w-8 h-8 ${
                isDark ? "text-white/15" : "text-slate-900/10"
              }`}
            />
          )
        )}
      </div>

      {/* =====================================================
          4. CONTINUOUS CONTENT BASE
      ===================================================== */}
      <div
        style={{
          backgroundColor: shellBg,
        }}
        className="
          w-full
          rounded-tl-xl
          rounded-b-xl
          p-4
          sm:p-5
          flex-1
          flex-col
          z-10
        "
      >
        {children}
      </div>
    </div>
  );
};

// ============================================================
// SMALL REVIEW FIELD
// ============================================================
const ReviewField = ({ label, value }) => (
  <div className="mb-3">
    <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">
      {label}
    </div>

    <div className="text-[10px] font-semibold text-slate-800 dark:text-white">
      {value || "NA"}
    </div>
  </div>
);

// ============================================================
// SMALL WHITE CONTENT BOX
// ============================================================
const ReviewInfoBox = ({ label, value }) => (
  <div
    className="
      rounded-lg
      bg-white
      dark:bg-[#15161a]
      p-2.5
      min-h-[52px]
    "
  >
    <div className="text-[10px] font-bold text-slate-900 dark:text-white truncate">
      {label}
    </div>

    <div className="text-[9px] font-semibold text-slate-700 dark:text-white/70 mt-1 break-words">
      {value || "NA"}
    </div>
  </div>
);

// ============================================================
// SCENARIO SUMMARY FIELD
// Matches the field design used in ReviewAndPublishCampaign
// ============================================================
const ScenarioSummaryField = ({
  label,
  value,
  isDark,
  className = "",
  multiline = false,
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300">
        {label}
      </label>

      <div
        className={`w-full h-7 px-2.5 rounded-xl flex items-center shadow-2xs text-[10.5px] font-mono-tech font-bold ${
          isDark
            ? "bg-[#15161A] text-white"
            : "bg-white text-slate-900"
        }`}
      >
        {value || "NA"}
      </div>
    </div>
  );
};

// ============================================================
// EMAIL BODY PREVIEW
// ============================================================
const EmailBodyPreview = ({ content }) => {
  if (!content) {
    return (
      <div
        className="
          flex
          items-center
          justify-center
          min-h-[180px]
          rounded-lg
          border
          border-dashed
          border-slate-300
          dark:border-white/10
          bg-white/60
          dark:bg-[#15161a]
          text-[10px]
          text-slate-400
          dark:text-white/40
        "
      >
        No email body available
      </div>
    );
  }

  return (
    <div
      className="
        mt-2
        rounded-lg
        border
        border-slate-200
        dark:border-white/10
        bg-white
        min-h-[180px]
        max-h-[260px]
        p-3
        text-[9px]
        text-slate-900
        overflow-auto
      "
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

// ============================================================
// RICH TEXT LANDING PAGE PREVIEW
// ============================================================
const RichTextLandingPageReview = ({ content }) => {
  if (!content) return null;

  return (
    <div className="mt-3">
      <div className="text-[10px] font-semibold text-slate-700 dark:text-white mb-2">
        Landing Page Preview
      </div>

      <div
        className="
          w-full
          h-[220px]
          rounded-lg
          overflow-hidden
          border
          border-slate-200
          dark:border-white/10
          bg-white
        "
      >
        <iframe
          title="Landing Page Rich Text Preview"
          srcDoc={`
            <html>
              <head>
                <style>
                  body {
                    margin: 0;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                    background: white;
                  }

                  * {
                    box-sizing: border-box;
                  }
                </style>
              </head>

              <body>
                ${content}
              </body>
            </html>
          `}
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
};

// ============================================================
// INDIVIDUAL TRAINING REVIEW
// ============================================================
const IndividualTrainingReview = ({ data }) => {
  const [openVideos, setOpenVideos] = useState(false);
  const [openQuiz, setOpenQuiz] = useState(false);
  const [openCertificate, setOpenCertificate] = useState(false);

  const videos = data?.videos || [];
  const quiz = data?.quiz || null;
  const certificate = data?.certificate || null;

  return (
    <div className="mt-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] font-bold text-slate-900 dark:text-white">
            Individual Training
          </div>

          <div className="text-[9px] text-slate-500 dark:text-white/50 mt-1">
            Attached learning content
          </div>
        </div>

        <span className="px-2 py-1 rounded-md text-[7px] font-bold bg-[#8BD63B] text-black">
          Individual
        </span>
      </div>

      {/* VIDEOS */}
      <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden mb-2">
        <button
          onClick={() => setOpenVideos(!openVideos)}
          className="
            w-full
            px-3
            py-2.5
            flex
            items-center
            justify-between
            text-[8px]
            font-semibold
            text-slate-900
            dark:text-white
          "
        >
          <span>
            {videos.length} Videos
            {" • "}
            Total Duration: {data?.duration || "5min:12sec"}
          </span>

          {openVideos ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown size={13} />
          )}
        </button>

        {openVideos && (
          <div>
            {videos.length > 0 ? (
              videos.map((video) => (
                <div
                  key={video.id}
                  className="
                    flex
                    items-center
                    justify-between
                    gap-2
                    px-3
                    py-2
                    border-t
                    border-black/10
                    dark:border-white/10
                  "
                >
                  <div className="text-[7px] text-slate-800 dark:text-white/80 truncate">
                    {video.title}
                  </div>

                  <button
                    type="button"
                    className="
                      shrink-0
                      px-2
                      py-1
                      rounded
                      bg-white
                      dark:bg-white
                      text-black
                      text-[6px]
                      font-bold
                      flex
                      items-center
                      gap-1
                    "
                  >
                    <Eye size={10} />
                    Preview
                  </button>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-[7px] text-slate-400 border-t">
                No videos attached
              </div>
            )}
          </div>
        )}
      </div>

      {/* QUIZ */}
      <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden mb-2">
        <button
          onClick={() => setOpenQuiz(!openQuiz)}
          className="
            w-full
            px-3
            py-2.5
            flex
            items-center
            justify-between
            text-[8px]
            font-semibold
            text-slate-900
            dark:text-white
          "
        >
          <span>
            {quiz ? 1 : 0} Quiz
            {" • "}
            Total Questions: {quiz?.totalQuestions || 0}
          </span>

          {openQuiz ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown size={13} />
          )}
        </button>

        {openQuiz && quiz && (
          <div
            className="
              flex
              items-center
              justify-between
              gap-2
              px-3
              py-2
              border-t
              border-black/10
              dark:border-white/10
            "
          >
            <div className="text-[7px] text-slate-800 dark:text-white/80">
              {quiz.title}
            </div>

            <button
              type="button"
              className="
                px-2
                py-1
                rounded
                bg-white
                text-black
                text-[6px]
                font-bold
                flex
                items-center
                gap-1
              "
            >
              <Eye size={10} />
              Preview
            </button>
          </div>
        )}
      </div>

      {/* CERTIFICATE */}
      <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
        <button
          onClick={() => setOpenCertificate(!openCertificate)}
          className="
            w-full
            px-3
            py-2.5
            flex
            items-center
            justify-between
            text-[8px]
            font-semibold
            text-slate-900
            dark:text-white
          "
        >
          <span>
            {certificate ? 1 : 0} Certificate
            {" • "}
            Downloadable
          </span>

          {openCertificate ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown size={13} />
          )}
        </button>

        {openCertificate && certificate && (
          <div
            className="
              flex
              items-center
              justify-between
              gap-2
              px-3
              py-2
              border-t
              border-black/10
              dark:border-white/10
            "
          >
            <div className="text-[7px] text-slate-800 dark:text-white/80">
              {certificate.title}
            </div>

            <button
              type="button"
              className="
                px-2
                py-1
                rounded
                bg-white
                text-black
                text-[6px]
                font-bold
                flex
                items-center
                gap-1
              "
            >
              <Eye size={10} />
              Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// TRAINING PATH REVIEW
// ============================================================
const TrainingPathReview = ({ training }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(
      expandedSection === section ? null : section
    );
  };

  if (!training) return null;

  const topics = Array.isArray(training.topics)
    ? training.topics
    : [];

    

  return (
    <div className="mt-1">
      {/* Training Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-slate-900 dark:text-white">
            Training Path
          </div>

          <div className="text-[9px] font-semibold text-slate-600 dark:text-white/60 mt-1">
            {training.trainingCode || "NA"}
          </div>

          <div className="text-[10px] font-bold text-slate-900 dark:text-white mt-1 truncate">
            {training.title || "NA"}
          </div>
        </div>

        <span className="px-2 py-1 rounded-md text-[7px] font-bold bg-white dark:bg-white/10 text-slate-700 dark:text-white/70 shrink-0">
          Training Path
        </span>
      </div>

      {/* VIDEOS */}
      <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden mb-2">
        <button
          onClick={() => toggleSection("videos")}
          className="
            w-full
            px-3
            py-2.5
            flex
            justify-between
            items-center
            text-[8px]
            text-slate-900
            dark:text-white
            font-semibold
          "
        >
          <span>
            {training.videos || 0} Videos
            {" • "}
            Total Duration: {training.duration || "NA"}
          </span>

          {expandedSection === "videos" ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown size={13} />
          )}
        </button>

        {expandedSection === "videos" && (
          <div>
            {topics.length > 0 ? (
              topics.map((topic, index) => (
                <div
                  key={index}
                  className="
                    px-3
                    py-2
                    border-t
                    border-black/10
                    dark:border-white/10
                    flex
                    justify-between
                    items-center
                    gap-2
                  "
                >
                  <span className="text-[8px] text-slate-800 dark:text-white/80 truncate">
                    {topic}
                  </span>

                  <button
                    type="button"
                    className="
                      shrink-0
                      px-2
                      py-1
                      rounded
                      bg-white
                      text-black
                      text-[6px]
                      font-bold
                    "
                  >
                    Preview
                  </button>
                </div>
              ))
            ) : (
              <div className="px-3 py-2 text-[7px] text-slate-400 border-t">
                No topics available
              </div>
            )}
          </div>
        )}
      </div>

      {/* QUIZ */}
      <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden mb-2">
        <button
          onClick={() => toggleSection("quiz")}
          className="
            w-full
            px-3
            py-2.5
            flex
            justify-between
            items-center
            text-[8px]
            text-slate-900
            dark:text-white
            font-semibold
          "
        >
          <span>
            1 Quiz
            {" • "}
            Total Questions: {training.questions || 0}
          </span>

          {expandedSection === "quiz" ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown size={13} />
          )}
        </button>

        {expandedSection === "quiz" && (
          <div
            className="
              px-3
              py-2
              border-t
              border-black/10
              dark:border-white/10
              flex
              justify-between
              items-center
            "
          >
            <span className="text-[8px] text-slate-800 dark:text-white/80">
              Assessment Quiz
            </span>

            <button
              type="button"
              className="
                px-2
                py-1
                rounded
                bg-white
                text-black
                text-[6px]
                font-bold
              "
            >
              Preview
            </button>
          </div>
        )}
      </div>

      {/* CERTIFICATE */}
      <div className="border border-black/10 dark:border-white/10 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("certificate")}
          className="
            w-full
            px-3
            py-2.5
            flex
            justify-between
            items-center
            text-[8px]
            text-slate-900
            dark:text-white
            font-semibold
          "
        >
          <span>1 Certificate • Downloadable</span>

          {expandedSection === "certificate" ? (
            <ChevronUp size={13} />
          ) : (
            <ChevronDown size={13} />
          )}
        </button>

        {expandedSection === "certificate" && (
          <div
            className="
              px-3
              py-2
              border-t
              border-black/10
              dark:border-white/10
              flex
              justify-between
              items-center
            "
          >
            <span className="text-[8px] text-slate-800 dark:text-white/80">
              Completion Certificate
            </span>

            <button
              type="button"
              className="
                px-2
                py-1
                rounded
                bg-white
                text-black
                text-[6px]
                font-bold
              "
            >
              Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// REVIEW PUBLISH DASHBOARD
// ============================================================
const ReviewPublishDashboard = ({ formData, shellHeightClass = "h-[calc(100vh-160px)]" }) => {
  const { isDark } = useUserType?.() || {
    isDark: false,
  };

  const shellBg = isDark
    ? '#1C1E24'
    : '#F1F5F7';
    const lCardBg = isDark ? '#1C1E24' : '#F1F5F7';
  const [showEmailBody, setShowEmailBody] = useState(false);
  const [showLandingModal, setShowLandingModal] = useState(false);
  

  const getRenderablePreviewHtml = () => {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <style>
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: 100vh;
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #ffffff;
    }
  </style>
</head>

<body>
  ${
    (formData.landingPageContent || formData.outcomeRichText || "")
      .replace(
        /{{userName}}/g,
        formData.userName || "Abhay H S"
      )
      .replace(
        /{{userEmailID}}/g,
        "abhay.hs1@vodafone.com"
      )
      .replace(
        /{{department}}/g,
        "AI & Data Analytics"
      )
      .replace(
        /{{phishLink}}/g,
        "#training"
      )
  }
</body>
</html>`;
};

  return (
    <div className="w-full">

      {/* =====================================================
          2 x 2 GRID
          
          CARD 1 = SCENARIO
          CARD 2 = EMAIL
          CARD 3 = LANDING PAGE
          CARD 4 = TRAINING
      ===================================================== */}
      <div
        className="
          grid
          grid-cols-1
          lg:grid-cols-3
          gap-4
          items-stretch
        "
      >

        {/* ===================================================
            CARD 1 — SCENARIO SUMMARY
        =================================================== */}
      
<LShapeCard
  theme={REVIEW_SECTION_THEMES.scenario}
  isDark={isDark}
  shellBg={shellBg}
  titleLine1="Scenario"
  titleLine2="Summary"
  description={
    <>
      Review the core
      <br />
      scenario details
      <br />
      before publishing
    </>
  }
  icon={FileText}
  minHeightClass="min-h-[420px]"
  armContent={
    <div className="w-full flex flex-col justify-center gap-1.5">
      {/* Scenario */}
      <label className="text-[12.5px] font-bold text-slate-900 dark:text-white leading-none">
        Scenario
      </label>

      {/* Scenario ID Label */}
      <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400">
        Scenario ID
      </span>

      {/* Scenario ID Field */}
      <div
        className={`w-full h-7 px-2.5 rounded-xl flex items-center shadow-2xs text-[10.5px] font-mono-tech font-bold ${
          isDark
            ? "bg-[#15161A] text-white"
            : "bg-white text-slate-900"
        }`}
      >
        {formData.scenarioId || "NA"}
      </div>
    </div>
  }
>
  {/* =================================================
      SCENARIO NAME
  ================================================= */}
  <ScenarioSummaryField
    label="Scenario Name"
    value={formData.scenarioName}
    isDark={isDark}
    className="mb-2"
    
  />

  {/* =================================================
      DESCRIPTION
  ================================================= */}
  <ScenarioSummaryField
    label="Description"
    value={formData.description}
    isDark={isDark}
    multiline
    className="mb-2"
  />

  {/* =================================================
      SCENARIO METADATA
  ================================================= */}
  <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-1">

    {/* TYPE */}
    <ScenarioSummaryField
      label="Type"
      value={formData.type}
      isDark={isDark}
    />

    {/* MOTIVATOR */}
    <ScenarioSummaryField
      label="Motivator"
      value={formData.motivator}
      isDark={isDark}
    />

    {/* TARGET AUDIENCE */}
    <ScenarioSummaryField
      label="Target Audience"
      value={formData.targetAudience}
      isDark={isDark}
    />

    {/* DIFFICULTY */}
    <ScenarioSummaryField
      label="Difficulty"
      value={formData.difficulty}
      isDark={isDark}
    />

  </div>
</LShapeCard>

        {/* ===================================================
            CARD 2 — EMAIL SUMMARY
        =================================================== */}
        
<LShapeCard
  theme={REVIEW_SECTION_THEMES.email}
  isDark={isDark}
  shellBg={shellBg}
  titleLine1="Email"
  titleLine2="Summary"
  description={
    <>
      Review the sender
      <br />
      and message content
      <br />
      before publishing
    </>
  }
  icon={Send}
  minHeightClass="min-h-[420px]"
  armContent={
    <div className="flex flex-col justify-center gap-1.5 w-full">
      
      {/* Sender Details */}
      <label className="text-[12.5px] font-bold text-slate-900 dark:text-white leading-none">
        Sender Details
      </label>
    <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400">
                    Sender Name
                  </span>
      <div
        className={`w-full h-7 px-3 rounded-xl flex items-center shadow-2xs text-[10.5px] font-medium truncate ${
          isDark
            ? "bg-[#15161A] text-white"
            : "bg-white text-slate-900"
        }`}
      >
        {formData.senderName || "NA"}
      </div>

    </div>
  }
>
  <div
                  style={{ backgroundColor: lCardBg }}
                  className="w-full flex-1 rounded-tl-xl rounded-b-lg flex flex-col justify-between gap-2.5 z-10"
                >
                   {/* =================================================
      SENDER EMAIL ID
  ================================================= */}
  <div className="flex flex-col gap-0.5">
    <label className="text-[12px] font-bold text-slate-900 dark:text-white">
      Sender Email ID
    </label>

    <div
        className={`w-full h-7 px-2.5 rounded-xl flex items-center shadow-2xs text-[10.5px] font-mono-tech font-bold ${
          isDark
            ? "bg-[#15161A] text-white"
            : "bg-white text-slate-900"
        }`}
      >
      {formData.emailId || "NA"}
    </div>
  </div>

  {/* =================================================
      EMAIL SUBJECT
  ================================================= */}
  <div className="flex flex-col gap-0.5">
    <label className="text-[12px] font-bold text-slate-900 dark:text-white">
      Email Subject
    </label>

    <div
      className={`w-full min-h-[34px] px-3 py-1.5 rounded-xl flex items-center shadow-2xs text-[10.5px] font-medium leading-snug ${
        isDark
          ? "bg-[#15161A] text-white"
          : "bg-white text-slate-900"
      }`}
    >
      {formData.emailSubject || "NA"}
    </div>
  </div>

  {/* =================================================
      EMAIL BODY
  ================================================= */}
 
<div className="flex flex-col gap-1">
  <label className="text-[11.5px] font-bold text-slate-700 dark:text-slate-300">
    Email Body
  </label>

  {/* Email Body Preview Button */}
  <button
    type="button"
    onClick={() => setShowEmailBody(true)}
    className="
      w-full
      h-[42px]
      px-3
      rounded-xl
      bg-black
      dark:bg-[#121418]
      text-white
      flex
      items-center
      justify-between
      cursor-pointer
      hover:bg-black/90
      dark:hover:bg-[#181A20]
      active:scale-[0.99]
      transition-all
      shadow-xs
      text-left
    "
  >
    <div className="flex flex-col leading-tight">
      <span className="text-[10px] font-bold">
        Email Body
      </span>

      <span className="text-[8px] text-white/70 mt-0.5">
        Click here to view full email body
      </span>
    </div>

    <Eye
      className="w-4 h-4 text-white/80 shrink-0"
    />
  </button>
</div>
                </div>
 
</LShapeCard>

        {/* ===================================================
            CARD 3 — LANDING PAGE SUMMARY
        =================================================== */}
        
<LShapeCard
  theme={REVIEW_SECTION_THEMES.landing}
  isDark={isDark}
  shellBg={shellBg}
  titleLine1="Landing Page"
  titleLine2="& Training"
  description={
    <>
      Review the landing
      <br />
      page and training
      <br />
      attached to this scenario
    </>
  }
  icon={GraduationCap}
  minHeightClass="min-h-[420px]"
  armContent={
    <div className="w-full flex flex-col justify-center gap-1">
      
      {/* ================================================
          LANDING PAGE HEADER
      ================================================= */}
      <label className="text-[12.5px] font-bold text-slate-900 dark:text-white leading-none">
        Landing Page
      </label>

      {/* Landing Page White Underlay */}
      <div
        className={`w-full p-2.5 rounded-2xl shadow-2xs flex flex-col gap-1 ${
          isDark
            ? "bg-[#15161A] text-white border border-white/10"
            : "bg-white text-slate-900"
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] flex-shrink-0" />

          <span className="text-[10.5px] font-mono-tech font-bold text-slate-900 dark:text-white">
            {formData.landingPageId ||
              formData.landingPageSource ||
              "Not Attached"}
          </span>
        </div>

        <span className="text-[8.5px] text-slate-500 dark:text-slate-400 leading-tight">
          Click here to view Landing Page in full screen
        </span>

        <div className="flex justify-end pt-0.5">
          <button
            type="button"
           onClick={() => setShowLandingModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFE4E6] text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 text-[8.5px] font-bold cursor-pointer hover:bg-rose-200 transition-colors shadow-2xs"
          >
            <span>Full Screen View</span>
            <Eye className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  }
>


  {/* =================================================
      TRAINING PATH
  ================================================= */}

  <div className="flex flex-col gap-1">

    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-[12.5px] font-voda font-bold text-slate-900 dark:text-white">
          Training Path
        </h4>
      </div>
    </div>

    {/* =================================================
        TRAINING PATH
    ================================================= */}
    {formData.trainingSource === "training-path" &&
      formData.selectedTrainingPath && (
        <div
          className={`
            w-full
            p-3
            rounded-2xl
            shadow-2xs
            flex
            flex-col
            gap-2
            ${
              isDark
                ? "bg-[#15161A] text-white border border-white/10"
                : "bg-white text-slate-900"
            }
          `}
        >
          {/* Training ID */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] flex-shrink-0" />

            <span className="text-[10.5px] font-mono-tech font-bold text-slate-900 dark:text-white">
              {formData.selectedTrainingPath.trainingCode || "NA"}
            </span>
          </div>

          {/* Training Name */}
          <p className="text-[10.5px] font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {formData.selectedTrainingPath.title || "NA"}
          </p>
          
          <div className="flex flex-col gap-2.5 pt-1">
                                  {/* Item 1: Videos */}
                                  <div className="flex items-center gap-2.5">
                                    <Play className="w-3.5 h-3.5 fill-black dark:fill-white text-black dark:text-white flex-shrink-0" />
                                    <div className="flex flex-col text-left leading-tight">
                                      <span className="text-[10px] font-bold text-slate-900 dark:text-white">
                                        4 Videos
                                      </span>
                                      <span className="text-[8.5px] text-slate-500 dark:text-slate-400">
                                        Total Duration: 10 seconds
                                      </span>
                                    </div>
                                  </div>
          
                                  {/* Item 2: Quiz */}
                                  <div className="flex items-center gap-2.5">
                                    <HelpCircle className="w-3.5 h-3.5 text-black dark:text-white flex-shrink-0" />
                                    <div className="flex flex-col text-left leading-tight">
                                      <span className="text-[10px] font-bold text-slate-900 dark:text-white">
                                        1 Quiz
                                      </span>
                                      <span className="text-[8.5px] text-slate-500 dark:text-slate-400">
                                        Total Questions: 1
                                      </span>
                                    </div>
                                  </div>
          
                                  {/* Item 3: Certificate */}
                                  <div className="flex items-center gap-2.5">
                                    <Award className="w-3.5 h-3.5 text-black dark:text-white flex-shrink-0" />
                                    <div className="flex flex-col text-left leading-tight">
                                      <span className="text-[10px] font-bold text-slate-900 dark:text-white">
                                        1 Certificate
                                      </span>
                                      <span className="text-[8.5px] text-slate-500 dark:text-slate-400">
                                        Passing score : 75 %
                                      </span>
                                    </div>
                                  </div>
                                </div>
          
        </div>

        
      )}

    {/* =================================================
        INDIVIDUAL TRAINING
    ================================================= */}
    {formData.trainingSource === "individual-training" &&
      formData.individualTraining && (
        <div
          className={`
            w-full
            p-3
            rounded-2xl
            shadow-2xs
            ${
              isDark
                ? "bg-[#15161A] text-white border border-white/10"
                : "bg-white text-slate-900"
            }
          `}
        >
          <IndividualTrainingReview
            data={formData.individualTraining}
          />
        </div>
      )}

    {/* =================================================
        NO TRAINING
    ================================================= */}
    {!formData.trainingSource && (
      <div
        className="
          min-h-[130px]
          rounded-2xl
          border
          border-dashed
          border-slate-300
          dark:border-white/10
          flex
          flex-col
          items-center
          justify-center
          text-[9px]
          text-slate-400
          dark:text-white/40
          gap-2
        "
      >
        <GraduationCap
          size={24}
          className="opacity-30"
        />

        <span>No training attached</span>
      </div>
    )}

  </div>
</LShapeCard>
      </div>
      {/* =================================================
    EMAIL BODY PREVIEW MODAL
================================================= */}
{showEmailBody && (
  <div
    className="
      fixed
      inset-0
      z-[9999]
      bg-black/80
      backdrop-blur-sm
      flex
      items-center
      justify-center
      p-4
      sm:p-6
    "
  >
    <div
      className="
        w-full
        max-w-2xl
        max-h-[85vh]
        bg-white
        dark:bg-[#181A20]
        rounded-2xl
        overflow-hidden
        shadow-2xl
        border
        border-white/20
        flex
        flex-col
      "
    >

      {/* Modal Header */}
      <div
        className="
          px-5
          py-3
          border-b
          border-slate-200
          dark:border-white/10
          flex
          items-center
          justify-between
          bg-slate-100
          dark:bg-[#121418]
        "
      >
        <div className="flex items-center gap-2">
          <Send
            className="w-4 h-4 text-slate-600 dark:text-white/70"
          />

          <span
            className="
              text-xs
              font-bold
              text-slate-900
              dark:text-white
              uppercase
              tracking-wider
            "
          >
            Email Body Preview
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowEmailBody(false)}
          className="
            p-1
            rounded-lg
            text-slate-400
            hover:text-black
            dark:hover:text-white
            hover:bg-black/5
            dark:hover:bg-white/10
            cursor-pointer
            transition-colors
          "
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Email Content */}
      <div
        className="
          p-4
          sm:p-5
          overflow-y-auto
          max-h-[70vh]
          bg-slate-50
          dark:bg-black/40
          custom-light-scrollbar
        "
      >
        <div
          className="
            bg-white
            dark:bg-[#15161A]
            rounded-xl
            shadow-xs
            border
            border-slate-200
            dark:border-white/10
            p-5
            text-[10px]
            text-slate-900
            dark:text-white
            leading-relaxed
          "
          dangerouslySetInnerHTML={{
            __html: formData.emailBody || `
              <p>No email body available.</p>
            `,
          }}
        />
      </div>
    </div>
  </div>
)}

{/* =====================================================
    LANDING PAGE FULL SCREEN MODAL
===================================================== */}
{/* ================================================================ */}
{/* FULL SCREEN LANDING PAGE PREVIEW - MATCHED TO REFERENCE        */}
{/* ================================================================ */}

{showLandingModal &&
  typeof document !== "undefined" &&
  createPortal(
    <div
      id="review-landing-page-fullscreen-viewport"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2147483647,
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* ========================================================== */}
      {/* GO BACK BUTTON - TOP LEFT                                  */}
      {/* ========================================================== */}

      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          zIndex: 2147483647,
        }}
      >
        <button
          type="button"
          onClick={() => setShowLandingModal(false)}
          className="
            px-4
            py-2
            rounded-xl
            bg-black
            hover:bg-black/80
            text-white
            font-voda
            font-bold
            text-xs
            uppercase
            tracking-wider
            flex
            items-center
            gap-2
            cursor-pointer
            shadow-2xl
            hover:scale-105
            active:scale-95
            transition-all
            border
            border-white/30
          "
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          Go Back
        </button>
      </div>

      {/* ========================================================== */}
      {/* CLOSE BUTTON - TOP RIGHT                                  */}
      {/* ========================================================== */}

      <div
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          zIndex: 2147483647,
        }}
      >
        <button
          type="button"
          onClick={() => setShowLandingModal(false)}
          className="
            p-2
            rounded-xl
            bg-black/70
            hover:bg-black
            text-white
            backdrop-blur-md
            border
            border-white/20
            shadow-2xl
            cursor-pointer
            hover:scale-105
            active:scale-95
            transition-all
          "
          aria-label="Close landing page preview"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* ========================================================== */}
      {/* FULL SCREEN LIVE LANDING PAGE                              */}
      {/* ========================================================== */}

      <iframe
        title="Full Screen Live Landing Page"
        srcDoc={getRenderablePreviewHtml()}
        style={{
          width: "100vw",
          height: "100vh",
          border: "none",
          margin: 0,
          padding: 0,
          display: "block",
          backgroundColor: "#ffffff",
        }}
      />
    </div>,
    document.body
  )}
    </div>
  );
};


export default ReviewPublishDashboard;