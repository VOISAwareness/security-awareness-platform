import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, ArrowUpRight, BarChart3, ChevronRight, Grid3x3, ScatterChart } from 'lucide-react';

import { deptCode } from '../../GlobalComponents/deptCodes';
import { Pager } from '../Leaderboard/BigPictureTables';
import { TONE_ART } from '../Leaderboard/bigPictureArt';
import CampaignMegaphone from '../../assets/LeaderboardAssets/CampaignMegaphone.png';
import { Blocks, Card, CompareBars, GoTo, Legend, PillColumns, RingGauge, Segmented, Staircase, TileMap } from './InsightsCharts';
import { Define, Heads, HealthChip, InlineBar, LureIcon, LureTile, MiniPager, RowsGrid } from './InsightsBits';
import { GLOSSARY } from '../../services/glossary';
import { useSize } from './useSize';
import { DEPT_CHARTS, deptOrder, deptRows } from '../../services/deptCharts';
import { useFitRows } from '../Leaderboard/useFitRows';
import { EASE, HEAD_H, HEALTH_WORD, SPANS, STEADY_INK, TIER_WORD, TINT, cardTitle, change, day, didParts, eyebrow, healthInk, heads, lureShort, num, pc, pc1, riskBands, small, tierInk, tierOf, times, TYPE } from './insightsUi';

// Insights' views, one per tab:
//   - Overview: one card for each question a leader asks. Are we safer
//     (risk over the year)? Where is the risk (the department map, what
//     fools us)? When phishing lands, do people raise the alarm (what people
//     do)? Is training paying off? What changed?
//   - Departments: one chart at a time (Ranking, Movement, Reporting,
//     Weak spots) beside a panel of one department's charts;
//   - Lures & campaigns: every kind of lure, then every campaign.
// Each card, tile and column opens its profile, most of them by growing
// into it.

const scoreText = (v, tick) => (Number.isFinite(v) ? (tick ? `${Math.round(v)}` : v.toFixed(1)) : '—');
const pts = (c) => c && { ...c, shown: c.shown.replace('×', ' pts').replace(' min', '') };

// a clay piece on its tone's wash, for the rows of what changed
function ToneArt({ tone, isDark }) {
  const tint = (isDark ? TINT.dark : TINT.light)[tone];
  return (
    <span aria-hidden style={{ width: 36, height: 36, borderRadius: 999, display: 'grid', placeItems: 'center', background: tint.wash, border: `1px solid ${tint.edge}` }}>
      <img src={TONE_ART[tone]} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
    </span>
  );
}

// ------------------------------------------------------------- overview

