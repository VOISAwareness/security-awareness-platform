
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
    onExportCSVReady,
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
                const matchesStatus = ["evaluted", "failed"].includes(status);

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

                // Sort date columns correctly for dates like 02-Mar-2026
                if (key === "assignedDate" || key === "dueDate") {
                    const parseDate = (value) => {
                        if (!value) return 0;

                        const parsedDate = new Date(value);

                        if (!Number.isNaN(parsedDate.getTime())) {
                            return parsedDate.getTime();
                        }

                        // Fallback for DD-MMM-YYYY date format
                        const match = String(value).match(
                            /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/
                        );

                        if (!match) return 0;

                        const months = {
                            jan: 0, feb: 1, mar: 2, apr: 3,
                            may: 4, jun: 5, jul: 6, aug: 7,
                            sep: 8, oct: 9, nov: 10, dec: 11,
                        };

                        const month = months[match[2].toLowerCase()];

                        return month === undefined
                            ? 0
                            : new Date(
                                Number(match[3]),
                                month,
                                Number(match[1])
                            ).getTime();
                    };

                    first = parseDate(first);
                    second = parseDate(second);
                }
                // Sort points and attempt counts numerically
                else if (
                    [
                        "trainingPoints",
                        "evaluationPoints",
                        "trainingTotalPoints",
                        "attemptCount",
                        "dueInDays",
                    ].includes(key)
                ) {
                    first = Number.parseFloat(first) || 0;
                    second = Number.parseFloat(second) || 0;
                }
                // Sort score values numerically, e.g. 80% vs 10%
                else if (key === "currentScore") {
                    first = Number.parseFloat(String(first).replace("%", "")) || 0;
                    second = Number.parseFloat(String(second).replace("%", "")) || 0;
                }
                // Sort names and statuses alphabetically
                else {
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

    const exportCSV = () => {
        const headers = [
            "Training Name",
            "Training Path ID",
            "Assigned Date",
            "Due Date",
            "Due in Days",
            "Status",
        ];

        const escapeCSV = (value) =>
            `"${String(value ?? "").replace(/"/g, '""')}"`;

        const rows = filteredTrainings.map((training) => [
            training.TrainingPathName,
            training.TrainingPathID,
            formatDate(training.assignedDate ?? training.AssignedDate),
            formatDate(training.dueDate ?? training.DueDate),
            training.dueInDays ?? training.DueInDays ?? "—",
            training.trainingStatus,
        ]);

        const csvContent = [headers, ...rows]
            .map((row) => row.map(escapeCSV).join(","))
            .join("\r\n");

        const blob = new Blob(["\uFEFF" + csvContent], {
            type: "text/csv;charset=utf-8;",
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "pending-training.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    useEffect(() => {
        if (typeof onExportCSVReady !== "function") return;

        onExportCSVReady(exportCSV);

        return () => {
            onExportCSVReady(null);
        };
    }, [filteredTrainings]);

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
                                        onClick={() => handleSort("dueDate")}
                                    >
                                        Due Date {getSortIcon("dueDate")}
                                    </button>
                                </th>




                                <th>
                                    <button
                                        type="button"
                                        onClick={() => handleSort("trainingPoints")}
                                    >
                                        Training Points {getSortIcon("trainingPoints")}
                                    </button>
                                </th>

                                <th>
                                    <button
                                        type="button"
                                        onClick={() => handleSort("evaluationPoints")}
                                    >
                                        Evaluated Points {getSortIcon("evaluationPoints")}
                                    </button>
                                </th>

                                <th>
                                    <button
                                        type="button"
                                        onClick={() => handleSort("trainingTotalPoints")}
                                    >
                                        Total Points {getSortIcon("trainingTotalPoints")}
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
                                                    <FilePlay size={25} />
                                                </span>
                                                <div className="training-details">
                                                    <p>
                                                        <Link
                                                            to={`/my-training/details/${training.TrainingPathID}`}
                                                            className="training-link"
                                                        >
                                                            <strong>{training.TrainingPathName}</strong>
                                                        </Link>
                                                    </p>

                                                    <p>
                                                        <strong>Training ID:</strong> {training.TrainingPathID}
                                                    </p>

                                                    <p>
                                                        <strong>Assigned Date:</strong>{" "}
                                                        {formatDate(
                                                            training.assignedDate ??
                                                            training.AssignedDate
                                                        )}
                                                    </p>
                                                </div>

                                            </div>
                                        </td>



                                        <td>
                                            <strong>
                                                {formatDate(training.dueDate ?? training.DueDate)}
                                            </strong>
                                        </td>




                                        <td>
                                            <strong>+{training.trainingPoints ?? "0"}</strong>
                                        </td>

                                        <td>
                                            <strong>+{training.evaluationPoints ?? "0"}</strong>
                                        </td>

                                        <td>
                                            
                                                    <strong>{training.trainingTotalPoints || 0}%</strong>
                                                

                                            
                                        </td>
                                        <td>
                                            <span
                                                className={`training-status-badge ${String(
                                                    training.trainingStatus
                                                ).toLowerCase()}`}
                                            >
                                                {getTrainingStatusLabel(training.trainingStatus)}
                                            </span>
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
