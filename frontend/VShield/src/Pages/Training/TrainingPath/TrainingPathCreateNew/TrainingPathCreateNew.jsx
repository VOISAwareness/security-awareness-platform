import { useState } from "react";
import {
  X,
  Play,
  HelpCircle,
  Award,
  Check,
  ChevronDown,
  Plus,
  Trash2,
  UploadCloud
} from "lucide-react";

import CreateNewCertificates from "../../InvidualTrainings/IndividualCertificates/CreateNewCertificates";
import { useIsDarkMode } from "../../components/modals/helpers";
import { VideoPlayerModal } from "../../components/modals/VideoPlayerModal";
import { QuizTakerModal } from "../../components/modals/QuizTakerModal";
import { CertificateViewerModal } from "../../components/modals/CertificateViewerModal";
import CreateNewVideos from "../../InvidualTrainings/IndividualVideos/CreateNewVideos";
import CreateNewQuiz from "../../InvidualTrainings/IndividualQuiz/CreateNewQuiz";
import { ZipUploader } from "../../InvidualTrainings/IndividualPackages/CreateNewPackages";
import { extractZipHtml } from "../../components/utility/zipHelpers";
import { TrainingVideoCard } from "../../components/cards/TrainingVideoCard";
import { TrainingQuizCard } from "../../components/cards/TrainingQuizCard";
import { TrainingCertificateCard } from "../../components/cards/TrainingCertificateCard";

