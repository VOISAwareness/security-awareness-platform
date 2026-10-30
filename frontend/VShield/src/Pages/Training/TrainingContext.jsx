import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useUserType } from "@/UserTypeContext/UserTypeContext";

import {
  getUploadedVideos,
  getUploadedCertificates,
  savePath,
  getPaths,
  saveQuiz,
  getQuizzes,
  saveVideo,
  getVideos,
  saveCertificateItem,
  getCertificateItems,
  getPackages
} from "./components/utility/db";

// JSON Data Imports
import trainingPathsJson from "./TrainingPath.json";
import trainingVideosJson from "./TrainingVideos.json";
import trainingQuizJson from "./TrainingQuiz.json";
import trainingCertificateJson from "./TrainingCertificate.json";

// Asset URL & Image Imports
import scormZipUrl from "@/assets/Training(LMS)/uploads/zips/scorm12-176523-148.zip?url";
import videosMetadataUrl from "@/assets/Training(LMS)/uploads/videos/metadata.json?url";
import certsMetadataUrl from "@/assets/Training(LMS)/uploads/certificates/metadata.json?url";

import { extractZipHtml } from "./components/utility/zipHelpers";

const TrainingContext = createContext(null);

export const TrainingProvider = ({ children }) => {
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsDark(userContext.isDark);
    }
  }, [userContext.isDark]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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
  const [packages, setPackages] = useState([
    {
      PackageID: "SP-00001",
      PackageName: "SCORM Interactive Green Fleet Simulation",
      Description:
        "SCORM-compliant simulation with an integrated simulated electric vehicle charging dashboard designed to train eco-compliance.",
      FileName: "scorm12-176523-148.zip",
      CreatedOn: "06-Oct-2026",
      Size: "14.2 MB",
      isLocalUrl: true,
      localPath: scormZipUrl,
      compiledHtmlUrl: ""
    }
  ]);

  // Load dynamic uploads and assets metadata on mount
  useEffect(() => {
    async function loadData() {
      let finalPaths;
      let finalQuizzes;
      let finalVideos;
      let finalCerts;

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
                } catch (err) {
                  console.error("Failed to repair video blob URL", err);
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
      } catch { /* ignore */ }

      let publicCerts = [];
      try {
        const res = await fetch(certsMetadataUrl);
        if (res.ok) publicCerts = await res.json();
      } catch { /* ignore */ }

      let dbVideos = [];
      let dbCerts = [];
      try {
        const savedVids = await getUploadedVideos();
        dbVideos = savedVids.map((vid) => {
          let videoUrl = "";
          if (vid.file && (vid.file instanceof Blob)) {
            try {
              videoUrl = URL.createObjectURL(vid.file);
            } catch (err) {
              console.error("Failed to create object URL for saved video", err);
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
            } catch (err) {
              console.error("Failed to create object URL for cert image", err);
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
      } catch (err) {
        console.error(err);
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
  }, [userContext.isDark]);

  const [activeTab, setActiveTab] = useState("paths");
  const [currentView, setCurrentView] = useState("hub");
  const [individualSubTab, setIndividualSubTab] = useState("videos");

  const [search, setSearch] = useState("");
  const [selectedAudiences] = useState([]);
  const [selectedTimes] = useState([]);
  const [selectedTypes] = useState([]);

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
    } catch (err) {
      console.error(err);
      setZipError(err?.message || "Internal error compiling HTML5 package.");
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

  // Filters logic for the sidebars
  const filteredPaths = useMemo(() => {
    const userRole = userContext.user?.role || "Regular User";
    const isEditor = userRole === "Campaign Creator";

    return paths.filter((path) => {
      const pathStatus = path.status || "Published";
      if (isEditor) {
        if (pathStatus !== "Published" && pathStatus !== "Draft") return false;
      } else {
        if (pathStatus !== "Published") return false;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paths, search, selectedAudiences, selectedTimes, selectedTypes]);

  const value = {
    toastMessage,
    showToast,
    isDark,
    setIsDark,
    paths,
    setPaths,
    editingPath,
    setEditingPath,
    pathsSubTab,
    setPathsSubTab,
    editingVideo,
    setEditingVideo,
    editingQuiz,
    setEditingQuiz,
    editingCert,
    setEditingCert,
    videos,
    setVideos,
    quizzes,
    setQuizzes,
    certificates,
    setCertificates,
    packages,
    setPackages,
    activeTab,
    setActiveTab,
    currentView,
    setCurrentView,
    individualSubTab,
    setIndividualSubTab,
    search,
    setSearch,
    selectedAudiences,
    selectedTimes,
    selectedTypes,
    activeVideo,
    setActiveVideo,
    activeQuiz,
    setActiveQuiz,
    activeCert,
    setActiveCert,
    activePathSequence,
    setActivePathSequence,
    sequenceIndex,
    setSequenceIndex,
    activeInteractivePath,
    setActiveInteractivePath,
    launchStandalonePkg,
    setLaunchStandalonePkg,
    launchHtmlUrl,
    setLaunchHtmlUrl,
    zipError,
    setZipError,
    handleLaunchStandalone,
    handleLaunchPathway,
    handleNextSequenceStep,
    showVideoUploader,
    setShowVideoUploader,
    showQuizCreator,
    setShowQuizCreator,
    showCertCreator,
    setShowCertCreator,
    filteredPaths
  };

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTraining = () => {
  const context = useContext(TrainingContext);
  if (!context) {
    throw new Error("useTraining must be used within a TrainingProvider");
  }
  return context;
};
