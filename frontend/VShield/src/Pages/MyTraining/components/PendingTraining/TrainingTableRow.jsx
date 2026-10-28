import React from "react";
import { FilePlay } from "lucide-react";
import { formatTrainingDate } from "../../utils/trainingUtils";
import TrainingStatusBadge from "./TrainingStatusBadge";

const TrainingTableRow = ({ training }) => {
  return (
    <tr>
      <td>
        <div className="training-name-cell">
          <span
            className="training-icon"
            aria-hidden="true"
          >
            <FilePlay size={18} />
          </span>

          <div>
            <strong>
              {training.TrainingPathName}
            </strong>

            <small>
              {training.TrainingPathID}
            </small>
          </div>
        </div>
      </td>

      <td>
        <strong>
          {formatTrainingDate(
            training.assignedDate ??
            training.AssignedDate
          )}
        </strong>
      </td>

      <td>
        <strong>
          {formatTrainingDate(
            training.dueDate ??
            training.DueDate
          )}
        </strong>
      </td>

      <td>
        <strong>
          {training.dueInDays ??
            training.DueInDays ??
            "—"}
        </strong>
      </td>

      <td>
        <TrainingStatusBadge training={training} />
      </td>
    </tr>
  );
};

export default TrainingTableRow;