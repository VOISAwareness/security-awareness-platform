import { createPortal } from "react-dom";
import { AlertTriangle, Check, X } from "lucide-react";
import { useTraining } from "../../TrainingContext";

export const TrainingToast = () => {
  const { toastMessage, setToastMessage } = useTraining?.() || {};

  if (!toastMessage || typeof document === "undefined") return null;

  const isObject = typeof toastMessage === "object" && toastMessage !== null;
  const isError = isObject
    ? toastMessage.type === "error"
    : /error|failed|couldn't|cannot|reject|invalid|required/i.test(String(toastMessage));

  const toastTitle =
    isObject && toastMessage.title
      ? toastMessage.title
      : isError
      ? (/reject/i.test(String(toastMessage)) ? "Action Recorded" : "Input Required")
      : (/approved|publish/i.test(String(toastMessage)) ? "Approved" : "Success");

  const toastText = isObject ? toastMessage.message : String(toastMessage);

  return createPortal(
    <div
      role="status"
      className={`fixed top-5 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-slate-900 border ${
        isError ? "border-red-500/30" : "border-emerald-500/30"
      } shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm`}
    >
      <div
        className={`w-8 h-8 rounded-full ${
          isError ? "bg-red-100 text-[#E60000]" : "bg-emerald-100 text-[#16A34A]"
        } flex items-center justify-center flex-shrink-0`}
      >
        {isError ? (
          <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
        ) : (
          <Check className="w-4 h-4 stroke-[2.5]" />
        )}
      </div>
      <div className="flex flex-col text-left leading-tight flex-1">
        <span
          className={`text-[10px] font-voda font-bold ${
            isError ? "text-[#E60000]" : "text-[#16A34A]"
          } uppercase tracking-wider`}
        >
          {toastTitle}
        </span>
        <span className="text-[9.5px] font-medium text-slate-700 mt-0.5">
          {toastText}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setToastMessage?.("")}
        className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>,
    document.body
  );
};

export default TrainingToast;
