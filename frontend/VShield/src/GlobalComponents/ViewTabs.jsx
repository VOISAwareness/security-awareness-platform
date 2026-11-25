import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// One switch for every page that flips between views or filters: Scenarios and
// Start New Campaign (All / Create new | Drafts, in the header bar) and User
// List (All Types | Bulk Upload | Distribution List). It has the User List
// look: a rounded box, the chosen option a dark pill (white in dark mode)
// that slides across to the option clicked. Pages fade their content in when
// the view changes (the `vs-view-fade` class in index.css).
//
//   header:  in the page header bar, which is black in light mode and white in
//            dark mode; the box is the light/dark opposite of the bar.
//   toolbar: on the page's own surface.
const STYLES = {
  header: {
    light: { box: 'bg-white/90 border-white/20', on: 'text-white', pill: 'bg-[#181A20]', off: 'text-slate-600 hover:text-black', countOn: 'bg-white/20', countOff: 'bg-black/10' },
    dark: { box: 'bg-black/80 border-black/10', on: 'text-black', pill: 'bg-white', off: 'text-slate-300 hover:text-white', countOn: 'bg-black/10', countOff: 'bg-white/15' },
  },
  toolbar: {
    light: { box: 'bg-white/80 border-black/5', on: 'text-white', pill: 'bg-[#181A20]', off: 'text-slate-600 hover:text-black', countOn: 'bg-white/20', countOff: 'bg-black/10' },
    dark: { box: 'bg-black/50 border-white/10', on: 'text-black', pill: 'bg-white', off: 'text-slate-300 hover:text-white', countOn: 'bg-black/10', countOff: 'bg-white/15' },
  },
};

const SLIDE = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 };

// fill: the options share the box's full width equally (the notification panel).
// tab.dot: a small red dot after the label (something unread there).
const ViewTabs = ({ tabs, value, onChange, isDark = false, variant = 'toolbar', ariaLabel = 'View', className = '', fill = false }) => {
  const group = useId();
  const reduce = useReducedMotion();
  const tone = (STYLES[variant] || STYLES.toolbar)[isDark ? 'dark' : 'light'];
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`p-0.5 rounded-xl border shadow-2xs flex items-center flex-shrink-0 ${tone.box} ${className}`}
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
            className={`relative ${fill ? 'flex-1 justify-center px-2' : 'px-3'} py-1 rounded-lg text-[9px] font-voda font-bold whitespace-nowrap flex items-center gap-1.5 cursor-pointer transition-colors duration-200 ${
              selected ? tone.on : tone.off
            }`}
          >
            {selected && (
              <motion.span
                layoutId={`view-tabs-${group}`}
                transition={reduce ? { duration: 0 } : SLIDE}
                className={`absolute inset-0 rounded-lg shadow-2xs ${tone.pill}`}
                aria-hidden="true"
              />
            )}
            <span className="relative">{tab.label}</span>
            {tab.dot && <span className="relative w-1.5 h-1.5 rounded-full bg-[#E60000]" aria-label="new" />}
            {tab.count !== undefined && (
              <span
                className={`relative min-w-[16px] h-[16px] px-1 rounded-full text-[8.5px] flex items-center justify-center ${
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