export function OverviewView({ ctx, list }) {
  const { m, p, ink, isDark, reduce, open, go } = ctx;
  const bands = riskBands(isDark);
  const dc = pts(change(p.now.score, p.before?.score, { kind: 'times', better: 'down' }));
  const c = p.now.cohorts;
  const n = m.now;
  // the phishing card sits with the others, washed in its health's colour:
  // emerald while Protected, amber while Holding or Exposed
  const spot = (isDark ? TINT.dark : TINT.light)[n.health?.word === 'Protected' ? 'good' : 'bad'];
  const [span, setSpan] = useState(12);
  const shownTrend = p.trend.slice(-span);
  return (
    <RowsGrid data-ins-overview minRow={200} sizes={['minmax(0,1.08fr)', 'minmax(0,1fr)']}>
      {/* are we safer? */}
      <Card i={0} reduce={reduce} title="Risk Score over time" define="riskScore" action={<Segmented id="ins-range-ov" label="Time span" value={span} options={SPANS} onChange={setSpan} reduce={reduce} />} layoutId="ins-risk" onOpen={() => open('risk', null, 'ins-risk')} openLabel="Explore" style={{ gridColumn: 'span 5' }} data-ins-risk>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
          <Staircase at={shownTrend.map((s) => s.to)} values={shownTrend.map((s) => s.score)} lit={shownTrend.map((s) => s.inPeriod)} start={ink.neutral} good={ink.good} bad={ink.bad} format={scoreText} reduce={reduce} tipHead={(t) => `Thirty days to ${day(t)}`} />
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <Legend items={[{ label: 'Fell', color: ink.good }, { label: 'Rose', color: ink.bad }]} />
          <span style={{ marginLeft: 'auto', ...small }}>{dc ? <>Last {p.basis.days} days: <strong style={{ color: 'var(--text)' }}>{dc.dir === 'down' ? 'down' : dc.dir === 'up' ? 'up' : 'steady'}{dc.dir === 'flat' ? '' : ` ${dc.shown}`}</strong></> : null}</span>
        </div>
      </Card>

      {/* where is the risk? */}
      <Card i={1} reduce={reduce} title="Risk by department" sub="Size is headcount" onOpen={() => go('departments')} openLabel="All" style={{ gridColumn: 'span 4' }} data-ins-map>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 10 }}>
          <TileMap
            items={p.departments.map((d) => ({ key: d.name, label: d.name, short: deptCode(d.name), weight: d.people, value: d.score, text: scoreText(d.score) }))}
            fill={(t) => bands.fill(t.value)}
            ink={(t) => bands.ink(t.value)}
            reduce={reduce}
            layoutIdOf={(t) => `dept-${t.key}`}
            onOpen={(name) => open('department', name, `dept-${name}`)}
            tip={(t) => { const d = p.departments.find((x) => x.name === t.key); return [d.name, `Risk Score ${scoreText(d.score)} · ${num(d.highRisk)} at high risk`, `${num(d.people)} people · open its profile`]; }}
          />
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, ...small }}>
          {bands.tiers.map((t, k) => <span key={t.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: t.color }} /><strong style={{ color: 'var(--text)', fontWeight: 700 }}>{TIER_WORD[t.key]}</strong>{['under 20', '20–35', '35–60', '60+'][k]}</span>)}
        </div>
      </Card>

      {/* when phishing lands */}
      <motion.section
        data-ins-spot
        aria-label="When phishing lands"
        initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduce ? 0.01 : 0.6, delay: reduce ? 0 : 0.14, ease: EASE }}
        style={{ gridColumn: 'span 3', position: 'relative', minWidth: 0, minHeight: 0, containerType: 'size', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '14px 16px 12px', borderRadius: 18, color: 'var(--text)', border: `1px solid ${spot.edge}`, background: spot.wash }}
      >
        <header style={{ position: 'relative', flexShrink: 0, height: HEAD_H, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={cardTitle}>{GLOSSARY.perClick.name}</span>
          <Define term="perClick" />
          <button type="button" className="ins-cta" data-ins-spot-open onClick={() => go('campaigns')} style={{ marginLeft: 'auto', height: 26, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 10px 0 12px', borderRadius: 999, border: 'none', background: 'var(--brand)', color: '#FFFFFF', boxShadow: '0 6px 16px rgba(230,0,0,0.22)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            See campaigns <ArrowUpRight size={12} strokeWidth={2.6} aria-hidden />
          </button>
        </header>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <span className="vs-rank ins-big" title={`${num(n.reported)} reported ÷ ${num(n.clicked)} clicked`} style={{ display: 'block', fontSize: TYPE.display, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em' }}>{times(n.perClick)}</span>
          <img className="ins-float ins-optional" src={CampaignMegaphone} alt="" aria-hidden width={60} height={60} style={{ marginLeft: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 8px 12px rgba(15,23,42,0.18))' }} />
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 10 }}>
          <Blocks parts={didParts(n, ink, isDark)} reduce={reduce} height={28} legendCols={2} />
        </div>
      </motion.section>

      {/* what fools us */}
      <Card i={3} reduce={reduce} title="Hook Rate by campaign type" define="hookRate" onOpen={() => go('campaigns')} openLabel="All" style={{ gridColumn: 'span 4' }} data-ins-lures>
        <PillColumns
          items={m.lures.map((l) => ({ key: l.type, label: lureShort(l.type), value: l.hooked, text: pc(l.hooked), tip: [l.type, `Hook Rate ${pc1(l.hooked)} · gave details ${pc(l.gaveOfClicks)} of clicks`, `Reported ${pc(l.reportRate)} · ${GLOSSARY.perClick.name} ${times(l.perClick)}`] }))}
          color={ink.bad}
          soft="var(--soft-bad)"
          reduce={reduce}
          onOpen={(type) => open('lure', type)}
          label="clicked. Open its profile"
        />
      </Card>

      {/* what changed */}
      <Card i={4} reduce={reduce} title="What changed" style={{ gridColumn: 'span 5' }} data-ins-changes>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 6 }}>
          {list.slice(0, 5).map((f, k) => (
            <motion.button
              key={f.id}
              type="button"
              className="ins-find ins-in-x"
              data-ins-finding={f.id}
              onClick={(e) => { e.stopPropagation(); open(f.view, f.view === 'risk' || f.view === 'training' ? null : f.focus); }}
              style={{ '--d': `${0.15 + 0.04 * k}s`, flex: '1 1 0', minHeight: 0, maxHeight: 56, display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) auto 14px', alignItems: 'center', gap: 11, padding: '0 8px', margin: '0 -8px', border: 'none', borderTop: k ? '1px solid var(--hair)' : '1px solid transparent', borderRadius: 12, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
            >
              <ToneArt tone={f.tone} isDark={isDark} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: TYPE.strong, fontWeight: 800, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</span>
                <span style={{ display: 'block', ...small, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.sub}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 999, background: f.tone === 'good' ? 'var(--good-soft)' : f.tone === 'bad' ? 'var(--bad-soft)' : 'var(--chip)', fontSize: TYPE.small, fontWeight: 800, whiteSpace: 'nowrap' }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: f.tone === 'good' ? ink.good : f.tone === 'bad' ? ink.bad : 'var(--muted)' }} />{f.chip}
              </span>
              <ChevronRight className="ins-arrow" size={14} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
            </motion.button>
          ))}
        </div>
      </Card>

      {/* is training paying off? */}
      <Card i={5} reduce={reduce} title={GLOSSARY.trainingImpact.name} define="trainingImpact" layoutId="ins-training" onOpen={() => open('training', null, 'ins-training')} openLabel="Explore" style={{ gridColumn: 'span 3' }} data-ins-training>
        {c && (
          <>
            <span className="vs-rank" style={{ display: 'block', marginTop: 10, fontSize: TYPE.hero, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>{c.times ? `${c.times.toFixed(1)}×` : '—'}</span>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 8 }}>
              <CompareBars rows={[{ key: 'un', label: 'Not yet trained', value: c.untrainedRate, color: ink.bad, text: pc(c.untrainedRate) }, { key: 'tr', label: 'Completed training', value: c.trainedRate, color: ink.good, text: pc(c.trainedRate) }]} reduce={reduce} height={24} />
            </div>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <RingGauge value={c.trainedShare * 100} size={36} stroke={4} color={ink.good} reduce={reduce} label={`${pc(c.trainedShare)} trained`} />
              <span style={{ ...small }}><strong style={{ color: 'var(--text)' }}>{pc(c.trainedShare)}</strong> of people have completed their training</span>
            </div>
          </>
        )}
      </Card>
    </RowsGrid>
  );
}

// ---------------------------------------------------------- departments

// The Departments tab shows one chart at a time (services/deptCharts.js):
// Ranking, Movement, Reporting and Weak spots. Each fills the sheet, and
// switching slides every department's row and dot to its place in the next
// chart. Beside it, a panel of small charts for one department: the one
// pointed at, else the first in the chart's order. It shows; it never says
// what to make of it. A click opens the department's profile. Rows page to
// fit a short window, so nothing scrolls.
const CHART = {
  ranking: { define: 'riskScore', sub: () => 'Risk Score now, riskiest first' },
  movement: { define: 'riskChange', sub: (days) => `Risk Score ${days} days ago and now, the most improved first` },
  reporting: { define: 'reportedVsClicked', sub: () => 'Each dot a department: Hook Rate across, Report Rate up' },
  spots: { define: 'hookRate', sub: () => 'Hook Rate for each campaign type, riskiest department first' },
};
const CHART_ICON = { ranking: BarChart3, movement: ArrowLeftRight, reporting: ScatterChart, spots: Grid3x3 };
const DQ_ROW = 22;
const DQ_COLS = 'minmax(0,180px) minmax(0,1fr) 64px';
const MOVE = { type: 'tween', duration: 0.5, ease: EASE };
const one = (v) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const moved = (v) => (!Number.isFinite(v) ? '—' : Math.abs(v) < 0.05 ? 'steady' : `${v < 0 ? '▼' : '▲'} ${Math.abs(v).toFixed(1)}`);
const toneOfChange = (v, ink) => (!Number.isFinite(v) || Math.abs(v) < 0.05 ? STEADY_INK : v < 0 ? ink.good : ink.bad);
const nameCell = (on) => ({ minWidth: 0, fontSize: TYPE.body, fontWeight: on ? 800 : 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
const keyDot = (color, ring = false) => <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, boxSizing: 'border-box', background: ring ? 'transparent' : color, border: ring ? `1.5px solid ${color}` : 'none' }} />;
const TIER_RANGE = { low: 'under 20', moderate: '20–35', high: '35–60', critical: '60+' };
const SLIDE = 'left .5s cubic-bezier(.22,1,.36,1), width .5s cubic-bezier(.22,1,.36,1)';

