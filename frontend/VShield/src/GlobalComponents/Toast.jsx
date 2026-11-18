import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Check, Info, X } from "lucide-react";

/**
 * Standardized Toast notification component.
 * Positioned fixed at the top-right corner of the screen (z-[9999]).
 * Supports success, error/failure, warning, and info designs.
 */
export const Toast = ({
  message,
  type,
  variant,
  title,
  onClose,
  duration,
  children,
  className = "",
  isError,
  tone,
  ...restProps
}) => {
  useEffect(() => {
    if (duration && typeof onClose === "function") {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message && !children) return null;
  if (typeof document === "undefined") return null;

  const isObject = typeof message === "object" && message !== null;
  const messageText = isObject
    ? message.message || message.text || ""
    : String(message || "");

  // Resolve notification kind strictly from explicit props/object - NO keyword sniffing
  let rawKind = (
    type ||
    variant ||
    (isObject && (message.type || message.variant || message.kind)) ||
    ""
  ).toLowerCase();

  if (!rawKind) {
    if (isError || (isObject && message.isError) || tone === "bad" || (isObject && message.tone === "bad")) {
      rawKind = "error";
    } else if (tone === "good" || (isObject && message.tone === "good")) {
      rawKind = "success";
    }
  }

  // Normalize aliases
  let kind = rawKind;
  if (kind === "err" || kind === "failure" || kind === "bad") kind = "error";
  else if (kind === "warn") kind = "warning";
  else if (kind === "good") kind = "success";
  else if (kind === "notice") kind = "info";

  // If type/kind was not supplied, warn developer in dev mode and fall back to neutral "info"
  if (!kind || !["success", "error", "warning", "info"].includes(kind)) {
    if (import.meta.env?.DEV) {
      console.warn(
        `[Toast] Missing required 'type' prop (received: "${type}"). Please pass type="success" | "error" | "warning" | "info". Defaulting to "info".`
      );
    }
    kind = "info";
  }

  // Resolve title: explicit title if provided, otherwise standard title per kind
  let displayTitle = title || (isObject && message.title);
  if (!displayTitle) {
    const defaultTitles = {
      success: "Success",
      error: "Error",
      warning: "Warning",
      info: "Notice",
    };
    displayTitle = defaultTitles[kind] || "Notice";
  }

  const kindStyles = {
    success: {
      border: "border-emerald-500/30 dark:border-emerald-500/40",
      iconBg: "bg-emerald-100 text-[#16A34A] dark:bg-emerald-950/60 dark:text-emerald-400",
      titleText: "text-[#16A34A] dark:text-emerald-400",
      icon: <Check className="w-4 h-4 stroke-[2.5]" />,
    },
    error: {
      border: "border-red-500/30 dark:border-red-500/40",
      iconBg: "bg-red-100 text-[#E60000] dark:bg-red-950/60 dark:text-red-400",
      titleText: "text-[#E60000] dark:text-red-400",
      icon: <AlertTriangle className="w-4 h-4 stroke-[2.5]" />,
    },
    warning: {
      border: "border-amber-500/30 dark:border-amber-500/40",
      iconBg: "bg-amber-100 text-[#D97706] dark:bg-amber-950/60 dark:text-amber-400",
      titleText: "text-[#D97706] dark:text-amber-400",
      icon: <AlertTriangle className="w-4 h-4 stroke-[2.5]" />,
    },
    info: {
      border: "border-sky-500/30 dark:border-sky-500/40",
      iconBg: "bg-sky-100 text-[#0284C7] dark:bg-sky-950/60 dark:text-sky-400",
      titleText: "text-[#0284C7] dark:text-sky-400",
      icon: <Info className="w-4 h-4 stroke-[2.5]" />,
    },
  }[kind] || {
    border: "border-emerald-500/30 dark:border-emerald-500/40",
    iconBg: "bg-emerald-100 text-[#16A34A] dark:bg-emerald-950/60 dark:text-emerald-400",
    titleText: "text-[#16A34A] dark:text-emerald-400",
    icon: <Check className="w-4 h-4 stroke-[2.5]" />,
  };

  return createPortal(
    <div
      role="status"
      {...restProps}
      className={`fixed top-5 right-6 z-[9999] flex ${
        children ? "items-start" : "items-center"
      } gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#161820] text-slate-900 dark:text-white border ${
        kindStyles.border
      } shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm sm:max-w-md ${className}`}
    >
      <div
        className={`w-8 h-8 rounded-full ${kindStyles.iconBg} flex items-center justify-center flex-shrink-0`}
      >
        {kindStyles.icon}
      </div>

      <div className="flex flex-col text-left leading-tight flex-1 min-w-0">
        {displayTitle && (
          <span
            className={`text-[10px] font-voda font-bold ${kindStyles.titleText} uppercase tracking-wider`}
          >
            {displayTitle}
          </span>
        )}
        {messageText && (
          <span className="text-[9.5px] font-medium text-slate-700 dark:text-slate-300 mt-0.5">
            {messageText}
          </span>
        )}
        {children}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer flex-shrink-0 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>,
    document.body
  );
};

export default Toast;
