import { X } from "lucide-react";
import { GlassmorphicBackdrop } from "../shared/GlassmorphicBackdrop";
import { useIsDarkMode } from "./helpers";

export const PackageViewerModal = ({
  pkg,
  launchHtmlUrl,
  zipError,
  onClose,
  isInline = false
}) => {
  const isDark = useIsDarkMode();

  const content = (
    <div className={`w-full overflow-hidden flex flex-col select-none font-sans text-left ${
      isInline
        ? `flex-1 h-full min-h-0 justify-between ${isDark ? "bg-[#0B1121] text-white" : "bg-white text-slate-800"}`
        : `bg-[#0B1121] border border-white/10 rounded-2xl shadow-2xl max-w-4xl h-[85vh]`
    }`}>
      {/* ── DOCKED TOP HEADER BAR ── */}
      <div className={`w-full h-12 flex items-stretch justify-between flex-shrink-0 select-none border-b ${
        isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200/90 bg-white"
      }`}>
        <div className="px-6 h-full flex items-center gap-2.5 flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-[#E60000] animate-pulse" />
          <span className="font-voda font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
            {pkg?.PackageName || "Imported Package"}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`px-4 h-full flex items-center justify-center border-l hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer ${
            isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500"
          }`}
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── SIMULATION SANDBOX BODY ── */}
      <div className="flex-1 min-h-0 bg-black relative flex items-center justify-center overflow-hidden">
        {zipError ? (
          <div className="p-6 text-center max-w-md">
            <p className="text-red-400 text-sm font-bold uppercase">Compilation Error</p>
            <p className="text-xs text-slate-400 mt-2">{zipError}</p>
          </div>
        ) : launchHtmlUrl ? (
          <iframe
            src={launchHtmlUrl}
            title={pkg?.PackageName || "Package Preview"}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-modals"
          />
        ) : (
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Extracting files and launching the package...
            </p>
          </div>
        )}
      </div>

      {/* ── DOCKED FOOTER BAR ── */}
      <div className={`w-full px-6 py-3 border-t flex items-center justify-end gap-2.5 flex-shrink-0 select-none ${
        isDark ? "border-white/10 bg-[#12141A]" : "border-slate-200 bg-white"
      }`}>
        <button
          type="button"
          onClick={onClose}
          className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
        >
          CLOSE
        </button>
      </div>
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <GlassmorphicBackdrop isDark={isDark} onClose={onClose}>
      {content}
    </GlassmorphicBackdrop>
  );
};

export default PackageViewerModal;