// The rows that fit a box (its ref first), a page at a time: all of them
// until it is measured.
function usePage(total, page) {
  const [box, { h }] = useSize();
  const size = h > 0 ? Math.max(4, Math.floor(h / DQ_ROW)) : total;
  const pages = Math.max(1, Math.ceil(total / size));
  const at = Math.min(page, pages - 1);
  return [box, { size, pages, at, from: at * size, to: at * size + size }];
}

// The frame Ranking and Movement share: column names and an axis over the
// rows, grid lines and a reference line behind them, a key under them.
function DeptRowsFrame({ head, ticks, x, refAt, refDashed, refLabel, keys, list, page, onPage, children }) {
  const [box, pg] = usePage(list.length, page);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 10 }}>
      <div aria-hidden style={{ flexShrink: 0, height: 18, display: 'grid', gridTemplateColumns: DQ_COLS, gap: 14, padding: '0 8px', ...heads }}>
        <span>Department</span>
        <span style={{ position: 'relative' }}>
          {ticks.filter((t) => refLabel === null || Math.abs(x(t) - x(refAt)) > 9).map((t) => <span key={t} style={{ position: 'absolute', left: `${x(t)}%`, transform: 'translateX(-50%)', letterSpacing: 0, fontVariantNumeric: 'tabular-nums', transition: 'left .5s ease' }}>{t}</span>)}
          {refLabel !== null && <span style={{ position: 'absolute', left: `${x(refAt)}%`, transform: 'translateX(-50%)', letterSpacing: 0, color: 'var(--text)', whiteSpace: 'nowrap', transition: 'left .5s ease' }}>{refLabel}</span>}
        </span>
        <span style={{ textAlign: 'right' }}>{head}</span>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'grid', gridTemplateColumns: DQ_COLS, gap: 14, padding: '0 8px' }}>
          <span />
          <span style={{ position: 'relative' }}>
            {ticks.map((t) => <span key={t} style={{ position: 'absolute', top: 0, bottom: 0, left: `${x(t)}%`, width: 1, background: 'var(--grid)', transition: 'left .5s ease' }} />)}
            <span style={{ position: 'absolute', top: 0, bottom: 0, left: `${x(refAt)}%`, borderLeft: `1.5px ${refDashed ? 'dashed' : 'solid'} var(--text)`, opacity: 0.4, transition: SLIDE }} />
          </span>
          <span />
        </div>
        <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {list.slice(pg.from, pg.to).map(children)}
        </div>
      </div>
      <div style={{ flexShrink: 0, height: 22, display: 'flex', alignItems: 'end', gap: 12, padding: '0 8px', ...small, whiteSpace: 'nowrap', overflow: 'hidden' }}>{keys}</div>
      {pg.pages > 1 && <MiniPager at={pg.at} pages={pg.pages} total={list.length} per={pg.size} onAt={onPage} what="departments" />}
    </div>
  );
}

// One department's row in Ranking or Movement: its name, its marks, its number.
function DeptRow({ r, hover, onHover, open, reduce, label, value, valueInk, children }) {
  const on = hover === r.name;
  return (
    <motion.button
      key={r.name}
      type="button"
      layoutId={`dept-${r.name}`}
      transition={{ layout: reduce ? { duration: 0 } : MOVE }}
      data-ins-dept-row={r.name}
      onClick={() => open('department', r.name, `dept-${r.name}`)}
      onMouseEnter={() => onHover(r.name)}
      onFocus={() => onHover(r.name)}
      aria-label={label}
      style={{ flex: '1 1 0', minHeight: DQ_ROW, maxHeight: 34, display: 'grid', gridTemplateColumns: DQ_COLS, alignItems: 'center', gap: 14, padding: '0 8px', border: 'none', borderRadius: 8, background: on ? 'var(--track)' : 'transparent', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', opacity: hover && !on ? 0.55 : 1, transition: 'opacity .2s ease, background-color .15s ease' }}
    >
      <motion.span layoutId={`dq-name-${r.name}`} transition={{ layout: reduce ? { duration: 0 } : MOVE }} style={nameCell(on)}>{r.name}</motion.span>
      <span aria-hidden style={{ position: 'relative', height: 14 }}>{children}</span>
      <span className="vs-rank" style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 900, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: valueInk || 'var(--text)' }}>{value}</span>
    </motion.button>
  );
}

// Ranking: each department's Risk Score as a bar from 0, in its risk
// level's colour, against the company's score.
function DeptRanking({ rows, company, isDark, reduce, hover, onHover, open, page, onPage }) {
  const colors = tierInk(isDark);
  const list = deptOrder(rows, 'ranking');
  const top = Math.max(25, Math.ceil(Math.max(...rows.map((r) => r.score)) / 5) * 5);
  const x = (v) => (v / top) * 100;
  const ticks = Array.from({ length: top / 5 + 1 }, (_, k) => k * 5);
  const keys = (
    <>
      {['low', 'moderate', 'high', 'critical'].map((t) => <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{keyDot(colors[t])}{TIER_WORD[t]} {TIER_RANGE[t]}</span>)}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}><span aria-hidden style={{ width: 14, borderTop: '1.5px dashed var(--text)', opacity: 0.5 }} />The company</span>
    </>
  );
  return (
    <DeptRowsFrame head="Score" ticks={ticks} x={x} refAt={company} refDashed refLabel={`Company ${one(company)}`} keys={keys} list={list} page={page} onPage={onPage}>
      {(r, k) => {
        const c = colors[tierOf(r.score)];
        return (
          <DeptRow key={r.name} r={r} hover={hover} onHover={onHover} open={open} reduce={reduce} value={one(r.score)} label={`${r.name}: Risk Score ${one(r.score)}. Open its profile`}>
            <span className="ins-grow-x" style={{ '--d': `${Math.min(0.05 + 0.025 * k, 0.4)}s`, position: 'absolute', top: 1, height: 12, left: 0, width: `${x(r.score)}%`, borderRadius: 6, background: `linear-gradient(90deg, color-mix(in srgb, ${c} 45%, var(--base)), ${c})`, transformOrigin: 'left', transition: `${SLIDE}, background .3s ease` }} />
            <motion.span layoutId={`dq-dot-${r.name}`} transition={{ layout: reduce ? { duration: 0 } : MOVE }} style={{ position: 'absolute', top: 1, left: `${x(r.score)}%`, width: 12, height: 12, marginLeft: -12, borderRadius: 999, background: c, boxShadow: '0 0 0 2px var(--base)' }} />
          </DeptRow>
        );
      }}
    </DeptRowsFrame>
  );
}

