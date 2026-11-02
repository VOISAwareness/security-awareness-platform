import { createPortal } from 'react-dom';
import { ArrowLeft, Check, X, Monitor } from 'lucide-react';

const LandingPageDesigner = ({
  currentView,
  VIEW_EDITOR,
  isEditorExpanded,
  renderEditorContent,
  showSaveChoiceModal,
  setShowSaveChoiceModal,
  handleLaunchFullScreenPreview,
  handleCommitSubmit,
  isFullScreenLivePreview,
  setIsFullScreenLivePreview,
  stagedHtmlForPreview
}) => {
  return (
    <>
        {/* ========================================================================= */}
        {/* ── 🌟 VIEW 2: DESIGN LANDING PAGE CANVAS (DIRECT VIEWPORT RENDERING)      */}
        {/* ========================================================================= */}
        {currentView === VIEW_EDITOR && !isEditorExpanded && renderEditorContent()}

        {/* ── 🌟 PORTALED EXPANDED VIEW (When user clicks Fullscreen on Designer) ── */}
        {currentView === VIEW_EDITOR &&
          isEditorExpanded &&
          typeof document !== 'undefined' &&
          createPortal(renderEditorContent(), document.body)}

        {/* ========================================================================= */}
        {/* ── 🌟 SAVE CHOICE DIALOGUE MODAL (PORTALED TO PREVENT ANY Z-INDEX HIDING) */}
        {/* ========================================================================= */}
        {showSaveChoiceModal &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2147483646,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}
            >
              <div className="w-full max-w-md bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/15 p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-voda-exb text-slate-900 dark:text-white uppercase tracking-tight">
                      Confirm Landing Page Save
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Choose how you want to proceed with saving your landing page:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSaveChoiceModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleLaunchFullScreenPreview}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group"
                  >
                    <Monitor className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[11.5px] font-voda-exb text-slate-900 dark:text-white uppercase">
                      Full Screen Preview
                    </span>
                    <span className="text-[9px] text-slate-400">
                      Test live browser viewport
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCommitSubmit}
                    className="p-3.5 rounded-xl bg-[#84cc16] hover:bg-[#65a30d] text-white flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-sm group hover:scale-[1.02]"
                  >
                    <Check className="w-5 h-5 stroke-[3] text-white group-hover:scale-110 transition-transform" />
                    <span className="text-[11.5px] font-voda-exb text-white uppercase">
                      Submit
                    </span>
                    <span className="text-[9px] text-white/80">
                      Save to catalogue gallery
                    </span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* ── 🌟 COMPLETE BROWSER SCREEN LIVE PREVIEW VIA REACT PORTAL               */}
        {/* ========================================================================= */}
        {isFullScreenLivePreview &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              id="lp-fullscreen-viewport-portal"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2147483647,
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                margin: 0,
                padding: 0,
                overflow: 'hidden'
              }}
            >
              {/* Floating Top Left Button: "Go Back & Submit" */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  zIndex: 2147483647
                }}
              >
                <button
                  type="button"
                  onClick={handleCommitSubmit}
                  className="px-4 py-2 rounded-xl bg-[#84cc16] hover:bg-[#65a30d] text-white font-voda-exb text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-2xl hover:scale-105 active:scale-95 transition-all border border-white/30"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                  Go Back & Submit
                </button>
              </div>

              {/* Floating Top Right Button: Exit Close 'X' */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  zIndex: 2147483647
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsFullScreenLivePreview(false)}
                  className="p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md border border-white/20 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  title="Exit Preview"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* 100% Full-Viewport Interactive Simulation Preview */}
              <iframe
                title="Full Screen Live Landing Page"
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>html,body{margin:0;padding:0;width:100%;min-height:100vh;}</style></head><body>${stagedHtmlForPreview}</body></html>`}
                style={{
                  width: '100vw',
                  height: '100vh',
                  border: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'block',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>,
            document.body
          )}

    </>
  );
};

export default LandingPageDesigner;