import { useState } from "react";
import { SlidersHorizontal, ChevronDown, Check, X } from "lucide-react";

// Filter Accordion Row component for collapsible section controls
const FilterRow = ({
  title,
  options,
  selected,
  onChange,
  isOpen,
  onToggle,
  accent = "#E60000",
  isDark
}) => {
  return (
    <div
      className={`rounded-md overflow-hidden border ${
        isDark ? "bg-[#15161a]/60 border-white/5" : "bg-white/80 border-black/5 shadow-2xs"
      }`}
    >
      {/* Row Header */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors cursor-pointer ${
          isDark ? "text-white" : "text-[#0B1121]"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-[7px] h-[7px] rounded-full flex-shrink-0"
            style={{
              backgroundColor: selected.length > 0 ? accent : isDark ? "#64748b" : "#94a3b8"
            }}
          />
          <span className="text-[10.5px] font-bold uppercase tracking-wide">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`min-w-[20px] h-[18px] px-1.5 rounded-full flex items-center justify-center text-[9px] font-extrabold ${
              selected.length > 0
                ? "text-white"
                : isDark
                ? "bg-white/10 text-white/60"
                : "bg-slate-100 text-slate-500"
            }`}
            style={selected.length > 0 ? { backgroundColor: accent } : undefined}
          >
            {selected.length}
          </span>

          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isOpen ? "rotate-180" : "rotate-0"
            } ${isDark ? "text-white/50" : "text-slate-400"}`}
          />
        </div>
      </button>

      {/* Checkbox Options */}
      {isOpen && (
        <div className="px-2 pb-2.5 space-y-1 text-left">
          {options.map((option) => {
            const checked = selected.includes(option);

            return (
              <label
                key={option}
                className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                  isDark ? "hover:bg-white/[0.05]" : "hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(option)}
                  className="sr-only"
                />

                <span
                  className={`w-[14px] h-[14px] rounded-[3px] border flex items-center justify-center flex-shrink-0 transition-all ${
                    checked
                      ? "border-transparent"
                      : isDark
                      ? "border-white/30 bg-white/[0.03]"
                      : "border-slate-300 bg-white"
                  }`}
                  style={checked ? { backgroundColor: accent, borderColor: accent } : undefined}
                >
                  {checked && <Check className="w-[10px] h-[10px] text-white" strokeWidth={3} />}
                </span>

                <span
                  className={`text-[10px] font-semibold leading-tight ${
                    checked
                      ? isDark
                        ? "text-white"
                        : "text-slate-900"
                      : isDark
                      ? "text-slate-400"
                      : "text-slate-600"
                  }`}
                >
                  {option}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

// LMS Control Hub component properties and setup






























export const LmsControlHub = ({
  activeTab,
  stats,
  selectedAudiences,
  setSelectedAudiences,
  selectedTimes,
  setSelectedTimes,
  selectedTypes,
  setSelectedTypes,
  selectedFormats,
  setSelectedFormats,
  selectedScores,
  setSelectedScores,
  selectedSizes,
  setSelectedSizes,
  isDark
}) => {
  const [openSection, setOpenSection] = useState("audience");

  const toggleValue = (
    value,
    selected,
    setter
  ) => {
    setter(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };

  // Compute active count on current tab
  const getActiveCount = () => {
    let count = selectedAudiences.length;
    if (activeTab === "paths") {
      count += selectedTimes.length + selectedTypes.length;
    } else if (activeTab === "videos") {
      count += selectedFormats.length;
    } else if (activeTab === "quizzes") {
      count += selectedScores.length;
    } else if (activeTab === "packages") {
      count += selectedSizes.length;
    }
    return count;
  };

  const activeCount = getActiveCount();

  const clearAll = () => {
    setSelectedAudiences([]);
    setSelectedTimes([]);
    setSelectedTypes([]);
    setSelectedFormats([]);
    setSelectedScores([]);
    setSelectedSizes([]);
  };

  return (
    <aside className="flex-shrink-0 w-full lg:w-[250px] xl:w-[270px] flex flex-col min-w-0 justify-between select-none">
      {/* ================================================= */}
      {/* TOP SECTION — isolated stats box + L-head          */}
      {/* ================================================= */}
      <div className="flex items-end justify-between w-full relative">
        {/* ---------------------------------------------
            TOP-LEFT ISOLATED BOX — TRAINING METRICS
        --------------------------------------------- */}
        <div
          style={{
            backgroundColor: isDark ? "#120d24" : "#f0ecff"
          }}
          className={`w-[calc(50%-4px)] h-[120px] p-3.5 rounded-2xl flex flex-col justify-between shadow-sm z-20 items-start text-left transition-colors mb-2 border ${
            isDark ? "border-purple-900/30" : "border-purple-200"
          }`}
        >
          <div>
            <h3 className={`text-[11px] font-voda font-black tracking-wider uppercase leading-tight ${
              isDark ? "text-purple-300" : "text-purple-800"
            }`}>
              Metrics
            </h3>
          </div>
          <div className={`flex flex-col gap-1 w-full text-[10px] font-bold ${
            isDark ? "text-purple-200/80" : "text-purple-950/80"
          }`}>
            <div className={`flex justify-between border-b pb-0.5 ${isDark ? "border-purple-950/40" : "border-purple-200/50"}`}>
              <span>PATHS</span>
              <span>{stats.paths}</span>
            </div>
            <div className={`flex justify-between border-b pb-0.5 ${isDark ? "border-purple-950/40" : "border-purple-200/50"}`}>
              <span>VIDEOS</span>
              <span>{stats.videos}</span>
            </div>
            <div className={`flex justify-between border-b pb-0.5 ${isDark ? "border-purple-950/40" : "border-purple-200/50"}`}>
              <span>QUIZZES</span>
              <span>{stats.quizzes}</span>
            </div>
            <div className="flex justify-between">
              <span>CERTS</span>
              <span>{stats.certs}</span>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------
            TOP-RIGHT L-HEAD — FILTER CONTROLS
        --------------------------------------------- */}
        <div
          className={`w-[calc(50%-4px)] h-[128px] rounded-t-xl flex-2 px-3 py-3 flex flex-col justify-center gap-2.5 transition-colors relative z-10 border-t border-r ${
            isDark ? "bg-[#202127] border-white/5" : "bg-[#f1f3f7] border-black/5"
          }`}
        >
          <div className="flex items-center gap-1.5 justify-start text-left">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#E60000] flex-shrink-0" />
            <span className={`text-[11px] font-extrabold uppercase tracking-wider ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              Filters
            </span>

            {activeCount > 0 && (
              <span
                className="min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white flex-shrink-0"
                style={{ backgroundColor: "#E60000" }}
              >
                {activeCount}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={clearAll}
            disabled={activeCount === 0}
            className={`w-full h-[24px] rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide transition-all cursor-pointer border ${
              activeCount > 0
                ? "bg-[#E60000] border-transparent text-white hover:bg-[#c40000] shadow-sm"
                : isDark
                ? "bg-white/5 border-white/5 text-white/25 cursor-not-allowed"
                : "bg-white border-slate-200 text-slate-300 cursor-not-allowed"
            }`}
          >
            <X className="w-3 h-3" strokeWidth={3} />
            Reset All
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* BOTTOM L-FOOT — TAB-SPECIFIC FILTERS              */}
      {/* ================================================= */}
      <div
        className={`flex-1 w-full p-2.5 rounded-b-xl rounded-tl-xl flex flex-col gap-1.5 transition-colors -mt-px relative z-10 border-l border-b border-r ${
          isDark ? "bg-[#202127] border-white/5" : "bg-[#f1f5f7] border-black/5"
        }`}
      >
        {/* Global Filter: Target Audience */}
        <FilterRow
          title="Target Audience"
          options={["All users", "Remote", "Employees", "Finance", "Executives"]}
          selected={selectedAudiences}
          onChange={(val) => toggleValue(val, selectedAudiences, setSelectedAudiences)}
          isOpen={openSection === "audience"}
          onToggle={() => setOpenSection(openSection === "audience" ? null : "audience")}
          accent="#E60000"
          isDark={isDark}
        />

        {/* TAB SPECIFIC: Paths */}
        {activeTab === "paths" && (
          <>
            <FilterRow
              title="Estimated Time"
              options={["Under 10m", "10-20m", "Over 20m"]}
              selected={selectedTimes}
              onChange={(val) => toggleValue(val, selectedTimes, setSelectedTimes)}
              isOpen={openSection === "time"}
              onToggle={() => setOpenSection(openSection === "time" ? null : "time")}
              accent="#7C3AED"
              isDark={isDark}
            />

            <FilterRow
              title="Pathway Type"
              options={["Scheduled Remediation", "Always Available Course"]}
              selected={selectedTypes}
              onChange={(val) => toggleValue(val, selectedTypes, setSelectedTypes)}
              isOpen={openSection === "type"}
              onToggle={() => setOpenSection(openSection === "type" ? null : "type")}
              accent="#16A34A"
              isDark={isDark}
            />
          </>
        )}

        {/* TAB SPECIFIC: Videos */}
        {activeTab === "videos" && (
          <FilterRow
            title="Video Format"
            options={["Local MP4 Video", "Cloud Stream Link"]}
            selected={selectedFormats}
            onChange={(val) => toggleValue(val, selectedFormats, setSelectedFormats)}
            isOpen={openSection === "format"}
            onToggle={() => setOpenSection(openSection === "format" ? null : "format")}
            accent="#E60000"
            isDark={isDark}
          />
        )}

        {/* TAB SPECIFIC: Quizzes */}
        {activeTab === "quizzes" && (
          <FilterRow
            title="Passing Threshold"
            options={["80% Passing Score", "Over 80% Passing Score"]}
            selected={selectedScores}
            onChange={(val) => toggleValue(val, selectedScores, setSelectedScores)}
            isOpen={openSection === "score"}
            onToggle={() => setOpenSection(openSection === "score" ? null : "score")}
            accent="#7C3AED"
            isDark={isDark}
          />
        )}

        {/* TAB SPECIFIC: Standalone Packages */}
        {activeTab === "packages" && (
          <FilterRow
            title="Package Size"
            options={["Under 20 MB", "Over 20 MB"]}
            selected={selectedSizes}
            onChange={(val) => toggleValue(val, selectedSizes, setSelectedSizes)}
            isOpen={openSection === "size"}
            onToggle={() => setOpenSection(openSection === "size" ? null : "size")}
            accent="#16A34A"
            isDark={isDark}
          />
        )}
      </div>
    </aside>
  );
};