// Movement: each department's Risk Score at the start of the period (a
// ring) and now (a dot), joined, on a scale close round them; the most
// improved first.
function DeptMovement({ rows, company, before, days, ink, reduce, hover, onHover, open, page, onPage }) {
  const list = deptOrder(rows, 'movement');
  const all = rows.flatMap((r) => [r.score, r.before ?? r.score]);
  const lo = Math.floor(Math.min(...all)) - 1; const hi = Math.ceil(Math.max(...all)) + 1;
  const step = hi - lo > 12 ? 4 : hi - lo > 6 ? 2 : 1;
  const from = Math.floor(lo / step) * step; const to = Math.ceil(hi / step) * step;
  const x = (v) => ((v - from) / (to - from || 1)) * 100;
  const ticks = Array.from({ length: (to - from) / step + 1 }, (_, k) => from + k * step);
  const keys = (
    <>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{keyDot(STEADY_INK, true)}{days} days ago</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{keyDot(ink.good)}Now, safer</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{keyDot(ink.bad)}Now, riskier</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}><span aria-hidden style={{ width: 14, borderTop: '1.5px dashed var(--text)', opacity: 0.5 }} />The company now{Number.isFinite(before) ? ` (${one(before)} ${days} days ago)` : ''}</span>
    </>
  );
  return (
    <DeptRowsFrame head="Change" ticks={ticks} x={x} refAt={company} refDashed refLabel={null} keys={keys} list={list} page={page} onPage={onPage}>
      {(r) => {
        const was = r.before ?? r.score;
        const c = toneOfChange(r.change, ink);
        const a = Math.min(was, r.score); const b = Math.max(was, r.score);
        return (
          <DeptRow key={r.name} r={r} hover={hover} onHover={onHover} open={open} reduce={reduce} value={moved(r.change)} valueInk={c} label={`${r.name}: Risk Score ${one(was)} ${days} days ago, ${one(r.score)} now. Open its profile`}>
            <span style={{ position: 'absolute', top: 5, height: 4, left: `${x(a)}%`, width: `${Math.max(0, x(b) - x(a))}%`, borderRadius: 999, background: c, opacity: 0.45, transition: SLIDE }} />
            <span style={{ position: 'absolute', top: 2, left: `${x(was)}%`, width: 10, height: 10, marginLeft: -5, borderRadius: 999, boxSizing: 'border-box', border: `2px solid ${STEADY_INK}`, background: 'var(--base)', transition: SLIDE }} />
            <motion.span layoutId={`dq-dot-${r.name}`} transition={{ layout: reduce ? { duration: 0 } : MOVE }} style={{ position: 'absolute', top: 1, left: `${x(r.score)}%`, width: 12, height: 12, marginLeft: -6, borderRadius: 999, background: c, boxShadow: '0 0 0 2px var(--base)' }} />
          </DeptRow>
        );
      }}
    </DeptRowsFrame>
  );
}

// Reports vs clicks: a dot per department at its Hook Rate (across) and
// Report Rate (up), on the same scale both ways, over the three healths:
// two or more reports for every click, at least one, fewer.
// Each dot's short name on the side with room: right, left, above or below,
// whichever first clears the names placed before it; none when no side does
// (the dot still shows its name when pointed at).
const LABEL_W = 30; const LABEL_H = 11;
function placeLabels(points) {
  const taken = [];
  const clash = (b) => taken.some((t) => b.x < t.x + t.w && t.x < b.x + b.w && b.y < t.y + t.h && t.y < b.y + b.h);
  // the dots themselves are taken too
  points.forEach((p) => taken.push({ x: p.x - 7, y: p.y - 7, w: 14, h: 14 }));
  const out = {};
  [...points].sort((a, b) => a.y - b.y || a.x - b.x).forEach((p) => {
    const sides = [
      ['right', { x: p.x + 9, y: p.y - LABEL_H / 2 }],
      ['left', { x: p.x - 9 - LABEL_W, y: p.y - LABEL_H / 2 }],
      ['above', { x: p.x - LABEL_W / 2, y: p.y - 9 - LABEL_H }],
      ['below', { x: p.x - LABEL_W / 2, y: p.y + 9 }],
    ];
    const free = sides.find(([, b]) => !clash({ ...b, w: LABEL_W, h: LABEL_H }));
    if (free) { taken.push({ ...free[1], w: LABEL_W, h: LABEL_H }); out[p.key] = free[0]; }
  });
  return out;
}
const LABEL_AT = {
  right: { left: 20, top: 6 },
  left: { right: 20, top: 6 },
  above: { left: '50%', bottom: 20, transform: 'translateX(-50%)' },
  below: { left: '50%', top: 20, transform: 'translateX(-50%)' },
};

