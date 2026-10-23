import { createElement, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Info } from 'lucide-react';

import { Chip } from '../Leaderboard/BigPictureTables';
import { EASE, HEALTH_RULE, STEADY_INK, eyebrow, healthInk, heads, lureIcon, num, pc, small, times } from './insightsUi';

// Small pieces Insights' views and profiles share: a change on a chip, a
// health chip, a lure's icon tile, a thin labelled bar, column names, a
// number that counts to its new value, and an "i" that explains a number.

/** A change against something, on a small chip: its arrow, its size, better or worse. */
export function Delta({ c, ink, title, onDark = false }) {
  if (!c) return null;
  const color = c.good === null ? STEADY_INK : c.good ? ink.good : ink.bad;
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 20, padding: '0 8px', borderRadius: 999, background: onDark ? 'rgba(255,255,255,0.12)' : 'var(--chip)', fontSize: 9.5, fontWeight: 800, color: onDark ? 'inherit' : 'var(--text)', whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ fontSize: 9, color }}>{c.dir === 'up' ? '▲' : c.dir === 'down' ? '▼' : '●'}</span>{c.shown}
    </span>
  );
}

/** Health (Protected, Holding, Exposed) on a chip, its rule on hover. */
export function HealthChip({ h, ink, width = 92 }) {
  if (!h) return <span style={small}>—</span>;
  return <Chip color={healthInk(h.word, ink)} width={width} title={`Reported ${pc(h.reportRate)} of emails · clicked ${pc(h.clickRate)}. ${HEALTH_RULE}`}>{h.word}</Chip>;
}

const LureIcon = ({ type, ...props }) => createElement(lureIcon(type), props);
/** A lure's icon on its own soft tile. */
export function LureTile({ type, size = 32, tone }) {
  return (
    <span aria-hidden style={{ flexShrink: 0, width: size, height: size, borderRadius: Math.round(size * 0.3), display: 'grid', placeItems: 'center', background: tone || 'var(--plate)', color: 'var(--text)' }}>
      <LureIcon type={type} size={Math.round(size * 0.47)} strokeWidth={2.3} />
    </span>
  );
}

// A bar's fill: set at its width and grown in from the left by a CSS
// animation of its transform, which the browser runs without script or
// layout; a later change of width eases across.
// `grow` false when the row around it already moves in: one animated layer, not two.
export function Fill({ width, color, delay = 0, radius = 999, grow = true }) {
  return <span className={grow ? 'ins-grow-x' : undefined} style={{ '--d': `${Math.min(delay, 0.45)}s`, display: 'block', height: '100%', width, borderRadius: radius, background: color, transformOrigin: 'left', transition: 'width .5s ease' }} />;
}

