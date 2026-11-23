import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import ClayImage from '../GlobalComponents/ClayImage';
import AchievementsDialog from './AchievementsDialog';
import { achievementsFor, previewOf, PREVIEW_COUNT } from './achievements';

// The person's achievements (achievements.js) as clay badges: the first few
// (earned ones first, in colour, popping in one after another; then the next
// to earn, greyed out, with how to earn them on hover), and a "View all"
// button that opens every one. Takes the height it is given (My Space: under
// the ID card).
const AchievementsCard = ({ standing, isDark, className = '' }) => {
  const reduce = useReducedMotion();
  const [showAll, setShowAll] = useState(false);
  const list = achievementsFor(standing);
  const shown = previewOf(list);
  const earned = list.filter((a) => a.earned).length;
  const more = list.length > PREVIEW_COUNT;
  return (
    <section
      aria-label="My achievements"
      className={`w-full rounded-2xl border p-3.5 flex flex-col gap-2.5 shadow-sm transition-colors ${
        isDark ? 'bg-[#15161A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-3.5 rounded-full bg-[#E60000]" />
          My achievements
        </h3>
        <span className="flex items-center gap-2">
          <span className={`text-[9.5px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {earned} of {list.length}
          </span>
          {more && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className={`text-[9.5px] font-bold uppercase tracking-wide rounded-md px-2 py-0.5 cursor-pointer transition-colors ${
                isDark ? 'bg-white text-black hover:bg-slate-200' : 'bg-black text-white hover:bg-slate-800'
              }`}
            >
              View all
            </button>
          )}
        </span>
      </div>

      <ul
        className={`flex-1 min-h-0 grid grid-cols-2 grid-rows-2 gap-x-2 gap-y-1 rounded-xl p-2.5 list-none m-0 ${
          isDark ? 'bg-white/[0.04]' : 'bg-[#F4F6F9]'
        }`}
      >
        {shown.map((a, i) => (
          <motion.li
            key={a.id}
            title={a.earned ? `${a.name}: earned. ${a.how}` : `${a.name}: ${a.how}`}
            initial={reduce ? false : { opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.15 + i * 0.06, type: 'spring', stiffness: 380, damping: 22 }}
            className="flex flex-col items-center justify-center gap-1 min-w-0 min-h-0 cursor-help"
          >
            <span className={`w-full flex-1 min-h-0 max-h-[84px] flex items-center justify-center ${a.earned ? '' : 'grayscale opacity-30'}`}>
              <ClayImage
                name={a.image}
                alt={a.earned ? `${a.name} achievement` : `${a.name} achievement, not earned yet`}
                className="h-full w-auto max-w-full object-contain"
              />
            </span>
            <span
              className={`w-full line-clamp-2 break-words text-center text-[9.5px] font-bold leading-tight ${
                a.earned ? (isDark ? 'text-slate-200' : 'text-slate-700') : isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {a.name}
            </span>
          </motion.li>
        ))}
      </ul>

      {showAll && <AchievementsDialog list={list} isDark={isDark} onClose={() => setShowAll(false)} />}
    </section>
  );
};

export default AchievementsCard;
