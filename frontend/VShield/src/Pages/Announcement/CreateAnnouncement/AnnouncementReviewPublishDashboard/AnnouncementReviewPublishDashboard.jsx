import { useState } from "react";
import { useUserType } from "../../../../UserTypeContext/UserTypeContext";
import {
  Eye,
  FileText,
  Send,
  X,
  ArrowLeft
} from "lucide-react";

import { createPortal } from "react-dom";
// ============================================================
// REVIEW CARD THEMES
// ============================================================
const REVIEW_SECTION_THEMES = {
  template: {
    bgLight: "#ECE8FF",
    bgDark: "#22193E",
  },
  email: {
    bgLight: "#CEFBEA",
    bgDark: "#0D271E",
  }
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
// SCENARIO SUMMARY FIELD
// Matches the field design used in ReviewAndPublishCampaign
// ============================================================
const ScenarioSummaryField = ({
  label,
  value,
  isDark,
  className = "",
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
// REVIEW PUBLISH DASHBOARD
// ============================================================
const AnnouncementReviewPublishDashboard = ({ formData}) => {
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
          lg:grid-cols-2
          gap-4
          items-stretch
        "
      >

        {/* ===================================================
            CARD 1 — SCENARIO SUMMARY
        =================================================== */}
      
<LShapeCard
  theme={REVIEW_SECTION_THEMES.template}
  isDark={isDark}
  shellBg={shellBg}
  titleLine1="Template"
  titleLine2="Summary"
  description={
    <>
      Review the core
      <br />
      template details
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
        Template
      </label>

      {/* Scenario ID Label */}
      <span className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400">
        Template ID
      </span>

      {/* Scenario ID Field */}
      <div
        className={`w-full h-7 px-2.5 rounded-xl flex items-center shadow-2xs text-[10.5px] font-mono-tech font-bold ${
          isDark
            ? "bg-[#15161A] text-white"
            : "bg-white text-slate-900"
        }`}
      >
        {formData.announcementScenarioId || "NA"}
      </div>
    </div>
  }
>
  {/* =================================================
      SCENARIO NAME
  ================================================= */}
  <ScenarioSummaryField
    label="Template Name"
    value={formData.announcementScenarioName}
    isDark={isDark}
    className="mb-2"
    
  />

  {/* =================================================
      DESCRIPTION
  ================================================= */}
  <ScenarioSummaryField
    label="Template Description"
    value={formData.announcementDescription}
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
      label="Template Type"
      value={formData.announcementCampaignType}
      isDark={isDark}
    />

    {/* TARGET AUDIENCE */}
    <ScenarioSummaryField
      label="Template Target Audience"
      value={formData.announcementTargetAudience}
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
        {formData.announcementSenderName || "NA"}
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
      {formData.announcementSenderEmailId || "NA"}
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
      {formData.announcementEmailSubject || "NA"}
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
            __html: formData.announcementEmailBody || `
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


export default AnnouncementReviewPublishDashboard;