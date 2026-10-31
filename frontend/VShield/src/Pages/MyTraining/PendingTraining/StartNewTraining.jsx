import { useState, useEffect } from "react";
import { useUserType } from "../../../UserTypeContext/UserTypeContext";
import { useNavigate } from "react-router-dom";
import TrainingCompletionDetails from "./TrainingHistoryDetails/TrainingCompletionDetails";

import { Check, ArrowLeft } from "lucide-react";

import GetTrainedDetails from "./TrainingHistoryDetails/GetTrainedDetail";
import TrainingQuizDetails from "./TrainingHistoryDetails/TrainingQuizDetails";
import { useParams } from "react-router-dom";

// ============================================================
// SCALE / DESIGN VARIABLES
// ============================================================
const VarScenarioScale = 0.975;

const VarOverallScenarioRoundednessScale = 0.75;

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');

  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Vodafone', 'Montserrat', 'Plus Jakarta Sans', sans-serif;
    font-weight: 900;
  }

  .rounded-2xl {
    border-radius: ${Math.round(16 * VarOverallScenarioRoundednessScale)}px !important;
  }

  .rounded-xl {
    border-radius: ${Math.round(12 * VarOverallScenarioRoundednessScale)}px !important;
  }

  .rounded-lg {
    border-radius: ${Math.round(8 * VarOverallScenarioRoundednessScale)}px !important;
  }

  .rounded-md {
    border-radius: ${Math.round(6 * VarOverallScenarioRoundednessScale)}px !important;
  }
