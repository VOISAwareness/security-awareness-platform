import Toast from "../../../../GlobalComponents/Toast";
import { useTraining } from "../../TrainingContext";

export const TrainingToast = () => {
  const { toastMessage, setToastMessage } = useTraining?.() || {};

  if (!toastMessage) return null;

  return (
    <Toast
      message={toastMessage}
      onClose={() => setToastMessage?.("")}
    />
  );
};

export default TrainingToast;

