import { createContext, useCallback, useContext, useState, useEffect, useMemo, useRef } from "react";
import { useUserType } from "@/UserTypeContext/UserTypeContext";

import { getPackages } from "./components/utility/db";
import { loadTraining } from "@/services/trainingCatalog";

// Asset URL & Image Imports
// A small built-in SCORM 1.2 sample (3 KB), so the Packages screen shows how a
// package plays before anyone uploads one. Real packages are uploaded through
// Add ZIP Package and stored in S3 (GET/POST /training/packages).
import sampleScormUrl from "@/assets/Training(LMS)/samples/sample-scorm12-spot-the-phish.zip?url";

import { api } from "@/services/api";
import { anyUnpacking, fromServer, mergePackages } from "@/services/trainingPackages";

const SAMPLE_PACKAGE = {
  PackageID: "SP-SAMPLE",
  PackageName: "Sample: Spot the phish",
  Description:
    "A small built-in SCORM 1.2 package: three emails, phishing or genuine, then a score. Upload your own with Add ZIP Package.",
  FileName: "sample-scorm12-spot-the-phish.zip",
  CreatedOn: "02-Nov-2026",
  Size: "0.0 MB",
  duration: 5,
  isLocalUrl: true,
  localPath: sampleScormUrl,
  isSample: true
};

const TrainingContext = createContext(null);

export const TrainingProvider = ({ children }) => {
  const userContext = useUserType?.() || {};

  // Top right toast feedback state
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg, type = "info", title) => {
    if (typeof msg === "object" && msg !== null) {
      setToastMessage(msg);
    } else {
      setToastMessage({ message: msg, type, title });
    }
    setTimeout(() => setToastMessage(null), 4000);
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
  // Paths, videos, quizzes and certificates come from the backend
  // (services/trainingCatalog.js); empty until it answers.
  const [paths, setPaths] = useState([]);
  const [editingPath, setEditingPath] = useState(null);
  const [pathsSubTab, setPathsSubTab] = useState("all");
  const [editingVideo, setEditingVideo] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editingCert, setEditingCert] = useState(null);
  const [videos, setVideos] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [trainingLoad, setTrainingLoad] = useState({ loading: true, error: null });
  const [packages, setPackages] = useState([SAMPLE_PACKAGE]);

  // The packages stored in S3 (everyone's), loaded on their own as soon as
  // the page opens: they used to be loaded only after this browser's
  // IndexedDB migration below, so a failed or slow migration hid them.
  useEffect(() => {
    let active = true;
    api.trainingPackages
      .list()
      .then((rows) => {
        if (!active) return;
        const serverPkgs = (Array.isArray(rows) ? rows : []).map(fromServer);
        setPackages((prev) => mergePackages(serverPkgs, prev.filter((p) => !p.isSample), [SAMPLE_PACKAGE]));
      })
      .catch((err) => console.error("Could not load training packages from the server", err));
    return () => {
      active = false;
    };
  }, []);

  // The training catalogue from the backend, and any packages this browser
  // kept before packages moved to S3.
  useEffect(() => {
    let active = true;
    loadTraining({ force: true })
      .then((catalog) => {
        if (!active) return;
        setPaths(catalog.paths);
        setVideos(catalog.videos);
        setQuizzes(catalog.quizzes);
        setCertificates(catalog.certificates);
        setTrainingLoad({ loading: false, error: null });
      })
      .catch((err) => {
        console.error("Could not load training from the server", err);
        if (active) setTrainingLoad({ loading: false, error: err });
      });

    // Packages kept only in this browser (from before packages moved to S3).
    // They are unpacked when played (PackageFrame), not on every page load.
    getPackages()
      .then((dbPkgs) => {
        if (active && dbPkgs.length) {
          setPackages((prev) => mergePackages(prev.filter((p) => !p.isSample), dbPkgs, [SAMPLE_PACKAGE]));
        }
      })
      .catch((err) => console.error("Could not read packages kept in this browser", err));
    return () => {
      active = false;
    };
  }, []);

  // The server unpacks each uploaded package (PENDING -> READY / FAILED):
  // while any is being unpacked, the list is read again every few seconds
  // (for up to three minutes after the last upload or retry).
  const pollsLeft = useRef(36);
  const refreshServerPackages = useCallback(async () => {
    const rows = await api.trainingPackages.list();
    const serverPkgs = (Array.isArray(rows) ? rows : []).map(fromServer);
    setPackages((prev) => mergePackages(serverPkgs, prev.filter((p) => !p.onServer && !p.isSample), [SAMPLE_PACKAGE]));
  }, []);
  const unpacking = anyUnpacking(packages);
  useEffect(() => {
    if (!unpacking || pollsLeft.current <= 0) return undefined;
    const timer = setTimeout(() => {
      pollsLeft.current -= 1;
      refreshServerPackages().catch((err) => console.error("Could not re-read training packages", err));
    }, 5000);
    return () => clearTimeout(timer);
  }, [unpacking, packages, refreshServerPackages]);

  /** A package added or retried: watch it again until it is unpacked. */
  const watchUnpacking = useCallback(() => {
    pollsLeft.current = 36;
  }, []);

  /** Ask the server to unpack a package again (after it failed). */
  const retryPackageUnpack = useCallback(
    async (id) => {
      const row = await api.trainingPackages.extract(id);
      watchUnpacking();
      setPackages((prev) => prev.map((p) => (p.PackageID === id ? fromServer(row) : p)));
    },
    [watchUnpacking],
  );

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
  // The player (components/PackageFrame.jsx) works out where the package
  // plays from and opens it; this only says which package is open.
  const handleLaunchStandalone = (pkg) => {
    setLaunchStandalonePkg(pkg);
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
  const [showPathCreator, setShowPathCreator] = useState(false);

  // Filters logic for the sidebars
  const filteredPaths = useMemo(() => {
    return paths.filter((path) => {
      const pathStatus = path.status || "Published";
      if (pathStatus !== "Published") return false;

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

  const value = {
    toastMessage,
    setToastMessage,
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
    handleLaunchStandalone,
    handleLaunchPathway,
    retryPackageUnpack,
    watchUnpacking,
    handleNextSequenceStep,
    showVideoUploader,
    setShowVideoUploader,
    showQuizCreator,
    setShowQuizCreator,
    showCertCreator,
    setShowCertCreator,
    showPathCreator,
    setShowPathCreator,
    filteredPaths,
    trainingLoad
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

// eslint-disable-next-line react-refresh/only-export-components
export const useOptionalTraining = () => {
  return useContext(TrainingContext) || null;
};
