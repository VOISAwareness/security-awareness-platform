
import { useTraining } from "../TrainingContext";
import { useUserType } from "@/UserTypeContext/UserTypeContext";

import TrainingPathLandingPage from "../TrainingPath/TrainingPathLandingPage";
import InvidualTrainingsLandingPage from "../InvidualTrainings/InvidualTrainingsLandingPage";

import {
  saveUploadedVideo,
  saveUploadedCertificate,
  savePath,
  deletePath,
  saveQuiz,
  saveVideo,
  saveCertificateItem,
  savePackage,
  deleteVideo,
  deleteQuiz,
  deleteCertificateItem,
  deletePackage
} from "../components/utility/db";
import { api } from "@/services/api";
import { fromServer, serverFields } from "@/services/trainingPackages";

export const LmsMainContent = () => {
  const userContext = useUserType?.() || {};

  const {
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
    isDark,
    currentView,
    setCurrentView,
    individualSubTab,
    setIndividualSubTab,
    search,
    setSearch,
    showVideoUploader,
    setShowVideoUploader,
    showQuizCreator,
    setShowQuizCreator,
    showCertCreator,
    setShowCertCreator,
    showPathCreator,
    setShowPathCreator,
    activeVideo,
    setActiveVideo,
    activeQuiz,
    setActiveQuiz,
    activeCert,
    setActiveCert,
    handleLaunchStandalone,
    handleLaunchPathway,
    filteredPaths,
    showToast
  } = useTraining();

  // A new package goes to S3 through the API, so everyone sees it. If the
  // API can't take it, it stays in this browser, as packages did before.
  const addPackage = async (p) => {
    const toast = showToast;
    if (p.fileBlob) {
      toast(`Uploading ${p.PackageName}…`);
      try {
        const row = await api.trainingPackages.upload({ file: p.fileBlob, fields: serverFields(p) });
        // already unpacked on upload, so it plays at once
        setPackages((prev) => [{ ...fromServer(row), compiledHtmlUrl: p.compiledHtmlUrl || "" }, ...prev]);
        toast(`Uploaded ${row.PackageName} as ${row.PackageID}`);
        return;
      } catch (err) {
        console.error("Package upload failed; keeping it in this browser", err);
        toast(`Couldn't upload to the server (${err?.message || "error"}). Saved in this browser only.`);
      }
    }
    try {
      await savePackage(p);
    } catch (err) {
      console.error("Failed to save package", err);
    }
    setPackages((prev) => [p, ...prev]);
  };

  const removePackage = async (id) => {
    const pkg = packages.find((p) => p.PackageID === id);
    try {
      if (pkg?.onServer) await api.trainingPackages.remove(id);
      else if (!pkg?.isSample) await deletePackage(id);
    } catch (err) {
      console.error(err);
      showToast(`Couldn't delete ${id}: ${err?.message || "error"}`);
      return;
    }
    setPackages((prev) => prev.filter((p) => p.PackageID !== id));
  };

  const isFormActive =
    (currentView === "paths" && (showPathCreator || editingPath)) ||
    currentView === "add-package" ||
    (currentView === "individual" && (
      (individualSubTab === "videos" && (showVideoUploader || editingVideo)) ||
      (individualSubTab === "quizzes" && (showQuizCreator || editingQuiz)) ||
      (individualSubTab === "certificates" && (showCertCreator || editingCert))
    ));

  return (
    <div className={`flex-1 min-w-0 rounded-[8px] border flex flex-col h-full overflow-hidden ${
      isFormActive ? "" : "p-3 pb-1"
    } ${
      isDark ? "bg-[#0B1121] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
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
          showPathCreator={showPathCreator}
          setShowPathCreator={setShowPathCreator}
          handleLaunchPathway={handleLaunchPathway}
          onSavePath={async (savedPath) => {
            const activeEmail = (
              (typeof userContext.user === 'string' ? userContext.user : null) ||
              userContext.user?.email ||
              userContext.user?.userEmail ||
              userContext.user?.UserEmailD_Admin ||
              userContext.user?.UserEmailD_CamapignManager ||
              userContext.user?.UserEmailD_CamapignCreator ||
              'abhay.hs1@vodafone.com'
            ).trim().toLowerCase();

            // When editing an already published path, preserve published status.
            // For new creations or resubmissions, always set status to 'Pending' so it goes right away for approval.
            const pathStatus = editingPath && editingPath.status === 'Published'
              ? 'Published'
              : 'Pending';

            const pathWithMeta = {
              ...savedPath,
              status: pathStatus,
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
            if (setShowPathCreator) setShowPathCreator(false);
            if (pathStatus === 'Pending') {
              showToast(
                savedPath.isAlwaysAvailable
                  ? "Course submitted successfully for approval."
                  : "Learning path submitted successfully for approval."
              );
              setCurrentView("requests");
            } else {
              showToast("Pathway updated successfully.");
              setPathsSubTab(savedPath.isAlwaysAvailable ? "courses" : "all");
            }
          }}
          onDeletePath={async (id) => {
            try {
              await deletePath(id);
            } catch (err) {
              console.error("Failed to delete pathway", err);
            }
            setPaths((prev) => prev.filter((p) => p.TrainingPathID !== id));
            if (setShowPathCreator) setShowPathCreator(false);
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
          onAddPackage={addPackage}
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
            setCurrentView("individual");
            setIndividualSubTab("packages");
            await addPackage(newPkg);
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
          onDeletePackage={removePackage}
        />
      )}
    </div>
  );
};

export default LmsMainContent;
