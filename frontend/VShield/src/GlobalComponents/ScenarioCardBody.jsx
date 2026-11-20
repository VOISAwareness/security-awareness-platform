// The text of a scenario card, the same on the Scenarios page and on Start a
// campaign -> Choose a scenario: the title in two lines' space, the description
// in three (cut with "…"; the details pop-up has the rest), then Type and
// who published it. The description is justified, both edges straight, with
// whole words only (no hyphens); text-wrap: pretty evens the lines out so the
// gaps between words stay small.
const PUBLISHED_BY = 'Published by ';

export default function ScenarioCardBody({ name, description, type, byline, bylineHint }) {
  const named = typeof byline === 'string' && byline.startsWith(PUBLISHED_BY);
  return (
    <div className="flex flex-col text-left z-10 min-w-0">
      <h3
        title={name}
        className="text-[13.5px] font-black text-slate-950 dark:text-white leading-[1.25] tracking-tight h-[2.5em] line-clamp-2 break-words"
      >
        {name}
      </h3>

      {/* No description: nothing is kept for it, so Type and the published line move up. */}
      {description && (
        <p
          title={description}
          className="mt-1.5 text-[9.5px] leading-[1.45] h-[4.35em] line-clamp-3 text-justify [text-wrap:pretty] break-words text-slate-700 dark:text-white/70"
        >
          <span className="font-bold text-slate-900 dark:text-white">Description:</span> {description}
        </p>
      )}

      <div className="mt-1.5 text-[9.5px] leading-[1.45] font-bold text-slate-800 dark:text-slate-200 truncate">
        Type: {type || '—'}
      </div>
      {byline && (
        <div
          title={bylineHint || undefined}
          className="text-[9.5px] leading-[1.45] font-bold text-slate-800 dark:text-slate-200 truncate"
        >
          {named ? (
            <>
              {PUBLISHED_BY}
              <span className="text-slate-950 dark:text-white">{byline.slice(PUBLISHED_BY.length)}</span>
            </>
          ) : (
            byline
          )}
        </div>
      )}
    </div>
  );
}
