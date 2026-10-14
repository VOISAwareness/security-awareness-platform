import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, Lock, LocateFixed, Sparkles, X } from 'lucide-react';

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
// in detail, and how points move; then the comeback zone, the three levels
// below Level 1, as a path back up to a fresh start. Sized to fit a laptop
// screen whole; on a shorter one the body scrolls under a fixed header, its
// thin scrollbar kept inside the panel. Lettering in the app's display face
// (.vs-rank: Vodafone ExB, else Montserrat).
//
// `current` and `points` are the viewer's own level and points: their level
// is marked "You", levels passed are ticked, levels ahead are greyed and say
// how far away they are. `selected` is the level to open on (the badge that
// was clicked; the viewer's own by default). `subject` names whose badge that
// was ({ name, levelId }), when it was someone else's. `isDark` picks the
// dark or light look, to match the app.
//
// The comeback zone is about the way back, not the drop: no points, no risk
// wording, no totals below zero, not even the viewer's own.
// Portalled to <body>, re-applying the app's zoom, over everything. Esc, the
// backdrop or Close shut it, and nothing underneath.

const HEAD = { L1: '#64676D', L0: '#8F6114' }; // darker bands where white text needs it
const headOf = (l) => HEAD[l.family] || l.color;
// Level colours for text on white, darkened where they'd fall under 4.5:1.
const INK = { L1: '#5F6268', L5: '#7E5C14', L0: '#8A5F12' };

const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
const fmt = (n) => `${n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('en-US')}`;
const RISK = { Unknown: 'Risk unknown', 'Medium-Low': 'Medium-low risk', 'Very Low': 'Very low risk' };
const riskText = (l) => RISK[l.risk] || l.risk.charAt(0) + l.risk.slice(1).toLowerCase();
const title = (l) => (l.grade ? `${l.name} ${ROMAN[l.grade]}` : l.name);
const isComeback = (l) => l.level <= 0;
const COMEBACK = {
  L0: 'One step from a fresh start',
  LN1: 'Two steps from a fresh start',
  LN2: 'Where the comeback begins',
};

