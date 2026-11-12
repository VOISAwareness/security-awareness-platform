import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";

const DEFAULT_TRAINING_SORT_OPTIONS = [
  "Latest Updated",
  "Shortest Expiring Date",
  "Latest Created Date",
  "Oldest Created Date",
];

export const TrainingGalleryHeader = ({
  count = 0,
  title,
  counterColor = "#818CF8",
  search = "",
  setSearch,
  searchPlaceholder = "Search by ID or Name",
  sortBy = "Latest Created Date",
  setSortBy,
  sortOptions = DEFAULT_TRAINING_SORT_OPTIONS,
  actionButton = null,
}) => {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSortDropdown(false);
      }
    };
    if (showSortDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSortDropdown]);

  return (
    <div className="flex items-center justify-between pb-3.5 mb-2 flex-shrink-0 relative z-30 select-none">
      {/* Left Side: Dynamic Big Counter + Category Headline */}
      <div className="flex items-center gap-4 text-left">
        <span
          style={{ color: counterColor }}
          className="text-5xl font-black leading-none tracking-tight font-voda font-bold"
        >
          {String(count).padStart(2, "0")}
        </span>
        <span className="text-[15px] font-voda font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
          Total <br /> {title}
        </span>
      </div>

      {/* Right Side: Search Input on top, Sort Dropdown & Action Button below it */}
      <div className="flex flex-col gap-2 max-w-[340px] sm:max-w-[360px] w-full">
        {/* Search by ID or Name */}
        <div className="relative flex items-center w-full">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch && setSearch(e.target.value)}
            className="w-full h-7 pl-3 pr-8 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] font-bold text-slate-800 dark:text-slate-200 text-[9px] placeholder-slate-400 outline-none border border-black/5 dark:border-white/5"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
        </div>

        {/* Row below search: Sort Dropdown on the left, Action Button on the end */}
        <div className="flex items-center justify-between gap-2 w-full">
          {/* Sort By Dropdown (z-[100] to float over lower base) */}
          <div className="relative w-40 flex-shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="w-full h-6 px-2.5 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] text-slate-700 dark:text-slate-300 text-[8px] font-bold flex items-center justify-between border border-black/5 dark:border-white/5 cursor-pointer shadow-2xs"
            >
              <span className="truncate">
                Sort By: {sortBy.split(" ").slice(0, 2).join(" ")}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 ml-1" />
            </button>

            {showSortDropdown && (
              <div className="absolute top-7 left-0 w-44 bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-[100] flex flex-col">
                {sortOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSortBy && setSortBy(option);
                      setShowSortDropdown(false);
                    }}
                    className={`px-3 py-1 text-left text-[9px] font-bold cursor-pointer transition-colors ${
                      sortBy === option
                        ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Button (e.g. Add Video, Add Course, etc.) */}
          {actionButton}
        </div>
      </div>
    </div>
  );
};

export default TrainingGalleryHeader;
