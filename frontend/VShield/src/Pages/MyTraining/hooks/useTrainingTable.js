import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ACTIVE_TRAINING_STATUSES,
  CURRENT_USER_ID,
  ITEMS_PER_PAGE,
} from "../constants/trainingConstants";

import {
  createTrainingPathMap,
  getTrainingPathName,
} from "../utils/trainingUtils";

const getSourceTrainings = (trainingData) => {
  if (Array.isArray(trainingData)) {
    return trainingData;
  }

  if (Array.isArray(trainingData?.trainings)) {
    return trainingData.trainings;
  }

  if (Array.isArray(trainingData?.campaigns)) {
    return trainingData.campaigns;
  }

  return [];
};

export const useTrainingTable = ({
  trainingData,
  trainingPathData,
  searchTerm,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: "assignedDate",
    direction: "desc",
  });

  const [currentPage, setCurrentPage] =
    useState(1);

  const trainingPathMap = useMemo(
    () => createTrainingPathMap(trainingPathData),
    [trainingPathData]
  );

  const sourceTrainings = useMemo(
    () => getSourceTrainings(trainingData),
    [trainingData]
  );

  const filteredTrainings = useMemo(() => {
    const search = String(searchTerm ?? "")
      .trim()
      .toLowerCase();

    return sourceTrainings
      .filter((training) => {
        const userId = String(
          training.userId ??
          training.UserID ??
          training.userID ??
          ""
        );

        const status = String(
          training.trainingStatus ??
          training.TrainingStatus ??
          training.status ??
          ""
        ).toLowerCase();

        return (
          userId === CURRENT_USER_ID &&
          ACTIVE_TRAINING_STATUSES.includes(
            status
          )
        );
      })

      .map((training) => {
        const trainingPathId =
          training.TrainingPathID ??
          training.trainingPathId ??
          training.trainingPathID ??
          "";

        return {
          ...training,

          TrainingPathID: trainingPathId,

          TrainingPathName:
            training.TrainingPathName ??
            training.trainingPathName ??
            getTrainingPathName(
              trainingPathId,
              trainingPathMap
            ),

          trainingStatus:
            training.trainingStatus ??
            training.TrainingStatus ??
            training.status ??
            "",
        };
      })

      .filter((training) => {
        if (!search) {
          return true;
        }

        const fields = [
          training.TrainingPathName,
          training.TrainingPathID,
          training.trainingStatus,
        ];

        return fields.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search)
        );
      })

      .sort((a, b) => {
        const key = sortConfig.key;

        let first = a[key] ?? "";
        let second = b[key] ?? "";

        if (
          key === "assignedDate" ||
          key === "dueDate"
        ) {
          first = first
            ? new Date(first).getTime()
            : 0;

          second = second
            ? new Date(second).getTime()
            : 0;
        } else if (key === "dueInDays") {
          first = Number(first) || 0;
          second = Number(second) || 0;
        } else {
          first = String(first).toLowerCase();
          second = String(second).toLowerCase();
        }

        if (first < second) {
          return sortConfig.direction === "asc"
            ? -1
            : 1;
        }

        if (first > second) {
          return sortConfig.direction === "asc"
            ? 1
            : -1;
        }

        return 0;
      });
  }, [
    sourceTrainings,
    searchTerm,
    sortConfig,
    trainingPathMap,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredTrainings.length /
        ITEMS_PER_PAGE
    )
  );

  const displayedTrainings = useMemo(() => {
    const startIndex =
      (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredTrainings.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
  }, [
    filteredTrainings,
    currentPage,
  ]);

  const handleSort = (key) => {
    setSortConfig((previous) => ({
      key,

      direction:
        previous.key === key &&
        previous.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage((previousPage) =>
      Math.min(previousPage, totalPages)
    );
  }, [totalPages]);

  return {
    displayedTrainings,
    filteredTrainings,
    sortConfig,
    currentPage,
    totalPages,
    setCurrentPage,
    handleSort,
  };
};