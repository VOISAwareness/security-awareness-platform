import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import TrainingGalleryHeader from "../../components/shared/TrainingGalleryHeader";

export const IndividualPackagesGallery = ({
  packages,
  search,
  setSearch,
  isDark,
  handleLaunchStandalone,
  onDeletePackage,
  setCurrentView
}) => {
  const [sortChoice, setSortBy] = useState(null);
  const sortBy = sortChoice || "Latest Created Date";

  const displayPackages = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const sourceList = packages || [];
    let list = sourceList.filter((pkg) => {
      if (!q) return true;
      const matchName = (pkg.PackageName || "").toLowerCase().includes(q);
      const matchId = (pkg.PackageID || "").toLowerCase().includes(q);
      return matchName || matchId;
    });

    return [...list].sort((a, b) => {
      const dateA = new Date(a.CreatedOn || a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.CreatedOn || b.createdAt || b.updatedAt || 0).getTime();
      const expA = new Date(a.ExpiryDate || a.ExpiresOn || 0).getTime();
      const expB = new Date(b.ExpiryDate || b.ExpiresOn || 0).getTime();

      if (sortBy === "Shortest Expiring Date") return expA - expB;
      if (sortBy === "Latest Updated") {
        const upA = new Date(a.updatedAt || a.CreatedOn || 0).getTime();
        const upB = new Date(b.updatedAt || b.CreatedOn || 0).getTime();
        return upB - upA;
      }
      if (sortBy === "Oldest Created Date") {
        return (dateA - dateB) || String(a.PackageID || "").localeCompare(String(b.PackageID || ""), undefined, { numeric: true });
      }
      return (dateB - dateA) || String(b.PackageID || "").localeCompare(String(a.PackageID || ""), undefined, { numeric: true });
    });
  }, [packages, search, sortBy]);

  const actionButton = (
    <button
      type="button"
      onClick={() => setCurrentView("add-package")}
      className={`h-6 px-3 rounded-lg text-[8.5px] font-voda font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0 ${
        isDark ? "bg-white text-[#0B1121] hover:bg-slate-200" : "bg-[#06080D] text-white hover:bg-slate-800"
      }`}
    >
      <span>Add Zip Package</span>
      <span className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center ${isDark ? "bg-[#0B1121]/10" : "bg-white/15"}`}>
        <Plus className="w-2.5 h-2.5" strokeWidth={3} />
      </span>
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <TrainingGalleryHeader
        count={displayPackages.length}
        title="Training Packages"
        counterColor="#F59E0B"
        search={search}
        setSearch={setSearch}
        searchPlaceholder="Search by Package ID or Package Name"
        sortBy={sortBy}
        setSortBy={setSortBy}
        actionButton={actionButton}
      />

      <div className="flex-1 overflow-y-auto pr-1 pb-12 custom-light-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start content-start">
          {displayPackages.map((pkg) => (
            <div
              key={pkg.PackageID}
              className={`border rounded-3xl p-5 flex flex-col justify-between h-[220px] transition-all duration-200 relative overflow-hidden select-none text-left ${
                isDark
                  ? "bg-[#2E200C] text-white border-white/10 hover:shadow-lg"
                  : "bg-[#FFEFCE] text-slate-900 border-[#FFE19C] hover:bg-[#FFEFCE] hover:border-[#FFE19C] hover:shadow-md"
              }`}
            >
              <div className="flex flex-col gap-2 z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[9px] font-bold font-mono-tech bg-black/10 dark:bg-white/10 text-slate-500 dark:text-slate-300 shadow-2xs w-max">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pkg.PackageID}
                </div>
                <h3 className="text-sm font-black font-voda tracking-tight text-slate-900 dark:text-white line-clamp-1">
                  {pkg.PackageName}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {pkg.Description}
                </p>
              </div>

              <div className="absolute right-4 top-4 w-12 h-12 opacity-10 pointer-events-none select-none text-slate-400 dark:text-white">
                <Plus className="w-full h-full" />
              </div>

              <div className="flex items-center justify-between border-t border-black/5 dark:border-white/5 pt-3 mt-4 z-10">
                <span className="text-[10px] font-bold text-slate-400">
                  {pkg.duration || 20} Mins
                </span>
                <div className="flex items-center gap-2">
                  {!pkg.isSample && (
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm("Are you sure you want to delete this standalone package?")) {
                          onDeletePackage(pkg.PackageID);
                        }
                      }}
                      className="h-8 w-8 rounded-xl bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/15 border border-black/5 dark:border-white/5 text-slate-500 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
                      title="Delete Package"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleLaunchStandalone(pkg)}
                    className="h-8 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-[10px] font-bold text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    Launch
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setCurrentView("add-package")}
            className="border-2 border-dashed border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 bg-slate-50/50 dark:bg-white/[0.01] hover:bg-slate-100/50 dark:hover:bg-amber-500/5 transition-all rounded-2xl p-6 flex flex-col items-center justify-center text-center h-[220px] gap-2.5 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
              <Plus className="w-6 h-6 text-slate-500 dark:text-slate-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider font-voda">Upload Zip Package</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                Directly upload pre-compiled SCORM / HTML5 standalone packages.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IndividualPackagesGallery;