/** A number over a thin bar that grows in from nothing. */
export function Meter({ value, max, color, label, sub, delay = 0, reduce, height = 6 }) {
  const w = `${Math.max(0, Math.min(1, max > 0 ? (value || 0) / max : 0)) * 100}%`;
  return (
    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
        <span className="vs-rank" style={{ fontSize: 13, fontWeight: 900, lineHeight: 1, color: 'var(--text)' }}>{label}</span>
        {sub && <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
      </span>
      <span aria-hidden style={{ height, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
        <Fill width={w} color={color} delay={delay} reduce={reduce} />
      </span>
    </span>
  );
}

/** A thin bar with its value at its end, on one line with the rest of a row. */
export function InlineBar({ value, max, color, label, delay = 0, reduce, grow = true }) {
  const w = `${Math.max(0, Math.min(1, max > 0 ? (value || 0) / max : 0)) * 100}%`;
  return (
    <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span aria-hidden style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
        <Fill width={w} color={color} delay={delay} reduce={reduce} grow={grow} />
      </span>
      <span className="vs-rank" style={{ flexShrink: 0, width: 36, textAlign: 'right', fontSize: 11.5, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{label}</span>
    </span>
  );
}

/** Column names over a list, lined up with its rows. */
export function Heads({ cols, children, pad = 13 }) {
  return <div role="row" style={{ flexShrink: 0, height: 28, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 14, padding: `0 ${pad}px`, borderBottom: '1px solid var(--hair)', ...heads }}>{children}</div>;
}

/**
 * `format(value)`, counting from the last value shown. A motion value writes
 * the text straight into the page, so nothing re-renders while it counts.
 */
export function Count({ value, format, reduce }) {
  const ok = Number.isFinite(value);
  const mv = useMotionValue(ok ? value : 0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    if (!ok) return undefined;
    if (reduce) { mv.set(value); return undefined; }
    const run = animate(mv, value, { duration: 0.7, ease: [0.16, 1, 0.3, 1] });
    return () => run.stop();
  }, [ok, value, reduce, mv]);
  return ok ? <motion.span>{text}</motion.span> : format(value);
}

const EXPLAIN_W = 290;
/**
 * A small "i" by a number: on hover, focus or a tap, a card saying what the
 * number means and how it is worked out. The card opens on the page's
 * sheet, so a card that clips what it holds never clips it.
 */
export function Explain({ label, children, onDark = false }) {
  const btn = useRef(null);
  const [at, setAt] = useState(null);
  const show = () => {
    const page = btn.current?.closest('.ins-sheet');
    if (!page) return;
    const r = btn.current.getBoundingClientRect(); const pr = page.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left - pr.left - 14, pr.width - EXPLAIN_W - 8));
    const below = window.innerHeight - r.bottom > 250;
    setAt({ page, left, top: below ? r.bottom - pr.top + 8 : r.top - pr.top - 8, below });
  };
  const hide = () => setAt(null);
  return (
    <>
      <button
        ref={btn}
        type="button"
        data-ins-explain
        aria-label={label}
        aria-expanded={Boolean(at)}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(e) => { if (e.key === 'Escape') hide(); }}
        onClick={(e) => { e.stopPropagation(); if (at) hide(); else show(); }}
        style={{ flexShrink: 0, width: 17, height: 17, padding: 0, display: 'inline-grid', placeItems: 'center', borderRadius: 999, border: 'none', background: onDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.08)', color: onDark ? 'inherit' : 'var(--text)', cursor: 'help' }}
      >
        <Info size={11} strokeWidth={2.6} aria-hidden />
      </button>
      {at && createPortal(
        <motion.div
          role="tooltip"
          data-ins-explained
          initial={{ opacity: 0, y: at.below ? 4 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: EASE }}
          style={{ position: 'absolute', left: at.left, top: at.top, translate: at.below ? '0 0' : '0 -100%', width: EXPLAIN_W, zIndex: 60, boxSizing: 'border-box', padding: '12px 14px', borderRadius: 14, background: 'var(--base)', border: '1px solid var(--hair)', boxShadow: '0 20px 44px rgba(15,23,42,0.24)', color: 'var(--text)', pointerEvents: 'none' }}
        >
          {children}
        </motion.div>,
        at.page,
      )}
    </>
  );
}

/**
 * What "reports for every click" means and how it is worked out, from the
 * period's counts; for an Explain.
 */
export function PerClickHow({ n, days, campaigns, ink }) {
  const rules = [
    ['Protected', ink.good, '2 or more: at least two people raise the alarm for everyone caught out'],
    ['Holding', ink.bad, '1 to 2: as many report it as click it, or more'],
    ['Exposed', ink.alert, 'below 1: more people click it than report it'],
  ];
  return (
    <>
      <span style={{ display: 'block', ...eyebrow }}>Reports for every click</span>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, lineHeight: 1.45, marginTop: 6 }}>
        Of the simulated phishing emails people got in the last {days} days, how many they reported to security for every one they clicked.
      </span>
      <span style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 5, marginTop: 9, padding: '8px 10px', borderRadius: 10, background: 'var(--plate)', fontSize: 11, fontWeight: 700 }}>
        <strong className="vs-rank" style={{ fontSize: 13 }}>{num(n.reported)}</strong> reported
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--muted)' }}>÷</span>
        <strong className="vs-rank" style={{ fontSize: 13 }}>{num(n.clicked)}</strong> clicked
        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--muted)' }}>=</span>
        <strong className="vs-rank" style={{ fontSize: 13 }}>{times(n.perClick)}</strong>
      </span>
      <span style={{ display: 'block', ...small, marginTop: 6 }}>From {num(n.delivered)} emails delivered by {campaigns} {campaigns === 1 ? 'campaign' : 'campaigns'}.</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--hair)' }}>
        {rules.map(([word, color, rule]) => (
          <span key={word} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 9.5, lineHeight: 1.35 }}>
            <span aria-hidden style={{ flexShrink: 0, width: 7, height: 7, borderRadius: 999, background: color, transform: 'translateY(-1px)' }} />
            <span><strong>{word}</strong> <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{rule}</span></span>
          </span>
        ))}
      </span>
    </>
  );
}

/** What the risk score means and how it is worked out; for an Explain. */
export function RiskHow({ score, days, colors }) {
  const levels = [
    ['low', 'Low', 'reported phishing and never clicked'],
    ['moderate', 'Moderate', 'clicked once, or never reported'],
    ['high', 'High', 'clicked more than once'],
    ['critical', 'Critical', 'gave details away'],
  ];
  const bands = [['low', 'Under 20'], ['moderate', '20 to 35'], ['high', '35 to 60'], ['critical', '60 and over']];
  return (
    <>
      <span style={{ display: 'block', ...eyebrow }}>Risk score</span>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 700, lineHeight: 1.45, marginTop: 6 }}>
        How exposed the company is to phishing, from 0 (no one at risk) to 100 (everyone at the highest level). Lower is safer.
      </span>
      <span style={{ display: 'block', ...small, fontSize: 9.5, fontWeight: 700, marginTop: 9, color: 'var(--text)' }}>Each person has a level, from their phishing record:</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 5 }}>
        {levels.map(([k, word, rule]) => (
          <span key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 9.5, lineHeight: 1.35 }}>
            <span aria-hidden style={{ flexShrink: 0, width: 7, height: 7, borderRadius: 2, background: colors[k], transform: 'translateY(-1px)' }} />
            <span><strong>{word}</strong> <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{rule}</span></span>
          </span>
        ))}
      </span>
      <span style={{ display: 'block', ...small, fontSize: 9.5, marginTop: 8, lineHeight: 1.45 }}>The score averages everyone: low counts 0, moderate 33, high 67, critical 100.</span>
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--hair)', fontSize: 9, fontWeight: 700 }}>
        {bands.map(([k, range]) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span aria-hidden style={{ width: 7, height: 7, borderRadius: 2, background: colors[k] }} />{range}</span>)}
      </span>
      {Number.isFinite(score) && <span style={{ display: 'block', ...small, fontSize: 9.5, marginTop: 6 }}>Now {score.toFixed(1)}; the arrow beside it is the change over the last {days} days.</span>}
    </>
  );
}