function DeptScatter({ rows, ink, reduce, hover, onHover, open }) {
  const [plot, { w, h }] = useSize();
  const pts = rows.filter((r) => r.health && Number.isFinite(r.hooked) && Number.isFinite(r.reportRate));
  const top = Math.max(0.1, Math.ceil(Math.max(...pts.flatMap((r) => [r.hooked, r.reportRate])) * 1.1 * 20) / 20);
  const ticks = Array.from({ length: Math.round(top / 0.05) + 1 }, (_, k) => k * 0.05);
  const at = (v) => (v / top) * 100;
  const move = reduce ? { duration: 0 } : MOVE;
  // the zones, in a 100 × 100 box with "up" at 0
  const P = (pairs) => pairs.map(([a, b]) => `${a},${100 - b}`).join(' ');
  const zones = [
    { key: 'Exposed', points: P([[0, 0], [100, 0], [100, 100]]), color: ink.alert },
    { key: 'Holding', points: P([[0, 0], [100, 100], [50, 100]]), color: ink.bad },
    { key: 'Protected', points: P([[0, 0], [50, 100], [0, 100]]), color: ink.good },
  ];
  const zoneLabel = { ...heads, position: 'absolute', pointerEvents: 'none' };
  const sides = w > 0 ? placeLabels(pts.map((r) => ({ key: r.name, x: (at(r.hooked) / 100) * w, y: (1 - at(r.reportRate) / 100) * h }))) : {};
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 10 }}>
      <div ref={plot} style={{ position: 'relative', flex: 1, minHeight: 0, margin: '6px 10px 26px 40px' }}>
        <svg aria-hidden className="ins-fade" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          {zones.map((z) => <polygon key={z.key} points={z.points} fill={z.color} fillOpacity={0.07} />)}
          {ticks.map((t) => <line key={`x${t}`} x1={at(t)} x2={at(t)} y1={0} y2={100} stroke="var(--grid)" vectorEffect="non-scaling-stroke" />)}
          {ticks.map((t) => <line key={`y${t}`} x1={0} x2={100} y1={100 - at(t)} y2={100 - at(t)} stroke="var(--grid)" vectorEffect="non-scaling-stroke" />)}
          <line x1={0} y1={100} x2={100} y2={0} stroke="var(--text)" strokeOpacity={0.35} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          <line x1={0} y1={100} x2={50} y2={0} stroke="var(--text)" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="ins-fade" style={{ ...zoneLabel, left: 8, top: 6, color: ink.good }}>{HEALTH_WORD.Protected}</span>
        <span className="ins-fade" style={{ ...zoneLabel, left: '58%', top: 6, color: ink.bad }}>{HEALTH_WORD.Holding}</span>
        <span className="ins-fade" style={{ ...zoneLabel, right: 8, bottom: 8, color: ink.alert }}>{HEALTH_WORD.Exposed}</span>
        {ticks.map((t) => <span key={`tx${t}`} aria-hidden style={{ ...small, position: 'absolute', top: '100%', marginTop: 5, left: `${at(t)}%`, transform: 'translateX(-50%)', fontVariantNumeric: 'tabular-nums' }}>{pc(t)}</span>)}
        {ticks.map((t) => <span key={`ty${t}`} aria-hidden style={{ ...small, position: 'absolute', right: '100%', marginRight: 7, top: `${100 - at(t)}%`, transform: 'translateY(-50%)', fontVariantNumeric: 'tabular-nums' }}>{pc(t)}</span>)}
        {pts.map((r) => {
          const on = hover === r.name;
          const c = healthInk(r.health.word, ink);
          return (
            <button
              key={r.name}
              type="button"
              data-ins-dept-dot={r.name}
              onClick={() => open('department', r.name)}
              onMouseEnter={() => onHover(r.name)}
              onFocus={() => onHover(r.name)}
              aria-label={`${r.name}: ${pc1(r.hooked)} clicked, ${pc1(r.reportRate)} reported, ${HEALTH_WORD[r.health.word]}. Open its profile`}
              style={{ position: 'absolute', left: `${at(r.hooked)}%`, top: `${100 - at(r.reportRate)}%`, width: 24, height: 24, margin: '-12px 0 0 -12px', padding: 0, border: 'none', background: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: on ? 3 : 2, opacity: hover && !on ? 0.4 : 1, transition: 'opacity .2s ease' }}
            >
              <motion.span layoutId={`dq-dot-${r.name}`} transition={{ layout: move }} style={{ width: 12, height: 12, borderRadius: 999, background: c, boxShadow: on ? `0 0 0 2px var(--base), 0 0 0 5px ${c}55` : '0 0 0 2px var(--base)' }} />
              {(sides[r.name] || on) && <span className="ins-fade" style={{ '--d': '0.35s', position: 'absolute', ...LABEL_AT[sides[r.name] || 'right'], fontSize: TYPE.label, fontWeight: 800, lineHeight: 1, color: 'var(--text)', whiteSpace: 'nowrap', pointerEvents: 'none', padding: '1px 3px', borderRadius: 4, background: on ? 'var(--base)' : 'transparent' }}>{on ? r.name : deptCode(r.name)}</span>}
            </button>
          );
        })}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, ...small }}>
        <span style={{ fontWeight: 800, color: 'var(--text)' }}>↑ Report Rate · Hook Rate →</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden style={{ width: 16, borderTop: '1.5px dashed var(--text)', opacity: 0.5 }} />2 reports for every click</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden style={{ width: 16, borderTop: '1.5px solid var(--text)', opacity: 0.5 }} />as many reports as clicks</span>
      </div>
    </div>
  );
}

