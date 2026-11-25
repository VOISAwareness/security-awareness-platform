import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';

import useLayoutScale from './useLayoutScale';

// A small two-choice dialog for draft decisions: "Continue where you left off /
// Start a new one", or "Replace your edits with this template? / Keep them".
// Portalled to <body>, so it re-applies the app shell's zoom to match the page.
// Esc and the backdrop call `onDismiss`, which defaults to the secondary action;
// pass a no-op when the secondary action discards work, so only the button can.
// With `onClose`, a ✕ in the top-right corner closes it without either choice.
const DraftDialog = ({
  open,
  isDark = false,
  title,
  body,
  detail,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onDismiss = onSecondary, // Esc / backdrop
  onClose, // the ✕ button; none without it
  tone = 'default', // 'default' | 'warning' | 'danger' (a delete: red trash icon and button)
  zIndex = 9500, // raise it to show above a full-screen layer
}) => {
  const layoutScale = useLayoutScale(); // the app's zoom, so the overlay matches it
  const primaryRef = useRef(null);
  // The latest onDismiss, read by the Esc listener. Callers may pass a new
  // function every render; the listener (and the focus on the primary button)
  // is only set up when the dialog opens, so a re-render never moves focus.
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') dismissRef.current?.();
    };
    window.addEventListener('keydown', onKey);
    primaryRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const warn = tone === 'warning';
  const danger = tone === 'danger';

  return createPortal(
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss?.();
      }}
      style={{
        position: 'fixed', top: 0, left: 0, zIndex,
        zoom: layoutScale, width: `${100 / layoutScale}vw`, height: `${100 / layoutScale}vh`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-dialog-title"
        className={`relative w-full ${danger ? 'max-w-[380px] p-5' : 'max-w-[440px] p-6'} rounded-2xl border shadow-2xl font-sans ${
          isDark ? 'bg-[#1C1E24] border-white/10 text-white' : 'bg-white border-black/10 text-slate-900'
        }`}
      >
        {onClose && (
          <button
            type="button"
            aria-label="Close"
            title="Close"
            onClick={onClose}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}
        {/* danger is compact: the icon, then the title and text beside it;
            the detail and two equal buttons beneath share the same edges */}
        <div className={danger ? 'flex items-center gap-3' : ''}>
          {danger && (
            <span className="w-10 h-10 rounded-xl bg-[#E60000]/10 text-[#E60000] dark:text-[#FF8A8A] flex items-center justify-center flex-shrink-0">
              <Trash2 className="w-[18px] h-[18px]" strokeWidth={2.2} />
            </span>
          )}
          <div className="min-w-0">
            <h2 id="draft-dialog-title" className={`${danger ? 'text-[14.5px]' : 'text-[16px]'} font-extrabold tracking-tight ${onClose ? 'pr-8' : ''}`}>
              {title}
            </h2>
            {body && (
              <p className={`${danger ? 'mt-0.5 text-[11px] leading-snug' : 'mt-1.5 text-[12px] leading-relaxed'} font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {body}
              </p>
            )}
          </div>
        </div>
        {detail && (
          <div
            className={`${danger ? 'mt-3.5' : 'mt-4'} rounded-xl px-3 py-2.5 text-[12px] font-bold ${
              warn
                ? (isDark ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-800')
                : (isDark ? 'bg-white/5 text-slate-100' : 'bg-slate-50 text-slate-800')
            }`}
          >
            {detail}
          </div>
        )}
        <div className={`gap-2 ${danger ? 'mt-4 grid grid-cols-2' : 'mt-5 flex items-center justify-end'}`}>
          <button
            type="button"
            onClick={onSecondary}
            className={`h-9 px-4 rounded-lg border text-[12px] font-bold cursor-pointer ${
              isDark ? 'border-white/15 text-slate-200 hover:bg-white/5' : 'border-black/10 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {secondaryLabel}
          </button>
          <button
            ref={primaryRef}
            type="button"
            onClick={onPrimary}
            className={`h-9 px-4 rounded-lg text-[12px] font-bold cursor-pointer text-white inline-flex items-center justify-center gap-1.5 ${
              warn ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#E60000] hover:bg-[#cc0000]'
            }`}
          >
            {danger && <Trash2 className="w-3.5 h-3.5" strokeWidth={2.4} />}
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DraftDialog;
