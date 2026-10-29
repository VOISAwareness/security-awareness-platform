import React, { useState, useEffect } from "react";
import './Training.css'
import {
  X,
  Check,
} from "lucide-react";

import { VarMySpaceScale } from "@/shared/SharedStyles";
import { useUserType } from "@/UserTypeContext/UserTypeContext";

// Dynamic Sub-Pages & Galleries Imports
import TrainingLandingPage from "./TrainingLandingPage";
import TrainingPathLandingPage from "./TrainingPath/TrainingPathLandingPage";
import InvidualTrainingsLandingPage from "./InvidualTrainings/InvidualTrainingsLandingPage";
import RequestsAndApprovalsLandingPage from "./RequestsAndApprovals/RequestsAndApprovalsLandingPage";
import ReportsLandingPage from "./TrainingReport/TrainingReportLandingPage";

import {
  VideoPlayerModal,
  QuizTakerModal,
  CertificateViewerModal
} from "./components/modals/Modals";
import { PathwaySequencePlayerModal } from "./components/modals/PathwaySequencePlayerModal";

import {
  saveUploadedVideo,
  getUploadedVideos,
  saveUploadedCertificate,
  getUploadedCertificates,
  savePath,
  getPaths,
  deletePath,
  saveQuiz,
  getQuizzes,
  deleteQuiz,
  saveVideo,
  getVideos,
  deleteVideo,
  saveCertificateItem,
  getCertificateItems,
  deleteCertificateItem,
  savePackage,
  getPackages,
  deletePackage
} from "./components/utility/db";

// JSON Data Imports
import trainingPathsJson from "./TrainingPath.json";
import trainingVideosJson from "./TrainingVideos.json";
import trainingQuizJson from "./TrainingQuiz.json";
import trainingCertificateJson from "./TrainingCertificate.json";

// Asset URL & Image Imports
import videosMetadataUrl from "@/assets/Training(LMS)/uploads/videos/metadata.json?url";
import certsMetadataUrl from "@/assets/Training(LMS)/uploads/certificates/metadata.json?url";

import side11Img from "@/assets/Training(LMS)/ui/side_1_1.png";
import side31Img from "@/assets/Training(LMS)/ui/side_3_1.png";
import soloVidsImg from "@/assets/Training(LMS)/ui/solo_vids.png";
import soloQuizImg from "@/assets/Training(LMS)/ui/solo_quiz.png";
import side14Img from "@/assets/Training(LMS)/ui/side_1_4.png";
import certificateIconImg from "@/assets/Training(LMS)/ui/cretificate_icon.png";
import mainLeftTopImg from "@/assets/Training(LMS)/ui/main_left_top.png";

import { extractZipHtml } from "./components/utility/zipHelpers";

// Centralized vertical L-cut boundary variable (viewBox is 500 width)
const VarLWallX = 110; 

const getSvgPath = (x) => {
  return `M ${x + 52} 0 H 484 Q 500 0 500 16 V 234 Q 500 250 484 250 H 16 Q 0 250 0 234 V 172 Q 0 156 16 156 H ${x - 10} Q ${x} 156 ${x} 140 V 16 Q ${x} 0 ${x + 12} 0 Z`;
};

const svgPath = getSvgPath(VarLWallX);

