import Toast from "../../../../GlobalComponents/Toast";
import { useTraining } from "../../TrainingContext";

export const TrainingToast = () => {
  const { toastMessage, setToastMessage } = useTraining?.() || {};

  if (!toastMessage) return null;

  const isObject = typeof toastMessage === "object" && toastMessage !== null;
  const message = isObject ? toastMessage.message || toastMessage.text || "" : String(toastMessage);
  const type = isObject ? toastMessage.type || (toastMessage.isError ? "error" : "info") : "info";
  const title = isObject ? toastMessage.title : undefined;

  return (
    <Toast
      message={message}
      type={type}
      title={title}
      onClose={() => setToastMessage?.(null)}
    />
  );
};

export default TrainingToast;

