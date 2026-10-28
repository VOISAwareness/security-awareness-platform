import React from "react";

const columns = [
  {
    key: "TrainingPathName",
    label: "Training Name",
  },
  {
    key: "assignedDate",
    label: "Assigned Date",
  },
  {
    key: "dueDate",
    label: "Due Date",
  },
  {
    key: "dueInDays",
    label: "Due in Days",
  },
  {
    key: "trainingStatus",
    label: "Status",
  },
];

const TrainingTableHeader = ({
  sortConfig,
  onSort,
}) => {
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return "↕";
    }

    return sortConfig.direction === "asc"
      ? "↑"
      : "↓";
  };

  return (
    <thead className="training-table-header">
      <tr>
        {columns.map((column) => (
          <th key={column.key}>
            <button
              type="button"
              onClick={() => onSort(column.key)}
            >
              {column.label}{" "}
              {getSortIcon(column.key)}
            </button>
          </th>
        ))}
      </tr>
    </thead>
  );
};

export default TrainingTableHeader;