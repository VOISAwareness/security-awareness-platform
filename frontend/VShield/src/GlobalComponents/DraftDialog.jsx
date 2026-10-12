import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { VarLayoutScale } from './Layout';

// A small two-choice dialog for draft decisions: "Continue where you left off /
// Start a new one", or "Replace your edits with this template? / Keep them".
// Portalled to <body>, so it re-applies the app shell's zoom to match the page.
// Esc and the backdrop call `onDismiss`, which defaults to the secondary action;
// pass a no-op when the secondary action discards work, so only the button can.
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
  tone = 'default', // 'default' | 'warning'
}) => {
  const primaryRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss?.();
    };
    window.addEventListener('keydown', onKey);
    primaryRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onDismiss]);

  if (!open || typeof document === 'undefined') return null;

  const warn = tone === 'warning';

  return createPortal(
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDismiss?.();
      }}
      style={{
        position: 'fixed', top: 0, left: 0, zIndex: 9500,
        zoom: VarLayoutScale, width: `${100 / VarLayoutScale}vw`, height: `${100 / VarLayoutScale}vh`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-dialog-title"
        className={`w-full max-w-[440px] rounded-2xl border p-6 shadow-2xl font-sans ${
          isDark ? 'bg-[#1C1E24] border-white/10 text-white' : 'bg-white border-black/10 text-slate-900'
        }`}
      >
        <h2 id="draft-dialog-title" className="text-[16px] font-extrabold tracking-tight">
          {title}
        </h2>
        {body && (
          <p className={`mt-2 text-[12px] font-medium leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {body}
          </p>
        )}
        {detail && (
          <div
            className={`mt-3 rounded-xl px-3 py-2.5 text-[12px] font-bold ${
              warn
                ? (isDark ? 'bg-amber-500/10 text-amber-200' : 'bg-amber-50 text-amber-800')
                : (isDark ? 'bg-white/5 text-slate-100' : 'bg-slate-50 text-slate-800')
            }`}
          >
            {detail}
          </div>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
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
            className={`h-9 px-4 rounded-lg text-[12px] font-bold cursor-pointer text-white ${
              warn ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#E60000] hover:bg-[#c50000]'
            }`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DraftDialog;