`;

// ============================================================
// TAB HEADER (Docked Stepper Strip style — matches ChooseAScenario.jsx)
// NOTE: This now renders *inside* the shared white/dark shell in
// NewScenario's main return, so it no longer carries its own
// border/rounded-corner/background — only a bottom divider.
// ============================================================
const TrainingTabs = ({ activeTab, onTabChange }) => {
  const steps = [
    { id: 0, titleLine1: "Get Trained", titleLine2: "" },
    { id: 1, titleLine1: "Take Quiz", titleLine2: "" },
    { id: 2, titleLine1: "Completion", titleLine2: "" },
  ];

  return (
    <div
      className="
        w-full
        h-12
        flex
        items-stretch
        border-slate-200
        dark:border-white/10
        select-none
      "
    >
      {steps.map((step) => {
        const isCurrent = activeTab === step.id;
        const isCompleted = activeTab > step.id;

        return (
          <button
            key={step.id}
            type="button"
            disabled={!isCurrent}
            onClick={() => {
              // Prevent changing tabs by clicking
              // Navigation is controlled only by BACK and NEXT
              if (isCurrent) {
                onTabChange(step.id);
              }
            }}
            className={`
              flex-1
              flex
              items-center
              justify-center
              gap-3
              px-4
              py-3
              transition-all

              ${
                isCurrent
                  ? `
                    bg-[#06080D]
                    dark:bg-white
                    text-white
                    dark:text-black
                    shadow-sm
                    cursor-default
                  `
                  : `
                    cursor-not-allowed
                    ${
                      isCompleted
                        ? "bg-[#06080D] text-[#8ED973] dark:text-[#74D054]"
                        : ""
                    }
                  `
              }
            `}
          >
            <div
              className={`
                w-6
                h-6
                rounded-full
                flex
                items-center
                justify-center
                text-[11px]
                font-black
                flex-shrink-0
                transition-colors

                ${
                  isCurrent
                    ? "bg-white dark:bg-black text-black dark:text-white"
                    : isCompleted
                      ? "bg-[#22c55e] text-white"
                      : "bg-slate-900 text-white dark:bg-white dark:text-black"
                }
              `}
            >
              {isCompleted && !isCurrent ? (
                <Check className="w-3 h-3 stroke-[3]" />
              ) : (
                step.id + 1
              )}
            </div>

            <div className="flex flex-col text-left leading-tight text-[11px] font-voda font-bold tracking-tight">
              <span>{step.titleLine1}</span>
              <span>{step.titleLine2}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const StartNewTraining = () => {
  const { isDark } = useUserType?.() || {
    isDark: false,
  };

  const [activeTab, setActiveTab] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();
  const isPublishing = false;
  const [isVideoCompleted, setIsVideoCompleted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showAssessmentPopup, setShowAssessmentPopup] = useState(false);

  const params = useParams();

  const trainingPathID =
    params?.trainingPathID ??
    params?.trainingPathId ??
    params?.trainingpathid ??
    params?.id ??
    params?.trainingId ??
    params?.TrainingPathID ??
    null;

  const userContext = useUserType?.() || {};

  const userId =
    userContext.userId ??
    userContext.userID ??
    userContext.UserID ??
    userContext.email ??
    userContext.userEmail ??
    null;

  const handleQuizComplete = (result) => {
    setQuizResult(result);
    setQuizSubmitted(true);
    setShowAssessmentPopup(true);
  };

  const handleViewResults = () => {
    setShowAssessmentPopup(false);
    setActiveTab(2);
  };

  const handleRetake = () => {
    setQuizResult(null);
    setActiveTab(1);
  };

  // ==========================================================
  // AUTO DISMISS VALIDATION TOAST
  // ==========================================================
  useEffect(() => {
    if (!errorMsg) {
      return;
    }

    const timer = setTimeout(() => {
      setErrorMsg("");
    }, 4000);

    return () => clearTimeout(timer);
  }, [errorMsg]);

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div
        style={{
          zoom: VarScenarioScale,
        }}
        className="
          w-full
          max-w-[1780px]
          mx-auto
          p-3
          sm:p-3
          -mt-3
          select-none
          font-sans
          flex
          flex-col
          gap-3
        "
      >
        {/* ====================================================
            PAGE HEADER
        ==================================================== */}

        {/* PAGE HEADER */}
        <div
          className={`
    w-full
    h-[38px]
    px-5
    rounded-xl
    border
    flex
    items-center
    transition-colors
    duration-300
    shadow-sm
    ${
      isDark
        ? "bg-white text-[#0B1121] border-slate-200"
        : "bg-[#06080D] text-white border-black/10"
    }
  `}
        >
          <button
            type="button"
            onClick={() => navigate("/my-training")}
            aria-label="Back to My Training"
            className="
      inline-flex
      items-center
      gap-2
      rounded-md
      text-[13px]
      font-bold
      tracking-tight
      uppercase
      transition-opacity
      hover:opacity-75
      focus:outline-none
      focus-visible:ring-2
      focus-visible:ring-[#8ED973]
    "
          >
            <ArrowLeft className="h-4 w-4 shrink-0 stroke-[2.5]" />
            <span>MY TRAINING</span>
          </button>
        </div>

        {/* ====================================================
            TABS + CONTENT — unified white/dark shell
            (matches DetailsAndSettings.jsx's single continuous card:
            docked stepper strip at top, content padded below,
            same background throughout, no seam/double border)
        ==================================================== */}
        <div
          className={`
            w-full
            rounded-2xl
            border
            overflow-hidden
            shadow-xs

            ${
              isDark
                ? "bg-[#0F1015] border-white/10"
                : "bg-white border-slate-200"
            }
          `}
        >
          <TrainingTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div
            className="
              w-full
              min-h-[400px]
              flex
              flex-col
              p-4
              sm:p-5
            "
          >
            {/* Scenario Details */}
            {activeTab === 0 && (
              <GetTrainedDetails
                onVideoCompleted={() => setIsVideoCompleted(true)}
              />
            )}

            {/* Email Details */}
            {activeTab === 1 && (
              <TrainingQuizDetails
                onBack={() => setActiveTab(0)}
                onComplete={handleQuizComplete}
              />
            )}

            {/* Attach Outcomes */}
            {activeTab === 2 && (
              <TrainingCompletionDetails
                result={quizResult}
                trainingPathID={trainingPathID}
                userId={userId}
                isDark={isDark}
                onRetake={handleRetake}
              />
            )}

            {/* ====================================================
    NAVIGATION BUTTONS
    SAME DESIGN AS DetailsAndSettings
==================================================== */}
            <div
              className="
    w-full
    flex
    items-center
    justify-end
    gap-2.5
    mt-auto
    pt-2
    border-black/5
    dark:border-white/10
  "
            >
              {activeTab === 2 ? (
                <button
                  type="button"
                  onClick={() => navigate("/my-training")}
                  className="
      w-[150px]
      h-[24px]
      rounded-3xl
      bg-[#8ED973]
      hover:bg-[#7ec963]
      text-white
      font-voda
      font-bold
      text-[10px]
      uppercase
      tracking-wider
      shadow-sm
      transition-all
      flex
      items-center
      justify-center
    "
                >
                  CONTINUE TRAINING
                </button>
              ) : (
                <>
                  {/* BACK */}
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 0) {
                        navigate("/my-training"); // Replace with your actual Training page route
                      } else {
                        setActiveTab((prev) => prev - 1);
                      }
                    }}
                    className={`
      w-[90px]
      h-[24px]
      rounded-3xl
      font-voda
      font-bold
      text-[10px]
      uppercase
      transition-all
      shadow-xs
      flex
      items-center
      justify-center

      ${
        activeTab === 0
          ? `
            bg-[#000000]
            dark:bg-[#ffffff]
            text-white
            dark:text-black
            cursor-pointer
          `
          : `
            bg-[#000000]
            dark:bg-[#ffffff]
            hover:bg-black/80
            dark:hover:bg-white/80
            text-white
            dark:text-black
            cursor-pointer
          `
      }
    `}
                  >
                    BACK
                  </button>

                  {/* NEXT / PUBLISH */}
                  <button
                    type="button"
                    disabled={
                      (activeTab === 0 && !isVideoCompleted) ||
                      (activeTab === 1 && !quizSubmitted)
                    }
                    onClick={() => {
                      if (activeTab === 0) {
                        setActiveTab(1);
                      } else if (activeTab === 1 && quizSubmitted) {
                        setActiveTab(2);
                      } else if (activeTab === 1 && !quizSubmitted) {
                        setErrorMsg(
                          "Please submit the assessment before continuing.",
                        );
                      }
                    }}
                    className={`
    w-[90px]
    h-[24px]
    rounded-3xl
    bg-[#8ED973]
    hover:bg-[#7ec963]
    text-white
    font-voda
    font-bold
    text-[10px]
    uppercase
    tracking-wider
    shadow-sm
    transition-all
    cursor-pointer
    hover:scale-[1.02]
    active:scale-95
    flex
    items-center
    justify-center
    disabled:opacity-50
    disabled:cursor-not-allowed
    ${
      isVideoCompleted
        ? "bg-[#8ED973] hover:bg-[#7ec963]"
        : "bg-[#8ED973] cursor-not-allowed"
    }
  `}
                  >
                    {activeTab === 3
                      ? isPublishing
                        ? "PUBLISHING..."
                        : "PUBLISH"
                      : "NEXT"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Assessment submitted confirmation popup */}
        {showAssessmentPopup && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="assessment-popup-title"
              className={`
        w-full max-w-md rounded-2xl border p-6 shadow-2xl
        ${
          isDark
            ? "bg-[#252830] border-[#41444F] text-white"
            : "bg-white border-slate-200 text-slate-900"
        }
      `}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-6 w-6 text-emerald-700" />
              </div>

              <h2
                id="assessment-popup-title"
                className="text-lg font-bold font-voda"
              >
                Assessment Submitted Successfully!
              </h2>

              <p
                className={`mt-3 text-sm leading-relaxed ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}
              >
                You have completed your assessment. Proceed to the Completion
                section to check your score and see whether you achieved the
                required passing score.
              </p>

              <button
                type="button"
                onClick={handleViewResults}
                className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#8ED973] px-4 text-sm font-bold text-white transition hover:bg-[#7ec963]"
              >
                View Results
                <Check className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ====================================================
            NAVIGATION BUTTONS
        ==================================================== */}
      </div>
    </>
  );
};

export default StartNewTraining;
