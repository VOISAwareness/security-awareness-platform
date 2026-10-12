// The "All … | Drafts" switch at the top-left of a list page (Scenarios, Start
// New Campaign). One component so both pages look and behave the same: the
// main view first, Drafts second with its count.
const ViewTabs = ({ tabs, value, onChange, isDark = false, ariaLabel = 'View', className = '' }) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className={`h-[30px] p-0.5 flex items-center gap-0.5 rounded-lg border shadow-sm flex-shrink-0 ${
      isDark ? 'bg-[#15161a] border-white/10' : 'bg-white border-slate-200'
    } ${className}`}
  >
    {tabs.map((tab) => {
      const selected = value === tab.id;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onChange(tab.id)}
          className={`h-full px-3 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors ${
            selected
              ? isDark
                ? 'bg-white text-[#0B1121]'
                : 'bg-[#06080D] text-white'
              : isDark
              ? 'text-white/60 hover:text-white'
              : 'text-slate-600 hover:text-black'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={`min-w-[16px] h-[16px] px-1 rounded-full text-[9px] flex items-center justify-center ${
                selected
                  ? isDark
                    ? 'bg-[#0B1121]/10'
                    : 'bg-white/20'
                  : isDark
                  ? 'bg-white/10'
                  : 'bg-slate-200'
              }`}
            >
              {tab.count}
            </span>
          )}
        </button>
      );
    })}
  </div>
);

export default ViewTabs;
