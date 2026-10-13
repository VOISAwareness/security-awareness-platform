// Colours and shape per placement, for light and dark mode.
//   toolbar: on the page's own surface (white, or #15161a in dark mode).
//   header:  in the page header bar, which is black in light mode and white in
//            dark mode, so everything is inverted: the selected pill takes the
//            header's text colour and the others are muted.
// The header switch is `rounded-full` on purpose: pages rescale `rounded-lg`
// and `rounded-md` with their own CSS, and it must look the same on every page.
const STYLES = {
  toolbar: {
    box: 'h-[30px] rounded-lg shadow-sm',
    tab: 'rounded-md',
    light: {
      box: 'bg-white border-slate-200',
      on: 'bg-[#06080D] text-white',
      off: 'text-slate-600 hover:text-black',
      countOn: 'bg-white/20',
      countOff: 'bg-slate-200',
    },
    dark: {
      box: 'bg-[#15161a] border-white/10',
      on: 'bg-white text-[#0B1121]',
      off: 'text-white/60 hover:text-white',
      countOn: 'bg-[#0B1121]/10',
      countOff: 'bg-white/10',
    },
  },
  header: {
    box: 'h-[26px] rounded-full',
    tab: 'rounded-full',
    light: {
      box: 'bg-white/[0.08] border-white/15',
      on: 'bg-white text-black',
      off: 'text-white/60 hover:text-white',
      countOn: 'bg-black/10',
      countOff: 'bg-white/15',
    },
    dark: {
      box: 'bg-black/[0.05] border-black/10',
      on: 'bg-black text-white',
      off: 'text-black/55 hover:text-black',
      countOn: 'bg-white/20',
      countOff: 'bg-black/10',
    },
  },
};

// The "All … | Drafts" switch of a list page (Scenarios, Start New Campaign),
// at the right-hand end of the page header bar (`variant="header"`). One
// component so both pages look and behave the same: the main view first,
// Drafts second with its count.
const ViewTabs = ({ tabs, value, onChange, isDark = false, variant = 'toolbar', ariaLabel = 'View', className = '' }) => {
  const shape = STYLES[variant] || STYLES.toolbar;
  const tone = isDark ? shape.dark : shape.light;
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`p-0.5 flex items-center gap-0.5 border flex-shrink-0 ${shape.box} ${tone.box} ${className}`}
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
            className={`h-full px-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-colors ${shape.tab} ${
              selected ? tone.on : tone.off
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`min-w-[16px] h-[16px] px-1 rounded-full text-[9px] flex items-center justify-center ${
                  selected ? tone.countOn : tone.countOff
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
};

export default ViewTabs;
