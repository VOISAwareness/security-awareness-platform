import { createElement, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { Chip } from '../Leaderboard/BigPictureTables';
import { EASE, HEALTH_RULE, STEADY_INK, healthInk, heads, lureIcon, pc, small } from './insightsUi';

// Small pieces Insights' views and profiles share: a change on a chip, a
// health chip, a lure's icon tile, a thin labelled bar, column names, and a
// number that counts to its new value.

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
        <motion.span initial={{ width: reduce ? w : 0 }} animate={{ width: w }} transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : delay, ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 999, background: color }} />
      </span>
    </span>
  );
}

/** Column names over a list, lined up with its rows. */
export function Heads({ cols, children, pad = 13 }) {
  return <div role="row" style={{ flexShrink: 0, height: 28, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 14, padding: `0 ${pad}px`, borderBottom: '1px solid var(--hair)', ...heads }}>{children}</div>;
}

// A number that counts to its new value when the period changes.
function useTween(target, reduce, ms = 700) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    if (reduce || !Number.isFinite(target)) return undefined;
    const from = Number.isFinite(cur.current) ? cur.current : target;
    const start = performance.now();
    let raf = 0;
    const step = (t) => {
      const k = Math.min(1, (t - start) / ms);
      const x = from + (target - from) * (1 - (1 - k) ** 4);
      cur.current = x;
      setV(x);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce, ms]);
  return reduce || !Number.isFinite(target) ? target : v;
}
/** `format(value)`, counting from the last value shown. */
export function Count({ value, format, reduce }) {
  return format(useTween(value, reduce));
}
