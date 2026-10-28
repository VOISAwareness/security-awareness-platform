 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); 
  lastAccessLHS = undefined; } } return value; }

import React, { useState, } from "react";
import { useUserType } from "@/UserTypeContext/UserTypeContext";
import {
  X,
  Play,
  HelpCircle,
  Award,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  Trash2,
  Eye,
  UploadCloud,
  Sparkles
} from "lucide-react";

import CreateNewCertificates from "../InvidualTrainings/IndividualCertificates/CreateNewCertificates"; 
import { useIsDarkMode } from "../components/modals/helpers";
import { VideoPlayerModal } from "../components/modals/VideoPlayerModal";
import { QuizTakerModal } from "../components/modals/QuizTakerModal";
import { CertificateViewerModal } from "../components/modals/CertificateViewerModal";
import CreateNewVideos from "../InvidualTrainings/IndividualVideos/CreateNewVideos";
import CreateNewQuiz from "../InvidualTrainings/IndividualQuiz/CreateNewQuiz";
import { ZipUploader } from "../InvidualTrainings/IndividualPackages/CreateNewPackages";
import { extractZipHtml } from "../Training";
import { TrainingVideoCard } from "../components/cards/TrainingVideoCard";
import { TrainingQuizCard } from "../components/cards/TrainingQuizCard";
import { TrainingCertificateCard } from "../components/cards/TrainingCertificateCard";

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
  const [isAlwaysAvailable, setIsAlwaysAvailable] = useState(() => {
    if (editingPath) return !!editingPath.isAlwaysAvailable;
    return !!defaultAlwaysAvailable;
  });

  // Selection state
  const [pathType, setPathType] = useState(
    _optionalChain([editingPath, 'optionalAccess', _6 => _6.isZipPath]) ? "zip" : "individual"
  );
  
  const [selectedVideos, setSelectedVideos] = useState(
    editingPath ? editingPath.TrainingVideoAttached || [] : []
  );
  const [selectedQuiz, setSelectedQuiz] = useState(
    editingPath ? _optionalChain([editingPath, 'access', _7 => _7.TrainingQuizAttached, 'optionalAccess', _8 => _8[0]]) || "" : ""
  );
  const [selectedCert, setSelectedCert] = useState(
    editingPath ? _optionalChain([editingPath, 'access', _9 => _9.TrainingCertificateAttached, 'optionalAccess', _10 => _10[0]]) || "" : ""
  );
  const [selectedPackage, setSelectedPackage] = useState(
    _optionalChain([editingPath, 'optionalAccess', _11 => _11.attachedZipID]) || ""
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
      setPackageZipError(_optionalChain([e, 'optionalAccess', _12 => _12.message]) || "Internal error compiling HTML5 zip website package.");
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

  const bgCard = isDark ? "bg-[#090D1A] border-white/5 text-white" : "bg-[#F8FAFC] border-slate-200 text-slate-800 shadow-xl";
  // const bgHeader = isDark ? "bg-black/40 border-white/10 text-white" : "bg-slate-100 border-slate-200 text-slate-800";
  // const bgSteps = isDark ? "bg-black/20 border-white/5 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600";
  const textPrimary = isDark ? "text-white" : "text-slate-800";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const bgInput = isDark ? "bg-[#04060d] border-white/10 text-white" : "bg-white border-slate-300 text-slate-800";
  // const bgItem = isDark ? "bg-white/[0.01] border-white/5 hover:border-white/10" : "bg-white border-slate-200 hover:border-slate-300";

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
          } ${isInline ? "rounded-t-[28px] overflow-hidden mb-6" : ""}`}
        >
          <div className="flex-1 flex items-stretch">
            {[
              { id: 1, step: "1", titleLine1: "1. Specifications" },
              { id: 2, step: "2", titleLine1: "2. Pathway Model" },
              { id: 3, step: "3", titleLine1: "3. Select Assets" },
              { id: 4, step: "4", titleLine1: "4. Review & Publish" }
            ].map((s) => {
              const isCurrent = s.id === step;

              if (isCurrent) {
                return (
                  <div
                    key={s.id}
                    className="bg-black dark:bg-white text-white dark:text-black px-8 py-2 flex items-center gap-3 flex-shrink-0 shadow-sm"
                  >
                    <div className="w-5 h-5 rounded-full bg-white dark:bg-black text-black dark:text-white font-black flex items-center justify-center text-[11px] flex-shrink-0">
                      {s.step}
                    </div>
                    <div className="text-left leading-none text-[10px] font-voda font-bold tracking-tight">
                      <span>{s.titleLine1}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={s.id}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 transition-opacity ${
                    isDark ? 'opacity-80 text-white' : 'opacity-85 text-black'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0 ${
                      isDark ? 'bg-white text-black' : 'bg-black text-white'
                    }`}
                  >
                    {s.step}
                  </div>
                  <span className="text-[10px] font-bold truncate">{s.titleLine1.split('. ')[1]}</span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`px-4 flex items-center justify-center border-l hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer ${
              isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"
            }`}
            title="Exit Wizard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto p-6 text-left custom-light-scrollbar">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div>
                <label className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${textSecondary}`}>
                  Pathway Name
                </label>
                <input
                  type="text"
                  value={pathName}
                  onChange={(e) => setPathName(e.target.value)}
                  className={`w-full h-10 px-3 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#E60000] border ${bgInput}`}
                  placeholder="e.g., Advanced Multi-Factor & Credential Security"
                />
              </div>

              <div>
                <label className={`text-[10px] font-extrabold uppercase tracking-wider block mb-1 ${textSecondary}`}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full h-24 p-3 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#E60000] resize-none border ${bgInput}`}
                  placeholder="Enter path purpose and target objectives..."
                />
              </div>

              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                isDark ? "border-white/5 bg-white/[0.01]" : "border-slate-200 bg-slate-50"
              }`}>
                <div>
                  <h4 className={`text-xs font-bold ${textPrimary}`}>Always Available Course</h4>
                  <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                    Enable to make this an elective course open to all users at any time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAlwaysAvailable(!isAlwaysAvailable)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                    isAlwaysAvailable ? "bg-[#16A34A]" : "bg-slate-600"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                      isAlwaysAvailable ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-5 text-left">
              <h3 className={`text-sm font-black uppercase tracking-tight ${textPrimary}`}>
                Select Pathway Model
              </h3>
              <p className={`text-xs -mt-2 leading-relaxed ${textSecondary}`}>
                Choose the format of this training path. You can either construct a sequence of standard lessons or attach a pre-compiled zip package directly.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {/* Option A: Modular Sequence */}
                <div
                  onClick={() => setPathType("individual")}
                  className={`p-5 rounded-2xl border flex flex-col gap-2.5 cursor-pointer transition-all ${
                    pathType === "individual"
                      ? "border-[#E60000] bg-[#E60000]/5"
                      : isDark ? "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-red-500/10 text-red-500">
                      <Play className="w-5 h-5 fill-current" />
                    </span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      pathType === "individual" ? "border-red-500 bg-[#E60000]" : "border-slate-500"
                    }`}>
                      {pathType === "individual" && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                  </div>
                  <h4 className={`text-sm font-black uppercase ${textPrimary}`}>Modular Sequence</h4>
                  <p className={`text-[10.5px] leading-relaxed ${textSecondary}`}>
                    Assemble multiple videos, assessment quizzes, and design achievement certifications.
                  </p>
                </div>

                {/* Option B: Zip Package */}
                <div
                  onClick={() => setPathType("zip")}
                  className={`p-5 rounded-2xl border flex flex-col gap-2.5 cursor-pointer transition-all ${
                    pathType === "zip"
                      ? "border-[#E60000] bg-[#E60000]/5"
                      : isDark ? "border-white/5 bg-white/[0.01] hover:bg-white/[0.03]" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <UploadCloud className="w-5 h-5" />
                    </span>
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      pathType === "zip" ? "border-red-500 bg-[#E60000]" : "border-slate-500"
                    }`}>
                      {pathType === "zip" && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                    </span>
                  </div>
                  <h4 className={`text-sm font-black uppercase ${textPrimary}`}>Standalone Zip</h4>
                  <p className={`text-[10.5px] leading-relaxed ${textSecondary}`}>
                    Run pre-compiled HTML5 training packages.
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
                  <div className="border border-white/5 bg-black/10 rounded-2xl p-4 flex flex-col text-left">
                    <div
                      onClick={() => toggleSection("videos")}
                      className={`w-full flex items-center justify-between border-b pb-2 mb-3.5 text-left font-bold text-xs uppercase tracking-wider cursor-pointer ${textPrimary} ${
                        isDark ? "border-white/5" : "border-slate-200"
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
                          className="h-6 px-2 rounded-lg bg-[#E60000]/10 border border-[#E60000]/20 text-[8.5px] font-bold text-[#E60000] flex items-center gap-1 cursor-pointer hover:bg-[#E60000]/20"
                        >
                          <Plus className="w-3 h-3" /> Upload New Video
                        </button>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSection === "videos" ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                        
                    {expandedSection === "videos" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[340px] overflow-y-auto pr-1 custom-light-scrollbar">
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
                  <div className="border border-white/5 bg-black/10 rounded-2xl p-4 flex flex-col text-left">
                    <div
                      onClick={() => toggleSection("quizzes")}
                      className={`w-full flex items-center justify-between border-b pb-2 mb-3.5 text-left font-bold text-xs uppercase tracking-wider cursor-pointer ${textPrimary} ${
                        isDark ? "border-white/5" : "border-slate-200"
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
                          className="h-6 px-2 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[8.5px] font-bold text-[#7C3AED] flex items-center gap-1 cursor-pointer hover:bg-[#7C3AED]/20"
                        >
                          <Plus className="w-3 h-3" /> Create New Quiz
                        </button>
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSection === "quizzes" ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                    {expandedSection === "quizzes" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[340px] overflow-y-auto pr-1 custom-light-scrollbar">
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
                /* Standalone Zip Accordion Section */
                <div className="border border-white/5 bg-black/10 rounded-2xl p-4 flex flex-col text-left">
                <div
                  onClick={() => toggleSection("zips")}
                  className={`w-full flex items-center justify-between border-b pb-2 mb-3.5 text-left font-bold text-xs uppercase tracking-wider cursor-pointer ${textPrimary} ${
                    isDark ? "border-white/5" : "border-slate-200"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <UploadCloud className="w-3.5 h-3.5 text-amber-500" /> Attach Standalone Zip (Select One)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowZipUpload(true);
                      }}
                      className="h-6 px-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[8.5px] font-bold text-amber-500 flex items-center gap-1 cursor-pointer hover:bg-amber-500/20"
                    >
                      <Plus className="w-3 h-3" /> Upload New Zip
                    </button>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSection === "zips" ? "rotate-180" : ""}`} />
                  </div>
                </div>

                  {expandedSection === "zips" && (
                    <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 custom-light-scrollbar">
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
                                className="h-6 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-[8.5px] font-bold uppercase tracking-wider flex items-center gap-1 border border-amber-500/20 cursor-pointer"
                                title="Launch Preview"
                              >
                                <Eye className="w-3 h-3" /> Preview
                              </button>
                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${
                                selected ? "bg-amber-600 border-transparent" : "border-slate-500"
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
              <div className="border border-white/5 bg-black/10 rounded-2xl p-4 flex flex-col text-left">
                <div
                  onClick={() => toggleSection("certificates")}
                  className={`w-full flex items-center justify-between border-b pb-2 mb-3.5 text-left font-bold text-xs uppercase tracking-wider cursor-pointer ${textPrimary} ${
                    isDark ? "border-white/5" : "border-slate-200"
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
                      className="h-6 px-2 rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/20 text-[8.5px] font-bold text-[#16A34A] flex items-center gap-1 cursor-pointer hover:bg-[#16A34A]/20"
                    >
                      <Plus className="w-3 h-3" /> Create Certificate
                    </button>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedSection === "certificates" ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {expandedSection === "certificates" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[340px] overflow-y-auto pr-1 custom-light-scrollbar">
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
              <div className={`p-4 rounded-xl border ${
                isDark ? "border-white/10 bg-white/[0.02]" : "border-slate-200 bg-slate-50"
              }`}>
                <span className="text-[10px] font-extrabold tracking-widest text-[#E60000] block uppercase mb-1">
                  {pathType === "zip" ? "STANDALONE ZIP PACKAGE PATHWAY" : "MODULAR SEQUENCE PATHWAY"}
                </span>
                <h3 className={`text-base font-black ${textPrimary}`}>{pathName || "Untitled Training Pathway"}</h3>
                <p className={`text-xs mt-1 ${textSecondary}`}>{description || "No description provided."}</p>
              </div>

              {/* Interactive Pipeline Sequence */}
              <div>
                <h4 className={`text-xs font-extrabold uppercase mb-3.5 tracking-wider ${textSecondary}`}>
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
                          <h4 className={`text-xs font-bold ${textPrimary}`}>Training Media</h4>
                          <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                            {selectedVideos.length} Attached Video Modules ({selectedVideos.length * 5} mins est)
                          </p>
                        </div>
                      </div>

                      {/* Sequence 2: Quiz */}
                      <div className="flex items-start gap-4 relative z-10">
                        <span className="w-9 h-9 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED] flex items-center justify-center text-[#7C3AED] flex-shrink-0">
                          <HelpCircle className="w-4 h-4" />
                        </span>
                        <div className="pt-1 text-left">
                          <h4 className={`text-xs font-bold ${textPrimary}`}>Evaluation Assessment</h4>
                          <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                            {selectedQuiz ? "Custom Assessment Quiz Attached" : "None attached"}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Sequence: Zip */
                    <div className="flex items-start gap-4 relative z-10">
                      <span className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center text-amber-500 flex-shrink-0">
                        <UploadCloud className="w-4 h-4" />
                      </span>
                      <div className="pt-1 text-left">
                        <h4 className={`text-xs font-bold ${textPrimary}`}>Standalone Zip</h4>
                        <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                          {selectedPackage ? `Package: ${_optionalChain([packages, 'access', _13 => _13.find, 'call', _14 => _14(p => p.PackageID === selectedPackage), 'optionalAccess', _15 => _15.PackageName]) || selectedPackage}` : "None attached"}
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
                      <h4 className={`text-xs font-bold ${textPrimary}`}>Compliance Certificate</h4>
                      <p className={`text-[10px] mt-0.5 ${textSecondary}`}>
                        {selectedCert ? "Dynamic Achievement Certificate Attached" : "None attached"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-6 py-4 bg-black/40 border-t border-white/10 flex items-center justify-between ${isInline ? "rounded-b-[28px] mt-6" : ""}`}>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={step === 1}
              className="h-10 px-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed text-xs font-bold text-white flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            {editingPath && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this training pathway? This action cannot be undone.")) {
                    onDelete(editingPath.TrainingPathID);
                    onClose();
                  }
                }}
                className="h-10 px-4 rounded-xl border border-red-500/30 bg-red-600 hover:bg-red-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete Pathway
              </button>
            )}
          </div>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !pathName.trim()) || (step === 3 && pathType === "individual" && selectedVideos.length === 0) || (step === 3 && pathType === "zip" && !selectedPackage)}
              className="h-10 px-5 rounded-xl bg-white text-[#0B1121] hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => handlePublish("Pending")}
                className="h-10 px-6 rounded-xl bg-[#E60000] hover:bg-[#c40000] transition-colors text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Sparkles className="w-4 h-4" /> Send for Approval
              </button>
            </div>
          )}
        </div>

        {/* Video Player Preview inside Builder */}
        {previewVideo && (
          <VideoPlayerModal
            video={previewVideo}
            onClose={() => setPreviewVideo(null)}
          />
        )}

        {/* Quiz Preview inside Builder */}
        {previewQuiz && (
          <QuizTakerModal
            quiz={previewQuiz}
            onClose={() => setPreviewQuiz(null)}
          />
        )}

        {/* Certificate Template Preview inside Builder */}
        {previewCert && (
          <CertificateViewerModal
            certificate={previewCert}
            onClose={() => setPreviewCert(null)}
          />
        )}

        {/* Standalone Zip Package Player Preview inside Builder */}
        {previewPackage && (
          <div
            onClick={() => setPreviewPackage(null)}
            className="fixed inset-0 z-[200] backdrop-blur-2xl bg-black/60 flex items-center justify-center p-4 text-left cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-5xl bg-[#090D1A] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh] border border-white/10 cursor-default"
            >
              <div className="px-6 py-4 bg-black/40 border-b border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                  PREVIEW SIMULATION • {previewPackage.PackageName}
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
                      Extracting preview...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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