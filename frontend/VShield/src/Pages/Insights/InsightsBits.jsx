import { Children, cloneElement, createContext, createElement, isValidElement, useContext, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';

import { Chip } from '../Leaderboard/BigPictureTables';
import { useFitRows } from '../Leaderboard/useFitRows';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { useSize } from './useSize';
import { GLOSSARY } from '../../services/glossary';
import { EASE, HEALTH_RULE, HEALTH_WORD, STEADY_INK, TIER_RULE, TIER_WORD, eyebrow, healthInk, heads, lureIcon, pc, small, tierInk, TYPE } from './insightsUi';

// Small pieces Insights' views and profiles share: a change on a chip, a
// health chip, a lure's icon tile, a thin labelled bar, column names, a
// number that counts to its new value, and an "i" that explains a number.

// A view the reader comes back to (with Back) shows its charts, bars and
// counts where they end, with no entrance: wrap it in <Returning value>.
// A chart's own `returning` prop wins over it.
const Back = createContext(false);
export function Returning({ value = false, children }) {
  return <Back.Provider value={Boolean(value)}>{children}</Back.Provider>;
}
Returning.Context = Back;

// Text only a screen reader hears.
const unseen = { position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 };

/**
 * A change against something, on a small chip: a dot in the colour of its
 * verdict (`good` when better, `bad` when worse, `context` when there is no
 * change), then the arrow and the signed size in the text's ink. The verdict
 * is never colour alone: the arrow and sign say which way it went, and a
 * screen reader hears "better" or "worse" (`say` shows the word too).
 * `c` is change()'s { dir, shown, good }.
 */
export function Delta({ c, ink, title, onDark = false, say = false }) {
  if (!c) return null;
  const flat = c.dir === 'flat' || c.good === null || c.good === undefined;
  const verdict = flat ? 'no change' : c.good ? 'better' : 'worse';
  const dot = flat ? (ink?.context ?? STEADY_INK) : c.good ? ink.good : ink.bad;
  const sign = c.dir === 'up' ? '+' : c.dir === 'down' ? '−' : '';
  return (
    <span title={title} data-ins-delta={flat ? 'flat' : c.good ? 'better' : 'worse'} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4, height: 20, padding: '0 7px', borderRadius: 999, background: onDark ? 'rgba(255,255,255,0.12)' : `color-mix(in srgb, ${dot} ${flat ? 8 : 14}%, var(--base))`, fontSize: TYPE.small, fontWeight: 800, color: onDark ? 'inherit' : 'var(--text)', whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ flexShrink: 0, width: 6, height: 6, borderRadius: 999, background: dot }} />
      {!flat && <span aria-hidden style={{ fontSize: TYPE.label }}>{c.dir === 'up' ? '▲' : '▼'}</span>}
      <span>{flat ? c.shown : `${sign}${c.shown}`}</span>
      {say ? <span style={{ fontWeight: 700, color: onDark ? 'inherit' : 'var(--muted)' }}>{verdict}</span> : <span style={unseen}>{`, ${verdict}`}</span>}
    </span>
  );
}

/** Health (Protected, Holding, Not protected) on a chip, its rule on hover. */
export function HealthChip({ h, ink, width = 112 }) {
  if (!h) return <span style={small}>—</span>;
  return <Chip color={healthInk(h.word, ink)} width={width} title={`Reported ${pc(h.reportRate)} of emails · clicked ${pc(h.clickRate)}. ${HEALTH_RULE}`}>{HEALTH_WORD[h.word] ?? h.word}</Chip>;
}

export const LureIcon = ({ type, ...props }) => createElement(lureIcon(type), props);
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
// layout; a later change of width eases across. It is in place within
// 450 ms (a delay of at most 0.12 s, then 0.32 s), and does not grow again
// on a view the reader comes back to.
// `grow` false when the row around it already moves in: one animated layer, not two.
export function Fill({ width, color, delay = 0, radius = 999, grow = true, returning }) {
  const back = useContext(Back);
  const on = grow && !(returning ?? back);
  return <span className={on ? 'ins-grow-x' : undefined} style={{ '--d': `${Math.min(0.12, Math.max(0, delay) / 4).toFixed(3)}s`, animationDuration: '0.32s', display: 'block', height: '100%', width, borderRadius: radius, background: color, transformOrigin: 'left', transition: 'width .5s ease' }} />;
}

