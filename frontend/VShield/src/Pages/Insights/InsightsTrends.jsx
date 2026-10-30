import { useState } from 'react';

import { Tip } from './InsightsCharts';
import { useSize } from './useSize';
import { TYPE, alpha } from './insightsUi';

// The Summary's charts, thirty days at a time. One frame draws them all to
// their card: a value axis on round ticks, the months along the bottom,
// shaded zones (a target's stretch of the axis), dashed target lines, and
// either lines (each optionally coloured by the zone it is in) or columns
// (each coloured by where it stands). Labels that would sit on the marks go
// in a margin on the right. Hover a month for its figures.

const month = (t) => new Date(t).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
const ok = (v) => v !== null && v !== undefined && Number.isFinite(v);
const tick = { fontSize: TYPE.label, fontWeight: 600, fill: 'var(--muted)', fontVariantNumeric: 'tabular-nums' };

/**
 * points:  [{ to, ... }] oldest first
 * lo, hi, ticks, tickText: the value axis
 * zones:   [{ from, to, color }] shaded stretches of the axis
 * targets: [{ v, color, label, below }] dashed lines, labelled at the left
 * lines:   [{ key, color, split, name, text, end }] a line per key; `split`
 *          ({ at, below, above }) colours each stretch by its side of `at`;
 *          `end` labels the newest value and `name` in the right margin
 * columns: { key, colorOf, text } a column per point, its value above it
 * between: { top, under, lead, trail } shade between two lines: `lead` where
 *          `top` is above `under`, `trail` where it is below
 * side:    [{ v, text, color, sub }] labels in the right margin at a value
 * peak:    { key, color, text } names the highest point
 * tag:     { key, text } the newest value on a dark tag beside it
 * step:    draw the lines as steps
 * right:   the right margin's width
 * tip:     (point) => { head, rows: [{ label, value, color }] }
 */
