import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { Check, EyeOff, Lock, LocateFixed, TriangleAlert, X } from 'lucide-react';

import { BADGE_RATIO, badgeSrc, badgeSrcSet } from './badgeImages';
import { VarLayoutScale } from './Layout';
import {
  BELOW_LEVELS,
  LEVEL_BY_ID,
  LEVEL_FAMILIES,
  ROMAN,
  familyRangeText,
  gradeName,
  levelAltText,
  progressFor,
  rangeText,
} from '../services/levels';
import { useGamificationRules } from '../services/useGamificationRules';
import { formatPoints } from '../services/gamificationPoints';

// "All badges": opens when someone clicks a badge. Seven level cards in a row,
// each with its colour band, its badge, its three grades (I, II, III) and the
// points it covers, like a game's rank screen; under them the badge picked,
// in detail; then the three levels below zero.
//
// `current` and `points` are the viewer's own level and points: their level
// is marked "You", levels passed are ticked, levels ahead are greyed and say
// how far away they are. `selected` is the level to open on (the badge that
// was clicked; the viewer's own by default). `subject` names whose badge that
// was ({ name, levelId }), when it was someone else's.
//
// These are the rules, so everyone sees every level here, the ones below zero
// too; whose badge is below zero is shown only to them and to admins.
// Portalled to <body>, re-applying the app's zoom, over everything. Esc, the
// backdrop or Close shut it, and nothing underneath.

const HEAD = { L1: '#64676D', L0: '#8F6114' }; // darker bands where white text needs it
const headOf = (l) => HEAD[l.family] || l.color;

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
const fmt = (n) => `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US')}`;
const levelNo = (l) => (l.level < 0 ? `−${-l.level}` : String(l.level));
const RISK = { Unknown: 'Risk unknown', 'Medium-Low': 'Medium-low risk', 'Very Low': 'Very low risk' };
const riskText = (l) => RISK[l.risk] || l.risk.charAt(0) + l.risk.slice(1).toLowerCase();
const title = (l) => (l.grade ? `${l.name} ${ROMAN[l.grade]}` : l.name);

// How the viewer stands against a level: 'current', 'done', 'ahead', 'below'
// (a level under theirs, below zero) or 'open' when we don't know who they are.
function stateOf(level, current) {
  if (!current) return 'open';
  if (level.rank === current.rank) return 'current';
  if (level.rank > current.rank) return 'ahead';
  return level.level > 0 ? 'done' : 'below';
}

const RULES = [
  { event: 'Reported', label: 'Report a phishing email' },
  { event: 'Trained', label: 'Complete a training' },
  { event: 'Clicked', label: 'Click a simulated link' },
  { event: 'Compromised', label: 'Submit details on a fake page' },
];

const Picture = ({ level, height, dim = false, eager = false }) => (
  <img
    src={badgeSrc(level.id, Math.round((height / BADGE_RATIO) * 2))}
    srcSet={badgeSrcSet(level.id)}
    sizes={`${Math.round(height / BADGE_RATIO)}px`}
    width={Math.round(height / BADGE_RATIO)}
    height={height}
    alt=""
    draggable={false}
    loading={eager ? 'eager' : 'lazy'}
    decoding="async"
    style={{
      display: 'block',
      objectFit: 'contain',
      filter: dim ? 'grayscale(1) brightness(0.62)' : 'drop-shadow(0 10px 14px rgba(0,0,0,0.45))',
    }}
  />
);