/** A number over a thin bar that grows in from nothing. */
export function Meter({ value, max, color, label, sub, delay = 0, reduce, height = 6, returning }) {
  const w = `${Math.max(0, Math.min(1, max > 0 ? (value || 0) / max : 0)) * 100}%`;
  return (
    <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 5, whiteSpace: 'nowrap' }}>
        <span className="vs-rank" style={{ fontSize: TYPE.title, fontWeight: 900, lineHeight: 1, color: 'var(--text)' }}>{label}</span>
        {sub && <span style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
      </span>
      <span aria-hidden style={{ height, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
        <Fill width={w} color={color} delay={delay} reduce={reduce} returning={returning} />
      </span>
    </span>
  );
}

/** A thin bar with its value at its end, on one line with the rest of a row. */
export function InlineBar({ value, max, color, label, delay = 0, reduce, grow = true, returning }) {
  const w = `${Math.max(0, Math.min(1, max > 0 ? (value || 0) / max : 0)) * 100}%`;
  return (
    <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span aria-hidden style={{ flex: 1, minWidth: 0, height: 6, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
        <Fill width={w} color={color} delay={delay} reduce={reduce} grow={grow} returning={returning} />
      </span>
      <span className="vs-rank" style={{ flexShrink: 0, width: 36, textAlign: 'right', fontSize: TYPE.strong, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>{label}</span>
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
    const run = animate(mv, value, { duration: 0.4, ease: EASE });
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
    const k = page.offsetWidth ? pr.width / page.offsetWidth : 1;
    const left = Math.max(8, Math.min((r.left - pr.left) / k - 14, page.offsetWidth - EXPLAIN_W - 8));
    const below = window.innerHeight - r.bottom > 250;
    setAt({ page, left, top: below ? (r.bottom - pr.top) / k + 8 : (r.top - pr.top) / k - 8, below });
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
        style={{ flexShrink: 0, width: 17, height: 17, padding: 0, display: 'inline-grid', placeItems: 'center', borderRadius: 999, border: 'none', background: onDark ? 'rgba(255,255,255,0.16)' : 'var(--chip)', color: onDark ? 'inherit' : 'var(--text)', cursor: 'help' }}
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
          style={{ position: 'absolute', left: at.left, top: at.top, translate: at.below ? '0 0' : '0 -100%', width: EXPLAIN_W, zIndex: 60, boxSizing: 'border-box', padding: '12px 14px', borderRadius: 14, background: 'var(--glass)', backdropFilter: 'blur(12px) saturate(1.4)', WebkitBackdropFilter: 'blur(12px) saturate(1.4)', border: '1px solid var(--hair-strong)', boxShadow: '0 20px 44px rgba(15,23,42,0.24)', color: 'var(--text)', pointerEvents: 'none' }}
        >
          {children}
        </motion.div>,
        at.page,
      )}
    </>
  );
}

// The Risk Score, explained one way wherever its "i" sits (the measure in
// the band, a card's title): what it is, each person's level and its rule,
// how the levels make the score, and where each level's range begins.
const LEVELS = ['low', 'moderate', 'high', 'critical'];
const RANGE = { low: 'under 20', moderate: '20 to 35', high: '35 to 60', critical: '60 and over' };
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
function RiskScoreMeaning({ colors }) {
  const g = GLOSSARY.riskScore;
  return (
    <>
      <span style={{ display: 'block', ...eyebrow }}>{g.name}</span>
      <span style={{ display: 'block', fontSize: TYPE.strong, fontWeight: 700, lineHeight: 1.45, marginTop: 6 }}>{g.what}</span>
      <span style={{ display: 'block', ...small, fontWeight: 700, marginTop: 9, color: 'var(--text)' }}>Each person has a level, from their phishing record:</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 5 }}>
        {LEVELS.map((k) => (
          <span key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: TYPE.small, lineHeight: 1.35 }}>
            <span aria-hidden style={{ flexShrink: 0, width: 7, height: 7, borderRadius: 2, background: colors[k], transform: 'translateY(-1px)' }} />
            <span><strong>{TIER_WORD[k]}</strong> <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{lower(TIER_RULE[k])}</span></span>
          </span>
        ))}
      </span>
      <span style={{ display: 'block', ...small, marginTop: 8, paddingTop: 7, borderTop: '1px solid var(--hair)', lineHeight: 1.45 }}>{g.how}</span>
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 6, fontSize: TYPE.small, fontWeight: 700 }}>
        {LEVELS.map((k) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span aria-hidden style={{ width: 7, height: 7, borderRadius: 2, background: colors[k] }} />{TIER_WORD[k]} <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{RANGE[k]}</span></span>)}
      </span>
    </>
  );
}

