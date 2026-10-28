import React from "react";
import { Link } from "react-router-dom";
import { getTrainingStatusLabel } from "../utils/trainingUtils";

const TrainingStatusBadge = ({ training }) => {
  const status = String(
    training.trainingStatus ?? ""
  ).toLowerCase();

  const trainingId =
    training.TrainingID ??
    training.trainingId ??
    training.trainingID ??
    training.assignmentId ??
    training.AssignmentID ??
    training.TrainingPathID;

  return (
    <Link
      to={`/my-training/details/${encodeURIComponent(
        String(trainingId)
      )}`}
      className={`training-status-badge ${status}`}
    >
      {getTrainingStatusLabel(status)}
    </Link>
  );
};

export default TrainingStatusBadge;