const Corner = ({ state, light }) => {
  const at = { position: 'absolute', top: 8, right: 8 };
  if (state === 'current') {
    return (
      <span className="vs-rank" style={{ ...at, padding: '3px 8px', borderRadius: 999, background: light, color: '#10131A', fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', lineHeight: 1.2 }}>
        YOU
      </span>
    );
  }
  if (state === 'done') {
    return (
      <span aria-hidden style={{ ...at, width: 22, height: 22, borderRadius: 999, background: '#1E9E5A', display: 'grid', placeItems: 'center' }}>
        <Check size={13} strokeWidth={3} color="#fff" />
      </span>
    );
  }
  if (state === 'ahead') {
    return (
      <span aria-hidden style={{ ...at, width: 22, height: 22, borderRadius: 999, background: 'rgba(255,255,255,0.14)', display: 'grid', placeItems: 'center' }}>
        <Lock size={11} strokeWidth={2.6} color="#D5DAE3" />
      </span>
    );
  }
  return null;
};

const stateWord = { current: 'your level', done: 'reached', ahead: 'not reached yet', below: 'below your level', open: '' };

const AllBadges = ({ current = null, points = null, rank = null, total = null, selected, subject = null, onClose }) => {
  const reduce = useReducedMotion();
  const present = useIsPresent(); // false while it fades out
  const closeRef = useRef(null);
  const rules = useGamificationRules();
  const [selId, setSelId] = useState(() => (LEVEL_BY_ID[selected] ? selected : current?.id || 'L1G1'));
  const sel = LEVEL_BY_ID[selId];

  // While open, Esc closes this and nothing else (a leaderboard pop-up may be
  // underneath, listening for Esc too). Focus goes to Close, and back to
  // whatever opened it afterwards.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!present) return undefined;
    const before = document.activeElement;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onCloseRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey, true);
      if (before && typeof before.focus === 'function') before.focus();
    };
  }, [present]);

  const progress = current && points !== null ? progressFor(points) : null;
  const selState = stateOf(sel, current);
  let status = null;
  if (selState === 'current') {
    status = progress?.next ? `You are here. ${fmt(progress.toNext)} pts to ${title(progress.next)}.` : 'You are here, at the very top.';
  } else if (selState === 'done') {
    status = `Reached. Unlocked at ${fmt(sel.min)} pts.`;
  } else if (selState === 'ahead' && points !== null) {
    status = `${fmt(sel.min - points)} pts to go. Unlocks at ${fmt(sel.min)} pts.`;
  } else if (sel.level <= 0) {
    status = 'Points below zero land here. Report phishing and finish your training to climb back.';
  }
  const StatusIcon = { current: LocateFixed, done: Check, ahead: Lock }[selState] || (sel.level <= 0 ? TriangleAlert : null);
  const statusTone = { current: sel.light, done: '#4ADE80', ahead: '#A9B0BE' }[selState] || '#F2B04C';

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
        position: 'fixed', top: 0, left: 0, zIndex: 9100, // over the leaderboard pop-up (9000)
        zoom: VarLayoutScale, width: `${100 / VarLayoutScale}vw`, height: `${100 / VarLayoutScale}vh`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, boxSizing: 'border-box',
        background: 'rgba(5,7,11,0.74)', backdropFilter: 'blur(6px)',
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-badges-title"
        data-all-badges
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        style={{
          width: '100%', maxWidth: 1260, maxHeight: '100%', overflow: 'auto', boxSizing: 'border-box',
          borderRadius: 26, padding: 28, color: '#fff',
          background: 'radial-gradient(70% 40% at 50% 0%, #1B2130 0%, rgba(27,33,48,0) 100%), linear-gradient(180deg, #141822 0%, #0D1016 100%)',
          border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
          fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.22em', color: '#E8C46A' }}>VOIS SHIELD RANKS</div>
            <h2 id="all-badges-title" className="vs-rank" style={{ margin: '6px 0 0', fontSize: 38, fontWeight: 800, lineHeight: 1, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Badges &amp; levels
            </h2>
            <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 600, color: '#A9B0BE' }}>
              Seven levels, three grades each. Earn points to climb. Lose points and you drop.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {current && (
              <div data-all-badges-you={current.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 18px 6px 8px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                <Picture level={current} height={46} eager />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span className="vs-rank" style={{ fontSize: 17, fontWeight: 800, lineHeight: 1, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{gradeName(current)}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#A9B0BE' }}>
                    You{points !== null ? ` · ${fmt(points)} pts` : ''}{rank ? ` · Rank ${rank}${total ? ` of ${total.toLocaleString()}` : ''}` : ''}
                  </span>
                </span>
              </div>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close all badges"
              className="vs-on-dark"
              style={{ width: 44, height: 44, borderRadius: 12, border: 0, background: 'rgba(255,255,255,0.08)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            >
              <X size={18} strokeWidth={2.6} />
            </button>
          </div>
        </div>

        {/* the seven levels */}
        <div style={{ overflowX: 'auto', marginTop: 16, padding: '8px 2px 4px' }}>
          <div style={{ minWidth: 1080, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 14 }}>
            {LEVEL_FAMILIES.map((grades) => {
              const head = grades[0];
              const state = !current ? 'open' : current.level === head.level ? 'current' : grades[2].rank < current.rank ? 'done' : 'ahead';
              const isSel = sel.level === head.level;
              const opensOn = state === 'current' ? current : state === 'done' ? grades[2] : grades[0];
              const shown = isSel ? sel : opensOn;
              const dim = state === 'ahead' && !isSel;
              const strength = state === 'ahead' ? 0.18 : 0.55;
              return (
                <div
                  key={head.family}
                  className="vs-tier"
                  data-tier={head.family}
                  data-state={state}
                  style={{
                    display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden',
                    background: `radial-gradient(70% 42% at 50% 34%, ${rgba(head.color, strength)} 0%, rgba(0,0,0,0) 70%), linear-gradient(180deg, ${rgba(head.color, state === 'ahead' ? 0.16 : 0.4)} 0%, rgba(16,19,26,0) 80%), #10131A`,
                    boxShadow: isSel ? `0 0 0 2px ${head.light}, 0 18px 40px rgba(0,0,0,0.55)` : state === 'current' ? `0 0 0 1px ${head.light}` : '0 0 0 1px rgba(255,255,255,0.08)',
                    transform: isSel ? 'translateY(-6px)' : 'none',
                  }}
                >
                  <button
                    type="button"
                    className="vs-tier-btn vs-on-dark"
                    onClick={() => setSelId(opensOn.id)}
                    aria-pressed={isSel}
                    aria-label={`Level ${head.level}, ${head.name}${stateWord[state] ? `, ${stateWord[state]}` : ''}. Show details`}
                    style={{ border: 0, padding: 0, margin: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', width: '100%' }}
                  >
                    <span
                      className="vs-rank"
                      style={{ display: 'block', padding: '10px 8px', background: `linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0)), ${headOf(head)}`, color: '#fff', fontSize: 15, fontWeight: 800, lineHeight: 1, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}
                    >
                      {head.name}
                    </span>
                    <span style={{ position: 'relative', display: 'grid', placeItems: 'center', height: 138 }}>
                      <Picture level={shown} height={114} dim={dim} eager />
                      <Corner state={state} light={head.light} />
                    </span>
                    <span style={{ display: 'block', fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: '#A9B0BE' }}>LEVEL {head.level}</span>
                    <span style={{ display: 'block', minHeight: 34, marginTop: 4, padding: '0 8px', fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, color: head.light }}>
                      {head.label} · {riskText(head)}
                    </span>
                  </button>
                  <div role="group" aria-label={`${head.name} grades`} style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '10px 8px 6px' }}>
                    {grades.map((g) => {
                      const gs = stateOf(g, current);
                      const on = g.id === sel.id;
                      const look = gs === 'current'
                        ? { background: head.light, color: '#10131A', border: `1px solid ${head.light}` }
                        : gs === 'done' || gs === 'open'
                          ? { background: rgba(head.color, 0.45), color: '#fff', border: '1px solid rgba(255,255,255,0.16)' }
                          : { background: 'rgba(255,255,255,0.04)', color: '#8C95A5', border: '1px solid rgba(255,255,255,0.10)' };
                      return (
                        <button
                          key={g.id}
                          type="button"
                          className="vs-grade-btn vs-on-dark vs-rank"
                          data-grade={g.id}
                          onClick={() => setSelId(g.id)}
                          aria-pressed={on}
                          aria-label={`${head.name} grade ${ROMAN[g.grade]}${stateWord[gs] ? `, ${stateWord[gs]}` : ''}`}
                          style={{
                            ...look,
                            border: on ? '2px solid #fff' : look.border,
                            width: 42, height: 40, padding: 0, borderRadius: 10, cursor: 'pointer', boxSizing: 'border-box',
                            fontSize: 16, fontWeight: 800, letterSpacing: '0.06em', transition: 'background .15s ease, color .15s ease',
                          }}
                        >
                          {ROMAN[g.grade]}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ padding: '4px 8px 14px', textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#8C95A5' }}>{familyRangeText(grades)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* the badge picked, in detail */}
        <section
          aria-live="polite"
          aria-label="Selected badge"
          data-all-badges-detail={sel.id}
          style={{
            marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'center', padding: '16px 28px', borderRadius: 20,
            background: `radial-gradient(45% 120% at 13% 50%, ${rgba(sel.color, 0.55)} 0%, rgba(0,0,0,0) 65%), #151922`,
            border: '1px solid rgba(255,255,255,0.08)', transition: 'background .3s ease',
          }}
        >
          <div style={{ flex: '0 0 220px', position: 'relative', height: 204, display: 'grid', placeItems: 'center' }}>
            <span
              aria-hidden
              className="vs-rays"
              style={{
                position: 'absolute', left: '50%', top: '50%', width: 300, height: 300, margin: '-150px 0 0 -150px', borderRadius: '50%',
                background: `repeating-conic-gradient(${rgba(sel.color, 0.4)} 0deg 5deg, rgba(0,0,0,0) 5deg 15deg)`,
                WebkitMaskImage: 'radial-gradient(circle, #000 25%, rgba(0,0,0,0) 66%)', maskImage: 'radial-gradient(circle, #000 25%, rgba(0,0,0,0) 66%)',
              }}
            />
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={sel.id}
                initial={reduce ? false : { opacity: 0, scale: 0.85, rotateY: -50 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotateY: 40 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="vs-float"
                style={{ position: 'relative', display: 'block' }}
              >
                <img
                  src={badgeSrc(sel.id, 512)}
                  srcSet={badgeSrcSet(sel.id)}
                  sizes="152px"
                  width={152}
                  height={190}
                  alt={levelAltText(sel)}
                  draggable={false}
                  style={{ display: 'block', filter: 'drop-shadow(0 18px 22px rgba(0,0,0,0.55))' }}
                />
              </motion.span>
            </AnimatePresence>
          </div>

          <div style={{ flex: '1 1 360px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.18em', color: sel.light }}>
              LEVEL {levelNo(sel)}{sel.grade ? ` · GRADE ${ROMAN[sel.grade]}` : ''}
            </div>
            <h3 className="vs-rank" style={{ margin: 0, fontSize: 48, fontWeight: 800, lineHeight: 0.95, letterSpacing: '0.01em', textTransform: 'uppercase' }}>{title(sel)}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ padding: '5px 12px', borderRadius: 999, background: rgba(sel.color, 0.32), color: sel.light, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{sel.label}</span>
              <span style={{ padding: '5px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', color: '#E6E9EF', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{riskText(sel)}</span>
            </div>
            <div className="vs-rank" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1, color: '#D5DAE3', letterSpacing: '0.04em' }}>{rangeText(sel)}</div>
            {subject && subject.levelId === sel.id && (
              <div style={{ fontSize: 13, fontWeight: 700, color: '#D5DAE3' }}>{subject.name} holds this badge.</div>
            )}
            {status && (
              <div data-all-badges-status style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {StatusIcon && <StatusIcon size={18} strokeWidth={2.4} color={statusTone} aria-hidden />}
                <span style={{ fontSize: 14, fontWeight: 700, color: '#E6E9EF' }}>{status}</span>
              </div>
            )}
            {selState === 'current' && progress && !progress.isTop && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: '#A9B0BE' }}>
                  <span>To {title(progress.next)}</span>
                  <span>{fmt(points)} / {fmt(progress.next.min)} pts</span>
                </div>
                <div role="progressbar" aria-label={`Progress to ${title(progress.next)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.pct} style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', marginTop: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progress.pct}%`, borderRadius: 999, background: `linear-gradient(90deg, ${sel.light}, ${sel.color})` }} />
                </div>
              </div>
            )}
          </div>

          <div style={{ flex: '1 1 260px', maxWidth: 330, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: '#A9B0BE' }}>HOW POINTS MOVE</div>
            {RULES.map((r) => {
              const v = rules.points[r.event];
              const gain = v > 0;
              const loss = v < 0;
              return (
                <div key={r.event} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
                  <span
                    className="vs-rank"
                    style={{
                      flexShrink: 0, minWidth: 46, textAlign: 'center', padding: '4px 0', borderRadius: 8, fontSize: 16, fontWeight: 800, lineHeight: 1.1,
                      background: gain ? 'rgba(30,158,90,0.22)' : loss ? 'rgba(217,45,32,0.22)' : 'rgba(255,255,255,0.06)',
                      color: gain ? '#7BE3A8' : loss ? '#FF9C93' : '#A9B0BE',
                    }}
                  >
                    {rules.loading ? '…' : formatPoints(v)}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#E6E9EF' }}>{r.label}</span>
                </div>
              );
            })}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#A9B0BE', marginTop: 2 }}>
              A simulation can cost you points only once, however many times it is clicked.
            </div>
          </div>
        </section>

        {/* below zero */}
        <section aria-labelledby="all-badges-below" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <h3 id="all-badges-below" className="vs-rank" style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1, letterSpacing: '0.08em' }}>BELOW ZERO</h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#A9B0BE' }}>
              <EyeOff size={16} strokeWidth={2.2} aria-hidden />
              Only you and admins see a badge below zero
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {BELOW_LEVELS.map((l) => {
              const on = sel.id === l.id;
              const st = stateOf(l, current);
              return (
                <button
                  key={l.id}
                  type="button"
                  className="vs-below-btn vs-on-dark"
                  data-below={l.id}
                  onClick={() => setSelId(l.id)}
                  aria-pressed={on}
                  aria-label={`Level ${l.level}, ${l.name}, ${rangeText(l)}${st === 'current' ? ', your level' : ''}. Show details`}
                  style={{
                    position: 'relative', display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderRadius: 14, border: 0, cursor: 'pointer', textAlign: 'left', color: '#fff', font: 'inherit',
                    background: `linear-gradient(135deg, ${rgba(l.color, 0.42)} 0%, ${rgba(l.color, 0.1)} 100%), #141821`,
                    boxShadow: on ? `0 0 0 2px ${l.light}, 0 14px 30px rgba(0,0,0,0.5)` : '0 0 0 1px rgba(255,255,255,0.08)',
                  }}
                >
                  <Picture level={l} height={66} eager />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                    <span className="vs-rank" style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{l.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: l.light }}>LEVEL {levelNo(l)} · {riskText(l).toUpperCase()}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#A9B0BE' }}>{rangeText(l)}</span>
                  </span>
                  {st === 'current' && <Corner state="current" light={l.light} />}
                </button>
              );
            })}
          </div>
        </section>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default AllBadges;
