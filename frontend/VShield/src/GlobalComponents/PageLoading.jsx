// A page's loading state: a spinner and "Loading…" in the centre of the page,
// covering its content until the page's data has arrived, so a half-loaded
// screen is never seen or clicked. One component so every screen loads the
// same way.
//
// Render it as a direct child of the page's content container (everything
// below the header bar) and give that container `relative`: the cover fills
// it, so it stays inside the page's zoomed shell and never covers the header.
// It takes the container's own background (`inherit`), i.e. the page's card.
//
// surface="page" is for content that sits straight on the app background,
// with no card behind it. A painted cover could not match that background
// (it has a glow) nor hide content that spills past the container, so the
// cover is see-through instead and the page hides the content itself while
// loading: `invisible` on the container (the cover stays visible).
const PageLoading = ({ show, isDark = false, label = 'Loading', surface = 'container' }) => {
  if (!show) return null;
  const surfaceClass = surface === 'page' ? 'visible' : 'bg-inherit';
  return (
    <div
      role="status"
      aria-live="polite"
      // Above the content's own layers (its menus go up to z-50).
      className={`absolute inset-0 z-[60] flex flex-col items-center justify-center gap-3 select-none cursor-wait ${surfaceClass}`}
    >
      <span
        aria-hidden="true"
        className={`w-8 h-8 rounded-full border-[3px] animate-spin ${
          isDark ? 'border-white/15 border-t-white' : 'border-black/10 border-t-black'
        }`}
      />
      <span className={`text-[11px] font-bold tracking-wide ${isDark ? 'text-white/70' : 'text-slate-600'}`}>
        {label}…
      </span>
    </div>
  );
};

export default PageLoading;
