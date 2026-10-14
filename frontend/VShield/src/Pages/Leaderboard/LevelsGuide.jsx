import { useEffect, useRef } from 'react';
import { motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

import LevelBadge from '../../GlobalComponents/LevelBadge';
import { LEVELS, levelTitle, rangeText } from '../../services/levels';

// "All levels", over the leaderboard: every level and grade with its badge
// and the points it covers, and the three levels below zero. These are the
// rules, so everyone sees them all; whose badge is whose is not shown here.
// The viewer's own level (`current`) is marked. Esc, the backdrop or Close
// shut it, without closing the leaderboard pop-up underneath.
const UP = [1, 2, 3, 4, 5, 6, 7].map((n) => LEVELS.filter((l) => l.level === n));
const BELOW = LEVELS.filter((l) => l.level <= 0).reverse(); // 0, -1, -2

const LevelsGuide = ({ current, isDark, onClose }) => {
  const reduce = useReducedMotion();
  const present = useIsPresent(); // false while it fades out
  const closeRef = useRef(null);

  // While open, Esc closes this and nothing else; once it is closing, Esc
  // goes back to the leaderboard pop-up.
  useEffect(() => {
    if (!present) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation(); // the leaderboard pop-up listens for Esc too
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    closeRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, present]);

  const text = isDark ? '#F1F5F9' : '#0F172A';
  const muted = isDark ? '#9AA6B2' : '#64748B';
  const cell = (l, size) => {
    const mine = current && current.id === l.id;
    return (
      <div
        key={l.id}
        data-guide-level={l.id}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 4px 4px', borderRadius: 12,
          background: mine ? (isDark ? `${l.color}55` : `${l.light}55`) : 'transparent',
          boxShadow: mine ? `inset 0 0 0 1.5px ${isDark ? l.light : l.color}` : 'none',
        }}
      >
        <LevelBadge level={l} size={size} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: text, whiteSpace: 'nowrap' }}>
            {l.grade ? `Grade ${l.grade}` : l.name}
            {mine && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, color: isDark ? l.light : l.color, letterSpacing: '0.08em' }}>YOU</span>}
          </div>
          <div className="lb-mono" style={{ fontSize: 10, fontWeight: 700, color: muted, whiteSpace: 'nowrap' }}>{rangeText(l)}</div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)', borderRadius: 'inherit',
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="levels-guide-title"
        initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        style={{
          width: '100%', maxWidth: 1240, maxHeight: '100%', overflow: 'auto', borderRadius: 20, padding: '20px 24px 22px',
          background: isDark ? '#1C1E24' : '#FFFFFF', color: text, boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h2 id="levels-guide-title" className="lb-exb" style={{ fontSize: 20, margin: 0, letterSpacing: '-0.01em' }}>Levels and badges</h2>
            <p style={{ fontSize: 12, fontWeight: 600, color: muted, margin: '4px 0 0', maxWidth: 720 }}>
              Your points decide your badge. Reporting phishing and finishing training earn points; clicking a simulated
              link or entering details loses them, and your level can go down as well as up.
              {current && (
                <>
                  {' '}You are <strong style={{ color: text }}>{levelTitle(current)} · {current.name}</strong>.
                </>
              )}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close levels"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 8, flexShrink: 0,
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(15,23,42,0.12)'}`, background: 'transparent', color: text,
              fontSize: 10.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer',
            }}
          >
            Close <X size={13} strokeWidth={2.8} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(156px, 1fr))', gap: 12, marginTop: 16 }}>
          {UP.map((grades) => (
            <div key={grades[0].family} style={{ borderRadius: 14, padding: '10px 8px', background: isDark ? 'rgba(255,255,255,0.04)' : '#F6F8FB' }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: isDark ? grades[0].light : grades[0].color, padding: '0 4px' }}>
                Level {grades[0].level} · {grades[0].label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: text, padding: '1px 4px 6px', whiteSpace: 'nowrap' }}>{grades[0].name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{grades.map((l) => cell(l, 50))}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, borderRadius: 14, padding: '10px 12px', background: isDark ? 'rgba(248,113,113,0.08)' : '#FEF2F2' }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: isDark ? '#F87171' : '#B91C1C' }}>
            Below zero
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: muted, margin: '2px 0 6px' }}>
            Only you and the security admins see your badge while you are below zero.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {BELOW.map((l) => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center' }}>
                {cell(l, 50)}
                <span style={{ fontSize: 10, fontWeight: 800, color: muted, marginLeft: -2 }}>{levelTitle(l)}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default LevelsGuide;
