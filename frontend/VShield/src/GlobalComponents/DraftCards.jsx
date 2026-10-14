import { useState } from 'react';
import { ArrowRight, Clock3, FilePenLine, Trash2 } from 'lucide-react';

import { NEUTRAL_DRAFT_THEME } from './draftTheme';

// "Oct 1, 9:00 AM" on the card (one line, beside the id; on a narrow card just
// "Oct 1"); full date on hover.
const savedDay = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');
const savedTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';
const savedFull = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

// The Drafts view shared by Scenarios and Start New Campaign. Each card is laid
// out like the template cards beside it — same size, same pastel theme, the
// template's art in the corner, the action at the bottom left — so the two
// tabs read as one system. Pages map their drafts onto `items`:
//   { id, code, title, description, savedAt, step, stepCount, stepName,
//     inProgress, busy, theme, image, imageClassName, photo }
// `theme` is one of the page's template themes (NEUTRAL_DRAFT_THEME when the
// draft has none); `image` is the art for the corner (`imageClassName` tints
// it), `photo` an uploaded picture shown framed instead.
// The cards fill their rows from edge to edge: as many as fit at least
// `minCardWidth` wide (about a template card's width), stretched to share the
// row, so no space is left over at the end of a row (a Drafts tab has no
// filter panel beside it to make room for).
// The draft in progress comes first, its edge highlighted. Every part has a
// fixed place, so the cards line up whatever their text: the title and the
// description take two lines each (cut short with "…", the whole of it shown
// on hover), even when shorter or empty, and the step sits at the same height
// on every card, on one line.
const DraftCards = ({
  items,
  isDark,
  onContinue,
  onDelete,
  loading = false,
  emptyText = 'Anything you start and leave unfinished is kept here.',
  minCardWidth = 280,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  if (loading && !items.length) {
    return (
      <div className="h-[250px] flex items-center justify-center text-[11px] font-bold text-slate-500">
        Loading drafts…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div
        className={`h-[250px] flex flex-col items-center justify-center gap-1.5 text-center ${
          isDark ? 'text-white' : 'text-[#0B1121]'
        }`}
      >
        <FilePenLine className="w-8 h-8 text-slate-400" strokeWidth={1.6} />
        <span className="font-bold text-sm">No drafts</span>
        <span className="text-[11px] font-medium text-slate-500">{emptyText}</span>
      </div>
    );
  }

  return (
    <div
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${minCardWidth}px, 100%), 1fr))` }}
      className="flex-1 min-h-0 overflow-y-auto pr-3 grid items-start gap-4 content-start [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md"
    >
      {inProgressFirst(items).map((info) => {
        const theme = info.theme || NEUTRAL_DRAFT_THEME;
        return (
          <div
            key={info.id}
            data-draft-id={info.id}
            data-in-progress={info.inProgress ? 'true' : undefined}
            style={{
              backgroundColor: isDark ? theme.bgDark : theme.bgLight,
              borderColor: info.inProgress ? IN_PROGRESS_EDGE : isDark ? theme.borderDark : theme.border,
              boxShadow: info.inProgress ? IN_PROGRESS_GLOW : undefined,
            }}
            className={`relative w-full p-4 rounded-3xl border transition-all duration-150 flex flex-col justify-between overflow-hidden select-none h-[270px] ${
              info.inProgress ? '' : 'shadow-2xs hover:shadow-md'
            }`}
          >
            {info.inProgress && <span className="sr-only">The draft you were last working on.</span>}
            {/* Top bar: id pill (left) + when it was saved (right). The date
                keeps its size and the id takes the rest, cut short only when
                it is very long; on a narrow card the time of day gives way
                first (a container query on this bar's own width). */}
            <div className="flex items-center justify-between gap-2 mb-1.5 z-10 [container-type:inline-size]">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-white/90 dark:bg-black/60 shadow-2xs text-slate-900 dark:text-white min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                <span className="truncate" title={info.code || undefined}>{info.code || 'No ID yet'}</span>
              </div>
              {info.savedAt && (
                <span
                  title={`Saved ${savedFull(info.savedAt)}`}
                  className="inline-flex items-center gap-1 flex-shrink-0 text-[10px] font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap"
                >
                  <Clock3 className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  <span className="sr-only">Saved </span>
                  <span>
                    {savedDay(info.savedAt)}
                    <span className="[@container(max-width:260px)]:hidden">, {savedTime(info.savedAt)}</span>
                  </span>
                </span>
              )}
            </div>

            {/* Title, description, where it was left: fixed heights (two
                lines each, in em of their own font), so the step below is at
                the same place on every card. */}
            <div className="flex flex-col gap-1.5 text-left z-10 max-w-[80%] flex-1 min-h-0">
              <h3
                title={info.title}
                className="h-[2.5em] flex-shrink-0 text-[13.5px] font-black text-slate-950 dark:text-white leading-tight tracking-tight line-clamp-2"
              >
                {info.title}
              </h3>
              {info.description ? (
                <p
                  title={info.description}
                  className="h-[3.25em] flex-shrink-0 text-[9.5px] text-slate-700 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed cursor-default"
                >
                  <strong className="text-slate-900 dark:text-white">Description: </strong>
                  {info.description}
                </p>
              ) : (
                <p className="h-[3.25em] flex-shrink-0 text-[9.5px] text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed">
                  No description yet
                </p>
              )}
              <div
                title={`Step ${info.step} of ${info.stepCount}: ${info.stepName}`}
                className="flex min-w-0 text-[9.5px] font-bold text-slate-800 dark:text-slate-200 mt-0.5 whitespace-nowrap cursor-default"
              >
                <span className="flex-shrink-0">
                  Step {info.step} of {info.stepCount}:&nbsp;
                </span>
                <span className="truncate">{info.stepName}</span>
              </div>
              <div className="flex gap-1 w-[150px] max-w-full" aria-hidden="true">
                {Array.from({ length: info.stepCount }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full ${
                      i < info.step ? 'bg-slate-900 dark:bg-white' : 'bg-black/10 dark:bg-white/15'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Bottom left: Continue → (as "Use This →") and Delete */}
            <div className="pt-2 z-10 flex items-center gap-1.5 text-[11px] font-bold">
              {info.busy ? (
                <span className="text-slate-600 dark:text-slate-300">Working…</span>
              ) : confirmDeleteId === info.id ? (
                <>
                  <span className="text-slate-800 dark:text-slate-200">Delete this draft?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(null);
                      onDelete(info.id);
                    }}
                    className="px-3 py-1 rounded-lg bg-[#E60000] hover:bg-[#ff2020] text-white cursor-pointer shadow-2xs"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-3 py-1 rounded-lg border bg-white/90 dark:bg-black/40 border-black/10 dark:border-white/15 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    No
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onContinue(info.id)}
                    className={`px-3.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${theme.btnBg} ${theme.btnBorder} ${theme.btnText}`}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(info.id)}
                    aria-label={`Delete draft ${info.title}`}
                    title="Delete draft"
                    className="h-[26px] px-2 rounded-lg bg-[#e60000] hover:bg-[#ff2020] text-white flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </>
              )}
            </div>

            {/* Bottom right: the template's art, as on the template cards */}
            {info.image && !info.photo && (
              <div className="absolute -right-[10%] -bottom-[10%] w-[135px] h-[135px] pointer-events-none select-none flex items-center justify-center overflow-hidden">
                <img
                  src={info.image}
                  alt=""
                  className={`w-full h-full object-contain filter drop-shadow-md ${info.imageClassName || ''}`}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            {/* An uploaded cover is a photo: framed, not cropped by the corner. */}
            {info.photo && (
              <img
                src={info.photo}
                alt=""
                className="absolute right-4 bottom-4 w-[96px] h-[70px] rounded-xl object-cover shadow-sm pointer-events-none"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

// The draft in progress: first, with a highlighted edge instead of a label.
const IN_PROGRESS_EDGE = '#E60000';
const IN_PROGRESS_GLOW = '0 0 0 1px #E60000, 0 8px 20px -8px rgba(230, 0, 0, 0.45)';

function inProgressFirst(items) {
  return [...items].sort((a, b) => Number(Boolean(b.inProgress)) - Number(Boolean(a.inProgress)));
}

export default DraftCards;