/** A measure from the glossary: its name, what it tells you, and how it is worked out; for an Explain. */
export function Definition({ term, children }) {
  const { isDark } = useUserType() || {};
  const g = GLOSSARY[term];
  if (!g) return null;
  if (term === 'riskScore') return <><RiskScoreMeaning colors={tierInk(Boolean(isDark))} />{children}</>;
  return (
    <>
      <span style={{ display: 'block', ...eyebrow }}>{g.name}</span>
      <span style={{ display: 'block', fontSize: TYPE.strong, fontWeight: 700, lineHeight: 1.45, marginTop: 6 }}>{g.what}</span>
      <span style={{ display: 'block', ...small, lineHeight: 1.45, marginTop: 7, paddingTop: 7, borderTop: '1px solid var(--hair)' }}>{g.how}</span>
      {children}
    </>
  );
}

/** The ⓘ beside a measure's name, opening its definition. */
export function Define({ term, onDark }) {
  const g = GLOSSARY[term];
  if (!g) return null;
  return <Explain label={`What ${g.name} means`} onDark={onDark}><Definition term={term} /></Explain>;
}

/** What the Risk Score means and how it is worked out (the same as its card's ⓘ), then where it stands now; for an Explain. */
export function RiskHow({ score, days, colors }) {
  const { isDark } = useUserType() || {};
  return (
    <>
      <RiskScoreMeaning colors={colors || tierInk(Boolean(isDark))} />
      {Number.isFinite(score) && <span style={{ display: 'block', ...small, marginTop: 6 }}>Now {score.toFixed(1)}; the chip beside it is the change over the last {days} days.</span>}
    </>
  );
}

// ------------------------------------------------- fitting any window

const pagerBtn = (off) => ({ width: 22, height: 22, padding: 0, display: 'grid', placeItems: 'center', borderRadius: 7, border: '1px solid var(--hair)', background: 'var(--ghost)', color: 'var(--text)', cursor: off ? 'default' : 'pointer', opacity: off ? 0.35 : 1 });

/** A slim "1–6 of 16" with back and next, under a list that pages. */
export function MiniPager({ at, pages, total, per, onAt, what = 'rows' }) {
  const from = at * per + 1; const to = Math.min(total, (at + 1) * per);
  const go = (e, k) => { e.stopPropagation(); onAt(k); };
  return (
    <div data-ins-pager style={{ flexShrink: 0, height: 24, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, ...small }}>
      <span style={{ whiteSpace: 'nowrap' }}><strong style={{ color: 'var(--text)' }}>{from}–{to}</strong> of {total} {what}</span>
      <span style={{ display: 'flex', gap: 4 }}>
        <button type="button" aria-label={`Previous ${what}`} disabled={at === 0} onClick={(e) => go(e, at - 1)} style={pagerBtn(at === 0)}><ChevronLeft size={12} strokeWidth={2.6} aria-hidden /></button>
        <button type="button" aria-label={`Next ${what}`} disabled={at >= pages - 1} onClick={(e) => go(e, at + 1)} style={pagerBtn(at >= pages - 1)}><ChevronRight size={12} strokeWidth={2.6} aria-hidden /></button>
      </span>
    </div>
  );
}

