
import { useMemo, useState, useEffect } from "react";
import trainingData from "../TrainingAllocationData.json";
import trainingPathData from "../TrainingPath";
import "../TrainingTable.css";
import { FilePlay, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const ITEMS_PER_PAGE = 6;
const CURRENT_USER_ID = "VSLD-000001";

const TRAINING_PATH_MAP = (Array.isArray(trainingPathData)
  ? trainingPathData
  : []
).reduce((acc, item) => {
  acc[String(item.TrainingPathID)] = item.TrainingPathName;
  return acc;
}, {});

const getTrainingPathName = (id) =>
  TRAINING_PATH_MAP[String(id)] || `Training ${id || ""}`;

const getTrainingStatusLabel = (status) => {
  switch (String(status ?? "").toLowerCase()) {
    case "pending":
      return "Start Training";
    case "ongoing":
      return "Continue Training";
    case "evaluated":
    case "evaluted":
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status || "—";
  }
};

export default function MyTrainingTableData({
  searchTerm = "",
  onCountChange,
}) {
  const [sortConfig, setSortConfig] = useState({
    key: "assignedDate",
    direction: "desc",
  });
  const VarTrainingTableScale = 0.95;
  const [currentPage, setCurrentPage] = useState(1);

  // Support JSON shaped as either { trainings: [] },
  // { campaigns: [] }, or a direct array.
  const sourceTrainings = useMemo(() => {
    if (Array.isArray(trainingData)) return trainingData;

    if (Array.isArray(trainingData?.trainings)) {
      return trainingData.trainings;
    }

    if (Array.isArray(trainingData?.campaigns)) {
      return trainingData.campaigns;
    }

    return [];
  }, []);

  const filteredTrainings = useMemo(() => {
    const search = String(searchTerm ?? "").trim().toLowerCase();

    return sourceTrainings
      .filter((training) => {
        // Keep the current-user restriction.
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

        const matchesUser = userId === CURRENT_USER_ID;
        const matchesStatus = ["pending", "ongoing"].includes(status);

        return matchesUser && matchesStatus;
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
            getTrainingPathName(trainingPathId),
          trainingStatus:
            training.trainingStatus ??
            training.TrainingStatus ??
            training.status ??
            "",
        };
      })
      .filter((training) => {
        if (!search) return true;

        const searchableFields = [
          training.TrainingPathName,
          training.TrainingPathID,
          training.trainingStatus,
        ];

        return searchableFields.some((value) =>
          String(value ?? "").toLowerCase().includes(search)
        );
      })
      .sort((a, b) => {
        const key = sortConfig.key;
        let first = a[key] ?? "";
        let second = b[key] ?? "";

        if (key === "assignedDate" || key === "dueDate") {
          first = first ? new Date(first).getTime() : 0;
          second = second ? new Date(second).getTime() : 0;
        } else if (key === "dueInDays") {
          first = Number(first) || 0;
          second = Number(second) || 0;
        } else {
          first = String(first).toLowerCase();
          second = String(second).toLowerCase();
        }

        if (first < second) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }

        if (first > second) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }

        return 0;
      });
  }, [sourceTrainings, searchTerm, sortConfig]);

  // Update the count shown in the parent component.
  useEffect(() => {
    if (typeof onCountChange === "function") {
      onCountChange(filteredTrainings.length);
    }
  }, [filteredTrainings.length, onCountChange]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTrainings.length / ITEMS_PER_PAGE)
  );

  // Reset pagination when the search changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Keep the selected page valid if the result count decreases.
  useEffect(() => {
    setCurrentPage((previousPage) =>
      Math.min(previousPage, totalPages)
    );
  }, [totalPages]);

  const displayedTrainings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

    return filteredTrainings.slice(
      startIndex,
      startIndex + ITEMS_PER_PAGE
    );
  }, [filteredTrainings, currentPage]);

  const handleSort = (key) => {
    setSortConfig((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <section className="training-table-card">
      <div className="training-table-scroll">
        <div
          className="training-table-scale"
          style={{
            zoom: VarTrainingTableScale,
          }}
        >
          <table className="training-table">
            <thead className="training-table-header">
              <tr>
                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("TrainingPathName")}
                  >
                    Training Name {getSortIcon("TrainingPathName")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("assignedDate")}
                  >
                    Assigned Date {getSortIcon("assignedDate")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("dueDate")}
                  >
                    Due Date {getSortIcon("dueDate")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("dueInDays")}
                  >
                    Due in Days {getSortIcon("dueInDays")}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => handleSort("trainingStatus")}
                  >
                    Status {getSortIcon("trainingStatus")}
                  </button>
                </th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {displayedTrainings.length > 0 ? (
                displayedTrainings.map((training, index) => (
                  <tr
                    key={
                      training.assignmentId ??
                      training.AssignmentID ??
                      `${training.TrainingPathID}-${(currentPage - 1) * ITEMS_PER_PAGE + index}`
                    }
                  >
                    <td>
                      <div className="training-name-cell">
                        <span className="training-icon" aria-hidden="true">
                          <FilePlay size={18} />
                        </span>

                        <div>
                          <strong>{training.TrainingPathName}</strong>
                          <small>{training.TrainingPathID}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong>
                        {formatDate(
                          training.assignedDate ?? training.AssignedDate
                        )}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {formatDate(training.dueDate ?? training.DueDate)}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {training.dueInDays ?? training.DueInDays ?? "—"}
                      </strong>
                    </td>

                    <td>
                      <Link
                        to={`/my-training/details/${encodeURIComponent(
                          String(
                            training.TrainingID ??
                            training.trainingId ??
                            training.trainingID ??
                            training.assignmentId ??
                            training.AssignmentID ??
                            training.TrainingPathID
                          )
                        )}`}
                        className={`training-status-badge ${String(
                          training.trainingStatus
                        ).toLowerCase()}`}
                        style={{
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                        }}
                      >
                        {getTrainingStatusLabel(training.trainingStatus)}
                      </Link>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="training-empty-state">
                    No matching training assignments found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      <div className="training-pagination">
        <button
          type="button"
          className="pagination-arrow"
          onClick={() =>
            setCurrentPage((page) => Math.max(1, page - 1))
          }
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <div className="pagination-pages">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`pagination-page ${currentPage === page ? "active" : ""
                  }`}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? "page" : undefined}
              >
                {page}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="pagination-arrow"
          onClick={() =>
            setCurrentPage((page) => Math.min(totalPages, page + 1))
          }
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}