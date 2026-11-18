
import { useTraining } from "../TrainingContext";
import { X } from "lucide-react";
import TrainingToast from "./shared/TrainingToast";
import PackageFrame from "./PackageFrame";

import {
  VideoPlayerModal,
  QuizTakerModal,
  CertificateViewerModal
} from "./modals/Modals";
import { PathwaySequencePlayerModal } from "./modals/PathwaySequencePlayerModal";

export const LmsModals = () => {
  const {
    isDark,
    setPaths,
    videos,
    quizzes,
    certificates,
    packages,
    activeVideo,
    setActiveVideo,
    activeQuiz,
    setActiveQuiz,
    activeCert,
    setActiveCert,
    activePathSequence,
    activeInteractivePath,
    setActiveInteractivePath,
    launchStandalonePkg,
    setLaunchStandalonePkg,
    handleNextSequenceStep
  } = useTraining();

  return (
    <>
      {/* VIEWER MODALS */}
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          onClose={() => {
            if (activePathSequence) {
              handleNextSequenceStep();
            } else {
              setActiveVideo(null);
            }
          }}
        />
      )}

      {activeQuiz && (
        <QuizTakerModal
          quiz={activeQuiz}
          onClose={() => {
            if (activePathSequence) {
              handleNextSequenceStep();
            } else {
              setActiveQuiz(null);
            }
          }}
        />
      )}

      {activeCert && (
        <CertificateViewerModal
          certificate={activeCert}
          onClose={() => {
            setActiveCert(null);
          }}
        />
      )}

      {activeInteractivePath && (
        <PathwaySequencePlayerModal
          path={activeInteractivePath}
          videos={videos}
          quizzes={quizzes}
          certificates={certificates}
          packages={packages}
          isDark={isDark}
          onClose={() => setActiveInteractivePath(null)}
          onSendForApproval={async (pToSubmit) => {
            const submittedPath = {
              ...pToSubmit,
              status: 'Pending'
            };
            try {
              const { savePath } = await import("./utility/db");
              await savePath(submittedPath);
              setPaths(prev => prev.map(item => item.TrainingPathID === pToSubmit.TrainingPathID ? submittedPath : item));
            } catch (err) {
              console.error("Failed to submit path for approval", err);
            }
          }}
        />
      )}

      {/* Standalone package player modal */}
      {launchStandalonePkg && (
        <div
          onClick={() => setLaunchStandalonePkg(null)}
          className="fixed inset-0 z-50 backdrop-blur-2xl bg-black/60 flex items-center justify-center p-4 text-left cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl bg-[#090D1A] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh] border border-white/10 cursor-default"
          >
            <div className="px-6 py-4 bg-black/40 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                  {launchStandalonePkg.PackageName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLaunchStandalonePkg(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 bg-black relative flex">
              <PackageFrame pkg={launchStandalonePkg} />
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback Notification */}
      <TrainingToast />
    </>
  );
};

export default LmsModals;
