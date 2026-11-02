import React from "react";
import { Layers, X, Play, HelpCircle, Award, Check, UploadCloud } from "lucide-react";

import { extractZipHtml } from "../utility/zipHelpers";
import { useUserType } from "@/UserTypeContext/UserTypeContext";

export const PathwaySequencePlayerModal = ({
  path,
  videos,
  quizzes,
  certificates,
  packages = [],
  isDark,
  onClose,
  onSendForApproval,
  isInline = false
}) => {
  const userContext = useUserType?.() || {};
  const loggedInName = React.useMemo(() => {
    if (userContext.user?.UserName) return userContext.user.UserName;
    try {
      const activeUser = localStorage.getItem("voisshield_active_user");
      if (activeUser) {
        const parsed = JSON.parse(activeUser);
        if (parsed?.UserName) return parsed.UserName;
      }
      const currentUser = localStorage.getItem("voisshield_current_user");
      if (currentUser) {
        const parsed = JSON.parse(currentUser);
        if (parsed?.UserName) return parsed.UserName;
      }
    } catch { /* ignore */ }
    return "Abhay H S";
  }, [userContext.user]);

  const [activeItemIndex, setActiveItemIndex] = React.useState(0);

  // Interactive Quiz States
  const [quizCurrentIdx, setQuizCurrentIdx] = React.useState(0);
  const [quizAnswers, setQuizAnswers] = React.useState({});
  const [quizCompleted, setQuizCompleted] = React.useState(false);

  const sequenceItems = React.useMemo(() => {
    const items





 = [];

    if (path.isZipPath && path.attachedZipID) {
      const pkg = (packages || []).find(p => p.PackageID === path.attachedZipID);
      if (pkg) {
        items.push({
          id: pkg.PackageID + "-0",
          type: "zip",
          name: pkg.PackageName,
          meta: `Standalone Sandbox Simulation`,
          data: pkg
        });
      }
    }

    (path.TrainingVideoAttached || []).forEach((vidId, idx) => {
      const vid = videos.find((v) => v.TrainingVideoID === vidId);
      if (vid) {
        items.push({
          id: vid.TrainingVideoID + "-" + idx,
          type: "video",
          name: vid.TrainingVideoName,
          meta: `Video Module`,
          data: vid
        });
      }
    });

    (path.TrainingQuizAttached || []).forEach((quizId, idx) => {
      const qz = quizzes.find((q) => q.TrainingQuizID === quizId);
      if (qz) {
        const qCount = qz.QuizData ? Object.keys(qz.QuizData).length : 10;
        items.push({
          id: qz.TrainingQuizID + "-" + idx,
          type: "quiz",
          name: qz.TrainingQuizName,
          meta: `Assessment • ${qCount} Qs`,
          data: qz
        });
      }
    });

    (path.TrainingCertificateAttached || []).forEach((certId, idx) => {
      const cert = certificates.find((c) => c.TrainingCertificateID === certId);
      if (cert) {
        items.push({
          id: cert.TrainingCertificateID + "-" + idx,
          type: "certificate",
          name: cert.TrainingCertificateName,
          meta: `Accreditation Award`,
          data: cert
        });
      }
    });

    return items;
  }, [path, videos, quizzes, certificates, packages]);

  const activeItem = sequenceItems[activeItemIndex];

  // Standalone Zip States inside Sequence Player
  const [zipHtmlUrl, setZipHtmlUrl] = React.useState("");
  const [zipError, setZipError] = React.useState("");

  React.useEffect(() => {
    if (activeItem?.type === "zip") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setZipHtmlUrl("");
      setZipError("");
      const pkg = activeItem.data;
      const source = pkg.isLocalUrl && pkg.localPath ? pkg.localPath : pkg.fileBlob;
      if (source) {
        extractZipHtml(source)
          .then((url) => setZipHtmlUrl(url))
          .catch((err) => {
            console.error(err);
            setZipError(err.message || "Failed to launch sandboxed sandbox environment.");
          });
      }
    }
  }, [activeItemIndex, activeItem]);

  if (!activeItem) return null;

  const content = (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`w-full overflow-hidden flex flex-col border cursor-default rounded-[28px] ${
        isInline 
          ? "h-full min-h-[500px]" 
          : "max-w-7xl h-[92vh] shadow-2xl"
      } ${
        isDark ? "bg-[#0B1121] border-white/10" : "bg-[#F8FAFC] border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-2 border-b flex items-center justify-between flex-shrink-0 ${
          isDark ? "bg-black/40 border-white/10" : "bg-slate-100 border-slate-200"
        }`}>
          <div className="flex items-center gap-3">
            <Layers className={`w-5 h-5 ${isDark ? "text-[#E60000]" : "text-slate-800"}`} />
            <h2 className={`text-sm font-black uppercase tracking-tight font-voda ${isDark ? "text-white" : "text-slate-800"}`}>
              {path.TrainingPathName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isDark ? "text-slate-400 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-800 hover:bg-black/5"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Main Viewer Area (Left) */}
          <div className={`flex-1 flex flex-col relative overflow-hidden ${
            isDark ? "bg-black" : "bg-white"
          }`}>
            {activeItem.type === "video" && (
              <div className="w-full h-full flex flex-col bg-black">
                <video
                  key={activeItem.id}
                  src={activeItem.data.TrainingVideo}
                  className="w-full h-full object-contain bg-black"
                  autoPlay
                  controls
                  controlsList="nodownload"
                  onError={(e) => {
                     e.currentTarget.style.display = 'none';
                     const errorDiv = document.createElement('div');
                     errorDiv.className = "w-full h-full flex flex-col items-center justify-center text-center p-8 bg-black";
                     errorDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-600 mb-4"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg><p class="text-white text-sm font-bold uppercase tracking-widest">Video Stream Unavailable</p><p class="text-slate-500 text-xs mt-2 max-w-sm">The requested media asset (${activeItem.data.TrainingVideoName}) cannot be loaded in this sandboxed environment.</p>`;
                     e.currentTarget.parentNode?.appendChild(errorDiv);
                  }}
                />
              </div>
            )}
            {activeItem.type === "zip" && (
              <div className="w-full h-full flex flex-col bg-black relative flex items-center justify-center">
                {zipError ? (
                  <div className="p-6 text-center max-w-md">
                    <p className="text-red-400 text-sm font-bold uppercase">Compilation Error</p>
                    <p className="text-xs text-slate-400 mt-2">{zipError}</p>
                  </div>
                ) : zipHtmlUrl ? (
                  <iframe
                    src={zipHtmlUrl}
                    title={activeItem.data.PackageName}
                    className="w-full h-full border-none"
                    sandbox="allow-scripts allow-same-origin allow-modals"
                  />
                ) : (
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                      Extracting files...
                    </p>
                  </div>
                )}
              </div>
            )}
            {activeItem.type === "quiz" && (() => {
              const quiz = activeItem.data;
              const questionsKeys = Object.keys(quiz.QuizData || {}).sort();
              const totalQuestions = questionsKeys.length;
              const currentKey = questionsKeys[quizCurrentIdx];
              const questionItem = quiz.QuizData[currentKey];

              const handleSelectOption = (option) => {
                setQuizAnswers({
                  ...quizAnswers,
                  [currentKey]: option
                });
              };

              const nextQuestion = () => {
                if (quizCurrentIdx < totalQuestions - 1) {
                  setQuizCurrentIdx(quizCurrentIdx + 1);
                } else {
                  setQuizCompleted(true);
                }
              };

              const prevQuestion = () => {
                if (quizCurrentIdx > 0) {
                  setQuizCurrentIdx(quizCurrentIdx - 1);
                }
              };

              // Compute stats
              let correctCount = 0;
              questionsKeys.forEach((key) => {
                if (quizAnswers[key] === quiz.QuizData[key].Answer) {
                  correctCount++;
                }
              });
              const scorePct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
              const passed = scorePct >= quiz.TrainingCompletionThreshold;

              return (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-6 lg:p-10 custom-light-scrollbar">
                  {!quizCompleted ? (
                    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6 text-left">
                      <div className="text-center">
                        <h2 className={`text-xl font-black ${isDark ? "text-white" : "text-slate-800"} uppercase tracking-tight`}>
                          {quiz.TrainingQuizName}
                        </h2>
                        <p className={`text-xs mt-1.5 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                          {quiz.Description}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#E60000] to-[#7C3AED] h-full transition-all duration-300"
                          style={{ width: `${((quizCurrentIdx + 1) / totalQuestions) * 100}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span>Question {quizCurrentIdx + 1} of {totalQuestions}</span>
                        <span>Passing Threshold: {quiz.TrainingCompletionThreshold}%</span>
                      </div>

                      <h3 className={`text-base font-black ${isDark ? "text-white" : "text-slate-800"} leading-snug`}>
                        {questionItem?.question}
                      </h3>

                      {/* Options */}
                      <div className="flex flex-col gap-2.5">
                        {(["optionA", "optionB", "optionC", "optionD"] ).map((optKey) => {
                          const text = questionItem?.[optKey];
                          if (!text) return null;
                          const isSelected = quizAnswers[currentKey] === optKey;

                          return (
                            <button
                              key={optKey}
                              type="button"
                              onClick={() => handleSelectOption(optKey)}
                              className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150 flex items-center justify-between text-xs font-semibold cursor-pointer ${
                                isSelected
                                  ? "bg-[#7C3AED]/15 border-[#7C3AED] text-slate-900 dark:text-white shadow-sm"
                                  : isDark 
                                  ? "bg-white/[0.02] border-white/5 hover:border-white/15 text-slate-300 hover:text-white" 
                                  : "bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900"
                              }`}
                            >
                              <span className="flex-1 pr-2">{text}</span>
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isSelected ? "bg-[#7C3AED] border-transparent" : "border-slate-500"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Nav Actions */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                        <button
                          type="button"
                          onClick={prevQuestion}
                          disabled={quizCurrentIdx === 0}
                          className="h-9 px-4 rounded-lg bg-white/5 border border-white/5 disabled:opacity-25 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={nextQuestion}
                          disabled={!quizAnswers[currentKey]}
                          className="h-9 px-5 rounded-lg bg-[#E60000] hover:bg-[#c40000] transition-colors disabled:opacity-40 disabled:hover:bg-[#E60000] disabled:cursor-not-allowed text-xs font-bold text-white uppercase tracking-wider cursor-pointer shadow-md"
                        >
                          {quizCurrentIdx === totalQuestions - 1 ? "Finish Assessment" : "Next"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Quiz Results Page */
                    <div className="max-w-md mx-auto w-full flex flex-col items-center justify-center text-center gap-5 mt-4">
                      <div
                        className={`w-14 h-10 flex items-center justify-center text-4xl mb-1`}
                      >
                        {passed ? "🏆" : "⚡"}
                      </div>
                      <div className="flex flex-col gap-1">
                        <h3 className={`text-lg font-black uppercase tracking-tight ${isDark ? "text-white" : "text-slate-800"}`}>
                          {passed ? "Assessment Passed" : "Criteria Not Met"}
                        </h3>
                        <p className="text-xs text-slate-400">
                          Course: {quiz.TrainingQuizName}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full bg-white/[0.02] border border-black/5 p-4 rounded-xl text-left mt-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Your Score</span>
                          <span className={`text-2xl font-black ${passed ? "text-emerald-400" : "text-rose-400"}`}>
                            {scorePct}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Required</span>
                          <span className="text-2xl font-black text-slate-300">
                            {quiz.TrainingCompletionThreshold}%
                          </span>
                        </div>
                        <div className="col-span-2 border-t border-black/5 dark:border-white/5 pt-2 flex justify-between text-xs text-slate-400 font-semibold">
                          <span>Total Questions: {totalQuestions}</span>
                          <span>Correct: {correctCount}</span>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-4 justify-center">
                        {!passed && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuizCurrentIdx(0);
                              setQuizAnswers({});
                              setQuizCompleted(false);
                            }}
                            className="h-10 px-5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-bold text-white cursor-pointer uppercase"
                          >
                            Retry Quiz
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (activeItemIndex < sequenceItems.length - 1) {
                              setActiveItemIndex(activeItemIndex + 1);
                            } else {
                              onClose();
                            }
                          }}
                          className="h-10 px-5 rounded-xl bg-white text-[#0B1121] hover:bg-slate-200 text-xs font-bold cursor-pointer shadow-md uppercase"
                        >
                          {activeItemIndex < sequenceItems.length - 1 ? "Proceed to Next Item" : "Finish Pathway"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            {activeItem.type === "certificate" && (() => {
              const rawHtml = activeItem.data["Certificate(html)"] || "";
              const renderedHtml = rawHtml
                .replace(/{{userName}}/g, loggedInName)
                .replace(/{{trainingPathName}}/g, path.TrainingPathName || "Anti-Phishing & Social Engineering Remediation")
                .replace(/{{completionDate}}/g, "18-Sep-2026")
                .replace(/{{certificateId}}/g, activeItem.data.TrainingCertificateID);

              return (
                <div className="flex-1 w-full h-full p-6 lg:p-10 flex flex-col items-center justify-center bg-slate-900 overflow-y-auto custom-light-scrollbar">
                  <div className="max-w-4xl w-full flex-1 flex flex-col min-h-0 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-300">
                    <iframe
                      title="Sequence Certificate View"
                      srcDoc={renderedHtml}
                      className="w-full h-full min-h-[500px] border-none"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sequence Timeline Sidebar (Right) */}
          <div className={`w-full md:w-[320px] lg:w-[380px] flex-shrink-0 border-l flex flex-col p-4 overflow-x-hidden overflow-y-auto ${
            isDark ? "bg-[#121418] border-white/5" : "bg-slate-50 border-slate-200"
          }`}>
            <h4 className={`text-[10px] font-extrabold uppercase tracking-widest mb-4 ${isDark ? "text-slate-500" : "text-slate-400"}`}>
              Timeline
            </h4>
            <div className="flex-1 overflow-y-auto custom-light-scrollbar flex flex-col gap-3 pr-1 pb-4">
              {sequenceItems.map((item, index) => {
                const isActive = activeItemIndex === index;
                const isPassed = activeItemIndex > index;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveItemIndex(index)}
                    className={`relative p-4 rounded-2xl border transition-all cursor-pointer overflow-hidden flex flex-col gap-1 shadow-sm ${
                      isActive
                        ? (isDark ? "bg-white text-slate-900 border-white animate-clay-stagger-1" : "bg-slate-900 text-white border-slate-900")
                        : (isDark ? "bg-white/[0.02] border-white/5 hover:border-white/10 text-slate-300" : "bg-white border-slate-200 hover:border-slate-300 text-slate-600 hover:shadow-md")
                    }`}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <span className={`text-[9px] font-black uppercase tracking-wider ${
                        isActive ? (isDark ? "text-red-600" : "text-red-400") : (isDark ? "text-slate-500" : "text-slate-400")
                      }`}>
                        {item.meta}
                      </span>
                      {isPassed && (
                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
                        </div>
                      )}
                    </div>
                    <h4 className={`text-sm font-black leading-tight line-clamp-2 mt-1 relative z-10 ${
                      isActive ? (isDark ? "text-black" : "text-white") : (isDark ? "text-white" : "text-slate-800")
                    }`}>
                      {item.name}
                    </h4>
                    <div className={`absolute -right-2 -bottom-3 opacity-10 pointer-events-none ${
                      isActive ? (isDark ? "text-black" : "text-white") : (isDark ? "text-white" : "text-slate-900")
                    }`}>
                      {item.type === "video" ? <Play className="w-16 h-16" /> : item.type === "quiz" ? <HelpCircle className="w-16 h-16" /> : <Award className="w-16 h-16" />}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Complete/Exit Button */}
            <div className={`pt-4 border-t mt-auto flex flex-col gap-2.5 ${isDark ? "border-white/10" : "border-slate-200"}`}>
               {path.status === 'Draft' && onSendForApproval && (
                 <button
                   onClick={() => {
                     onSendForApproval(path);
                     onClose();
                   }}
                   className="w-full h-11 rounded-xl bg-violet-600 text-white text-xs font-black shadow-lg hover:bg-violet-700 uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-colors"
                 >
                   <UploadCloud className="w-4 h-4" />
                   <span>Send for Approval</span>
                 </button>
               )}
               <button
                 onClick={onClose}
                 className="w-full h-11 rounded-xl bg-[#E60000] hover:bg-[#c40000] transition-colors text-white text-xs font-black shadow-lg uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
               >
                 Exit
               </button>
            </div>
          </div>
        </div>
      </div>
    );

  if (isInline) {
    return content;
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 backdrop-blur-2xl bg-black/60 flex items-center justify-center p-4 text-left cursor-pointer transition-all duration-300"
    >
      {content}
    </div>
  );
};

export default PathwaySequencePlayerModal;
