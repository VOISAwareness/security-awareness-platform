import { motion, useReducedMotion } from 'framer-motion';
import ClayImage from '../../GlobalComponents/ClayImage';
import { badgeShelf } from '../../services/levels';

// Under the ID card on My Space: the seven level badges, the ones reached in
// colour (popping in when the page opens), the rest greyed out. Fills the
// column down to the Explore bar. Click to see every badge (AllBadges).
const MyBadgesCard = ({ level, isDark, onOpenBadges }) => {
  const reduce = useReducedMotion();
  const shelf = badgeShelf(level);
  const earned = shelf.filter((b) => b.earned).length;
  return (
    <section
      aria-label="My badges"
      className={`w-full flex-1 min-h-[150px] mt-3 rounded-2xl border p-3.5 flex flex-col gap-2.5 shadow-sm transition-colors ${
        isDark ? 'bg-[#15161A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
          <span className="w-1.5 h-3.5 rounded-full bg-[#E60000]" />
          My badges
        </h3>
        <span className={`text-[9.5px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {earned} of {shelf.length}
        </span>
      </div>

      <button
        type="button"
        onClick={onOpenBadges}
        title="See every badge and what it takes"
        className={`flex-1 min-h-0 grid grid-cols-4 grid-rows-2 gap-x-2 gap-y-1.5 rounded-xl p-2 cursor-pointer transition-colors ${
          isDark ? 'bg-white/[0.04] hover:bg-white/[0.07]' : 'bg-[#F4F6F9] hover:bg-[#EDF0F5]'
        }`}
      >
        {shelf.map((badge, i) => (
          <motion.span
            key={badge.level}
            initial={reduce ? false : { opacity: 0, scale: 0.6, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.15 + i * 0.07, type: 'spring', stiffness: 380, damping: 22 }}
            className="flex flex-col items-center justify-center gap-1 min-w-0 min-h-0"
          >
            {/* The picture takes the row's height (up to 64px), so the shelf fits any card size */}
            <span className={`relative w-full flex-1 min-h-0 max-h-[64px] flex items-end justify-center ${badge.earned ? '' : 'grayscale opacity-35'}`}>
              <ClayImage
                name={`badge:${badge.id}`}
                width={128}
                sizes="56px"
                alt={badge.earned ? `${badge.name} badge` : `${badge.name} badge, not reached yet`}
                className="h-full w-auto max-w-full object-contain"
              />
              {badge.current && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#E60000]" aria-hidden="true" />
              )}
            </span>
            <span
              className={`w-full truncate text-center text-[7.5px] font-bold leading-tight ${
                badge.earned ? (isDark ? 'text-slate-200' : 'text-slate-700') : isDark ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              {badge.name}
            </span>
          </motion.span>
        ))}
      </button>
    </section>
  );
};

export default MyBadgesCard;