export default function TraningLanding() {
  const userContext = useUserType?.() || {};

  // Top right toast feedback state
  const [toastMessage, setToastMessage] = useState("");
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Theme check
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") || !!userContext.isDark;
    }
    return !!userContext.isDark;
  });

  useEffect(() => {
    if (typeof userContext.isDark === "boolean") {
      setIsDark(userContext.isDark);
    }
  }, [userContext.isDark]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [userContext.isDark]);

  // Global In-Memory States
  const [paths, setPaths] = useState(() => trainingPathsJson);
  const [editingPath, setEditingPath] = useState(null);
  const [pathsSubTab, setPathsSubTab] = useState("all");
  const [editingVideo, setEditingVideo] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editingCert, setEditingCert] = useState(null);
  const [videos, setVideos] = useState(() => trainingVideosJson);
  const [quizzes, setQuizzes] = useState(() => trainingQuizJson);
  const [certificates, setCertificates] = useState(() => trainingCertificateJson);
  // SCORM packages: the ones uploaded in this browser (IndexedDB, db.js). The
  // sample package (a 94 MB zip) is not kept in the repo; packages are to be
  // served from the SCORM bucket in S3.
  const [packages, setPackages] = useState([]);

  // Load dynamic uploads and assets metadata on mount
  useEffect(() => {
    async function loadData() {
      let finalPaths = [];
      let finalQuizzes = [];
      let finalVideos = [];
      let finalCerts = [];

      try {
        const dbPaths = await getPaths();
        if (dbPaths.length === 0) {
          for (const staticPath of trainingPathsJson) {
            await savePath(staticPath);
          }
          finalPaths = [...trainingPathsJson];
        } else {
          const pathsMap = new Map(dbPaths.map((p) => [p.TrainingPathID, p]));
          finalPaths = [...dbPaths];
          for (const staticPath of trainingPathsJson) {
            if (!pathsMap.has(staticPath.TrainingPathID)) {
              await savePath(staticPath);
              finalPaths.push(staticPath);
            }
          }
        }
        setPaths(finalPaths);

        const dbQuizzes = await getQuizzes();
        if (dbQuizzes.length === 0) {
          for (const staticQuiz of trainingQuizJson) {
            await saveQuiz(staticQuiz);
          }
          finalQuizzes = [...trainingQuizJson];
        } else {
          const quizzesMap = new Map(dbQuizzes.map((q) => [q.TrainingQuizID, q]));
          finalQuizzes = [...dbQuizzes];
          for (const staticQuiz of trainingQuizJson) {
            if (!quizzesMap.has(staticQuiz.TrainingQuizID)) {
              await saveQuiz(staticQuiz);
              finalQuizzes.push(staticQuiz);
            }
          }
        }
        setQuizzes(finalQuizzes);

        const dbVideosList = await getVideos();
        const savedVidsList = await getUploadedVideos();
        const uploadedFilesMap = new Map(savedVidsList.map((v) => [v.id, v.file]));

        if (dbVideosList.length === 0) {
          for (const staticVid of trainingVideosJson) {
            await saveVideo(staticVid);
          }
          finalVideos = [...trainingVideosJson];
        } else {
          dbVideosList.forEach((v) => {
            if (uploadedFilesMap.has(v.TrainingVideoID)) {
              const file = uploadedFilesMap.get(v.TrainingVideoID);
              if (file && (file instanceof Blob)) {
                try {
                  v.TrainingVideo = URL.createObjectURL(file);
                } catch (e) {
                  console.error("Failed to repair video blob URL", e);
                }
              }
            }
          });
          const videosMap = new Map(dbVideosList.map((v) => [v.TrainingVideoID, v]));
          finalVideos = [...dbVideosList];
          for (const staticVid of trainingVideosJson) {
            if (!videosMap.has(staticVid.TrainingVideoID)) {
              await saveVideo(staticVid);
              finalVideos.push(staticVid);
            }
          }
        }
        setVideos(finalVideos);

        const dbCertsList = await getCertificateItems();
        if (dbCertsList.length === 0) {
          for (const staticCert of trainingCertificateJson) {
            await saveCertificateItem(staticCert);
          }
          finalCerts = [...trainingCertificateJson];
        } else {
          const certsMap = new Map(dbCertsList.map((c) => [c.TrainingCertificateID, c]));
          finalCerts = [...dbCertsList];
          for (const staticCert of trainingCertificateJson) {
            if (!certsMap.has(staticCert.TrainingCertificateID)) {
              await saveCertificateItem(staticCert);
              finalCerts.push(staticCert);
            }
          }
        }
        setCertificates(finalCerts);

        const dbPkgs = await getPackages();
        const extractedDbPkgs = await Promise.all(dbPkgs.map(async (pkg) => {
          if (pkg.fileBlob) {
            try {
              pkg.compiledHtmlUrl = await extractZipHtml(pkg.fileBlob);
            } catch (err) {
              console.error("Failed to extract saved standalone package on load", err);
            }
          }
          return pkg;
        }));
        setPackages((prev) => {
          const existingIds = new Set(prev.map(p => p.PackageID));
          const toAdd = extractedDbPkgs.filter(p => !existingIds.has(p.PackageID));
          return [...prev, ...toAdd];
        });
      } catch (err) {
        console.error("Failed to run progressive JSON-to-IDB migration flow:", err);
      }

      // Local metadata assets loaded dynamically
      let publicVideos = [];
      try {
        const res = await fetch(videosMetadataUrl);
        if (res.ok) publicVideos = await res.json();
      } catch (e) {}

      let publicCerts = [];
      try {
        const res = await fetch(certsMetadataUrl);
        if (res.ok) publicCerts = await res.json();
      } catch (e) {}

      let dbVideos = [];
      let dbCerts = [];
      try {
        const savedVids = await getUploadedVideos();
        dbVideos = savedVids.map((vid) => {
          let videoUrl = "";
          if (vid.file && (vid.file instanceof Blob)) {
            try {
              videoUrl = URL.createObjectURL(vid.file);
            } catch (e) {
              console.error("Failed to create object URL for saved video", e);
            }
          }
          return {
            TrainingVideoID: vid.id,
            TrainingVideoName: vid.name,
            "Thumbnail(CoverImage)": "",
            TrainingVideo: videoUrl,
            CreatedOn: vid.createdOn,
            Description: vid.description
          };
        });

        const savedCerts = await getUploadedCertificates();
        dbCerts = savedCerts.map((cert) => {
          let certHtml = cert.htmlContent;
          if (cert.imageFile && (cert.imageFile instanceof Blob)) {
            try {
              const imgUrl = URL.createObjectURL(cert.imageFile);
              certHtml = `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;justify-content:center;align-items:center;height:100vh;background:#0f172a;}img{max-width:100%;max-height:100vh;object-fit:contain;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.5);}</style></head><body><img src="${imgUrl}" /></body></html>`;
            } catch (e) {
              console.error("Failed to create object URL for cert image", e);
            }
          }
          return {
            TrainingCertificateID: cert.id,
            TrainingCertificateName: cert.name,
            "Thumbnail(CoverImage)": "",
            CreatedOn: cert.createdOn,
            Description: cert.description,
            "Certificate(html)": certHtml
          };
        });
      } catch (e) {
        console.error(e);
      }

      if (publicVideos.length > 0 || dbVideos.length > 0) {
        setVideos((prev) => {
          const existingIds = new Set(prev.map((v) => v.TrainingVideoID));
          const toAdd = [...publicVideos, ...dbVideos].filter((v) => !existingIds.has(v.TrainingVideoID));
          return [...prev, ...toAdd];
        });
      }

      if (publicCerts.length > 0 || dbCerts.length > 0) {
        setCertificates((prev) => {
          const existingIds = new Set(prev.map((c) => c.TrainingCertificateID));
          const toAdd = [...publicCerts, ...dbCerts].filter((c) => !existingIds.has(c.TrainingCertificateID));
          return [...prev, ...toAdd];
        });
      }
    }
    loadData();
  }, []);

  const [activeTab, setActiveTab] = useState("paths");
  const [currentView, setCurrentView] = useState("hub");
  const [individualSubTab, setIndividualSubTab] = useState("videos");

  const [search, setSearch] = useState("");
  const [selectedAudiences, setSelectedAudiences] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedFormats, setSelectedFormats] = useState([]);
  const [selectedScores, setSelectedScores] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);

  const [activeVideo, setActiveVideo] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [activeCert, setActiveCert] = useState(null);

  const [activePathSequence, setActivePathSequence] = useState(null);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const [activeInteractivePath, setActiveInteractivePath] = useState(null);

  const [launchStandalonePkg, setLaunchStandalonePkg] = useState(null);
  const [launchHtmlUrl, setLaunchHtmlUrl] = useState("");
  const [zipError, setZipError] = useState("");

  const handleLaunchStandalone = async (pkg) => {
    setLaunchStandalonePkg(pkg);
    setLaunchHtmlUrl("");
    setZipError("");
    try {
      const source = pkg.isLocalUrl && pkg.localPath ? pkg.localPath : pkg.fileBlob;
      if (!source) throw new Error("Could not trace package website files source.");
      const url = await extractZipHtml(source);
      setLaunchHtmlUrl(url);
    } catch (e) {
      console.error(e);
      setZipError(e?.message || "Internal error compiling HTML5 package.");
    }
  };

  const handleLaunchPathway = (path) => {
    setActiveInteractivePath(path);
  };

  const handleNextSequenceStep = () => {
    if (!activePathSequence) return;
    const totalVideos = activePathSequence.TrainingVideoAttached?.length || 0;
    const nextIdx = sequenceIndex + 1;

    if (sequenceIndex < totalVideos - 1) {
      setSequenceIndex(nextIdx);
      const nextVidId = activePathSequence.TrainingVideoAttached?.[nextIdx];
      if (nextVidId) {
        const vid = videos.find((v) => v.TrainingVideoID === nextVidId) || videos[0];
        setActiveVideo(vid);
        return;
      }
    }

    if (sequenceIndex === totalVideos - 1) {
      setSequenceIndex(nextIdx);
      const quizId = activePathSequence.TrainingQuizAttached?.[0];
      if (quizId) {
        const qz = quizzes.find((q) => q.TrainingQuizID === quizId) || quizzes[0];
        setActiveQuiz(qz);
        return;
      }
    }

    const certId = activePathSequence.TrainingCertificateAttached?.[0];
    if (certId) {
      const cert = certificates.find((c) => c.TrainingCertificateID === certId) || certificates[0];
      setActiveCert(cert);
    }
    setActivePathSequence(null);
  };

  const [showVideoUploader, setShowVideoUploader] = useState(false);
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [showCertCreator, setShowCertCreator] = useState(false);

  // Filters logic for the sidebars (moved state mapping for galleries here)
  const filteredPaths = React.useMemo(() => {
    const userRole = userContext.user?.role || 'Regular User';
    const isEditor = userRole === 'Campaign Creator';

    return paths.filter((path) => {
      const pathStatus = path.status || 'Published';
      if (isEditor) {
        if (pathStatus !== 'Published' && pathStatus !== 'Draft') return false;
      } else {
        if (pathStatus !== 'Published') return false;
      }

      const matchSearch = path.TrainingPathName.toLowerCase().includes(search.toLowerCase());
      const matchesAudience =
        selectedAudiences.length === 0 ||
        selectedAudiences.some((aud) => {
          if (aud === "SOC Analysts Only") return path.TrainingPathName.toLowerCase().includes("wire");
          return !path.TrainingPathName.toLowerCase().includes("wire");
        });
      const matchesTime =
        selectedTimes.length === 0 ||
        selectedTimes.some((t) => {
          if (t === "Under 10m") return path.UsedTime < 10;
          if (t === "10-20m") return path.UsedTime >= 10 && path.UsedTime <= 20;
          return path.UsedTime > 20;
        });
      const matchesType =
        selectedTypes.length === 0 ||
        selectedTypes.some((type) => {
          if (type === "Always Available Course") return !!path.isAlwaysAvailable;
          return !path.isAlwaysAvailable;
        });

      return matchSearch && matchesAudience && matchesTime && matchesType;
    });
  }, [paths, search, selectedAudiences, selectedTimes, selectedTypes]);

  const VideoCardImg = soloVidsImg;
  const QuizIconImg = soloQuizImg;
  const CertificateCardImg = side14Img;
  const CreateNewOneCardImg = mainLeftTopImg;

  return (
    <>
      <div
        style={{ zoom: VarMySpaceScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-3.5 h-[calc(104vh-0px)] overflow-hidden animate-clay-stagger-1"
      >
        {/* PAGE HEADER TOOLBAR */}
        <div
          className="w-full py-2.5 px-6 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm select-none bg-[#13151A] border-black/10"
        >
          <div className="flex items-center gap-3 w-full">
            <h1 className="text-[13px] font-voda font-extrabold tracking-widest text-white uppercase flex items-center justify-between w-full">
              <span>
                LMS {currentView === "paths" ? "– Training Path" : currentView === "individual" ? "– Storage Room" : currentView === "add-package" ? "– Configure SCORM Package" : currentView === "requests" ? "– Requests & Approvals" : currentView === "reports" ? "– Learning Progress" : ""}
              </span>
              {currentView !== "hub" && (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView("hub");
                    setActiveTab("paths");
                  }}
                  className="h-7 px-3.5 rounded-lg text-[9px] font-voda font-black uppercase tracking-wider bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-all scale-100 active:scale-98"
                >
                  ← Back to Hub
                </button>
              )}
            </h1>
          </div>
        </div>

        {/* UNIFIED TRAINING SHELL */}
        <div
          className={`w-full flex-1 min-h-0 transition-all duration-300 overflow-hidden flex flex-col ${
            currentView === "hub"
              ? (isDark ? "bg-[#15161a] border border-white/10 shadow-xl p-4 sm:p-5 gap-4 rounded-xl" : "bg-white border border-slate-200 shadow-sm p-4 sm:p-5 gap-4 rounded-xl")
              : "bg-transparent border-none shadow-none p-0 gap-0"
          }`}
        >
          {currentView === "hub" ? (
            <TrainingLandingPage
              setCurrentView={setCurrentView}
              setPathsSubTab={setPathsSubTab}
              setActiveTab={setActiveTab}
              setIndividualSubTab={setIndividualSubTab}
              svgPath={svgPath}
              VarLWallX={VarLWallX}
            />
          ) : currentView === "requests" ? (
            <RequestsAndApprovalsLandingPage
              paths={paths}
              setPaths={setPaths}
              isDark={isDark}
              videos={videos}
              quizzes={quizzes}
              certificates={certificates}
              onLaunch={handleLaunchPathway}
              onEdit={(path) => {
                setEditingPath(path);
                setPathsSubTab("create");
                setCurrentView("paths");
              }}
              onSendForApproval={async (pToSubmit) => {
                const submittedPath = {
                  ...pToSubmit,
                  status: 'Pending'
                };
                try {
                  await savePath(submittedPath);
                  setPaths(prev => prev.map(item => item.TrainingPathID === pToSubmit.TrainingPathID ? submittedPath : item));
                  showToast("Learning path pathway submitted successfully to manager approvals queue.");
                  setCurrentView("requests");
                } catch (err) {
                  console.error("Failed to submit path for approval", err);
                }
              }}
            />
          ) : currentView === "reports" ? (
            <ReportsLandingPage isDark={isDark} />
          ) : (
            /* SUB-VIEW SIDEBAR + CONTAINER SHELL */
            <div className="flex-1 flex flex-col lg:flex-row items-stretch gap-6 min-h-0 select-none w-full animate-clay-stagger-2 text-left">
              {/* FLOATING LEFT SIDEBAR */}
              <div className="flex flex-col gap-3.5 min-w-[240px] w-full lg:w-[22%] flex-shrink-0 text-left">
                {currentView === "paths" ? (
                  <>
                    <div
                      onClick={() => {
                        setPathsSubTab("all");
                        setEditingPath(null);
                      }}
                      style={{ height: "80px", borderRadius: "14px" }}
                      className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
                        pathsSubTab === "all" && !editingPath
                          ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                          : (isDark ? "bg-[#1C1E24] text-white hover:bg-[#252830] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
                      }`}
                    >
                      <div className="flex justify-between items-start relative z-10">
                        <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">All Training Paths</h3>
                      </div>
                      <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                        pathsSubTab === "all" && !editingPath ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
                      }`}>
                        Every created training paths are stored here
                      </p>
                      <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
                        <img src={side11Img} alt="All Paths" className="w-full h-full object-contain" />
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setPathsSubTab("create");
                        setEditingPath(null);
                      }}
                      style={{ height: "80px", borderRadius: "14px" }}
                      className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
                        pathsSubTab === "create" || editingPath
                          ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-[#E5E6FF] text-[#3B3C80] shadow-md border-transparent")
                          : (isDark ? "bg-[#1C1E24] text-white hover:bg-[#252830] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
                      }`}
                    >
                      <div className="flex justify-between items-start relative z-10">
                        <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">Create New Training Path</h3>
                      </div>
                      <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                        pathsSubTab === "create" || editingPath ? (isDark ? "text-slate-700" : "text-[#5B5DAB]") : (isDark ? "text-slate-400" : "text-slate-500")
                      }`}>
                        Start here to create a new training path
                      </p>
                      <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
                        <img src={side31Img} alt="Create Path" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      onClick={() => {
                        setIndividualSubTab("videos");
                        setCurrentView("individual");
                      }}
                      style={{ height: "80px", borderRadius: "14px" }}
                      className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
                        individualSubTab === "videos"
                          ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                          : (isDark ? "bg-[#1C1E24] text-white hover:bg-[#252830] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
                      }`}
                    >
                      <div className="flex justify-between items-start relative z-10">
                        <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">Individual Videos</h3>
                      </div>
                      <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                        individualSubTab === "videos" ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
                      }`}>
                        Upload new videos to add in your training paths
                      </p>
                      <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
                        <img src={VideoCardImg} alt="Videos" className="w-full h-full object-contain" />
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setIndividualSubTab("quizzes");
                        setCurrentView("individual");
                      }}
                      style={{ height: "80px", borderRadius: "14px" }}
                      className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
                        individualSubTab === "quizzes"
                          ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                          : (isDark ? "bg-[#1C1E24] text-white hover:bg-[#252830] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
                      }`}
                    >
                      <div className="flex justify-between items-start relative z-10">
                        <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">Individual Quizzes</h3>
                      </div>
                      <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                        individualSubTab === "quizzes" ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
                      }`}>
                        Create interactive quizzes and test the knowledge of your users.
                      </p>
                      <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
                        <img src={QuizIconImg} alt="Quizzes" className="w-full h-full object-contain" />
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setIndividualSubTab("certificates");
                        setCurrentView("individual");
                      }}
                      style={{ height: "80px", borderRadius: "14px" }}
                      className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
                        individualSubTab === "certificates"
                          ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                          : (isDark ? "bg-[#1C1E24] text-white hover:bg-[#252830] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
                      }`}
                    >
                      <div className="flex justify-between items-start relative z-10">
                        <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">Certificates</h3>
                      </div>
                      <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                        individualSubTab === "certificates" ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
                      }`}>
                        Crate and Award certifications on successful completions.
                      </p>
                      <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
                        <img src={CertificateCardImg} alt="Certificates" className="w-full h-full object-contain" />
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setIndividualSubTab("packages");
                        setCurrentView("individual");
                      }}
                      style={{ height: "80px", borderRadius: "14px" }}
                      className={`relative p-3.5 flex flex-col justify-between transition-all cursor-pointer overflow-hidden border ${
                        individualSubTab === "packages"
                          ? (isDark ? "bg-white text-black shadow-md border-transparent" : "bg-black text-white shadow-md border-transparent")
                          : (isDark ? "bg-[#1C1E24] text-white hover:bg-[#252830] border-white/10 shadow-xs" : "bg-white text-slate-900 hover:bg-slate-50 border-black/10 shadow-xs")
                      }`}
                    >
                      <div className="flex justify-between items-start relative z-10">
                        <h3 className="text-[13px] font-voda font-bold tracking-tight leading-tight">Training Packages</h3>
                      </div>
                      <p className={`text-[9px] font-medium leading-tight relative z-10 max-w-[145px] ${
                        individualSubTab === "packages" ? (isDark ? "text-slate-700" : "text-slate-300") : (isDark ? "text-slate-400" : "text-slate-500")
                      }`}>
                        Upload and deploy scrom packages.
                      </p>
                      <div className="absolute -bottom-1 -right-1 w-12 h-12 pointer-events-none select-none z-0">
                        <img src={certificateIconImg} alt="Standalone Zip" className="w-full h-full object-contain" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* RIGHT MAIN ROUNDED-3XL CONTENT BOX */}
              <div className={`flex-1 min-w-0 rounded-[28px] border shadow-md flex flex-col h-full overflow-hidden ${
                ((currentView === "paths" && (pathsSubTab === "create" || editingPath)) ||
                 (currentView === "individual" && (showVideoUploader || editingVideo || showQuizCreator || editingQuiz || showCertCreator || editingCert)) ||
                 (currentView === "add-package")) ? "p-0" : "p-6"
              } ${
                isDark ? "bg-[#1E2024] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}>
                {currentView === "paths" ? (
                  <TrainingPathLandingPage
                    paths={paths}
                    filteredPaths={filteredPaths}
                    videos={videos}
                    quizzes={quizzes}
                    certificates={certificates}
                    packages={packages}
                    isDark={isDark}
                    search={search}
                    setSearch={setSearch}
                    editingPath={editingPath}
                    setEditingPath={setEditingPath}
                    pathsSubTab={pathsSubTab}
                    setPathsSubTab={setPathsSubTab}
                    handleLaunchPathway={handleLaunchPathway}
                    onSavePath={async (savedPath) => {
                      const activeEmail = (
                        userContext.user?.email ||
                        userContext.user?.userEmail ||
                        userContext.user?.UserEmailD_Admin ||
                        userContext.user?.UserEmailD_CamapignManager ||
                        userContext.user?.UserEmailD_CamapignCreator ||
                        'abhay.hs1@vodafone.com'
                      ).trim().toLowerCase();

                      const pathWithMeta = {
                        ...savedPath,
                        status: savedPath.status || 'Pending',
                        createdBy: savedPath.createdBy || activeEmail,
                      };

                      try {
                        await savePath(pathWithMeta);
                      } catch (err) {
                        console.error("Failed to save pathway", err);
                      }
                      if (editingPath) {
                        setPaths((prev) =>
                          prev.map((p) => (p.TrainingPathID === savedPath.TrainingPathID ? pathWithMeta : p))
                        );
                        setEditingPath(null);
                      } else {
                        setPaths((prev) => [pathWithMeta, ...prev]);
                      }
                      setPathsSubTab("all");
                      setCurrentView("requests");
                    }}
                    onDeletePath={async (id) => {
                      try {
                        await deletePath(id);
                      } catch (err) {
                        console.error("Failed to delete pathway", err);
                      }
                      setPaths((prev) => prev.filter((p) => p.TrainingPathID !== id));
                      setPathsSubTab("all");
                      setEditingPath(null);
                    }}
                    onSendForApproval={async (pToSubmit) => {
                      const submittedPath = {
                        ...pToSubmit,
                        status: 'Pending'
                      };
                      try {
                        await savePath(submittedPath);
                        setPaths(prev => prev.map(item => item.TrainingPathID === pToSubmit.TrainingPathID ? submittedPath : item));
                        showToast("Learning path pathway submitted successfully to manager approvals queue.");
                        setCurrentView("requests");
                      } catch (err) {
                        console.error("Failed to submit path for approval", err);
                      }
                    }}
                    onAddVideo={async (v, file) => {
                      try {
                        if (file) {
                          await saveUploadedVideo(v.TrainingVideoID, v.TrainingVideoName, v.Description || "", file);
                        }
                        await saveVideo(v);
                      } catch (err) {
                        console.error("Failed to save video", err);
                      }
                      setVideos((prev) => [v, ...prev]);
                    }}
                    onAddQuiz={async (q) => {
                      try {
                        await saveQuiz(q);
                      } catch (err) {
                        console.error("Failed to save quiz", err);
                      }
                      setQuizzes((prev) => [q, ...prev]);
                    }}
                    onAddCertificate={async (c, file) => {
                      try {
                        if (file) {
                          await saveUploadedCertificate(
                            c.TrainingCertificateID,
                            c.TrainingCertificateName,
                            c.Description || "",
                            c["Certificate(html)"],
                            file
                          );
                        }
                        await saveCertificateItem(c);
                      } catch (err) {
                        console.error("Failed to save certificate", err);
                      }
                      setCertificates((prev) => [c, ...prev]);
                    }}
                    onAddPackage={async (p) => {
                      try {
                        await savePackage(p);
                      } catch (err) {
                        console.error("Failed to save package", err);
                      }
                      setPackages((prev) => [p, ...prev]);
                    }}
                  />
                ) : (
                  <InvidualTrainingsLandingPage
                    individualSubTab={individualSubTab}
                    setIndividualSubTab={setIndividualSubTab}
                    videos={videos}
                    setVideos={setVideos}
                    quizzes={quizzes}
                    setQuizzes={setQuizzes}
                    certificates={certificates}
                    setCertificates={setCertificates}
                    packages={packages}
                    setPackages={setPackages}
                    isDark={isDark}
                    search={search}
                    setSearch={setSearch}
                    editingVideo={editingVideo}
                    setEditingVideo={setEditingVideo}
                    editingQuiz={editingQuiz}
                    setEditingQuiz={setEditingQuiz}
                    editingCert={editingCert}
                    setEditingCert={setEditingCert}
                    showVideoUploader={showVideoUploader}
                    setShowVideoUploader={setShowVideoUploader}
                    showQuizCreator={showQuizCreator}
                    setShowQuizCreator={setShowQuizCreator}
                    showCertCreator={showCertCreator}
                    setShowCertCreator={setShowCertCreator}
                    currentView={currentView}
                    setCurrentView={setCurrentView}
                    activeVideo={activeVideo}
                    setActiveVideo={setActiveVideo}
                    activeQuiz={activeQuiz}
                    setActiveQuiz={setActiveQuiz}
                    activeCert={activeCert}
                    setActiveCert={setActiveCert}
                    handleLaunchStandalone={handleLaunchStandalone}
                    onAddVideo={async (newVideo, file) => {
                      try {
                        if (file) {
                          await saveUploadedVideo(newVideo.TrainingVideoID, newVideo.TrainingVideoName, newVideo.Description || "", file);
                        }
                        await saveVideo(newVideo);
                      } catch (err) {
                        console.error(err);
                      }
                      if (editingVideo) {
                        setVideos((prev) =>
                          prev.map((v) => (v.TrainingVideoID === newVideo.TrainingVideoID ? newVideo : v))
                        );
                        setEditingVideo(null);
                      } else {
                        setVideos((prev) => [newVideo, ...prev]);
                        setShowVideoUploader(false);
                      }
                    }}
                    onAddQuiz={async (newQuiz) => {
                      try {
                        await saveQuiz(newQuiz);
                      } catch (err) {
                        console.error(err);
                      }
                      if (editingQuiz) {
                        setQuizzes((prev) =>
                          prev.map((q) => (q.TrainingQuizID === newQuiz.TrainingQuizID ? newQuiz : q))
                        );
                        setEditingQuiz(null);
                      } else {
                        setQuizzes((prev) => [newQuiz, ...prev]);
                        setShowQuizCreator(false);
                      }
                    }}
                    onAddCertificate={async (savedCert, file) => {
                      try {
                        if (file) {
                          await saveUploadedCertificate(
                            savedCert.TrainingCertificateID,
                            savedCert.TrainingCertificateName,
                            savedCert.Description || "",
                            savedCert["Certificate(html)"],
                            file
                          );
                        }
                        await saveCertificateItem(savedCert);
                      } catch (err) {
                        console.error(err);
                      }
                      if (editingCert) {
                        setCertificates((prev) =>
                          prev.map((c) => (c.TrainingCertificateID === savedCert.TrainingCertificateID ? savedCert : c))
                        );
                        setEditingCert(null);
                      } else {
                        setCertificates((prev) => [savedCert, ...prev]);
                        setShowCertCreator(false);
                      }
                    }}
                    onAddPackage={async (newPkg) => {
                      try {
                        await savePackage(newPkg);
                      } catch (err) {
                        console.error("Failed to save package", err);
                      }
                      setPackages((prev) => [newPkg, ...prev]);
                      setCurrentView("individual");
                      setIndividualSubTab("packages");
                    }}
                    onDeleteVideo={async (id) => {
                      try {
                        await deleteVideo(id);
                      } catch (err) {
                        console.error(err);
                      }
                      setVideos((prev) => prev.filter((v) => v.TrainingVideoID !== id));
                      setEditingVideo(null);
                    }}
                    onDeleteQuiz={async (id) => {
                      try {
                        await deleteQuiz(id);
                      } catch (err) {
                        console.error(err);
                      }
                      setQuizzes((prev) => prev.filter((q) => q.TrainingQuizID !== id));
                      setEditingQuiz(null);
                    }}
                    onDeleteCertificate={async (id) => {
                      try {
                        await deleteCertificateItem(id);
                      } catch (err) {
                        console.error(err);
                      }
                      setCertificates((prev) => prev.filter((c) => c.TrainingCertificateID !== id));
                      setEditingCert(null);
                    }}
                    onDeletePackage={async (id) => {
                      try {
                        await deletePackage(id);
                      } catch (err) {
                        console.error(err);
                      }
                      setPackages((prev) => prev.filter((p) => p.PackageID !== id));
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

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
              await savePath(submittedPath);
              setPaths(prev => prev.map(item => item.TrainingPathID === pToSubmit.TrainingPathID ? submittedPath : item));
              showToast("Learning path pathway submitted successfully to manager approvals queue.");
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

            <div className="flex-1 bg-black relative flex items-center justify-center">
              {zipError ? (
                <div className="p-6 text-center max-w-md">
                  <p className="text-red-400 text-sm font-bold uppercase">Compilation Error</p>
                  <p className="text-xs text-slate-400 mt-2">{zipError}</p>
                </div>
              ) : launchHtmlUrl ? (
                <iframe
                  src={launchHtmlUrl}
                  title={launchStandalonePkg.PackageName}
                  className="w-full h-full border-none"
                  sandbox="allow-scripts allow-same-origin allow-modals"
                />
              ) : (
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Extracting files and launching the package...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[200] bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg border border-emerald-500 font-bold text-xs uppercase tracking-wide flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <Check className="w-4 h-4 stroke-[3]" />
          {toastMessage}
        </div>
      )}
    </>
  );
}