// What fools them: each department's Hook Rate for each campaign type, the
// riskiest department first; darker is more clicked. A type's heading opens it.
function DeptHeat({ rows, types, cells, ink, reduce, hover, onHover, open, page, onPage }) {
  const list = deptOrder(rows, 'risk');
  const [box, pg] = usePage(list.length, page);
  const all = list.flatMap((r) => types.map((t) => cells[r.name]?.[t]).filter(Boolean)).map((c) => c.hooked ?? 0);
  const hot = Math.max(...all, 0.01); const cool = Math.min(...all, hot);
  // from the coolest cell to the hottest, curved so the few that fool most stand out
  const heat = (v) => Math.round(6 + Math.pow((v - cool) / (hot - cool || 1), 1.6) * 84);
  const cols = `minmax(0,190px) repeat(${types.length}, minmax(0,1fr))`;
  const move = reduce ? { duration: 0 } : MOVE;
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 10 }}>
      <div role="row" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: cols, alignItems: 'end', gap: 6, padding: '0 8px 6px' }}>
        <span style={heads}>Department</span>
        {types.map((t) => (
          <button key={t} type="button" className="ins-crumb" data-ins-heat-type={t} title={`${t}: open its profile`} onClick={() => open('lure', t)} style={{ minWidth: 0, border: 'none', background: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: 'var(--muted)', cursor: 'pointer', ...heads, letterSpacing: 0 }}>
            <LureIcon type={t} size={13} strokeWidth={2.2} aria-hidden />
            <span style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lureShort(t)}</span>
          </button>
        ))}
      </div>
      <div ref={box} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {list.slice(pg.from, pg.to).map((r, k) => {
          const on = hover === r.name;
          return (
            <motion.button
              key={r.name}
              type="button"
              layoutId={`dept-${r.name}`}
              transition={{ layout: move }}
              data-ins-heat-row={r.name}
              onClick={() => open('department', r.name, `dept-${r.name}`)}
              onMouseEnter={() => onHover(r.name)}
              onFocus={() => onHover(r.name)}
              aria-label={`${r.name}: ${types.map((t) => `${t} ${cells[r.name]?.[t] ? pc(cells[r.name][t].hooked) : 'no emails'}`).join(', ')}. Open its profile`}
              style={{ flex: '1 1 0', minHeight: DQ_ROW, maxHeight: 34, display: 'grid', gridTemplateColumns: cols, alignItems: 'stretch', gap: 6, padding: '2px 8px', border: 'none', borderRadius: 8, background: on ? 'var(--track)' : 'transparent', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
            >
              <motion.span layoutId={`dq-name-${r.name}`} transition={{ layout: move }} style={{ ...nameCell(on), alignSelf: 'center' }}>{r.name}</motion.span>
              {types.map((t, j) => {
                const c = cells[r.name]?.[t];
                const cell = { borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: TYPE.small, fontWeight: 800, fontVariantNumeric: 'tabular-nums' };
                if (!c) return <span key={t} title={`${t}: no emails`} style={{ ...cell, background: 'var(--plate)', color: 'var(--muted)', fontWeight: 600 }}>—</span>;
                return <span key={t} className="ins-pop-in" title={`${r.name} · ${t}: ${num(c.clicked)} of ${num(c.recipients)} clicked`} style={{ ...cell, '--d': `${Math.min(0.05 + 0.02 * k + 0.03 * j, 0.5)}s`, background: `color-mix(in srgb, ${ink.bad} ${heat(c.hooked)}%, var(--base))`, color: 'var(--text)' }}>{pc(c.hooked)}</span>;
              })}
            </motion.button>
          );
        })}
      </div>
      <div style={{ flexShrink: 0, height: 22, display: 'flex', alignItems: 'end', gap: 8, padding: '0 8px', ...small }}>
        <span>Hook Rate</span>
        <span>{pc(cool)}</span>
        <span aria-hidden style={{ width: 90, height: 8, borderRadius: 999, background: `linear-gradient(90deg, color-mix(in srgb, ${ink.bad} 6%, var(--base)), color-mix(in srgb, ${ink.bad} 30%, var(--base)), ${ink.bad})`, alignSelf: 'center' }} />
        <span>{pc(hot)}</span>
        <span style={{ marginLeft: 'auto' }}>A type's name opens it</span>
      </div>
      {pg.pages > 1 && <MiniPager at={pg.at} pages={pg.pages} total={list.length} per={pg.size} onAt={onPage} what="departments" />}
    </div>
  );
}

// A small line of a department's Risk Score month by month against the
// company's (dashed), its newest point marked.
function MiniTrend({ values, base, color }) {
  const [box, { w, h }] = useSize();
  const all = [...values, ...base].filter(Number.isFinite);
  const lo = Math.floor(Math.min(...all)) - 1; const hi = Math.ceil(Math.max(...all)) + 1;
  const n = values.length;
  const px = (i) => (n > 1 ? 4 + (i / (n - 1)) * (w - 8) : w / 2);
  const py = (v) => 6 + (1 - (v - lo) / (hi - lo || 1)) * (h - 12);
  const line = (vs) => vs.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {w > 0 && h > 0 && n > 1 && (
        <svg width={w} height={h} role="img" aria-label={`Risk Score by month, from ${one(values[0])} to ${one(values.at(-1))}`} style={{ display: 'block', overflow: 'visible' }}>
          <path d={`${line(values)} L${px(n - 1)},${h} L${px(0)},${h} Z`} fill={color} fillOpacity={0.1} />
          <path d={line(base)} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="3 4" />
          <path d={line(values)} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={px(n - 1)} cy={py(values.at(-1))} r={4.5} fill={color} stroke="var(--base)" strokeWidth={2} />
        </svg>
      )}
    </div>
  );
}

