import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import ClayImage from '../GlobalComponents/ClayImage';

// Every achievement (achievements.js), in a box over the page: the earned ones
// in colour first, then the ones still to earn, greyed out, each with how to
// earn it. Escape, the X and a click outside close it. `list` is what
// achievementsFor() returns.
const AchievementsDialog = ({ list, isDark, onClose }) => {
  const closeRef = useRef(null);
  const earned = list.filter((a) => a.earned);
  const todo = list.filter((a) => !a.earned);

  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    const keep = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = keep;
      opener?.focus?.();
    };
  }, [onClose]);

  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const tile = (a) => (
    <li
      key={a.id}
      className={`flex items-center gap-3 rounded-xl p-2.5 min-w-0 ${
        isDark ? 'bg-white/[0.04]' : 'bg-[#F4F6F9]'
      } ${a.earned ? '' : 'opacity-70'}`}
    >
      <span className={`w-16 h-16 flex-shrink-0 flex items-center justify-center ${a.earned ? '' : 'grayscale opacity-40'}`}>
        <ClayImage
          name={a.image}
          alt={a.earned ? `${a.name} achievement` : `${a.name} achievement, not earned yet`}
          className="h-full w-auto max-w-full object-contain"
        />
      </span>
      <span className="min-w-0 flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[11.5px] font-bold leading-tight">
          <span className="truncate">{a.name}</span>
          {a.earned && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#22c55e]/15 text-[#16A34A] px-1.5 py-px text-[8.5px] font-bold uppercase">
              <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden /> Earned
            </span>
          )}
        </span>
        <span className={`text-[10px] leading-snug ${muted}`}>{a.how}</span>
      </span>
    </li>
  );

  const group = (title, items) =>
    items.length > 0 && (
      <section className="flex flex-col gap-2">
        <h4 className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}>
          {title} ({items.length})
        </h4>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 list-none m-0 p-0">{items.map(tile)}</ul>
      </section>
    );

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-dialog-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full max-w-2xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col ${
          isDark ? 'bg-[#15161A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between gap-3 p-4 pb-3 flex-shrink-0">
          <div>
            <h3 id="achievements-dialog-title" className="text-[14px] font-voda font-bold leading-tight">
              My achievements
            </h3>
            <p className={`text-[10.5px] mt-0.5 ${muted}`}>
              {earned.length} of {list.length} earned
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
          {group('Earned', earned)}
          {group('Still to earn', todo)}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AchievementsDialog;
