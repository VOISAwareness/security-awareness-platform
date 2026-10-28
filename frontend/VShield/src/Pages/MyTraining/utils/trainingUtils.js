
export const TRAINING_PATH_MAP = (Array.isArray(trainingPathData)
  ? trainingPathData
  : []
).reduce((acc, item) => {
  acc[String(item.TrainingPathID)] = item.TrainingPathName;
  return acc;
}, {});

export const getTrainingPathName = (id) =>
  TRAINING_PATH_MAP[String(id)] || `Training ${id || ""}`;

export const getTrainingStatusLabel = (status) => {
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
export const formatDate = (dateString) => {
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