// The department beside the chart: its Risk Score month by month against
// the company's, its people by risk level, and its Hook Rate and Report Rate
// against the company's. Numbers and marks only.
function DeptSpot({ row, pointed, at, companyTrend, company, isDark, ink, reduce, open }) {
  const colors = tierInk(isDark);
  const tone = colors[tierOf(row.score)];
  const months = Math.min(12, row.trend.length);
  const all = ['low', 'moderate', 'high', 'critical'].reduce((a, t) => a + (row.tiers[t] || 0), 0) || 1;
  const rate = (label, mine, theirs, color) => (
    <span style={{ display: 'grid', gridTemplateColumns: '74px minmax(0,1fr) 42px', alignItems: 'center', columnGap: 8, rowGap: 3 }}>
      <span style={{ ...small, fontWeight: 800, color: 'var(--text)' }}>{label}</span>
      <span style={{ height: 8, borderRadius: 999, background: 'var(--plate)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${Math.min(1, (mine ?? 0) / Math.max(mine ?? 0, theirs ?? 0, 0.01)) * 100}%`, borderRadius: 999, background: color, transition: 'width .4s ease' }} /></span>
      <span className="vs-rank" style={{ textAlign: 'right', fontSize: TYPE.body, fontWeight: 900 }}>{pc1(mine)}</span>
      <span style={{ ...small }}>Company</span>
      <span style={{ height: 8, borderRadius: 999, background: 'var(--plate)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${Math.min(1, (theirs ?? 0) / Math.max(mine ?? 0, theirs ?? 0, 0.01)) * 100}%`, borderRadius: 999, background: STEADY_INK, transition: 'width .4s ease' }} /></span>
      <span style={{ ...small, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pc1(theirs)}</span>
    </span>
  );
  return (
    <Card
      i={1}
      reduce={reduce}
      title={row.name}
      sub={`${num(row.people)} people${pointed ? '' : ' · point at another'}`}
      action={<GoTo label="Open" onClick={(e) => { e.stopPropagation(); open('department', row.name); }} data-ins-spot-open-dept />}
      style={{ gridColumn: 'span 3' }}
      data-ins-dept-spot={row.name}
    >
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ ...eyebrow }}>Risk Score</span>
          <span className="vs-rank" style={{ marginLeft: 'auto', fontSize: TYPE.number, fontWeight: 900, lineHeight: 1, color: 'var(--text)' }}>{one(row.score)}</span>
          <span className="vs-rank" style={{ fontSize: TYPE.small, fontWeight: 800, color: toneOfChange(row.change, ink) }}>{moved(row.change)}</span>
        </span>
        <div style={{ flex: 1, minHeight: 56, display: 'flex', flexDirection: 'column' }}>
          <MiniTrend values={row.trend.slice(-months)} base={companyTrend.slice(-months)} color={tone} />
          <span style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', marginTop: 4, ...small, fontSize: TYPE.label }}>
            <span>{day(at.at(-months))}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span aria-hidden style={{ width: 12, borderTop: '1.5px dashed var(--muted)' }} />Company {one(company)}</span>
            <span>{day(at.at(-1))}</span>
          </span>
        </div>
        <span className="ins-optional" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ ...eyebrow }}>People by risk level</span>
          <span aria-hidden style={{ display: 'flex', gap: 2, height: 10 }}>
            {['low', 'moderate', 'high', 'critical'].map((t) => <span key={t} style={{ flex: `${row.tiers[t] || 0} 1 0`, minWidth: 3, borderRadius: 3, background: colors[t], transition: 'flex-grow .4s ease' }} />)}
          </span>
          <span style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 4 }}>
            {['low', 'moderate', 'high', 'critical'].map((t) => (
              <span key={t} style={{ minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, ...small, fontSize: TYPE.label, whiteSpace: 'nowrap' }}>{keyDot(colors[t])}{TIER_WORD[t]}</span>
                <span className="vs-rank" style={{ display: 'block', fontSize: TYPE.body, fontWeight: 900, marginTop: 2 }}>{pc((row.tiers[t] || 0) / all)}</span>
              </span>
            ))}
          </span>
        </span>
        <span className="ins-optional-tall" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '1px solid var(--hair)' }}>
          {rate('Hook Rate', row.hooked, companyRates(row).hooked, ink.bad)}
          {rate('Report Rate', row.reportRate, companyRates(row).reportRate, ink.good)}
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HealthChip h={row.health} ink={ink} />
            <span style={{ ...small, marginLeft: 'auto' }}>{GLOSSARY.perClick.name} <strong className="vs-rank" style={{ color: 'var(--text)' }}>{times(row.perClick)}</strong></span>
          </span>
        </span>
      </div>
    </Card>
  );
}
// the company's rates, carried on each row by the view
const companyRates = (row) => row.company || { hooked: null, reportRate: null };

export function DepartmentsView({ ctx }) {
  const { m, p, ink, isDark, reduce, open, view, onView } = ctx;
  const [hover, setHover] = useState(null);
  const chart = CHART[view.deptChart] ? view.deptChart : 'ranking';
  const company = { hooked: m.now.hooked, reportRate: m.now.reportRate };
  const rows = deptRows(m, p).map((r) => ({ ...r, company }));
  const types = m.lures.map((l) => l.type);
  const cells = Object.fromEntries(Object.entries(m.deptLures).map(([name, list]) => [name, Object.fromEntries(list.map((x) => [x.type, x]))]));
  const shared = { rows, ink, isDark, reduce, hover, onHover: setHover, open, page: view.deptPage || 0, onPage: (pg) => onView({ deptPage: pg }) };
  const pointed = rows.find((r) => r.name === hover);
  const spot = pointed || deptOrder(rows, chart)[0];
  const options = DEPT_CHARTS.map((c) => ({ ...c, Icon: CHART_ICON[c.id] }));
  return (
    <div data-ins-depts-view style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: 'minmax(0,1fr)', gap: 14 }}>
      <Card
        i={0}
        reduce={reduce}
        title="Departments"
        define={CHART[chart].define}
        sub={CHART[chart].sub(m.basis.days)}
        action={<Segmented id="ins-dq" label="Chart" value={chart} options={options} onChange={(id) => { setHover(null); onView({ deptChart: id, deptPage: 0 }); }} reduce={reduce} />}
        style={{ gridColumn: 'span 9' }}
        onMouseLeave={() => setHover(null)}
        data-ins-dq-card
      >
        {chart === 'ranking' ? <DeptRanking {...shared} company={p.now.score} />
          : chart === 'movement' ? <DeptMovement {...shared} company={p.now.score} before={p.before?.score} days={m.basis.days} />
            : chart === 'reporting' ? <DeptScatter {...shared} />
              : <DeptHeat {...shared} types={types} cells={cells} />}
      </Card>
      {spot && <DeptSpot row={spot} pointed={Boolean(pointed)} at={p.trend.map((s) => s.to)} companyTrend={p.trend.map((s) => s.score)} company={p.now.score} isDark={isDark} ink={ink} reduce={reduce} open={open} />}
    </div>
  );
}

// ---------------------------------------------------- lures & campaigns

// Lures & campaigns: the lures ranked by click rate on the left (a click
// keeps only that lure's campaigns, its arrow opens its profile), and every
// campaign as a row on the right, sorted as chosen and paged to fit; each
// row grows into its campaign.
const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'clicked', label: 'Most clicked' },
  { id: 'reported', label: 'Most reported' },
  { id: 'health', label: 'Health' },
];
const HEALTH_RANK = { Exposed: 0, Holding: 1, Protected: 2 };
const LURE_COLS = '26px minmax(0,1fr) minmax(0,1.1fr) 56px 60px 14px';
const CAMP_COLS = '26px minmax(0,2.1fr) 54px minmax(0,1.2fr) minmax(0,1.2fr) 72px 56px 112px 12px';
const ROW_H = 40;

