
import { useMemo, useState } from "react";
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
  showPathCreator,
  setShowPathCreator,
  handleLaunchPathway,
  onSavePath,
  onDeletePath,
  onSendForApproval,
  onAddVideo,
  onAddQuiz,
  onAddCertificate,
  onAddPackage
}) => {
  const [localShowCreator, setLocalShowCreator] = useState(false);
  const isCreating = showPathCreator !== undefined ? showPathCreator : localShowCreator;
  const setIsCreating = setShowPathCreator || setLocalShowCreator;

  const isCourseTab = pathsSubTab === "courses";

  // Filter paths for the active tab:
  // Only show paths that have been approved (status === 'Published' or undefined for seed paths)
  // In Courses tab: only show paths saved with isAlwaysAvailable = true
  // In All Training Paths tab: only show paths without isAlwaysAvailable (skip always available courses)
  const isApproved = (p) => p.status === 'Published' || p.status === undefined;

  const tabPaths = useMemo(() => {
    return paths.filter((p) => {
      if (!isApproved(p)) return false;
      return isCourseTab ? !!p.isAlwaysAvailable : !p.isAlwaysAvailable;
    });
  }, [paths, isCourseTab]);

  const tabFilteredPaths = useMemo(() => {
    return filteredPaths.filter((p) => {
      if (!isApproved(p)) return false;
      return isCourseTab ? !!p.isAlwaysAvailable : !p.isAlwaysAvailable;
    });
  }, [filteredPaths, isCourseTab]);

  if (isCreating || editingPath) {
    return (
      <div className="flex-1 h-full min-h-0 overflow-hidden">
        <CreateNewTrainingPath
          videos={videos}
          quizzes={quizzes}
          certificates={certificates}
          packages={packages}
          editingPath={editingPath}
          defaultAlwaysAvailable={editingPath ? editingPath.isAlwaysAvailable : isCourseTab}
          isInline={true}
          onAddVideo={onAddVideo}
          onAddQuiz={onAddQuiz}
          onAddCertificate={onAddCertificate}
          onAddPackage={onAddPackage}
          onSave={(saved) => {
            onSavePath(saved);
            setIsCreating(false);
            setEditingPath(null);
          }}
          onDelete={(id) => {
            onDeletePath(id);
            setIsCreating(false);
            setEditingPath(null);
          }}
          onClose={() => {
            setIsCreating(false);
            setEditingPath(null);
          }}
        />
      </div>
    );
  }

  return (
    <AllTrainingPathGallery
      paths={tabPaths}
      filteredPaths={tabFilteredPaths}
      videos={videos}
      quizzes={quizzes}
      certificates={certificates}
      isDark={isDark}
      search={search}
      setSearch={setSearch}
      handleLaunchPathway={handleLaunchPathway}
      onEdit={setEditingPath}
      onSendForApproval={onSendForApproval}
      onCreateClick={() => setIsCreating(true)}
      isCourseTab={isCourseTab}
    />
  );
};

export default TrainingPathLandingPage;
