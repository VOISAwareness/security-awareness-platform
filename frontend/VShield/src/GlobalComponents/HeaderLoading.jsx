// "Loading…" for the right end of a page's header bar, shown while the page's
// data is on its way. One component so every screen's loading cue looks the
// same. The header is black in light mode and white in dark mode, so the pill
// takes the opposite tint.
const HeaderLoading = ({ show, isDark = false, label = 'Loading' }) => {
  if (!show) return null;
  return (
    <span
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 h-6 pl-2 pr-3 rounded-full text-[10.5px] font-bold tracking-wide whitespace-nowrap select-none flex-shrink-0 animate-in fade-in zoom-in-95 duration-200 ${
        isDark ? 'bg-black/[0.07] text-black' : 'bg-white/[0.14] text-white'
      }`}
    >
      <span
        aria-hidden="true"
        className={`w-3.5 h-3.5 rounded-full border-2 animate-spin ${
          isDark ? 'border-black/20 border-t-black' : 'border-white/25 border-t-white'
        }`}
      />
      {label}…
    </span>
  );
};

export default HeaderLoading;
