
import { AllTrainingPathGallery } from "./TrainingPathAllGallery/TrainingPathAllGallery";
import { CreateNewTrainingPath } from "./TrainingPathCreateNew/TrainingPathCreateNew";

export const TrainingPathLandingPage = ({
  paths,
  filteredPaths,
  videos,
  quizzes,
  certificates,
  packages,
  isDark,
  search,
  setSearch,
  editingPath,
  setEditingPath,
  pathsSubTab,
  setPathsSubTab,
  handleLaunchPathway,
  onSavePath,
  onDeletePath,
  onSendForApproval,
  onAddVideo,
  onAddQuiz,
  onAddCertificate,
  onAddPackage,
  setCurrentView
}) => {
  if (pathsSubTab === "create" || editingPath) {
    return (
      <div className="flex-1 h-full min-h-0 overflow-hidden">
        <CreateNewTrainingPath
          videos={videos}
          quizzes={quizzes}
          certificates={certificates}
          packages={packages}
          editingPath={editingPath}
          defaultAlwaysAvailable={true}
          isInline={true}
          onAddVideo={onAddVideo}
          onAddQuiz={onAddQuiz}
          onAddCertificate={onAddCertificate}
          onAddPackage={onAddPackage}
          onSave={onSavePath}
          onDelete={onDeletePath}
          onClose={() => {
            setPathsSubTab("all");
            setEditingPath(null);
          }}
        />
      </div>
    );
  }

  return (
    <AllTrainingPathGallery
      paths={paths}
      filteredPaths={filteredPaths}
      videos={videos}
      quizzes={quizzes}
      certificates={certificates}
      isDark={isDark}
      search={search}
      setSearch={setSearch}
      handleLaunchPathway={handleLaunchPathway}
      onEdit={setEditingPath}
      onSendForApproval={onSendForApproval}
      onCreateClick={() => setPathsSubTab("create")}
    />
  );
};

export default TrainingPathLandingPage;