const THEMES = {
  dark: {
    backdrop: 'rgba(5,7,11,0.74)',
    panel: 'radial-gradient(70% 40% at 50% 0%, #1B2130 0%, rgba(27,33,48,0) 100%), linear-gradient(180deg, #141822 0%, #0D1016 100%)',
    edge: 'rgba(255,255,255,0.08)',
    panelShadow: '0 30px 80px rgba(0,0,0,0.5)',
    text: '#FFFFFF',
    sub: '#A9B0BE',
    faint: '#8C95A5',
    eyebrow: '#E8C46A',
    chip: 'rgba(255,255,255,0.06)',
    chipEdge: 'rgba(255,255,255,0.10)',
    chipText: '#E6E9EF',
    cardBase: '#10131A',
    cardTint: [0.4, 0.16], // [reached, locked]
    cardGlow: [0.55, 0.18],
    selShadow: '0 18px 40px rgba(0,0,0,0.55)',
    dim: 'grayscale(1) brightness(0.62)',
    shadow: 'drop-shadow(0 10px 14px rgba(0,0,0,0.45))',
    accent: (l) => l.light,
    you: (l) => [l.light, '#10131A'],
    lock: ['rgba(255,255,255,0.14)', '#D5DAE3'],
    grade: {
      current: (l) => ({ background: l.light, color: '#10131A', border: `1px solid ${l.light}` }),
      done: (l) => ({ background: rgba(l.color, 0.45), color: '#fff', border: '1px solid rgba(255,255,255,0.16)' }),
      locked: () => ({ background: 'rgba(255,255,255,0.04)', color: '#8C95A5', border: '1px solid rgba(255,255,255,0.10)' }),
      picked: '2px solid #FFFFFF',
    },
    detail: '#151922',
    detailGlow: 0.55,
    rays: 0.4,
    labelChip: 0.32,
    track: 'rgba(255,255,255,0.08)',
    row: 'rgba(255,255,255,0.04)',
    gain: ['rgba(30,158,90,0.22)', '#7BE3A8'],
    loss: ['rgba(217,45,32,0.22)', '#FF9C93'],
    zero: ['rgba(255,255,255,0.06)', '#A9B0BE'],
    comebackCard: (l) => `linear-gradient(135deg, ${rgba(l.color, 0.42)} 0%, ${rgba(l.color, 0.1)} 100%), #141821`,
    tone: { done: '#4ADE80', ahead: '#A9B0BE', comeback: '#F2C66B' },
    focus: 'vs-on-dark',
  },
  light: {
    backdrop: 'rgba(15,23,42,0.45)',
    panel: 'radial-gradient(70% 40% at 50% 0%, #FFF4D6 0%, rgba(255,244,214,0) 100%), linear-gradient(180deg, #FFFFFF 0%, #F5F6FA 100%)',
    edge: 'rgba(15,23,42,0.09)',
    panelShadow: '0 30px 80px rgba(15,23,42,0.28)',
    text: '#0F172A',
    sub: '#5B6170',
    faint: '#6B7280',
    eyebrow: '#9A6408',
    chip: '#F1F3F8',
    chipEdge: 'rgba(15,23,42,0.08)',
    chipText: '#334155',
    cardBase: '#FFFFFF',
    cardTint: [0.16, 0.06],
    cardGlow: [0.3, 0.1],
    selShadow: '0 18px 36px rgba(15,23,42,0.18)',
    dim: 'grayscale(1) brightness(1.08) opacity(0.55)',
    shadow: 'drop-shadow(0 10px 12px rgba(15,23,42,0.28))',
    accent: (l) => INK[l.family] || l.color,
    you: (l) => [headOf(l), '#FFFFFF'],
    lock: ['rgba(15,23,42,0.08)', '#64748B'],
    grade: {
      current: (l) => ({ background: headOf(l), color: '#fff', border: `1px solid ${headOf(l)}` }),
      done: (l) => ({ background: rgba(l.color, 0.14), color: INK[l.family] || l.color, border: `1px solid ${rgba(l.color, 0.32)}` }),
      locked: () => ({ background: '#F3F4F7', color: '#8A93A3', border: '1px solid rgba(15,23,42,0.08)' }),
      picked: '2px solid #0F172A',
    },
    detail: '#FFFFFF',
    detailGlow: 0.22,
    rays: 0.22,
    labelChip: 0.14,
    track: '#E6EAF2',
    row: '#F6F7FB',
    gain: ['#DCFCE7', '#15803D'],
    loss: ['#FEE2E2', '#B91C1C'],
    zero: ['#EEF0F5', '#64748B'],
    comebackCard: (l) => `linear-gradient(135deg, ${rgba(l.color, 0.16)} 0%, ${rgba(l.color, 0.04)} 100%), #FFFFFF`,
    tone: { done: '#15803D', ahead: '#64748B', comeback: '#B7791F' },
    focus: 'vs-on-light',
  },
};

// How the viewer stands against a level: 'current', 'done', 'ahead', 'below'
// (a comeback level under theirs) or 'open' when we don't know who they are.
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

const Picture = ({ level, height, T, dim = false }) => (
  <img
    src={badgeSrc(level.id, Math.round((height / BADGE_RATIO) * 2))}
    srcSet={badgeSrcSet(level.id)}
    sizes={`${Math.round(height / BADGE_RATIO)}px`}
    width={Math.round(height / BADGE_RATIO)}
    height={height}
    alt=""
    draggable={false}
    decoding="async"
    style={{ display: 'block', objectFit: 'contain', filter: dim ? T.dim : T.shadow }}
  />
);

