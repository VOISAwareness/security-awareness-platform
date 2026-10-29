import IndividualVideosGallery from "./IndividualVideos/IndividualVideosGallery";
import CreateNewVideos from "./IndividualVideos/CreateNewVideos";
import IndividualQuizGallery from "./IndividualQuiz/IndividualQuizGallery";
import CreateNewQuiz from "./IndividualQuiz/CreateNewQuiz";
import IndividualCertificatesGallery from "./IndividualCertificates/IndividualCertificatesGallery";
import CreateNewCertificates from "./IndividualCertificates/CreateNewCertificates";
import IndividualPackagesGallery from "./IndividualPackages/IndividualPackagesGallery";
import CreateNewPackages from "./IndividualPackages/CreateNewPackages";

export const InvidualTrainingsLandingPage = ({
  individualSubTab,
  setIndividualSubTab,
  videos,
  quizzes,
  certificates,
  packages,
  isDark,
  search,
  setSearch,
  editingVideo,
  setEditingVideo,
  editingQuiz,
  setEditingQuiz,
  editingCert,
  setEditingCert,
  showVideoUploader,
  setShowVideoUploader,
  showQuizCreator,
  setShowQuizCreator,
  showCertCreator,
  setShowCertCreator,
  currentView,
  setCurrentView,
  setActiveVideo,
  setActiveQuiz,
  setActiveCert,
  handleLaunchStandalone,
  onAddVideo,
  onAddQuiz,
  onAddCertificate,
  onAddPackage,
  onDeleteVideo,
  onDeleteQuiz,
  onDeleteCertificate,
  onDeletePackage
}) => {
  // If we are configuring a package in full view
  if (currentView === "add-package") {
    return (
      <CreateNewPackages
        isDark={isDark}
        onSave={onAddPackage}
        onCancel={() => {
          setCurrentView("individual");
          setIndividualSubTab("packages");
        }}
      />
    );
  }

  // Videos Tab Render
  if (individualSubTab === "videos") {
    if (showVideoUploader || editingVideo) {
      return (
        <CreateNewVideos
          isInline={true}
          editingVideo={editingVideo}
          onSave={onAddVideo}
          onDelete={onDeleteVideo}
          onClose={() => {
            setEditingVideo(null);
            setShowVideoUploader(false);
          }}
        />
      );
    }
    return (
      <IndividualVideosGallery
        videos={videos}
        search={search}
        setSearch={setSearch}
        isDark={isDark}
        setActiveVideo={setActiveVideo}
        setEditingVideo={setEditingVideo}
        setShowVideoUploader={setShowVideoUploader}
      />
    );
  }

  // Quizzes Tab Render
  if (individualSubTab === "quizzes") {
    if (showQuizCreator || editingQuiz) {
      return (
        <CreateNewQuiz
          isInline={true}
          editingQuiz={editingQuiz}
          onSave={onAddQuiz}
          onDelete={onDeleteQuiz}
          onClose={() => {
            setEditingQuiz(null);
            setShowQuizCreator(false);
          }}
        />
      );
    }
    return (
      <IndividualQuizGallery
        quizzes={quizzes}
        search={search}
        setSearch={setSearch}
        isDark={isDark}
        setActiveQuiz={setActiveQuiz}
        setEditingQuiz={setEditingQuiz}
        setShowQuizCreator={setShowQuizCreator}
      />
    );
  }

  // Certificates Tab Render
  if (individualSubTab === "certificates") {
    if (showCertCreator || editingCert) {
      return (
        <CreateNewCertificates
          isInline={true}
          editingCert={editingCert}
          onSave={onAddCertificate}
          onDelete={onDeleteCertificate}
          onClose={() => {
            setEditingCert(null);
            setShowCertCreator(false);
          }}
        />
      );
    }
    return (
      <IndividualCertificatesGallery
        certificates={certificates}
        search={search}
        setSearch={setSearch}
        isDark={isDark}
        setActiveCert={setActiveCert}
        setEditingCert={setEditingCert}
        setShowCertCreator={setShowCertCreator}
      />
    );
  }

  // Packages Tab Render
  if (individualSubTab === "packages") {
    return (
      <IndividualPackagesGallery
        packages={packages}
        search={search}
        setSearch={setSearch}
        isDark={isDark}
        handleLaunchStandalone={handleLaunchStandalone}
        onDeletePackage={onDeletePackage}
        setCurrentView={setCurrentView}
      />
    );
  }

  return null;
};

export default InvidualTrainingsLandingPage;
