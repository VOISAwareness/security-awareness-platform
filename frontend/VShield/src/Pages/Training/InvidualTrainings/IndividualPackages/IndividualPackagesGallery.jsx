import { useMemo } from "react";
import { Search, Plus, Trash2, ArrowRightCircle } from "lucide-react";

export const IndividualPackagesGallery = ({
  packages,
  search,
  setSearch,
  isDark,
  handleLaunchStandalone,
  onDeletePackage,
  setCurrentView
}) => {
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchSearch = pkg.PackageName.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [packages, search]);

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-black/5 dark:border-white/5 pb-4 mb-5 gap-3 flex-shrink-0">
        <div className="flex items-center gap-4 text-left select-none">
          <span className="text-4xl text-[#16A34A] font-black tracking-tight leading-none">
            {packages.length < 10 ? `0${packages.length}` : packages.length}
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
            <span className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-tight mt-0.5">
              Zip Packages Stored
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className={`flex items-center h-[34px] rounded-lg border shadow-xs transition-colors px-2.5 gap-2 w-48 sm:w-64 ${
            isDark ? "bg-[#15161a] border-white/10" : "bg-white border-slate-200"
          }`}>
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter materials..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`flex-1 min-w-0 text-[10px] font-medium bg-transparent outline-none ${
                isDark ? "text-white placeholder:text-white/30" : "text-slate-800 placeholder:text-slate-400"
              }`}
            />
          </div>

          <button
            type="button"
            onClick={() => setCurrentView("add-package")}
            className={`h-[34px] pl-4 pr-3.5 rounded-full text-[9px] font-voda font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
              isDark ? "bg-white text-[#0B1121] hover:bg-slate-200" : "bg-[#06080D] text-white hover:bg-slate-800"
            }`}
          >
            Add Zip Package
            <span className={`w-[18px] h-[18px] rounded-md flex items-center justify-center ${isDark ? "bg-[#0B1121]/10" : "bg-white/15"}`}>
              <Plus className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 pb-12 custom-light-scrollbar animate-clay-stagger-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start content-start">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.PackageID}
              className={`border rounded-3xl p-5 flex flex-col justify-between h-[220px] transition-all duration-200 relative overflow-hidden select-none text-left ${
                isDark 
                  ? "bg-[#2E200C] text-white border-white/10 hover:shadow-lg" 
                  : "bg-[#FFEFCE] text-slate-900 border-[#FFE19C] hover:bg-[#FFEFCE] hover:border-[#FFE19C] hover:shadow-md"
              }`}
            >
              <div className="flex flex-col gap-2 z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[9px] font-bold bg-black/10 dark:bg-white/10 text-slate-500 dark:text-slate-300 shadow-2xs w-max">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {pkg.PackageID}
                </div>
                <h3 className="text-sm font-black tracking-tight text-slate-900 dark:text-white line-clamp-1">
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
                  {pkg.PackageID !== "SP-00001" && (
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
                    className="h-8 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer shadow-md transition-colors"
                  >
                    Launch <ArrowRightCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setCurrentView("add-package")}
            className="border-2 border-dashed border-white/10 hover:border-amber-500/40 bg-white/[0.01] hover:bg-amber-500/5 transition-all rounded-2xl p-6 flex flex-col items-center justify-center text-center h-[220px] gap-2.5 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-voda">Upload Zip Package</h4>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">
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