const Corner = ({ state, level, T }) => {
  const at = { position: 'absolute', top: 8, right: 8 };
  if (state === 'current') {
    const [bg, fg] = T.you(level);
    return (
      <span className="vs-rank" style={{ ...at, padding: '3px 7px', borderRadius: 999, background: bg, color: fg, fontSize: 9.5, fontWeight: 900, letterSpacing: '0.06em', lineHeight: 1.2 }}>
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
      <span aria-hidden style={{ ...at, width: 22, height: 22, borderRadius: 999, background: T.lock[0], display: 'grid', placeItems: 'center' }}>
        <Lock size={11} strokeWidth={2.6} color={T.lock[1]} />
      </span>
    );
  }
  return null;
};

const stateWord = { current: 'your level', done: 'reached', ahead: 'not reached yet', below: '', open: '' };

const AllBadges = ({ current = null, points = null, rank = null, total = null, selected, subject = null, isDark = false, onClose }) => {
  const T = THEMES[isDark ? 'dark' : 'light'];
  const reduce = useReducedMotion();
  const present = useIsPresent(); // false while it fades out
  const closeRef = useRef(null);
  const rules = useGamificationRules();
  const [selId, setSelId] = useState(() => (LEVEL_BY_ID[selected] ? selected : current?.id || 'L1G1'));
  const sel = LEVEL_BY_ID[selId];
  const selAccent = T.accent(sel);

  // While open, Esc closes this and nothing else (a pop-up underneath may be
  // listening for Esc too). Focus goes to Close, and back to
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
  const ownPointsShown = points !== null && points >= 0; // never a total below zero on this screen
  const selState = stateOf(sel, current);
  const comeback = isComeback(sel);
  let status = null;
  let StatusIcon = null;
  let statusTone = T.tone.comeback;
  if (selState === 'current') {
    const to = progress?.next ? `${fmt(progress.toNext)} pts to ${title(progress.next)}.` : '';
    status = progress?.next ? `${comeback ? 'You are on your comeback.' : 'You are here.'} ${to}` : 'You are here, at the very top.';
    StatusIcon = LocateFixed;
    statusTone = T.accent(sel);
  } else if (selState === 'done') {
    status = `Reached. Unlocked at ${fmt(sel.min)} pts.`;
    StatusIcon = Check;
    statusTone = T.tone.done;
  } else if (selState === 'ahead' && points !== null) {
    status = comeback ? `${fmt(sel.min - points)} pts to go.` : `${fmt(sel.min - points)} pts to go. Unlocks at ${fmt(sel.min)} pts.`;
    StatusIcon = Lock;
    statusTone = T.tone.ahead;
  } else if (comeback) {
    status = 'Every report and every finished training moves you up and out.';
    StatusIcon = Sparkles;
  }

  const showProgress = selState === 'current' && progress && !progress.isTop;
  const fresh = LEVEL_BY_ID.L1G1; // where the comeback path leads

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
        position: 'fixed', top: 0, left: 0, zIndex: 9100, // over the app's other pop-ups
        zoom: VarLayoutScale, width: `${100 / VarLayoutScale}vw`, height: `${100 / VarLayoutScale}vh`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, boxSizing: 'border-box',
        background: T.backdrop, backdropFilter: 'blur(6px)',
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-badges-title"
        data-all-badges={isDark ? 'dark' : 'light'}
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        style={{
          width: '100%', maxWidth: 1260, maxHeight: '100%', overflow: 'hidden', boxSizing: 'border-box',
          display: 'flex', flexDirection: 'column',
          borderRadius: 26, color: T.text, background: T.panel,
          border: `1px solid ${T.edge}`, boxShadow: T.panelShadow,
          fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* header: stays put while the body scrolls */}
        <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '18px 24px 10px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.2em', color: T.eyebrow }}>VOIS SHIELD RANKS</div>
            <h2 id="all-badges-title" className="vs-rank" style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
              Badges &amp; levels
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12.5, fontWeight: 600, color: T.sub }}>
              Seven levels, three grades each. Earn points to climb. Lose points and you drop.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {current && (
              <div data-all-badges-you={current.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 16px 5px 8px', borderRadius: 999, background: T.chip, border: `1px solid ${T.chipEdge}` }}>
                <Picture level={current} height={40} T={T} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span className="vs-rank" style={{ fontSize: 13.5, fontWeight: 900, lineHeight: 1.1, textTransform: 'uppercase' }}>{gradeName(current)}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: T.sub }}>
                    You{ownPointsShown ? ` · ${fmt(points)} pts` : ''}{rank ? ` · Rank ${rank}${total ? ` of ${total.toLocaleString()}` : ''}` : ''}
                  </span>
                </span>
              </div>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close all badges"
              className={T.focus}
              style={{ width: 44, height: 44, borderRadius: 12, border: 0, background: T.chip, color: T.text, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
            >
              <X size={18} strokeWidth={2.6} />
            </button>
          </div>
        </div>

        {/* body: the one scrolling part, its thin scrollbar kept inside the panel's edge */}
        <div
          data-all-badges-body
          className="vs-scroll"
          style={{ flex: '1 1 auto', minHeight: 0, overflow: 'auto', margin: '0 8px 12px 0', padding: '2px 10px 6px 24px' }}
        >
          <div style={{ minWidth: 1080 }}>
            {/* the seven levels */}
            <div style={{ paddingTop: 8, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 14 }}>
              {LEVEL_FAMILIES.map((grades) => {
                const head = grades[0];
                const accent = T.accent(head);
                const state = !current ? 'open' : current.level === head.level ? 'current' : grades[2].rank < current.rank ? 'done' : 'ahead';
                const isSel = sel.level === head.level;
                const opensOn = state === 'current' ? current : state === 'done' ? grades[2] : grades[0];
                const shown = isSel ? sel : opensOn;
                const reached = state === 'ahead' ? 1 : 0;
                return (
                  <div
                    key={head.family}
                    className="vs-tier"
                    data-tier={head.family}
                    data-state={state}
                    style={{
                      display: 'flex', flexDirection: 'column', borderRadius: 16, overflow: 'hidden',
                      background: `radial-gradient(70% 42% at 50% 34%, ${rgba(head.color, T.cardGlow[reached])} 0%, rgba(0,0,0,0) 70%), linear-gradient(180deg, ${rgba(head.color, T.cardTint[reached])} 0%, rgba(0,0,0,0) 80%), ${T.cardBase}`,
                      boxShadow: isSel ? `0 0 0 2px ${accent}, ${T.selShadow}` : state === 'current' ? `0 0 0 1px ${accent}` : `0 0 0 1px ${T.edge}`,
                      transform: isSel ? 'translateY(-6px)' : 'none',
                    }}
                  >
                    <button
                      type="button"
                      className={`vs-tier-btn ${T.focus}`}
                      onClick={() => setSelId(opensOn.id)}
                      aria-pressed={isSel}
                      aria-label={`Level ${head.level}, ${head.name}${stateWord[state] ? `, ${stateWord[state]}` : ''}. Show details`}
                      style={{ border: 0, padding: 0, margin: 0, background: 'transparent', color: 'inherit', font: 'inherit', textAlign: 'center', cursor: 'pointer', display: 'flex', flexDirection: 'column', width: '100%' }}
                    >
                      <span
                        className="vs-rank"
                        style={{ display: 'block', padding: '9px 6px', background: `linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0)), ${headOf(head)}`, color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1.1, letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      >
                        {head.name}
                      </span>
                      <span style={{ position: 'relative', display: 'grid', placeItems: 'center', height: 104 }}>
                        <Picture level={shown} height={88} T={T} dim={state === 'ahead' && !isSel} />
                        <Corner state={state} level={head} T={T} />
                      </span>
                      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', color: T.sub }}>LEVEL {head.level}</span>
                      <span style={{ display: 'block', minHeight: 30, marginTop: 3, padding: '0 8px', fontSize: 11.5, fontWeight: 700, lineHeight: 1.3, color: accent }}>
                        {head.label} · {riskText(head)}
                      </span>
                    </button>
                    <div role="group" aria-label={`${head.name} grades`} style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '6px 8px 4px' }}>
                      {grades.map((g) => {
                        const gs = stateOf(g, current);
                        const on = g.id === sel.id;
                        const look = gs === 'current' ? T.grade.current(head) : gs === 'done' || gs === 'open' ? T.grade.done(head) : T.grade.locked();
                        return (
                          <button
                            key={g.id}
                            type="button"
                            className={`vs-grade-btn vs-rank ${T.focus}`}
                            data-grade={g.id}
                            onClick={() => setSelId(g.id)}
                            aria-pressed={on}
                            aria-label={`${head.name} grade ${ROMAN[g.grade]}${stateWord[gs] ? `, ${stateWord[gs]}` : ''}`}
                            style={{
                              ...look,
                              border: on ? T.grade.picked : look.border,
                              width: 40, height: 32, padding: 0, borderRadius: 10, cursor: 'pointer', boxSizing: 'border-box',
                              fontSize: 12.5, fontWeight: 900, transition: 'background .15s ease, color .15s ease',
                            }}
                          >
                            {ROMAN[g.grade]}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ padding: '3px 8px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: T.faint }}>{familyRangeText(grades)}</div>
                  </div>
                );
              })}
            </div>

            {/* the badge picked, in detail */}
            <section
              aria-live="polite"
              aria-label="Selected badge"
              data-all-badges-detail={sel.id}
              style={{
                marginTop: 12, display: 'grid', gridTemplateColumns: '132px minmax(0, 1fr) 300px', gap: 22, alignItems: 'center', padding: '10px 20px', borderRadius: 18,
                background: `radial-gradient(40% 130% at 8% 50%, ${rgba(sel.color, T.detailGlow)} 0%, rgba(0,0,0,0) 65%), ${T.detail}`,
                border: `1px solid ${T.edge}`, transition: 'background .3s ease',
              }}
            >
              <div style={{ position: 'relative', height: 132, display: 'grid', placeItems: 'center' }}>
                <span
                  aria-hidden
                  className="vs-rays"
                  style={{
                    position: 'absolute', left: '50%', top: '50%', width: 200, height: 200, margin: '-100px 0 0 -100px', borderRadius: '50%',
                    background: `repeating-conic-gradient(${rgba(sel.color, T.rays)} 0deg 5deg, rgba(0,0,0,0) 5deg 15deg)`,
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
                      sizes="100px"
                      width={100}
                      height={125}
                      alt={levelAltText(sel)}
                      draggable={false}
                      style={{ display: 'block', filter: T.shadow }}
                    />
                  </motion.span>
                </AnimatePresence>
              </div>

              <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: selAccent }}>
                  {comeback ? 'COMEBACK ZONE' : `LEVEL ${sel.level}${sel.grade ? ` · GRADE ${ROMAN[sel.grade]}` : ''}`}
                </div>
                <h3 className="vs-rank" style={{ margin: 0, fontSize: 26, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>{title(sel)}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {!comeback && (
                    <>
                      <span style={{ padding: '4px 11px', borderRadius: 999, background: rgba(sel.color, T.labelChip), color: selAccent, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{sel.label}</span>
                      <span style={{ padding: '4px 11px', borderRadius: 999, background: T.chip, color: T.chipText, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{riskText(sel)}</span>
                    </>
                  )}
                  <span className="vs-rank" style={{ fontSize: 13.5, fontWeight: 800, color: comeback ? selAccent : T.chipText, marginLeft: comeback ? 0 : 4 }}>
                    {comeback ? COMEBACK[sel.id] : rangeText(sel)}
                  </span>
                </div>
                {subject && subject.levelId === sel.id && (
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.chipText }}>{subject.name} holds this badge.</div>
                )}
                {status && (
                  <div data-all-badges-status style={{ padding: '8px 12px', borderRadius: 12, background: T.row, border: `1px solid ${T.edge}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      {StatusIcon && <StatusIcon size={16} strokeWidth={2.4} color={statusTone} aria-hidden style={{ flexShrink: 0 }} />}
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: T.chipText }}>{status}</span>
                      {showProgress && ownPointsShown && (
                        <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: T.sub }}>{fmt(points)} / {fmt(progress.next.min)} pts</span>
                      )}
                    </div>
                    {showProgress && (
                      <div role="progressbar" aria-label={`Progress to ${title(progress.next)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.pct} style={{ height: 6, borderRadius: 999, background: T.track, marginTop: 7, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress.pct}%`, borderRadius: 999, background: `linear-gradient(90deg, ${sel.light}, ${sel.color})` }} />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', color: T.sub, marginBottom: 1 }}>HOW POINTS MOVE</div>
                {RULES.map((r) => {
                  const v = rules.points[r.event];
                  const [bg, fg] = v > 0 ? T.gain : v < 0 ? T.loss : T.zero;
                  return (
                    <div key={r.event} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px', borderRadius: 9, background: T.row }}>
                      <span className="vs-rank" style={{ flexShrink: 0, minWidth: 42, textAlign: 'center', padding: '3px 0', borderRadius: 7, fontSize: 12, fontWeight: 800, lineHeight: 1.2, background: bg, color: fg }}>
                        {rules.loading ? '…' : formatPoints(v)}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: T.chipText }}>{r.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* the comeback zone: the way back up, as a path from Level -2 to a fresh start */}
            <section
              aria-labelledby="all-badges-comeback"
              style={{ marginTop: 12, padding: '10px 16px 12px', borderRadius: 18, background: T.detail, border: `1px solid ${T.edge}` }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 8 }}>
                <h3 id="all-badges-comeback" className="vs-rank" style={{ margin: 0, fontSize: 14, fontWeight: 900, lineHeight: 1.1, textTransform: 'uppercase' }}>Comeback zone</h3>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: T.sub }}>Every report and every finished training moves you up and out.</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 16px minmax(0, 1fr) 16px minmax(0, 1fr) 16px minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
              {[...BELOW_LEVELS].reverse().map((l) => {
                const on = sel.id === l.id;
                const st = stateOf(l, current);
                return [
                  <button
                    key={l.id}
                    type="button"
                    className={`vs-below-btn ${T.focus}`}
                    data-below={l.id}
                    onClick={() => setSelId(l.id)}
                    aria-pressed={on}
                    aria-label={`${l.name}: ${COMEBACK[l.id]}${st === 'current' ? ', your level' : ''}. Show details`}
                    style={{
                      position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', minHeight: 58, boxSizing: 'border-box', borderRadius: 12, border: 0, cursor: 'pointer', textAlign: 'left', color: T.text, font: 'inherit',
                      background: T.comebackCard(l),
                      boxShadow: on ? `0 0 0 2px ${T.accent(l)}, ${T.selShadow}` : `0 0 0 1px ${T.edge}`,
                    }}
                  >
                    <Picture level={l} height={42} T={T} />
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                      <span className="vs-rank" style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.15, textTransform: 'uppercase' }}>{l.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: T.accent(l) }}>{COMEBACK[l.id]}</span>
                    </span>
                    {st === 'current' && <Corner state="current" level={l} T={T} />}
                  </button>,
                  <ChevronRight key={`${l.id}-to`} aria-hidden size={16} strokeWidth={2.6} color={T.faint} style={{ justifySelf: 'center' }} />,
                ];
              })}
              <button
                type="button"
                className={`vs-below-btn ${T.focus}`}
                data-below-fresh
                onClick={() => setSelId(fresh.id)}
                aria-pressed={sel.id === fresh.id}
                aria-label={`A fresh start: ${fresh.name}, Level 1. Show details`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', minHeight: 58, boxSizing: 'border-box', borderRadius: 12, cursor: 'pointer', textAlign: 'left', color: T.text, font: 'inherit',
                  background: 'transparent', border: `1.5px dashed ${T.tone.done}`,
                }}
              >
                <Picture level={fresh} height={42} T={T} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                  <span className="vs-rank" style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.15, textTransform: 'uppercase', color: T.tone.done }}>Fresh start</span>
                  <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.3, color: T.sub }}>Level 1 · {fresh.name}</span>
                </span>
              </button>
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
};

export default AllBadges;
