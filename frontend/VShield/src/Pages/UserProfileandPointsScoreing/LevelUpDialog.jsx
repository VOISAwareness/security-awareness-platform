import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';

import BadgeMedal from '../../GlobalComponents/BadgeMedal';
import { VarLayoutScale } from '../../GlobalComponents/Layout';
import { levelTitle, rangeText } from '../../services/levels';

// Shown on My Space when your level has gone up since you last looked: the
// new badge spins in with a burst of light. A new level and a new grade read
// differently ("Level up!" / "New grade!"). Closes on the button, Esc or the
// backdrop. Portalled to <body>, re-applying the app shell's zoom.
const LevelUpDialog = ({ notice, isDark, onClose }) => {
  const reduce = useReducedMotion();
  const buttonRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    buttonRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { from, to } = notice;
  const newLevel = from.level !== to.level;
  const heading = newLevel ? 'Level up!' : 'New grade!';

  return createPortal(
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed', top: 0, left: 0, zIndex: 9000,
        zoom: VarLayoutScale, width: `${100 / VarLayoutScale}vw`, height: `${100 / VarLayoutScale}vh`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        background: 'rgba(8,10,16,0.72)', backdropFilter: 'blur(8px)',
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-title"
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className={`relative w-full max-w-[440px] rounded-3xl px-8 pt-6 pb-7 flex flex-col items-center text-center overflow-visible ${
          isDark ? 'bg-[#15161a] text-white border border-white/10' : 'bg-white text-slate-900'
        }`}
        style={{
          boxShadow: `0 30px 80px rgba(0,0,0,0.45), 0 0 0 1px ${to.color}22, 0 0 120px ${to.light}33`,
          background: isDark
            ? `radial-gradient(120% 70% at 50% 0%, ${to.color}55, #15161a 62%)`
            : `radial-gradient(120% 70% at 50% 0%, ${to.light}66, #ffffff 62%)`,
        }}
      >
        <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]" style={{ color: isDark ? to.light : to.color }}>
          {levelTitle(to)}
        </span>
        <h2 id="level-up-title" className="font-voda-exb text-[34px] uppercase tracking-tight leading-none mt-1">
          {heading}
        </h2>

        <div className="my-3">
          <BadgeMedal level={to} size={300} celebrate={1} idle />
        </div>

        <p className="font-voda-exb text-[20px] uppercase tracking-tight leading-tight">{to.name}</p>
        <p className={`text-[12px] font-semibold mt-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          You moved up from {levelTitle(from)} · {from.name}. This badge covers {rangeText(to)}.
        </p>

        <button
          ref={buttonRef}
          type="button"
          onClick={onClose}
          className="mt-5 px-6 py-2 rounded-xl text-[12px] font-extrabold uppercase tracking-wider text-white cursor-pointer shadow-md transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ background: `linear-gradient(135deg, ${to.color}, ${to.light})` }}
        >
          Continue
        </button>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default LevelUpDialog;