export function CampaignsView({ ctx }) {
  const { m, ink, isDark, reduce, open, view, onView } = ctx;
  const sort = view.sort || 'newest';
  const lure = view.lure || null;
  const shownLure = m.lures.find((l) => l.type === lure);
  const [fit, size] = useFitRows(ROW_H, 4, 0);
  const list = m.campaigns.filter((c) => !lure || c.type === lure);
  const by = {
    newest: () => 0,
    clicked: (a, b) => (b.hooked ?? 0) - (a.hooked ?? 0),
    reported: (a, b) => (b.reportRate ?? 0) - (a.reportRate ?? 0),
    health: (a, b) => (HEALTH_RANK[a.health?.word] ?? 1) - (HEALTH_RANK[b.health?.word] ?? 1) || (b.hooked ?? 0) - (a.hooked ?? 0),
  }[sort];
  const rows = [...list].sort(by);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(view.page || 0, pages - 1);
  const maxHook = Math.max(...m.campaigns.map((c) => c.hooked || 0), 0.01);
  const maxRep = Math.max(...m.campaigns.map((c) => c.reportRate || 0), 0.01);
  const maxLure = Math.max(...m.lures.map((l) => l.hooked || 0), 0.01);
  return (
    <div data-ins-camps-view style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gap: 14 }}>
      <Card i={0} reduce={reduce} title="Hook Rate by campaign type" define="hookRate" sub={lure ? 'Showing one type · click it again for all' : 'Pick one to see only its campaigns'} style={{ gridColumn: 'span 4' }} data-ins-lure-rank>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          <Heads cols={LURE_COLS} pad={8}><span /><span>Campaign type</span><span>Hook Rate</span><span style={{ textAlign: 'right', whiteSpace: 'normal', lineHeight: 1.15 }}>{GLOSSARY.perClick.name}</span><span style={{ textAlign: 'right' }}>Campaigns</span><span /></Heads>
          {m.lures.map((l, k) => {
            const on = lure === l.type;
            return (
              <div
                key={l.type}
                role="button"
                tabIndex={0}
                className="ins-row ins-in-x"
                data-ins-lure={l.type}
                aria-pressed={on}
                aria-label={`${l.type}: ${pc1(l.hooked)} clicked. ${on ? 'Show every campaign type' : 'Show only its campaigns'}`}
                onClick={() => onView({ lure: on ? null : l.type, page: 0 })}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onView({ lure: on ? null : l.type, page: 0 }); } }}
                style={{ '--d': `${0.08 + 0.03 * k}s`, flex: '1 1 0', minHeight: 30, maxHeight: ROW_H, display: 'grid', gridTemplateColumns: LURE_COLS, alignItems: 'center', gap: 14, padding: '0 8px', borderTop: k ? '1px solid var(--hair)' : 'none', borderRadius: 10, background: on ? 'var(--plate)' : 'none', boxShadow: on ? 'inset 3px 0 0 var(--brand)' : 'none', cursor: 'pointer', outline: 'none' }}
              >
                <LureTile type={l.type} size={24} />
                <span style={{ minWidth: 0, fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.type}</span>
                <InlineBar value={l.hooked} max={maxLure} color={k === 0 ? ink.bad : 'var(--soft-bad)'} label={pc1(l.hooked)} grow={false} />
                <span className="vs-rank" style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 900 }}>{times(l.perClick)}</span>
                <span className="vs-rank" style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 900 }}>{l.campaigns}</span>
                <button type="button" aria-label={`Open ${l.type}`} data-ins-lure-open={l.type} onClick={(e) => { e.stopPropagation(); open('lure', l.type); }} style={{ width: 14, height: 24, padding: 0, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><ChevronRight size={13} strokeWidth={2.4} aria-hidden /></button>
              </div>
            );
          })}
          <div className="ins-optional-tall" style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
            <span style={{ ...cardTitle, fontSize: TYPE.strong, marginBottom: 10 }}>What people did{lure ? ` · ${lureShort(lure)}` : ''}</span>
            <Blocks key={lure || 'all'} parts={didParts(shownLure || m.now, ink, isDark)} reduce={reduce} height={24} legendCols={2} />
          </div>
        </div>
      </Card>

      <Card i={1} reduce={reduce} title={lure ? `Campaigns · ${lure}` : 'Campaigns'} action={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{lure && <button type="button" onClick={() => onView({ lure: null, page: 0 })} className="ins-go" style={{ height: 26, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 10px', borderRadius: 999, border: '1px solid var(--card-edge)', background: 'var(--ghost)', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer' }}>{lure} ✕</button>}<Segmented id="ins-camp-sort" label="Sort campaigns" value={sort} options={SORTS} onChange={(id) => onView({ sort: id, page: 0 })} reduce={reduce} /></span>} style={{ gridColumn: 'span 8' }} data-ins-camp-table>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          <Heads cols={CAMP_COLS} pad={8}><span /><span>Campaign</span><span style={{ textAlign: 'right' }}>Emails</span><span>Hook Rate</span><span>Report Rate</span><span style={{ textAlign: 'right', whiteSpace: 'normal', lineHeight: 1.15 }}>Gave details away</span><span style={{ textAlign: 'right', whiteSpace: 'normal', lineHeight: 1.15 }}>{GLOSSARY.perClick.name}</span><span style={{ textAlign: 'right' }}>Health</span><span /></Heads>
          <div ref={fit} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {rows.slice(page * size, page * size + size).map((c, k) => (
              <motion.button
                key={c.id}
                type="button"
                layoutId={`camp-${c.id}`}
                className="ins-row ins-in-x"
                data-ins-campaign={c.id}
                onClick={() => open('campaign', c.id, `camp-${c.id}`)}
                aria-label={`${c.name}: ${pc1(c.hooked)} clicked, ${pc1(c.reportRate)} reported. Open the campaign`}
                style={{ '--d': `${Math.min(0.06 + 0.02 * k, 0.3)}s`, flexShrink: 0, height: ROW_H, display: 'grid', gridTemplateColumns: CAMP_COLS, alignItems: 'center', gap: 14, padding: '0 8px', border: 'none', borderTop: k ? '1px solid var(--hair)' : 'none', borderRadius: 10, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
              >
                <LureTile type={c.type} size={24} />
                <span title={`Started ${day(c.started)}`} style={{ minWidth: 0, fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                <span className="vs-rank" style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{num(c.delivered)}</span>
                <InlineBar value={c.hooked} max={maxHook} color={ink.bad} label={pc1(c.hooked)} grow={false} />
                <InlineBar value={c.reportRate} max={maxRep} color={ink.good} label={pc1(c.reportRate)} grow={false} />
                <span className="vs-rank" style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{pc1(c.delivered ? c.compromised / c.delivered : null)}</span>
                <span className="vs-rank" style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{times(c.perClick)}</span>
                <span style={{ display: 'flex', justifyContent: 'flex-end' }}><HealthChip h={c.health} ink={ink} /></span>
                <ChevronRight className="ins-arrow" size={13} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
              </motion.button>
            ))}
          </div>
          <Pager page={page} pages={pages} total={rows.length} size={size} onPage={(pg) => onView({ page: pg })} what="campaigns" />
        </div>
      </Card>
    </div>
  );
}