export function Trend({ points, lo, hi, ticks, tickText, zones = [], targets = [], lines = [], columns = null, between = null, side = [], peak = null, tag = null, step = false, right = 76, tip, label }) {
  const [box, { w, h }] = useSize();
  const [at, setAt] = useState(null);
  const n = points.length;
  const L = 30; const T = 12; const B = 18;
  const iw = Math.max(0, w - L - right); const ih = Math.max(0, h - T - B);
  const X = columns ? (i) => L + (iw * (i + 0.5)) / n : (i) => L + (n > 1 ? (iw * i) / (n - 1) : iw / 2);
  const Y = (v) => T + ih * (1 - (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo));
  const ready = w > 0 && h > 0 && n > 0;
  const shown = at === null ? null : tip?.(points[at]);
  const top = at === null ? 0 : Math.min(...[...lines.map((l) => points[at][l.key]), columns ? points[at][columns.key] : null].filter(ok).map(Y), Y(hi));

  // a line, in stretches between points that have a value; with `split`, each
  // stretch in the colour of its side of the cut (split where it crosses)
  const lineMarks = (l) => {
    const out = [];
    for (let i = 0; i < n - 1; i += 1) {
      const a = points[i][l.key]; const b = points[i + 1][l.key];
      if (!ok(a) || !ok(b)) continue;
      const x0 = X(i); const x1 = X(i + 1);
      const colorOf = (v) => (l.split ? (v <= l.split.at ? l.split.below : l.split.above) : l.color);
      if (step) {
        out.push(<path key={`${l.key}${i}`} d={`M${x0},${Y(a)} H${x1} V${Y(b)}`} fill="none" stroke={l.color} strokeWidth={2.2} strokeLinejoin="round" />);
      } else if (l.split && (a <= l.split.at) !== (b <= l.split.at)) {
        const t = (l.split.at - a) / (b - a); const xm = x0 + (x1 - x0) * t;
        out.push(<line key={`${l.key}${i}a`} x1={x0} y1={Y(a)} x2={xm} y2={Y(l.split.at)} stroke={colorOf(a)} strokeWidth={2.6} strokeLinecap="round" />);
        out.push(<line key={`${l.key}${i}b`} x1={xm} y1={Y(l.split.at)} x2={x1} y2={Y(b)} stroke={colorOf(b)} strokeWidth={2.6} strokeLinecap="round" />);
      } else {
        out.push(<line key={`${l.key}${i}`} x1={x0} y1={Y(a)} x2={x1} y2={Y(b)} stroke={colorOf(a)} strokeWidth={2.6} strokeLinecap="round" />);
      }
    }
    points.forEach((p, i) => {
      const v = p[l.key];
      if (!ok(v)) return;
      const last = i === n - 1;
      if (!l.dots && !last && at !== i) return;
      const c = l.split ? (v <= l.split.at ? l.split.below : l.split.above) : l.color;
      out.push(<circle key={`${l.key}d${i}`} cx={X(i)} cy={Y(v)} r={last || at === i ? 4.5 : 3} fill={c} stroke="var(--base)" strokeWidth={2} />);
    });
    return out;
  };

  // shade between two lines, green where one leads and red where it trails,
  // split where they cross
  const betweenMarks = () => {
    const out = [];
    for (let i = 0; i < n - 1; i += 1) {
      const a0 = points[i][between.top]; const a1 = points[i + 1][between.top];
      const b0 = points[i][between.under]; const b1 = points[i + 1][between.under];
      if (![a0, a1, b0, b1].every(ok)) continue;
      const d0 = a0 - b0; const d1 = a1 - b1; const fill = (d) => (d >= 0 ? between.lead : between.trail);
      if (d0 * d1 >= 0) {
        out.push(<polygon key={i} points={`${X(i)},${Y(a0)} ${X(i + 1)},${Y(a1)} ${X(i + 1)},${Y(b1)} ${X(i)},${Y(b0)}`} fill={alpha(fill(d0 + d1), 0.14)} />);
      } else {
        const t = d0 / (d0 - d1); const xm = X(i) + (X(i + 1) - X(i)) * t; const ym = Y(a0 + (a1 - a0) * t);
        out.push(<polygon key={`${i}a`} points={`${X(i)},${Y(a0)} ${xm},${ym} ${X(i)},${Y(b0)}`} fill={alpha(fill(d0), 0.14)} />);
        out.push(<polygon key={`${i}b`} points={`${xm},${ym} ${X(i + 1)},${Y(a1)} ${X(i + 1)},${Y(b1)}`} fill={alpha(fill(d1), 0.14)} />);
      }
    }
    return out;
  };

  const bw = columns ? Math.max(6, Math.min(26, (iw / Math.max(1, n)) * 0.55)) : 0;
  const pk = peak ? points.reduce((best, p, i) => (ok(p[peak.key]) && (best < 0 || p[peak.key] > points[best][peak.key]) ? i : best), -1) : -1;
  const last = points[n - 1];

  return (
    <div ref={box} onMouseLeave={() => setAt(null)} style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, marginTop: 8 }}>
      {ready && (
        <svg role="img" aria-label={label} width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
          {zones.map((z) => <rect key={`${z.from}-${z.to}`} x={L} y={Y(z.to)} width={iw} height={Math.max(0, Y(z.from) - Y(z.to))} fill={alpha(z.color, 0.1)} />)}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={L + iw} y1={Y(t)} y2={Y(t)} stroke="var(--grid)" />
              <text x={L - 7} y={Y(t) + 3} textAnchor="end" style={tick}>{tickText(t)}</text>
            </g>
          ))}
          {targets.map((t) => (
            <g key={t.label}>
              <line x1={L} x2={L + iw} y1={Y(t.v)} y2={Y(t.v)} stroke={t.color} strokeWidth={1.4} strokeDasharray="5 4" />
              <text x={L + 6} y={Y(t.v) + (t.below ? 11 : -5)} style={{ fontSize: TYPE.label, fontWeight: 800, fill: t.color }}>{t.label}</text>
            </g>
          ))}
          {between && betweenMarks()}
          {at !== null && !columns && <line x1={X(at)} x2={X(at)} y1={T} y2={T + ih} stroke="var(--hair-strong)" strokeDasharray="3 3" />}
          {columns && points.map((p, i) => {
            const v = p[columns.key];
            if (!ok(v)) return null;
            return (
              <g key={p.to} opacity={at === null || at === i ? 1 : 0.55}>
                <rect x={X(i) - bw / 2} y={Y(v)} width={bw} height={Math.max(0, Y(lo) - Y(v))} rx={Math.min(5, bw / 3)} fill={columns.colorOf(v)} />
                <text x={X(i)} y={Y(v) - 5} textAnchor="middle" style={{ ...tick, fill: 'var(--text)', fontWeight: i === n - 1 ? 900 : 700 }}>{columns.text(v)}</text>
              </g>
            );
          })}
          {lines.map(lineMarks)}
          {pk >= 0 && <text x={X(pk)} y={Y(points[pk][peak.key]) - 9} textAnchor="middle" style={{ fontSize: TYPE.label, fontWeight: 800, fill: peak.color }}>{peak.text(points[pk][peak.key])}</text>}
          {tag && ok(last[tag.key]) && (
            <g>
              <rect x={X(n - 1) + 9} y={Y(last[tag.key]) - 9} width={40} height={18} rx={9} fill="var(--text)" />
              <text x={X(n - 1) + 29} y={Y(last[tag.key]) + 3.5} textAnchor="middle" style={{ fontSize: TYPE.small, fontWeight: 900, fill: 'var(--base)' }}>{tag.text(last[tag.key])}</text>
            </g>
          )}
          {lines.filter((l) => l.end && ok(last[l.key])).map((l) => (
            <g key={`end-${l.key}`}>
              <text x={X(n - 1) + 9} y={Y(last[l.key]) + 3 + (l.dy || 0)} style={{ fontSize: TYPE.body, fontWeight: 900, fill: 'var(--text)' }}>{l.text(last[l.key])}</text>
              <text x={X(n - 1) + 9} y={Y(last[l.key]) + 14 + (l.dy || 0)} style={{ fontSize: TYPE.label, fontWeight: 700, fill: l.color }}>{l.name}</text>
            </g>
          ))}
          {side.map((s) => (
            <g key={s.text}>
              <text x={L + iw + (columns ? 8 : 12)} y={Y(s.v) + 3} style={{ fontSize: TYPE.label, fontWeight: 800, fill: s.color, letterSpacing: s.caps ? '0.06em' : 0 }}>{s.text}</text>
              {s.sub && <text x={L + iw + (columns ? 8 : 12)} y={Y(s.v) + 14} style={{ ...tick }}>{s.sub}</text>}
            </g>
          ))}
          {points.map((p, i) => <text key={p.to} x={X(i)} y={h - 3} textAnchor="middle" style={{ ...tick, fill: i === n - 1 ? 'var(--text)' : 'var(--muted)', fontWeight: i === n - 1 ? 800 : 600 }}>{month(p.to)}</text>)}
          {/* each month's hover strip, inside the plot */}
          {points.map((p, i) => {
            const half = columns ? iw / n / 2 : n > 1 ? iw / (n - 1) / 2 : iw / 2;
            const x0 = Math.max(L, X(i) - half);
            return <rect key={`hit-${p.to}`} x={x0} y={T} width={Math.max(0, Math.min(L + iw, X(i) + half) - x0)} height={ih} fill="transparent" onMouseEnter={() => setAt(i)} />;
          })}
        </svg>
      )}
      {ready && shown && (
        <Tip x={X(at)} y={top} w={w} edge={8}>
          <div style={{ fontSize: TYPE.body, fontWeight: 800, color: 'var(--text)' }}>{shown.head}</div>
          {shown.rows.map((r) => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, fontSize: TYPE.body, fontWeight: 600 }}>
              {r.color && <span aria-hidden style={{ flexShrink: 0, width: 10, height: 3, borderRadius: 2, background: r.color }} />}
              <span>{r.label}</span>
              <strong className="vs-rank" style={{ marginLeft: 'auto', paddingLeft: 14, fontWeight: 900 }}>{r.value}</strong>
            </div>
          ))}
        </Tip>
      )}
    </div>
  );
}

/** Two groups' rates as bars on one scale, the value at the end of each, and the gap between them in a line under. */
export function GroupBars({ rows, max, text, gap }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, marginTop: 6 }}>
      {rows.map((r) => (
        <div key={r.label} data-ins-group={r.label} title={`${r.label}: ${text(r.value)} clicked`} style={{ display: 'grid', gridTemplateColumns: '96px minmax(0,1fr) 54px', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: TYPE.strong, fontWeight: 800, color: 'var(--text)' }}>{r.label}</span>
          <span aria-hidden style={{ height: 20, borderRadius: 8, background: 'var(--track)', overflow: 'hidden' }}>
            <span className="ins-grow-x" style={{ display: 'block', height: '100%', width: `${ok(r.value) ? Math.min(100, (r.value / max) * 100) : 0}%`, borderRadius: 8, background: r.color, transformOrigin: 'left' }} />
          </span>
          <span className="vs-rank" style={{ fontSize: TYPE.figure, fontWeight: 900, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{text(r.value)}</span>
        </div>
      ))}
      {gap && <div style={{ paddingTop: 10, borderTop: '1px solid var(--hair)', fontSize: TYPE.strong, fontWeight: 700, color: 'var(--text)' }}>{gap}</div>}
    </div>
  );
}