/**
 * A list that shows as many rows of `rowH` as fit its card, a page at a
 * time, so it never scrolls; `cols` side by side. `render(item, k)` draws a
 * row, `k` its place on the page.
 */
export function FitList({ items, rowH, render, cols = 1, what = 'rows', style }) {
  const [fit, size] = useFitRows(rowH, 1, 0);
  const [page, setPage] = useState(0);
  const per = size * cols;
  const pages = Math.max(1, Math.ceil(items.length / per));
  const at = Math.min(page, pages - 1);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div ref={fit} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', ...style }}>
        {items.slice(at * per, at * per + per).map((x, k) => render(x, k))}
      </div>
      {pages > 1 && <MiniPager at={at} pages={pages} total={items.length} per={per} onAt={setPage} what={what} />}
    </div>
  );
}

// a card's name, for saying what is on another page of charts
const nameOf = (el) => {
  const t = el.props.title ?? el.props['aria-label'];
  return typeof t === 'string' ? t : null;
};

/**
 * A view's cards on twelve columns, in rows that share its height. A card's
 * row comes from its `span`s. When the height leaves a row less than
 * `minRow`, the rows take turns, one at a time with a switch under them
 * that names the cards on the other page, so the page never scrolls.
 */
export function RowsGrid({ children, minRow = 180, gap = 14, sizes, ...rest }) {
  const [box, { h }] = useSize();
  const [page, setPage] = useState(0);
  const say = useId();
  let used = 0; let row = 0;
  const kids = Children.toArray(children).filter(isValidElement).map((c) => {
    const span = Number(/span (\d+)/.exec(c.props.style?.gridColumn || '')?.[1] || 12);
    if (used + span > 12) { row += 1; used = 0; }
    used += span;
    return cloneElement(c, { 'data-row': row });
  });
  const rows = row + 1;
  const paged = rows > 1 && h > 0 && (h - gap * (rows - 1)) / rows < minRow;
  const at = Math.min(page, rows - 1);
  const go = (k) => setPage(Math.max(0, Math.min(rows - 1, k)));
  // the other page named: the next one, or from the last, the one before
  const other = at < rows - 1 ? at + 1 : at - 1;
  const names = paged ? kids.filter((k) => k.props['data-row'] === other).map(nameOf).filter(Boolean).join(' · ') : '';
  return (
    <div ref={box} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div {...rest} data-ins-paged={paged ? at : undefined} style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: paged ? 'minmax(0,1fr)' : (sizes || Array(rows).fill('minmax(0,1fr)')).join(' '), gap }}>
        {paged ? kids.filter((k) => k.props['data-row'] === at) : kids}
      </div>
      {paged && (
        <div data-ins-rows-switch style={{ flexShrink: 0, height: 24, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...small }}>
          <button type="button" aria-label="Previous charts" aria-describedby={other < at ? say : undefined} disabled={at === 0} onClick={() => go(at - 1)} style={pagerBtn(at === 0)}><ChevronLeft size={12} strokeWidth={2.6} aria-hidden /></button>
          {Array.from({ length: rows }, (_, k) => <button key={k} type="button" aria-label={`Charts ${k + 1} of ${rows}`} aria-current={k === at ? 'true' : undefined} onClick={() => go(k)} style={{ width: k === at ? 18 : 7, height: 7, padding: 0, border: 'none', borderRadius: 999, background: k === at ? 'var(--brand)' : 'var(--hair-strong)', cursor: 'pointer', transition: 'width .2s ease' }} />)}
          <button type="button" aria-label="Next charts" aria-describedby={other > at ? say : undefined} disabled={at >= rows - 1} onClick={() => go(at + 1)} style={pagerBtn(at >= rows - 1)}><ChevronRight size={12} strokeWidth={2.6} aria-hidden /></button>
          {names && (
            <span id={say} data-ins-rows-next onClick={() => go(other)} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>
              {other > at ? 'Next' : 'Before'}: <strong style={{ color: 'var(--text)', fontWeight: 700 }}>{names}</strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
