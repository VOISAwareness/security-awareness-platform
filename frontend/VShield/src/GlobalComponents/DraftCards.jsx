import { useState } from 'react';
import { FilePenLine, Trash2 } from 'lucide-react';

// "Oct 1, 9:00 AM" on the card (one line, so the id beside it keeps its
// room); the full date and time on hover.
const savedShort = (iso) =>
  iso
    ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';
const savedFull = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';

// The Drafts view shared by Scenarios and Start New Campaign: one card per
// unfinished item, newest first, each with Continue and Delete (after a
// "Delete this draft?" check). Pages map their drafts onto `items`:
//   { id, code, title, description, savedAt, step, stepCount, stepName,
//     cover, inProgress, busy }
const DraftCards = ({
  items,
  isDark,
  onContinue,
  onDelete,
  loading = false,
  emptyText = 'Anything you start and leave unfinished is kept here.',
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
    <div className="flex-1 min-h-0 overflow-y-auto pr-3 items-start flex flex-wrap gap-4 content-start [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md">
      {items.map((info) => {
        const { inProgress } = info;
        return (
          <div
            key={info.id}
            data-draft-id={info.id}
            className={`relative rounded-3xl border overflow-hidden select-none w-full sm:w-[calc(50%-8px)] md:w-[calc(33.333%-11px)] lg:w-[calc(25%-12px)] min-w-[230px] max-w-[320px] h-[270px] p-4 shadow-2xs hover:shadow-md transition-shadow ${
              isDark ? 'bg-[#1C1E24] border-white/10' : 'bg-[#F1F5F9] border-slate-200'
            }`}
          >
            {/* ID + saved time */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-white/80 dark:bg-black/50 shadow-2xs text-slate-900 dark:text-white min-w-0">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-slate-400" />
                <span className="truncate" title={info.code || undefined}>{info.code || 'No ID yet'}</span>
              </div>
              {info.savedAt && (
                <span
                  title={`Saved ${savedFull(info.savedAt)}`}
                  className="text-[9.5px] font-bold text-slate-600 dark:text-slate-400 whitespace-nowrap flex-shrink-0"
                >
                  Saved {savedShort(info.savedAt)}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5 text-left">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wide bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  Draft
                </span>
                {inProgress && (
                  <span className="px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wide bg-[#E60000]/10 text-[#E60000]">
                    In progress
                  </span>
                )}
              </div>
              <h3 className="text-[13.5px] font-black text-slate-950 dark:text-white leading-tight tracking-tight line-clamp-2">
                {info.title}
              </h3>
              {info.description && (
                <p className="text-[9.5px] leading-[1.25] text-slate-700 dark:text-white/70 line-clamp-3 max-w-[70%]">
                  {info.description}
                </p>
              )}

              {/* Where it was left */}
              <div className="mt-1 max-w-[70%]">
                <div className="text-[9.5px] font-bold text-slate-800 dark:text-slate-200">
                  Step {info.step} of {info.stepCount}: {info.stepName}
                </div>
                <div className="mt-1 flex gap-1" aria-hidden="true">
                  {Array.from({ length: info.stepCount }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i < info.step ? 'bg-[#8ED973]' : isDark ? 'bg-white/10' : 'bg-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {info.cover && (
              <img
                src={info.cover}
                alt=""
                className="absolute right-4 bottom-14 w-[92px] h-[68px] rounded-xl object-cover shadow-sm"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}

            {/* Continue / Delete */}
            <div className="absolute left-4 right-4 bottom-4 flex items-center gap-1.5 text-[9.5px] font-bold">
              {info.busy ? (
                <span className="text-slate-500">Working…</span>
              ) : confirmDeleteId === info.id ? (
                <>
                  <span className="text-slate-700 dark:text-slate-300">Delete this draft?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(null);
                      onDelete(info.id);
                    }}
                    className="h-[26px] px-2.5 rounded-lg bg-[#E60000] hover:bg-[#ff2020] text-white cursor-pointer"
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="h-[26px] px-2.5 rounded-lg bg-white dark:bg-black/40 border border-black/10 dark:border-white/15 text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    No
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onContinue(info.id)}
                    className="h-[26px] px-2.5 rounded-lg flex items-center gap-1 bg-black text-white dark:bg-white dark:text-black cursor-pointer"
                  >
                    <FilePenLine className="w-3 h-3" /> Continue
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(info.id)}
                    className="h-[26px] px-2.5 rounded-lg flex items-center gap-1 bg-white dark:bg-black/40 border border-black/10 dark:border-white/15 text-[#E60000] cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DraftCards;