export const CreateNewTrainingPath = ({
  videos,
  quizzes,
  certificates,
  packages = [],
  onSave,
  onClose,
  editingPath,
  defaultAlwaysAvailable,
  onDelete,
  isInline,
  onAddVideo,
  onAddQuiz,
  onAddCertificate,
  onAddPackage
}) => {
  const isDark = useIsDarkMode();


  const [step, setStep] = useState(1);
  const [pathName, setPathName] = useState(editingPath ? editingPath.TrainingPathName : "");
  const [description, setDescription] = useState(editingPath ? editingPath.Description : "");
  const isAlwaysAvailable = editingPath ? !!editingPath.isAlwaysAvailable : !!defaultAlwaysAvailable;

  // Selection state
  const [pathType, setPathType] = useState(
    editingPath?.isZipPath ? "zip" : "individual"
  );

  const [selectedVideos, setSelectedVideos] = useState(
    editingPath ? editingPath.TrainingVideoAttached || [] : []
  );
  const [selectedQuiz, setSelectedQuiz] = useState(
    editingPath ? editingPath.TrainingQuizAttached?.[0] || "" : ""
  );
  const [selectedCert, setSelectedCert] = useState(
    editingPath ? editingPath.TrainingCertificateAttached?.[0] || "" : ""
  );
  const [selectedPackage, setSelectedPackage] = useState(
    editingPath?.attachedZipID || ""
  );

  // Nested upload modal triggers
  const [showVideoUpload, setShowVideoUpload] = useState(false);
  const [showQuizCreate, setShowQuizCreate] = useState(false);
  const [showCertCreate, setShowCertCreate] = useState(false);
  const [showZipUpload, setShowZipUpload] = useState(false);

  // Accordion section collapse state
  const [expandedSection, setExpandedSection] = useState(() => {
    return pathType === "zip" ? "zips" : "videos";
  });

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? "" : section);
  };

  // Active Preview modal states inside Builder
  const [previewVideo, setPreviewVideo] = useState(null);
  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [previewCert, setPreviewCert] = useState(null);
  const [previewPackage, setPreviewPackage] = useState(null);
  const [packageZipError, setPackageZipError] = useState("");
  const [packageLaunchHtmlUrl, setPackageLaunchHtmlUrl] = useState("");

  const handleLaunchPreviewPackage = async (pkg) => {
    setPreviewPackage(pkg);
    setPackageLaunchHtmlUrl("");
    setPackageZipError("");
    try {
      const source = pkg.isLocalUrl && pkg.localPath ? pkg.localPath : pkg.fileBlob;
      if (!source) throw new Error("Could not trace package website files source.");
      const url = await extractZipHtml(source);
      setPackageLaunchHtmlUrl(url);
    } catch (e) {
      console.error(e);
      setPackageZipError(e?.message || "Internal error compiling HTML5 zip website package.");
    }
  };

  const toggleVideo = (id) => {
    if (selectedVideos.includes(id)) {
      setSelectedVideos(selectedVideos.filter((vidId) => vidId !== id));
    } else {
      setSelectedVideos([...selectedVideos, id]);
    }
  };

  const handlePublish = (status) => {
    if (!pathName.trim()) return;

    const newPath = {
      TrainingPathID: editingPath ? editingPath.TrainingPathID : `TP-${Math.floor(10000 + Math.random() * 90000)}`,
      TrainingPathName: pathName,
      "Thumbnail(CoverImage)": editingPath ? editingPath["Thumbnail(CoverImage)"] : `CovImg-00${Math.floor(1 + Math.random() * 5)}.png`,
      Description: description || "Custom constructed remediation training program.",
      CreatedOn: editingPath ? editingPath.CreatedOn : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).replace(/ /g, "-"),
      UsedTime: pathType === "zip" ? 20 : (selectedVideos.length * 5 + 10),
      TrainingVideoAttached: pathType === "individual" ? selectedVideos : [],
      TrainingQuizAttached: pathType === "individual" && selectedQuiz ? [selectedQuiz] : [],
      TrainingCertificateAttached: selectedCert ? [selectedCert] : [],
      isAlwaysAvailable,
      isZipPath: pathType === "zip" ? true : undefined,
      attachedZipID: pathType === "zip" ? selectedPackage : undefined,
      status: status
    };

    onSave(newPath);
    onClose();
  };

  const bgCard = isDark ? "bg-[#090D1A] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800 shadow-xl";
  const textPrimary = isDark ? "text-white" : "text-slate-900";
  const bgInput = isDark ? "bg-[#15161A] border-white/10 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-900 placeholder-slate-400 shadow-2xs";

  if (showVideoUpload) {
    return (
      <CreateNewVideos
        isInline={true}
        onSave={(newVideo, file) => {
          if (onAddVideo) onAddVideo(newVideo, file);
          setSelectedVideos([...selectedVideos, newVideo.TrainingVideoID]);
          setShowVideoUpload(false);
        }}
        onClose={() => setShowVideoUpload(false)}
      />
    );
  }

  if (showQuizCreate) {
    return (
      <CreateNewQuiz
        isInline={true}
        onSave={(newQuiz) => {
          if (onAddQuiz) onAddQuiz(newQuiz);
          setSelectedQuiz(newQuiz.TrainingQuizID);
          setShowQuizCreate(false);
        }}
        onClose={() => setShowQuizCreate(false)}
      />
    );
  }

  if (showZipUpload) {
    return (
      <ZipUploader
        isInline={true}
        onSave={(newPkg) => {
          if (onAddPackage) onAddPackage(newPkg);
          setSelectedPackage(newPkg.PackageID);
          setShowZipUpload(false);
        }}
        onClose={() => setShowZipUpload(false)}
      />
    );
  }

  if (showCertCreate) {
    return (
      <CreateNewCertificates
        isInline={true}
        onSave={(newCert, file) => {
          if (onAddCertificate) onAddCertificate(newCert, file);
          setSelectedCert(newCert.TrainingCertificateID);
          setShowCertCreate(false);
        }}
        onClose={() => setShowCertCreate(false)}
      />
    );
  }

  if (previewVideo) {
    return (
      <VideoPlayerModal
        video={previewVideo}
        onClose={() => setPreviewVideo(null)}
        isInline={true}
      />
    );
  }

  if (previewQuiz) {
    return (
      <QuizTakerModal
        quiz={previewQuiz}
        onClose={() => setPreviewQuiz(null)}
        isInline={true}
      />
    );
  }

  if (previewCert) {
    return (
      <CertificateViewerModal
        certificate={previewCert}
        onClose={() => setPreviewCert(null)}
        isInline={true}
      />
    );
  }

  if (previewPackage) {
    return (
      <div className="flex-1 h-full min-h-[500px] bg-[#090D1A] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-white/10 text-left">
        <div className="px-6 py-4 bg-black/40 border-b border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
            {previewPackage.PackageName}
          </span>
          <button
            type="button"
            onClick={() => setPreviewPackage(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 bg-black relative flex items-center justify-center">
          {packageZipError ? (
            <div className="p-6 text-center max-w-md">
              <p className="text-red-400 text-sm font-bold uppercase">Compilation Error</p>
              <p className="text-xs text-slate-400 mt-2">{packageZipError}</p>
            </div>
          ) : packageLaunchHtmlUrl ? (
            <iframe
              src={packageLaunchHtmlUrl}
              title={previewPackage.PackageName}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin allow-modals"
            />
          ) : (
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Setting up preview...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const wizardContent = (
    <div className={`overflow-hidden flex flex-col ${
      isInline
        ? "w-full h-full min-h-[500px]"
        : `border rounded-2xl ${bgCard} w-full max-w-3xl h-[85vh]`
    }`}>
        {/* ── DOCKED CONTINUOUS STEPPER STRIP ── */}
        <div
          className={`w-full h-12 flex items-stretch flex-shrink-0 select-none border-b ${
            isDark ? 'border-white/10 bg-[#12141A]' : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="flex-1 flex items-stretch">
            {[
              { id: 1, step: 1, titleLine1: "Describe", titleLine2: isAlwaysAvailable ? "Course" : "Path" },
              { id: 2, step: 2, titleLine1: "Select", titleLine2: "Type" },
              { id: 3, step: 3, titleLine1: "Select", titleLine2: "Assets" },
              { id: 4, step: 4, titleLine1: "Review &", titleLine2: "Publish" }
            ].map((s) => {
              const isCompleted = s.step < step;
              const isCurrent = s.step === step;
              const isFilled = s.step <= step;

              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    if (s.step <= step) {
                      setStep(s.step);
                    } else if (s.step === 2 && pathName.trim()) {
                      setStep(2);
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2.5 px-3 h-full transition-colors duration-200 select-none ${
                    s.step <= step || (s.step === 2 && pathName.trim()) ? "cursor-pointer" : "cursor-default"
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

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-left custom-light-scrollbar">
          {step === 1 && (
            <div className={`p-5 rounded-2xl border flex flex-col gap-5 ${
              isDark ? "bg-[#15161A] border-white/10" : "bg-[#F8FAFC] border-slate-200"
            }`}>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  {isAlwaysAvailable ? "Course Name" : "Learning Path Name"} <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
                </label>
                <input
                  type="text"
                  value={pathName}
                  onChange={(e) => setPathName(e.target.value)}
                  className={`w-full h-10 px-3.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[#E60000] focus:ring-1 focus:ring-[#E60000] border transition-all ${bgInput}`}
                  placeholder={isAlwaysAvailable ? "e.g., Executive Cybersecurity Fundamentals" : "e.g., Advanced Multi-Factor & Credential Security"}
                />
              </div>

              <div className="flex flex-col mt-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={`w-full p-3.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[#E60000] focus:ring-1 focus:ring-[#E60000] resize-none border transition-all ${bgInput}`}
                  placeholder={isAlwaysAvailable ? "Enter course purpose and target objectives..." : "Enter path purpose and target objectives..."}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5 text-left">
              <h3 className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white font-voda">
                Select the type of learning path
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {/* Option A: Modular Sequence */}
                <div
                  onClick={() => setPathType("individual")}
                  className={`p-5 rounded-2xl border flex flex-col gap-2.5 cursor-pointer transition-all shadow-xs ${
                    pathType === "individual"
                      ? "border-[#E60000] bg-red-500/[0.04] dark:bg-red-500/[0.08]"
                      : isDark ? "border-white/10 bg-[#15161A] hover:bg-white/[0.04]" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-red-500/10 text-red-500">
                      <Play className="w-5 h-5 fill-current" />
                    </span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      pathType === "individual" ? "border-red-500 bg-[#E60000]" : "border-slate-400"
                    }`}>
                      {pathType === "individual" && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold uppercase text-slate-900 dark:text-white">Videos & Quizzes</h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Select multiple videos, assessment, and design certificates.
                  </p>
                </div>

                {/* Option B: Imported Package */}
                <div
                  onClick={() => setPathType("zip")}
                  className={`p-5 rounded-2xl border flex flex-col gap-2.5 cursor-pointer transition-all shadow-xs ${
                    pathType === "zip"
                      ? "border-[#E60000] bg-red-500/[0.04] dark:bg-red-500/[0.08]"
                      : isDark ? "border-white/10 bg-[#15161A] hover:bg-white/[0.04]" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <UploadCloud className="w-5 h-5" />
                    </span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      pathType === "zip" ? "border-red-500 bg-[#E60000]" : "border-slate-400"
                    }`}>
                      {pathType === "zip" && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold uppercase text-slate-900 dark:text-white">Import Package (Zip)</h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    Run HTML based training packages.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">
              {pathType === "individual" ? (
                <>
                  {/* Videos Accordion Section */}
                  <div
                    onClick={() => toggleSection("videos")}
                    className={`border rounded-2xl p-4 flex flex-col text-left cursor-pointer transition-colors ${
                      isDark ? "border-white/10 bg-[#15161A]" : "border-slate-200 bg-[#F8FAFC]"
                    }`}
                  >
                    <div
                      className={`w-full flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white ${
                        expandedSection === "videos"
                          ? (isDark ? "border-b pb-2 mb-3.5 border-white/10" : "border-b pb-2 mb-3.5 border-slate-200")
                          : ""
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-[#E60000]" /> Attach Videos (Select Multiple)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowVideoUpload(true);
                          }}
                          className="h-6 px-2.5 rounded-lg bg-[#E60000]/10 border border-[#E60000]/20 text-[9px] font-bold text-[#E60000] flex items-center gap-1 cursor-pointer hover:bg-[#E60000]/20 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Upload New Video
                        </button>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSection === "videos" ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expandedSection === "videos" && (
                      <div onClick={(e) => e.stopPropagation()} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[340px] overflow-y-auto pr-1 custom-light-scrollbar">
                        {videos.map((vid) => {
                          const selected = selectedVideos.includes(vid.TrainingVideoID);
                          return (
                            <TrainingVideoCard
                              key={vid.TrainingVideoID}
                              video={vid}
                              isDark={isDark}
                              isSelected={selected}
                              onSelect={() => toggleVideo(vid.TrainingVideoID)}
                              onPreview={(v) => setPreviewVideo(v)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Quizzes Accordion Section */}
                  <div
                    onClick={() => toggleSection("quizzes")}
                    className={`border rounded-2xl p-4 flex flex-col text-left cursor-pointer transition-colors ${
                      isDark ? "border-white/10 bg-[#15161A]" : "border-slate-200 bg-[#F8FAFC]"
                    }`}
                  >
                    <div
                      className={`w-full flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white ${
                        expandedSection === "quizzes"
                          ? (isDark ? "border-b pb-2 mb-3.5 border-white/10" : "border-b pb-2 mb-3.5 border-slate-200")
                          : ""
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-[#7C3AED]" /> Attach Assessment Quiz (Select One)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowQuizCreate(true);
                          }}
                          className="h-6 px-2.5 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[9px] font-bold text-[#7C3AED] flex items-center gap-1 cursor-pointer hover:bg-[#7C3AED]/20 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Create New Quiz
                        </button>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSection === "quizzes" ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expandedSection === "quizzes" && (
                      <div onClick={(e) => e.stopPropagation()} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[340px] overflow-y-auto pr-1 custom-light-scrollbar">
                        {quizzes.map((qz) => {
                          const selected = selectedQuiz === qz.TrainingQuizID;
                          return (
                            <TrainingQuizCard
                              key={qz.TrainingQuizID}
                              quiz={qz}
                              isDark={isDark}
                              isSelected={selected}
                              onSelect={() => setSelectedQuiz(qz.TrainingQuizID)}
                              onPreview={(q) => setPreviewQuiz(q)}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Imported Package Accordion Section */
                <div
                  onClick={() => toggleSection("zips")}
                  className={`border rounded-2xl p-4 flex flex-col text-left cursor-pointer transition-colors ${
                    isDark ? "border-white/10 bg-[#15161A]" : "border-slate-200 bg-[#F8FAFC]"
                  }`}
                >
                  <div
                    className={`w-full flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white ${
                      expandedSection === "zips"
                        ? (isDark ? "border-b pb-2 mb-3.5 border-white/10" : "border-b pb-2 mb-3.5 border-slate-200")
                        : ""
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <UploadCloud className="w-3.5 h-3.5 text-amber-500" /> Attach Imported Packages (Select One)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowZipUpload(true);
                        }}
                        className="h-6 px-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[9px] font-bold text-amber-500 flex items-center gap-1 cursor-pointer hover:bg-amber-500/20 transition-colors"
                      >
                        <Plus className="w-3 h-3" /> Import New Package (Zip)
                      </button>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSection === "zips" ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {expandedSection === "zips" && (
                    <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 custom-light-scrollbar">
                      {packages.map((pkg) => {
                        const selected = selectedPackage === pkg.PackageID;
                        return (
                          <div
                            key={pkg.PackageID}
                            onClick={() => setSelectedPackage(pkg.PackageID)}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                              selected
                                ? "bg-amber-500/10 border-amber-500"
                                : isDark ? "bg-white/[0.02] border-white/5 hover:border-white/10" : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-black/10 dark:bg-white/10 text-slate-500 dark:text-slate-300 rounded-full font-mono-tech select-none">
                                {pkg.PackageID}
                              </span>
                              <div className="flex flex-col min-w-0 leading-tight">
                                <h4 className={`text-xs font-bold truncate ${textPrimary}`} title={pkg.PackageName}>
                                  {pkg.PackageName}
                                </h4>
                                <span className="text-[9px] text-slate-400 truncate mt-0.5">{pkg.FileName} • {pkg.Size}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLaunchPreviewPackage(pkg);
                                }}
                                className="h-6 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[8.5px] font-bold uppercase tracking-wider flex items-center justify-center border border-amber-500/20 cursor-pointer"
                                title="Launch Preview"
                              >
                                Preview
                              </button>
                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                selected ? "bg-amber-600 border-transparent" : "border-slate-400"
                              }`}>
                                {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Certificate Accordion Selection (Common to both) */}
              <div
                onClick={() => toggleSection("certificates")}
                className={`border rounded-2xl p-4 flex flex-col text-left cursor-pointer transition-colors ${
                  isDark ? "border-white/10 bg-[#15161A]" : "border-slate-200 bg-[#F8FAFC]"
                }`}
              >
                <div
                  className={`w-full flex items-center justify-between text-left font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white ${
                    expandedSection === "certificates"
                      ? (isDark ? "border-b pb-2 mb-3.5 border-white/10" : "border-b pb-2 mb-3.5 border-slate-200")
                      : ""
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-[#16A34A]" /> Attach Completion Certificate (Select One)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCertCreate(true);
                      }}
                      className="h-6 px-2.5 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/20 text-[9px] font-bold text-[#16A34A] flex items-center gap-1 cursor-pointer hover:bg-[#16A34A]/20 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Create Certificate
                    </button>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSection === "certificates" ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {expandedSection === "certificates" && (
                  <div onClick={(e) => e.stopPropagation()} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[340px] overflow-y-auto pr-1 custom-light-scrollbar">
                    {certificates.map((cert) => {
                      const selected = selectedCert === cert.TrainingCertificateID;
                      return (
                        <TrainingCertificateCard
                          key={cert.TrainingCertificateID}
                          certificate={cert}
                          isDark={isDark}
                          isSelected={selected}
                          onSelect={() => setSelectedCert(cert.TrainingCertificateID)}
                          onPreview={(c) => setPreviewCert(c)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div className={`p-5 rounded-2xl border ${
                isDark ? "border-white/10 bg-[#15161A]" : "border-slate-200 bg-[#F8FAFC]"
              }`}>
                <span className="text-[10px] font-extrabold tracking-widest text-[#E60000] block uppercase mb-1">
                  {pathType === "zip" ? "Import Package (Zip)" : "Videos & Quizzes"}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{pathName || "Untitled Learning Path"}</h3>
                <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">{description || "No description provided."}</p>
              </div>

              {/* Interactive Pipeline Sequence */}
              <div>
                <h4 className="text-xs font-bold uppercase mb-3.5 tracking-wider text-slate-700 dark:text-slate-300">
                  Program Flow
                </h4>

                <div className={`flex flex-col gap-3 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] ${
                  isDark ? "before:bg-white/10" : "before:bg-slate-200"
                }`}>
                  {pathType === "individual" ? (
                    <>
                      {/* Sequence 1: Videos */}
                      <div className="flex items-start gap-4 relative z-10">
                        <span className="w-9 h-9 rounded-full bg-[#E60000]/20 border border-[#E60000] flex items-center justify-center text-[#E60000] flex-shrink-0">
                          <Play className="w-4 h-4" />
                        </span>
                        <div className="pt-1 text-left">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">Training Videos</h4>
                          <p className="text-[11px] mt-0.5 text-slate-600 dark:text-slate-400">
                            {selectedVideos.length} Attached Video ({selectedVideos.length * 5} mins est)
                          </p>
                        </div>
                      </div>

                      {/* Sequence 2: Quiz */}
                      <div className="flex items-start gap-4 relative z-10">
                        <span className="w-9 h-9 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED] flex items-center justify-center text-[#7C3AED] flex-shrink-0">
                          <HelpCircle className="w-4 h-4" />
                        </span>
                        <div className="pt-1 text-left">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">Quiz</h4>
                          <p className="text-[11px] mt-0.5 text-slate-600 dark:text-slate-400">
                            {selectedQuiz ? "Quiz Attached" : "None attached"}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Sequence: Imported Package */
                    <div className="flex items-start gap-4 relative z-10">
                      <span className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-500 flex-shrink-0">
                        <UploadCloud className="w-4 h-4" />
                      </span>
                      <div className="pt-1 text-left">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Imported Package</h4>
                        <p className="text-[11px] mt-0.5 text-slate-600 dark:text-slate-400">
                          {selectedPackage ? `Package: ${packages.find(p => p.PackageID === selectedPackage)?.PackageName || selectedPackage}` : "None attached"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sequence 3: Certificate */}
                  <div className="flex items-start gap-4 relative z-10">
                    <span className="w-9 h-9 rounded-full bg-[#16A34A]/20 border border-[#16A34A] flex items-center justify-center text-[#16A34A] flex-shrink-0">
                      <Award className="w-4 h-4" />
                    </span>
                    <div className="pt-1 text-left">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Certificate</h4>
                      <p className="text-[11px] mt-0.5 text-slate-600 dark:text-slate-400">
                        {selectedCert ? "Achievement Certificate Attached" : "None attached"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-[#12141A] border-t border-slate-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
          <div>
            {editingPath && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(isAlwaysAvailable ? "Are you sure you want to delete this course? This action cannot be undone." : "Are you sure you want to delete this learning path? This action cannot be undone.")) {
                    onDelete(editingPath.TrainingPathID);
                    onClose();
                  }
                }}
                className="h-[24px] px-4 rounded-3xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all font-voda uppercase text-[10px] tracking-wider"
              >
                <Trash2 className="w-3.5 h-3.5" /> {isAlwaysAvailable ? "Delete Course" : "Delete Learning Path"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  onClose();
                } else {
                  setStep(step - 1);
                }
              }}
              className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
            >
              BACK
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !pathName.trim()) || (step === 3 && pathType === "individual" && selectedVideos.length === 0) || (step === 3 && pathType === "zip" && !selectedPackage)}
                className="w-[90px] h-[24px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                NEXT
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handlePublish("Pending")}
                className="px-6 h-[24px] rounded-3xl bg-[#E60000] hover:bg-[#c40000] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5"
              >
                REQUEST APPROVAL
              </button>
            )}
          </div>
        </div>

      </div>
    );

    if (isInline) {
      return wizardContent;
    }

    return (
      <div className={`fixed inset-0 z-50 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto transition-all duration-300 ${
        isDark ? "bg-slate-950/45" : "bg-slate-500/15"
      }`}>
        {wizardContent}
      </div>
    );
  };
