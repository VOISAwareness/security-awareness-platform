import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';

import Leaderboard from './Leaderboard';
import { VarLayoutScale } from '../../GlobalComponents/Layout';

// The leaderboard as a pop-up over the current screen, opened from the
// LEADERBOARD button on the My Space profile card. This is how Regular Users
// reach it (they have no nav item); other roles can use it too.
//
// Portalled to <body>, so it re-applies the app shell's zoom to render at the
// same scale as the page underneath. Closes on Esc, the backdrop, or Close.
const LeaderboardModal = ({ onClose }) => {
  const reduce = useReducedMotion();
  const panelRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed', top: 0, left: 0, zIndex: 9000,
        zoom: VarLayoutScale, width: `${100 / VarLayoutScale}vw`, height: `${100 / VarLayoutScale}vh`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 28,
        background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)',
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Leaderboard"
        tabIndex={-1}
        initial={reduce ? false : { opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        style={{
          width: '100%', maxWidth: 1480, height: '100%', maxHeight: 960,
          borderRadius: 20, overflow: 'hidden', outline: 'none',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        }}
      >
        <Leaderboard onClose={onClose} />
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default LeaderboardModal;
