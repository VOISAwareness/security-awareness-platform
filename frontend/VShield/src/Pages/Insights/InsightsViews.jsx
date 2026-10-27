import { Fragment, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, BarChart3, Building2, ChevronRight, GraduationCap, Grid3x3, Scale, ScatterChart, TextCursorInput, Users } from 'lucide-react';

import { Pager } from '../Leaderboard/BigPictureTables';
import CampaignMegaphone from '../../assets/LeaderboardAssets/CampaignMegaphone.png';
import { Blocks, Card, CompareBars, GoTo, Legend, RingGauge, Segmented, Staircase, TileMap, Tip } from './InsightsCharts';
import { Define, HealthChip, InlineBar, LureIcon, LureTile, MiniPager, RowsGrid } from './InsightsBits';
import { GLOSSARY, TYPE_WORD } from '../../services/glossary';
import { useSize } from './useSize';
import { DEPT_CHARTS, deptOrder, deptRows } from '../../services/deptCharts';
import { useFitRows } from '../Leaderboard/useFitRows';
import { EASE, HEALTH_WORD, SPANS, TIER_WORD, TINT, cardTitle, change, day, didParts, eyebrow, healthInk, healthTone, heads, num, pc1, riskBands, small, themeVars, tierInk, tierOf, times, TYPE } from './insightsUi';

// Insights' views, one per tab:
//   - Overview: one card for each question a leader asks. Are we safer
//     (risk over the year)? Where is the risk (the department map, the
//     campaign types)? When phishing lands, what do people do? Is training
//     paying off? What changed over the period?
//   - Departments: one chart at a time (Ranking, Movement, Reporting,
//     Weak spots) beside a panel of one department's charts;
//   - Campaigns: every campaign type, then every campaign.
// Each card, tile and column opens its profile, most of them by growing
// into it. They show what happened; they never say what to make of it.
// Colour goes on marks by what it means (insightsUi.js); text wears the
// text inks.

const scoreText = (v, tick) => (Number.isFinite(v) ? (tick ? `${Math.round(v)}` : v.toFixed(1)) : '—');
const pts = (c) => c && { ...c, shown: c.shown.replace('×', ' pts').replace(' min', '') };
const dot = (color, size = 8) => <span aria-hidden style={{ flexShrink: 0, width: size, height: size, borderRadius: 999, background: color }} />;

// A tooltip's body: a head, then each figure's name and value.
function TipBody({ head, rows }) {
  return (
    <>
      <div style={{ fontSize: TYPE.body, fontWeight: 800, color: 'var(--text)' }}>{head}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 16, rowGap: 3, marginTop: 6 }}>
        {rows.filter(Boolean).map(([k, v]) => (
          <Fragment key={k}>
            <span style={{ ...small, whiteSpace: 'nowrap' }}>{k}</span>
            <span className="vs-rank" style={{ fontSize: TYPE.small, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'var(--text)' }}>{v}</span>
          </Fragment>
        ))}
      </div>
    </>
  );
}

// A campaign type's figures, for its tooltip. "Gave details away" is a
// share of the emails delivered, the base of the Hook Rate and Report Rate.
const lureTip = (l) => [
  ['Hook Rate', pc1(l.hooked)],
  ['Report Rate', pc1(l.reportRate)],
  [GLOSSARY.gaveDetails.name, pc1(l.delivered ? l.compromised / l.delivered : null)],
  [GLOSSARY.perClick.name, times(l.perClick)],
  ['Campaigns', num(l.campaigns)],
  ['Emails delivered', num(l.delivered)],
];

// ------------------------------------------------------------- overview

// Hook Rate by campaign type: one bar from zero per type, the highest
// first, each in the colour of a click with its value at its end, against
// the company's Hook Rate (a dashed line). Full names; a long one wraps.
// Hover or focus a type for its figures; a click opens it.
function LureBars({ lures, company, ink, onOpen }) {
  const [box, { w }] = useSize();
  const [hover, setHover] = useState(null);
  const top = Math.max(...lures.map((l) => l.hooked || 0), company || 0, 0.001) * 1.1;
  const x = (v) => `${Math.max(0, Math.min(1, (v || 0) / top)) * 100}%`;
  const cols = '18px minmax(0,1.25fr) minmax(0,1fr) 48px';
  const shown = lures.find((l) => l.type === hover?.type);
  const show = (l) => (e) => setHover({ type: l.type, y: e.currentTarget.offsetTop, below: e.currentTarget.offsetTop < 40 });
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }} onMouseLeave={() => setHover(null)}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* the company's Hook Rate, behind the bars */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: cols, columnGap: 10, padding: '0 6px', pointerEvents: 'none' }}>
          <span /><span />
          <span style={{ position: 'relative' }}><span style={{ position: 'absolute', top: 2, bottom: 2, left: x(company), borderLeft: '1.5px dashed var(--muted)', opacity: 0.8 }} /></span>
          <span />
        </div>
        {lures.map((l, k) => (
          <button
            key={l.type}
            type="button"
            className="ins-row ins-in-x"
            data-ins-col={l.type}
            aria-label={`${l.type}: Hook Rate ${pc1(l.hooked)}. Open its profile`}
            onClick={(e) => { e.stopPropagation(); onOpen(l.type); }}
            onMouseEnter={show(l)}
            onFocus={show(l)}
            onBlur={() => setHover(null)}
            style={{ '--d': `${0.08 + 0.03 * k}s`, position: 'relative', flex: '1 1 0', minHeight: 0, maxHeight: 44, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', columnGap: 10, padding: '0 6px', border: 'none', borderRadius: 8, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', outline: hover?.type === l.type ? '1.5px solid var(--hair-strong)' : 'none', outlineOffset: -1 }}
          >
            <LureIcon type={l.type} size={14} strokeWidth={2.3} aria-hidden style={{ color: 'var(--muted)' }} />
            <span style={{ minWidth: 0, fontSize: TYPE.body, fontWeight: 800, lineHeight: 1.15 }}>{l.type}</span>
            <span aria-hidden style={{ position: 'relative', height: 10, borderRadius: 999, background: 'var(--track)' }}>
              <span className="ins-grow-x" style={{ '--d': `${0.1 + 0.03 * k}s`, position: 'absolute', left: 0, top: 0, bottom: 0, width: x(l.hooked), borderRadius: 999, background: ink.bad, transformOrigin: 'left', transition: 'width .5s ease' }} />
            </span>
            <span className="vs-rank" style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{pc1(l.hooked)}</span>
          </button>
        ))}
      </div>
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: cols, columnGap: 10, padding: '0 6px', marginTop: 4, ...small }}>
        <span /><span />
        <span style={{ position: 'relative', height: 14 }}>
          <span style={{ position: 'absolute', left: x(company), transform: `translateX(${(company || 0) / top > 0.6 ? '-100%' : '-50%'})`, display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
            <span aria-hidden style={{ width: 12, borderTop: '1.5px dashed var(--muted)' }} />Company <strong style={{ color: 'var(--text)' }}>{pc1(company)}</strong>
          </span>
        </span>
        <span />
      </div>
      {shown && w > 0 && (
        <Tip x={w * 0.62} y={hover.y + (hover.below ? 40 : 0)} w={w} edge={4} below={hover.below}>
          <TipBody head={shown.type} rows={lureTip(shown)} />
        </Tip>
      )}
    </div>
  );
}

// What changed: each row a measure, where, its value before and after, and
// the change between them on a chip. A plain icon names the kind of
// measure; the chip's dot says safer (good) or riskier (bad). As many rows
// as fit.
const CHANGE_ICON = { riskRose: Building2, riskFell: Building2, highRisk: Users, gave: TextCursorInput, perClick: Scale, lift: GraduationCap };
function ChangeList({ list, ink, onOpen }) {
  const [box, { h }] = useSize();
  const fit = h > 0 ? Math.max(3, Math.floor(h / 36)) : 5;
  return (
    <div ref={box} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 6 }}>
      {list.slice(0, fit).map((f, k) => {
        const Icon = CHANGE_ICON[f.id] || Scale;
        return (
          <button
            key={f.id}
            type="button"
            className="ins-find ins-in-x"
            data-ins-finding={f.id}
            aria-label={`${f.title}, ${f.where}: ${f.before} before, ${f.after} after, ${f.chip}. Open it`}
            onClick={(e) => { e.stopPropagation(); onOpen(f); }}
            style={{ '--d': `${0.15 + 0.04 * k}s`, flex: '1 1 0', minHeight: 0, maxHeight: 54, display: 'grid', gridTemplateColumns: '28px minmax(0,1fr) auto 14px', alignItems: 'center', columnGap: 11, padding: '0 8px', margin: '0 -8px', border: 'none', borderTop: k ? '1px solid var(--hair)' : '1px solid transparent', borderRadius: 12, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
          >
            <span aria-hidden style={{ width: 28, height: 28, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--plate)', color: 'var(--muted)' }}><Icon size={14} strokeWidth={2.3} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: TYPE.strong, fontWeight: 800, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</span>
              <span style={{ display: 'block', ...small, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'tabular-nums' }}>
                {f.where} · {f.before} → <strong style={{ color: 'var(--text)', fontWeight: 800 }}>{f.after}</strong>
              </span>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 999, background: f.tone === 'good' ? 'var(--good-soft)' : 'var(--bad-soft)', fontSize: TYPE.small, fontWeight: 800, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              {dot(f.tone === 'good' ? ink.good : ink.bad, 6)}{f.chip}
            </span>
            <ChevronRight className="ins-arrow" size={14} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
          </button>
        );
      })}
    </div>
  );
}

export function OverviewView({ ctx, list }) {
  const { m, p, ink, isDark, reduce, open, go } = ctx;
  const bands = riskBands(isDark);
  const days = m.basis.days;
  const dc = pts(change(p.now.score, p.before?.score, { kind: 'times', better: 'down' }));
  const c = p.now.cohorts;
  const n = m.now;
  // the card on what people did wears the period's health, as the corner
  // tile does: green while Protected, amber while Holding, red while Not protected
  const tints = isDark ? TINT.dark : TINT.light;
  const spot = tints[healthTone(n.health?.word)] || tints.neutral;
  const [span, setSpan] = useState(12);
  const shownTrend = p.trend.slice(-span);
  const openChange = (f) => (f.view === 'campaigns' ? go('campaigns') : open(f.view, f.view === 'department' ? f.focus : null));
  return (
    <RowsGrid data-ins-overview minRow={200} sizes={['minmax(0,1.08fr)', 'minmax(0,1fr)']}>
      {/* are we safer? */}
      <Card i={0} reduce={reduce} title="Risk Score over time" define="riskScore" action={<Segmented id="ins-range-ov" label="Time span" value={span} options={SPANS} onChange={setSpan} reduce={reduce} />} layoutId="ins-risk" onOpen={() => open('risk', null, 'ins-risk')} openLabel="Explore" style={{ gridColumn: 'span 5' }} data-ins-risk>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
          <Staircase at={shownTrend.map((s) => s.to)} values={shownTrend.map((s) => s.score)} lit={shownTrend.map((s) => s.inPeriod)} start={ink.context} good={ink.good} bad={ink.bad} format={scoreText} reduce={reduce} tipHead={(t) => `30 days to ${day(t)}`} valueLabel="Risk Score" />
        </div>
        {/* the line's two colours: the period's stretch says its one change (on the chart's chip) */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <Legend items={[{ label: `Last ${days} days${dc && dc.good !== null ? (dc.good ? ', safer' : ', riskier') : ''}`, color: dc?.good === null || !dc ? ink.context : dc.good ? ink.good : ink.bad, line: true }, { label: 'Before', color: ink.context, line: true }]} />
        </div>
      </Card>

      {/* where is the risk? */}
      <Card i={1} reduce={reduce} title="Risk by department" sub="Risk Score now · tile size: people" onOpen={() => go('departments')} openLabel="All" style={{ gridColumn: 'span 4' }} data-ins-map>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 10 }}>
          <TileMap
            items={p.departments.map((d) => ({ key: d.name, label: d.name, weight: d.people, value: d.score, text: scoreText(d.score) }))}
            fill={(t) => bands.fill(t.value)}
            ink={(t) => bands.ink(t.value)}
            reduce={reduce}
            layoutIdOf={(t) => `dept-${t.key}`}
            onOpen={(name) => open('department', name, `dept-${name}`)}
            tip={(t) => { const d = p.departments.find((x) => x.name === t.key); return [d.name, `Risk Score ${scoreText(d.score)} now · ${TIER_WORD[tierOf(d.score)]}`, `${num(d.highRisk)} people at high risk of ${num(d.people)}`]; }}
          />
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, ...small }}>
          {bands.tiers.map((t, k) => <span key={t.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: t.color }} /><strong style={{ color: 'var(--text)', fontWeight: 700 }}>{TIER_WORD[t.key]}</strong>{['under 20', '20–35', '35–60', '60+'][k]}</span>)}
        </div>
      </Card>

      {/* when phishing lands, what do people do? */}
      <Card i={2} reduce={reduce} title={GLOSSARY.outcomes.name} define="outcomes" sub={`Last ${days} days`} onOpen={() => go('campaigns')} openLabel="Campaigns" style={{ gridColumn: 'span 3', border: `1px solid ${spot.edge}`, background: spot.wash }} data-ins-spot>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <span style={{ minWidth: 0 }}>
            <span className="vs-rank ins-big" title={`${num(n.reported)} reported ÷ ${num(n.clicked)} clicked`} style={{ display: 'block', fontSize: TYPE.display, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em' }}>{times(n.perClick)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}><span style={eyebrow}>{GLOSSARY.perClick.name}</span><Define term="perClick" /></span>
          </span>
          <img className="ins-float ins-optional" src={CampaignMegaphone} alt="" aria-hidden width={60} height={60} style={{ marginLeft: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 8px 12px rgba(15,23,42,0.18))' }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 10 }}>
          <Blocks parts={didParts(n, ink)} reduce={reduce} height="clamp(24px, 10cqh, 52px)" legendCols={2} />
        </div>
      </Card>

      {/* which campaign types fool people? */}
      <Card i={3} reduce={reduce} title="Hook Rate by campaign type" define="hookRate" sub={`Last ${days} days`} onOpen={() => go('campaigns')} openLabel="All" style={{ gridColumn: 'span 4' }} data-ins-lures>
        <LureBars lures={m.lures} company={n.hooked} ink={ink} onOpen={(type) => open('lure', type)} />
      </Card>

      {/* what changed? */}
      <Card i={4} reduce={reduce} title="What changed" sub={`Last ${days} days · before → after`} style={{ gridColumn: 'span 5' }} data-ins-changes>
        <ChangeList list={list} ink={ink} onOpen={openChange} />
      </Card>

      {/* is training paying off? */}
      <Card i={5} reduce={reduce} title={GLOSSARY.trainingImpact.name} define="trainingImpact" sub="Now · Hook Rate by training" layoutId="ins-training" onOpen={() => open('training', null, 'ins-training')} openLabel="Explore" style={{ gridColumn: 'span 3' }} data-ins-training>
        {c && (
          <>
            <span className="vs-rank" style={{ display: 'block', marginTop: 10, fontSize: TYPE.hero, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>{c.times ? `${c.times.toFixed(1)}×` : '—'}</span>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 8 }}>
              {/* both bars are Hook Rates, so both wear the colour of a click; the trained one a lighter step of it */}
              <CompareBars rows={[{ key: 'un', label: 'Not yet trained', value: c.untrainedRate, color: ink.bad, text: pc1(c.untrainedRate) }, { key: 'tr', label: 'Completed training', value: c.trainedRate, color: `color-mix(in srgb, ${ink.bad} 55%, var(--base))`, text: pc1(c.trainedRate) }]} reduce={reduce} height="clamp(22px, 8cqh, 38px)" />
            </div>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <RingGauge value={c.trainedShare * 100} size={36} stroke={4} color={ink.measure} reduce={reduce} label={`${pc1(c.trainedShare)} of people trained`} />
              <span style={{ ...small }}>Trained <strong style={{ color: 'var(--text)' }}>{pc1(c.trainedShare)}</strong> of people</span>
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
  ranking: { define: 'riskScore', sub: () => 'Risk Score now, highest first' },
  movement: { define: 'riskChange', sub: (days) => `Risk Score ${days} days ago and now, largest fall first` },
  reporting: { define: 'reportedVsClicked', sub: (days) => `Reports vs clicks, last ${days} days: each dot a department` },
  spots: { define: 'hookRate', sub: (days) => `Hook Rate by campaign type, last ${days} days: highest Risk Score first` },
};
const CHART_ICON = { ranking: BarChart3, movement: ArrowLeftRight, reporting: ScatterChart, spots: Grid3x3 };
const DQ_ROW = 22;
const DQ_COLS = 'minmax(0,180px) minmax(0,1fr) 64px';
const MOVE_COLS = 'minmax(0,180px) minmax(0,1fr) 112px';
const MOVE = { type: 'tween', duration: 0.5, ease: EASE };
const one = (v) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const moved = (v) => (!Number.isFinite(v) ? '—' : Math.abs(v) < 0.05 ? 'no change' : `${v < 0 ? '▼' : '▲'} ${Math.abs(v).toFixed(1)} pts`);
const toneOfChange = (v, ink) => (!Number.isFinite(v) || Math.abs(v) < 0.05 ? ink.context : v < 0 ? ink.good : ink.bad);
const nameCell = (on) => ({ minWidth: 0, fontSize: TYPE.body, fontWeight: on ? 800 : 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
const keyDot = (color, ring = false) => <span aria-hidden style={{ flexShrink: 0, width: 8, height: 8, borderRadius: 999, boxSizing: 'border-box', background: ring ? 'transparent' : color, border: ring ? `1.5px solid ${color}` : 'none' }} />;
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
function DeptRowsFrame({ head, ticks, x, refAt, refDashed, refLabel, keys, list, page, onPage, cols = DQ_COLS, children }) {
  const [box, pg] = usePage(list.length, page);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 10 }}>
      <div aria-hidden style={{ flexShrink: 0, height: 18, display: 'grid', gridTemplateColumns: cols, gap: 14, padding: '0 8px', ...heads }}>
        <span>Department</span>
        <span style={{ position: 'relative' }}>
          {ticks.filter((t) => refLabel === null || Math.abs(x(t) - x(refAt)) > 9).map((t) => <span key={t} style={{ position: 'absolute', left: `${x(t)}%`, transform: 'translateX(-50%)', letterSpacing: 0, fontVariantNumeric: 'tabular-nums', transition: 'left .5s ease' }}>{t}</span>)}
          {refLabel !== null && <span style={{ position: 'absolute', left: `${x(refAt)}%`, transform: 'translateX(-50%)', letterSpacing: 0, color: 'var(--text)', whiteSpace: 'nowrap', transition: 'left .5s ease' }}>{refLabel}</span>}
        </span>
        <span style={{ textAlign: 'right' }}>{head}</span>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'grid', gridTemplateColumns: cols, gap: 14, padding: '0 8px' }}>
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
function DeptRow({ r, hover, onHover, open, reduce, label, value, cols = DQ_COLS, children }) {
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
      style={{ flex: '1 1 0', minHeight: DQ_ROW, maxHeight: 34, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 14, padding: '0 8px', border: 'none', borderRadius: 8, background: on ? 'var(--track)' : 'transparent', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', opacity: hover && !on ? 0.55 : 1, transition: 'opacity .2s ease, background-color .15s ease' }}
    >
      <motion.span layoutId={`dq-name-${r.name}`} transition={{ layout: reduce ? { duration: 0 } : MOVE }} style={nameCell(on)}>{r.name}</motion.span>
      <span aria-hidden style={{ position: 'relative', height: 14 }}>{children}</span>
      <span className="vs-rank" style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 900, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', color: 'var(--text)' }}>{value}</span>
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
// ring) and now (a dot), joined, on a scale close round them; the largest
// fall first. The numbers beside each say where it was and where it is.
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
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{keyDot(ink.context, true)}{days} days ago</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{keyDot(ink.good)}Now, safer</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{keyDot(ink.bad)}Now, riskier</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}><span aria-hidden style={{ width: 14, borderTop: '1.5px dashed var(--text)', opacity: 0.5 }} />The company now{Number.isFinite(before) ? ` (${one(before)} ${days} days ago)` : ''}</span>
    </>
  );
  return (
    <DeptRowsFrame head={`${days} days ago → now`} cols={MOVE_COLS} ticks={ticks} x={x} refAt={company} refDashed refLabel={null} keys={keys} list={list} page={page} onPage={onPage}>
      {(r) => {
        const was = r.before ?? r.score;
        const c = toneOfChange(r.change, ink);
        const a = Math.min(was, r.score); const b = Math.max(was, r.score);
        return (
          <DeptRow key={r.name} r={r} cols={MOVE_COLS} hover={hover} onHover={onHover} open={open} reduce={reduce} value={<><span style={{ color: 'var(--muted)', fontWeight: 700 }}>{one(was)}</span> → {one(r.score)}</>} label={`${r.name}: Risk Score ${one(was)} ${days} days ago, ${one(r.score)} now. Open its profile`}>
            <span style={{ position: 'absolute', top: 5, height: 4, left: `${x(a)}%`, width: `${Math.max(0, x(b) - x(a))}%`, borderRadius: 999, background: c, opacity: 0.45, transition: SLIDE }} />
            <span style={{ position: 'absolute', top: 2, left: `${x(was)}%`, width: 10, height: 10, marginLeft: -5, borderRadius: 999, boxSizing: 'border-box', border: `2px solid ${ink.context}`, background: 'var(--base)', transition: SLIDE }} />
            <motion.span layoutId={`dq-dot-${r.name}`} transition={{ layout: reduce ? { duration: 0 } : MOVE }} style={{ position: 'absolute', top: 1, left: `${x(r.score)}%`, width: 12, height: 12, marginLeft: -6, borderRadius: 999, background: c, boxShadow: '0 0 0 2px var(--base)' }} />
          </DeptRow>
        );
      }}
    </DeptRowsFrame>
  );
}

// Reports vs clicks: a dot per department at its Hook Rate (across) and
// Report Rate (up), each axis fitted to the departments' own spread, over
// the three healths: two or more reports for every click (above the dashed
// line, y = 2x), at least one (above the solid line, y = x), fewer. The
// lines and zones are drawn in the data's units, so they stay true however
// each axis is fitted. Hover or focus a dot for its figures.
const pct = (v) => `${Number((v * 100).toFixed(1))}%`;
// an axis fitted to its values, with a little room either side
function fitAxis(values) {
  const lo = Math.min(...values); const hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.07, 0.004);
  const a = Math.max(0, lo - pad); const b = hi + pad;
  const raw = (b - a) / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const s = [1, 2, 2.5, 5, 10].map((k) => k * p).find((k) => k >= raw);
  const ticks = [];
  for (let t = Math.ceil(a / s - 1e-9) * s; t <= b + 1e-9; t += s) ticks.push(Number(t.toFixed(6)));
  return { a, b, ticks };
}
// A polygon cut to the box [X.a, X.b] × [Y.a, Y.b] (Sutherland–Hodgman), so
// nothing is drawn outside the plot.
function clipTo(points, X, Y) {
  const sides = [[(p) => p[0] >= X.a, 0, X.a], [(p) => p[0] <= X.b, 0, X.b], [(p) => p[1] >= Y.a, 1, Y.a], [(p) => p[1] <= Y.b, 1, Y.b]];
  return sides.reduce((pts, [inside, axis, v]) => {
    const out = [];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const cut = () => { const t = (v - p[axis]) / (q[axis] - p[axis]); return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]; };
      if (inside(p)) { out.push(p); if (!inside(q)) out.push(cut()); } else if (inside(q)) out.push(cut());
    });
    return out;
  }, points);
}
// The health at a point: the same rule as health() in bigPictureViews.js.
const zoneAt = (x, y) => (y >= 2 * x ? 'Protected' : y >= x ? 'Holding' : 'Exposed');
// Where to name each zone: the longest stretch of the plot's edge it
// touches that no dot sits on, inside the edge.
function zoneLabels(X, Y, w, h, dots) {
  const N = 48;
  const edges = [
    { side: 'top', at: (t) => [X.a + t * (X.b - X.a), Y.b], len: w },
    { side: 'right', at: (t) => [X.b, Y.b - t * (Y.b - Y.a)], len: h },
    { side: 'bottom', at: (t) => [X.a + t * (X.b - X.a), Y.a], len: w },
    { side: 'left', at: (t) => [X.a, Y.b - t * (Y.b - Y.a)], len: h },
  ];
  const runs = [];
  edges.forEach((e) => {
    let start = 0;
    for (let k = 1; k <= N; k += 1) {
      const z = zoneAt(...e.at((start + 0.5) / N));
      if (k === N || zoneAt(...e.at((k + 0.5) / N)) !== z) { runs.push({ zone: z, side: e.side, from: start / N, to: k / N, px: ((k - start) / N) * e.len }); start = k; }
    }
  });
  const box = (r, lw) => {
    const mid = (r.from + r.to) / 2;
    const clampX = (v) => Math.max(4, Math.min(w - lw - 4, v));
    const clampY = (v) => Math.max(4, Math.min(h - 16, v));
    if (r.side === 'top') return { left: clampX(mid * w - lw / 2), top: 4 };
    if (r.side === 'bottom') return { left: clampX(mid * w - lw / 2), top: h - 16 };
    if (r.side === 'right') return { left: w - lw - 6, top: clampY(mid * h - 6) };
    return { left: 6, top: clampY(mid * h - 6) };
  };
  const clash = (b, lw) => dots.some((d) => d.x + 9 > b.left && d.x - 9 < b.left + lw && d.y + 9 > b.top && d.y - 9 < b.top + 12);
  const out = [];
  for (const zone of ['Protected', 'Holding', 'Exposed']) {
    const lw = HEALTH_WORD[zone].length * 6.6 + 16;
    const mine = runs.filter((r) => r.zone === zone && r.px > lw + 8).sort((a, b) => b.px - a.px);
    const free = mine.map((r) => box(r, lw)).find((b) => !clash(b, lw) && !out.some((o) => b.left < o.left + o.lw && o.left < b.left + lw && Math.abs(b.top - o.top) < 14));
    if (free) out.push({ zone, lw, ...free });
  }
  return out;
}

function DeptScatter({ rows, ink, reduce, hover, onHover, open }) {
  const [plot, { w, h }] = useSize();
  const pts = rows.filter((r) => r.health && Number.isFinite(r.hooked) && Number.isFinite(r.reportRate));
  const X = fitAxis(pts.map((r) => r.hooked));
  const Y = fitAxis(pts.map((r) => r.reportRate));
  const sx = (v) => ((v - X.a) / (X.b - X.a || 1)) * 100;
  const sy = (v) => 100 - ((v - Y.a) / (Y.b - Y.a || 1)) * 100;
  const move = reduce ? { duration: 0 } : MOVE;
  // the zones and their edges, in the data's units, cut to the plot
  const M = 10;
  const P = (pairs) => clipTo(pairs, X, Y).map(([a, b]) => `${sx(a)},${sy(b)}`).join(' ');
  const zones = [
    { key: 'Exposed', points: P([[0, 0], [M, 0], [M, M]]) },
    { key: 'Holding', points: P([[0, 0], [M, M], [M, 2 * M]]) },
    { key: 'Protected', points: P([[0, 0], [M, 2 * M], [0, 2 * M]]) },
  ];
  // the line y = k·x, from where it enters the plot to where it leaves
  const edge = (k) => { const a = Math.max(X.a, Y.a / k); const b = Math.min(X.b, Y.b / k); return a < b ? { x1: sx(a), y1: sy(k * a), x2: sx(b), y2: sy(k * b) } : null; };
  const one1 = edge(1); const two1 = edge(2);
  const dots = w > 0 ? pts.map((r) => ({ name: r.name, x: (sx(r.hooked) / 100) * w, y: (sy(r.reportRate) / 100) * h })) : [];
  const labels = w > 0 ? zoneLabels(X, Y, w, h, dots) : [];
  const tipped = pts.find((r) => r.name === hover);
  const at = dots.find((d) => d.name === hover);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 10 }}>
      <div ref={plot} style={{ position: 'relative', flex: 1, minHeight: 0, margin: '6px 10px 34px 54px' }}>
        <svg aria-hidden className="ins-fade" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}>
          {zones.filter((z) => z.points).map((z) => <polygon key={z.key} points={z.points} fill={healthInk(z.key, ink)} fillOpacity={0.08} />)}
          {X.ticks.map((t) => <line key={`x${t}`} x1={sx(t)} x2={sx(t)} y1={0} y2={100} stroke="var(--grid)" vectorEffect="non-scaling-stroke" />)}
          {Y.ticks.map((t) => <line key={`y${t}`} x1={0} x2={100} y1={sy(t)} y2={sy(t)} stroke="var(--grid)" vectorEffect="non-scaling-stroke" />)}
          {one1 && <line {...one1} stroke="var(--text)" strokeOpacity={0.35} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
          {two1 && <line {...two1} stroke="var(--text)" strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />}
          <rect x={0} y={0} width={100} height={100} fill="none" stroke="var(--hair-strong)" vectorEffect="non-scaling-stroke" />
        </svg>
        {labels.map((l) => (
          <span key={l.zone} className="ins-fade" data-ins-zone={l.zone} style={{ ...heads, position: 'absolute', left: l.left, top: l.top, display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--muted)', pointerEvents: 'none', lineHeight: '12px' }}>{dot(healthInk(l.zone, ink), 6)}{HEALTH_WORD[l.zone]}</span>
        ))}
        {X.ticks.map((t) => <span key={`tx${t}`} aria-hidden style={{ ...small, position: 'absolute', top: '100%', marginTop: 5, left: `${sx(t)}%`, transform: 'translateX(-50%)', fontVariantNumeric: 'tabular-nums' }}>{pct(t)}</span>)}
        {Y.ticks.map((t) => <span key={`ty${t}`} aria-hidden style={{ ...small, position: 'absolute', right: '100%', marginRight: 7, top: `${sy(t)}%`, transform: 'translateY(-50%)', fontVariantNumeric: 'tabular-nums' }}>{pct(t)}</span>)}
        {/* the axes' names, at the axes */}
        <span aria-hidden style={{ ...heads, position: 'absolute', left: 0, right: 0, top: '100%', marginTop: 20, textAlign: 'center', color: 'var(--text)' }}>Hook Rate →</span>
        <span aria-hidden style={{ ...heads, position: 'absolute', right: '100%', marginRight: 36, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: 'var(--text)' }}>Report Rate →</span>
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
              aria-label={`${r.name}: Hook Rate ${pc1(r.hooked)}, Report Rate ${pc1(r.reportRate)}, ${GLOSSARY.perClick.name} ${times(r.perClick)}, ${HEALTH_WORD[r.health.word]}. Open its profile`}
              style={{ position: 'absolute', left: `${sx(r.hooked)}%`, top: `${sy(r.reportRate)}%`, width: 24, height: 24, margin: '-12px 0 0 -12px', padding: 0, border: 'none', background: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: on ? 3 : 2, opacity: hover && !on ? 0.4 : 1, transition: 'opacity .2s ease' }}
            >
              <motion.span layoutId={`dq-dot-${r.name}`} transition={{ layout: move }} style={{ width: 12, height: 12, borderRadius: 999, background: c, boxShadow: on ? `0 0 0 2px var(--base), 0 0 0 5px color-mix(in srgb, ${c} 35%, transparent)` : '0 0 0 2px var(--base)' }} />
            </button>
          );
        })}
        {tipped && at && (
          <Tip x={at.x} y={at.y} w={w} edge={12} below={at.y < h * 0.4}>
            <TipBody head={tipped.name} rows={[['Hook Rate', pc1(tipped.hooked)], ['Report Rate', pc1(tipped.reportRate)], [GLOSSARY.perClick.name, times(tipped.perClick)], ['Health', HEALTH_WORD[tipped.health.word]]]} />
          </Tip>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, ...small, whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {['Protected', 'Holding', 'Exposed'].map((z) => <span key={z} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{dot(healthInk(z, ink))}<strong style={{ color: 'var(--text)', fontWeight: 700 }}>{HEALTH_WORD[z]}</strong></span>)}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}><span aria-hidden style={{ width: 16, borderTop: '1.5px dashed var(--text)', opacity: 0.5 }} />2 reports for every click</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden style={{ width: 16, borderTop: '1.5px solid var(--text)', opacity: 0.5 }} />1 report for every click</span>
      </div>
    </div>
  );
}

// The Hook Rate as a fill: from the page's base towards the colour of a
// click, deeper for more clicks, with the text ink that reads best on it.
const rgbOf = (c) => (/^#[0-9a-f]{6}$/i.test(c || '') ? c.slice(1).match(/../g).map((x) => parseInt(x, 16)) : null);
const lumOf = (rgb) => rgb.map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lumOf(a), lumOf(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const ON_LIGHT = '#0F172A'; const ON_DARK = '#FFFFFF';
function heatOf(color, base) {
  const c = rgbOf(color); const b = rgbOf(base);
  if (!c || !b) return (share) => ({ bg: `color-mix(in srgb, ${color} ${share}%, var(--base))`, fg: 'var(--text)' });
  return (share) => {
    const rgb = c.map((v, i) => Math.round(b[i] + ((v - b[i]) * share) / 100));
    return { bg: `rgb(${rgb.join(',')})`, fg: ratio(rgb, rgbOf(ON_LIGHT)) >= ratio(rgb, rgbOf(ON_DARK)) ? ON_LIGHT : ON_DARK };
  };
}

// Weak spots: each department's Hook Rate for each campaign type, the
// department with the highest Risk Score first; deeper is more clicked.
// Hover a cell for its figures; a type's name (a link) opens it.
function DeptHeat({ rows, types, cells, ink, isDark, reduce, hover, onHover, open, page, onPage }) {
  const list = deptOrder(rows, 'risk');
  const [box, pg] = usePage(list.length, page);
  const [wrap, { w }] = useSize();
  const [cell, setCell] = useState(null);
  const all = list.flatMap((r) => types.map((t) => cells[r.name]?.[t]).filter(Boolean)).map((c) => c.hooked ?? 0);
  const hot = Math.max(...all, 0.01); const cool = Math.min(...all, hot);
  // from the coolest cell to the hottest, curved so the few that fool most stand out
  const share = (v) => Math.round(8 + Math.pow((v - cool) / (hot - cool || 1), 1.6) * 92);
  const fill = heatOf(ink.bad, themeVars(isDark)['--base']);
  const cols = `minmax(0,190px) repeat(${types.length}, minmax(0,1fr))`;
  const move = reduce ? { duration: 0 } : MOVE;
  const point = (r, t) => (e) => {
    const host = e.currentTarget.closest('[data-ins-heat]')?.getBoundingClientRect();
    const b = e.currentTarget.getBoundingClientRect();
    if (!host) return;
    // the page is drawn at a zoom: work in the box's own units
    const z = host.width / (e.currentTarget.closest('[data-ins-heat]').offsetWidth || host.width);
    setCell({ name: r.name, type: t, x: (b.left + b.width / 2 - host.left) / z, y: (b.top - host.top) / z, h: b.height / z });
  };
  const tipped = cell && cells[cell.name]?.[cell.type];
  return (
    <div ref={wrap} data-ins-heat style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 10 }} onMouseLeave={() => setCell(null)}>
      <div role="row" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: cols, alignItems: 'end', gap: 6, padding: '0 8px 6px' }}>
        <span style={heads}>Department</span>
        {types.map((t) => (
          <button key={t} type="button" className="ins-crumb" data-ins-heat-type={t} aria-label={`${t}: open its profile`} onClick={() => open('lure', t)} style={{ minWidth: 0, border: 'none', background: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, color: 'var(--text)', cursor: 'pointer', fontSize: TYPE.small, fontWeight: 700, lineHeight: 1.15, textAlign: 'center' }}>
            <LureIcon type={t} size={13} strokeWidth={2.2} aria-hidden style={{ color: 'var(--muted)' }} />
            <span style={{ maxWidth: '100%', textDecoration: 'underline', textDecorationColor: 'var(--hair-strong)', textUnderlineOffset: 3, overflowWrap: 'anywhere' }}>{t}</span>
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
              aria-label={`${r.name}: ${types.map((t) => `${t} ${cells[r.name]?.[t] ? pc1(cells[r.name][t].hooked) : 'no emails'}`).join(', ')}. Open its profile`}
              style={{ flex: '1 1 0', minHeight: DQ_ROW, maxHeight: 34, display: 'grid', gridTemplateColumns: cols, alignItems: 'stretch', gap: 6, padding: '2px 8px', border: 'none', borderRadius: 8, background: on ? 'var(--track)' : 'transparent', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
            >
              <motion.span layoutId={`dq-name-${r.name}`} transition={{ layout: move }} style={{ ...nameCell(on), alignSelf: 'center' }}>{r.name}</motion.span>
              {types.map((t, j) => {
                const c = cells[r.name]?.[t];
                const look = { borderRadius: 6, display: 'grid', placeItems: 'center', fontSize: TYPE.small, fontWeight: 800, fontVariantNumeric: 'tabular-nums' };
                const lit = cell?.name === r.name && cell?.type === t;
                if (!c) return <span key={t} data-ins-heat-cell onMouseEnter={point(r, t)} style={{ ...look, background: 'var(--plate)', color: 'var(--muted)', fontWeight: 600 }}>—</span>;
                const f = fill(share(c.hooked));
                return <span key={t} data-ins-heat-cell className="ins-pop-in" onMouseEnter={point(r, t)} style={{ ...look, '--d': `${Math.min(0.05 + 0.02 * k + 0.03 * j, 0.5)}s`, background: f.bg, color: f.fg, boxShadow: lit ? 'inset 0 0 0 2px var(--text)' : 'none' }}>{pc1(c.hooked)}</span>;
              })}
            </motion.button>
          );
        })}
      </div>
      <div style={{ flexShrink: 0, height: 22, display: 'flex', alignItems: 'end', gap: 8, padding: '0 8px', ...small, whiteSpace: 'nowrap' }}>
        <span>Hook Rate</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pc1(cool)}</span>
        <span aria-hidden style={{ width: 90, height: 8, borderRadius: 999, background: `linear-gradient(90deg, ${[8, 30, 60, 100].map((s) => fill(s).bg).join(', ')})`, alignSelf: 'center' }} />
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pc1(hot)}</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden style={{ width: 22, height: 12, borderRadius: 4, background: 'var(--plate)', display: 'grid', placeItems: 'center', lineHeight: 1 }}>—</span>No emails</span>
      </div>
      {pg.pages > 1 && <MiniPager at={pg.at} pages={pg.pages} total={list.length} per={pg.size} onAt={onPage} what="departments" />}
      {cell && w > 0 && (
        <Tip x={cell.x} y={cell.y < 90 ? cell.y + cell.h : cell.y} w={w} edge={6} below={cell.y < 90}>
          <TipBody head={`${cell.name} · ${cell.type}`} rows={tipped ? [['Hook Rate', pc1(tipped.hooked)], ['Clicked', `${num(tipped.clicked)} of ${num(tipped.recipients)}`], ['Report Rate', pc1(tipped.reportRate)]] : [['Emails', 'none']]} />
        </Tip>
      )}
    </div>
  );
}

// A small line of a department's Risk Score month by month (in the text
// ink) against the company's (dashed), on a scale from a round floor to a
// round ceiling at least ten points apart, both marked; its first and newest
// values labelled.
function MiniTrend({ values, base }) {
  const [box, { w, h }] = useSize();
  const all = [...values, ...base].filter(Number.isFinite);
  let lo = Math.floor(Math.min(...all) / 5) * 5; let hi = Math.ceil(Math.max(...all) / 5) * 5;
  if (hi - lo < 10) { const mid = (lo + hi) / 2; lo = Math.max(0, Math.floor((mid - 5) / 5) * 5); hi = lo + 10; }
  const n = values.length;
  const L = 22; const R = 30; const T = 8; const B = 6;
  const px = (i) => (n > 1 ? L + (i / (n - 1)) * (w - L - R) : w / 2);
  const py = (v) => T + (1 - (v - lo) / (hi - lo || 1)) * (h - T - B);
  const line = (vs) => vs.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ');
  const first = values[0]; const last = values.at(-1);
  const tick = { fontSize: TYPE.label, fontWeight: 600, fill: 'var(--muted)', fontVariantNumeric: 'tabular-nums' };
  const label = { fontSize: TYPE.label, fontWeight: 800, fill: 'var(--text)', fontVariantNumeric: 'tabular-nums' };
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0 }}>
      {w > 0 && h > 0 && n > 1 && (
        <svg width={w} height={h} role="img" aria-label={`Risk Score by month, from ${one(first)} to ${one(last)}; the company's dashed`} style={{ display: 'block', overflow: 'visible' }}>
          {[lo, hi].map((v) => (
            <g key={v}>
              <line x1={L} x2={w - R} y1={py(v)} y2={py(v)} stroke="var(--grid)" />
              <text x={L - 5} y={py(v) + 3} textAnchor="end" style={tick}>{v}</text>
            </g>
          ))}
          <path d={`${line(values)} L${px(n - 1)},${py(lo)} L${px(0)},${py(lo)} Z`} fill="var(--text)" fillOpacity={0.05} />
          <path d={line(base)} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="3 4" />
          <path d={line(values)} fill="none" stroke="var(--text)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={px(0)} cy={py(first)} r={3} fill="var(--base)" stroke="var(--text)" strokeWidth={1.5} />
          <circle cx={px(n - 1)} cy={py(last)} r={4} fill="var(--text)" stroke="var(--base)" strokeWidth={2} />
          <text x={px(0) + 6} y={py(first) + (py(first) < T + 14 ? 12 : -6)} style={label}>{one(first)}</text>
          <text x={px(n - 1) + 7} y={py(last) + 3} style={label}>{one(last)}</text>
        </svg>
      )}
    </div>
  );
}

// The department beside the chart: its Risk Score month by month against
// the company's, its people by risk level, and its Hook Rate and Report Rate
// against the company's. Numbers and marks only.
function DeptSpot({ row, at, companyTrend, company, days, isDark, ink, reduce, open }) {
  const colors = tierInk(isDark);
  const months = Math.min(12, row.trend.length);
  const all = ['low', 'moderate', 'high', 'critical'].reduce((a, t) => a + (row.tiers[t] || 0), 0) || 1;
  const top = (mine, theirs) => Math.max(mine ?? 0, theirs ?? 0, 0.01);
  const bar = (v, max, color) => <span style={{ height: 8, borderRadius: 999, background: 'var(--plate)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${Math.min(1, (v ?? 0) / max) * 100}%`, borderRadius: 999, background: color, transition: 'width .4s ease' }} /></span>;
  const rate = (label, mine, theirs, color) => (
    <span style={{ display: 'grid', gridTemplateColumns: '6.5em minmax(0,1fr) 3.6em', alignItems: 'center', columnGap: 8, rowGap: 3, fontSize: TYPE.small }}>
      <span style={{ ...small, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{label}</span>
      {bar(mine, top(mine, theirs), color)}
      <span className="vs-rank" style={{ textAlign: 'right', fontSize: TYPE.body, fontWeight: 900 }}>{pc1(mine)}</span>
      <span style={{ ...small }}>Company</span>
      {bar(theirs, top(mine, theirs), ink.context)}
      <span style={{ ...small, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pc1(theirs)}</span>
    </span>
  );
  return (
    <Card
      i={1}
      reduce={reduce}
      title={row.name}
      sub={`${num(row.people)} people`}
      action={<GoTo label="Open" onClick={(e) => { e.stopPropagation(); open('department', row.name); }} data-ins-spot-open-dept />}
      style={{ gridColumn: 'span 3' }}
      data-ins-dept-spot={row.name}
    >
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ ...eyebrow }}>Risk Score now</span>
          <span className="vs-rank" style={{ marginLeft: 'auto', fontSize: TYPE.number, fontWeight: 900, lineHeight: 1, color: 'var(--text)' }}>{one(row.score)}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, ...small, whiteSpace: 'nowrap' }}>{dot(toneOfChange(row.change, ink), 6)}<strong className="vs-rank" style={{ color: 'var(--text)' }}>{moved(row.change)}</strong> vs {days} days ago</span>
        </span>
        <div style={{ flex: 1, minHeight: 56, display: 'flex', flexDirection: 'column' }}>
          <MiniTrend values={row.trend.slice(-months)} base={companyTrend.slice(-months)} />
          <span style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 4, paddingLeft: 22, ...small, fontSize: TYPE.label, whiteSpace: 'nowrap' }}>
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
                <span className="vs-rank" style={{ display: 'block', fontSize: TYPE.body, fontWeight: 900, marginTop: 2 }}>{pc1((row.tiers[t] || 0) / all)}</span>
              </span>
            ))}
          </span>
        </span>
        <span className="ins-optional-tall" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 10, borderTop: '1px solid var(--hair)' }}>
          <span style={{ ...eyebrow }}>Last {days} days</span>
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
      {spot && <DeptSpot row={spot} at={p.trend.map((s) => s.to)} companyTrend={p.trend.map((s) => s.score)} company={p.now.score} days={m.basis.days} isDark={isDark} ink={ink} reduce={reduce} open={open} />}
    </div>
  );
}

// ---------------------------------------------------------------- campaigns

// Campaigns: the campaign types ranked by Hook Rate on the left (a click
// keeps only that type's campaigns, its arrow opens its profile), and every
// campaign as a row on the right, sorted as chosen and paged to fit; each
// row grows into its campaign.
const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'clicked', label: 'Most clicked' },
  { id: 'reported', label: 'Most reported' },
  { id: 'health', label: 'Health' },
];
const HEALTH_RANK = { Exposed: 0, Holding: 1, Protected: 2 };
// The types' list shares one grid (each row a subgrid), so its columns fit
// the longest name and the widest heading, and a long name wraps rather
// than being cut.
const LURE_COLS = '24px minmax(0,1.2fr) minmax(0,1fr) auto 14px';
const CAMP_COLS = (health) => `24px minmax(0,2.2fr) 44px 54px minmax(0,1.1fr) minmax(0,1.1fr) 64px 58px${health ? ' 100px' : ''} 12px`;
const ROW_H = 40;
const numCell = { textAlign: 'right', fontSize: TYPE.strong, fontWeight: 900, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const headWrap = { whiteSpace: 'normal', lineHeight: 1.15, width: 'min-content', justifySelf: 'end', textAlign: 'right' };

// Health as a dot in its colour and its word in the text ink.
function HealthWord({ h, ink }) {
  if (!h) return <span style={small}>—</span>;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: TYPE.body, fontWeight: 700, whiteSpace: 'nowrap' }}>{dot(healthInk(h.word, ink))}{HEALTH_WORD[h.word] ?? h.word}</span>;
}

export function CampaignsView({ ctx }) {
  const { m, ink, reduce, open, view, onView } = ctx;
  const days = m.basis.days;
  const sort = view.sort || 'newest';
  const lure = view.lure || null;
  const shownLure = m.lures.find((l) => l.type === lure);
  const [fit, size] = useFitRows(ROW_H, 4, 0);
  const [lureBox, { w: lureW }] = useSize();
  const [tip, setTip] = useState(null);
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
  // one health for every campaign shown: said once, over the table, not on every row
  const words = new Set(list.map((c) => c.health?.word));
  const oneHealth = list.length > 1 && words.size === 1 ? list[0].health : null;
  const cols = CAMP_COLS(!oneHealth);
  const pick = (type) => onView({ lure: lure === type ? null : type, page: 0 });
  const tipped = m.lures.find((l) => l.type === tip?.type);
  return (
    <div data-ins-camps-view style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gap: 14 }}>
      <Card i={0} reduce={reduce} title="Hook Rate by campaign type" define="hookRate" sub={lure ? `Last ${days} days · showing ${lure}` : `Last ${days} days`} style={{ gridColumn: 'span 4' }} data-ins-lure-rank>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          <div ref={lureBox} style={{ position: 'relative', flex: '0 1 auto', minHeight: 0, display: 'grid', gridTemplateColumns: LURE_COLS, gridTemplateRows: `auto repeat(${m.lures.length}, minmax(30px, 52px))`, columnGap: 12 }} onMouseLeave={() => setTip(null)}>
            <div role="row" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'subgrid', alignItems: 'end', padding: '0 8px 6px', borderBottom: '1px solid var(--hair)', ...heads }}>
              <span /><span>{TYPE_WORD}</span><span>Hook Rate</span><span style={headWrap}>{GLOSSARY.perClick.name}</span><span />
            </div>
            {m.lures.map((l, k) => {
              const on = lure === l.type;
              const show = (e) => setTip({ type: l.type, y: e.currentTarget.offsetTop + e.currentTarget.offsetHeight });
              return (
                <div
                  key={l.type}
                  role="button"
                  tabIndex={0}
                  className="ins-row ins-in-x"
                  data-ins-lure={l.type}
                  aria-pressed={on}
                  aria-label={`${l.type}: Hook Rate ${pc1(l.hooked)}, ${GLOSSARY.perClick.name} ${times(l.perClick)}, ${l.campaigns} campaigns. ${on ? 'Show every campaign type' : 'Show only its campaigns'}`}
                  onClick={() => pick(l.type)}
                  onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pick(l.type); } }}
                  onMouseEnter={show}
                  onFocus={show}
                  onBlur={() => setTip(null)}
                  style={{ '--d': `${0.08 + 0.03 * k}s`, gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'subgrid', alignItems: 'center', padding: '0 8px', borderTop: k ? '1px solid var(--hair)' : 'none', borderRadius: 10, background: on ? 'var(--plate)' : 'none', boxShadow: on ? 'inset 3px 0 0 var(--brand)' : 'none', cursor: 'pointer', outline: 'none' }}
                >
                  <LureTile type={l.type} size={24} />
                  <span style={{ minWidth: 0, fontSize: TYPE.body, fontWeight: 800, lineHeight: 1.15 }}>{l.type}</span>
                  <InlineBar value={l.hooked} max={maxLure} color={ink.bad} label={pc1(l.hooked)} grow={false} />
                  <span className="vs-rank" style={numCell}>{times(l.perClick)}</span>
                  <button type="button" aria-label={`Open ${l.type}`} data-ins-lure-open={l.type} onClick={(e) => { e.stopPropagation(); open('lure', l.type); }} style={{ width: 14, height: 24, padding: 0, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><ChevronRight size={13} strokeWidth={2.4} aria-hidden /></button>
                </div>
              );
            })}
            {tipped && lureW > 0 && (
              <Tip x={lureW * 0.55} y={tip.y} w={lureW} edge={2} below>
                <TipBody head={tipped.type} rows={lureTip(tipped)} />
              </Tip>
            )}
          </div>
          <div className="ins-optional-tall" style={{ flexShrink: 0, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
            <span style={{ ...cardTitle, fontSize: TYPE.strong, marginBottom: 10 }}>{GLOSSARY.outcomes.name}{lure ? ` · ${lure}` : ''}</span>
            <Blocks key={lure || 'all'} parts={didParts(shownLure || m.now, ink)} reduce={reduce} height="clamp(24px, 6cqh, 40px)" legendCols={2} />
          </div>
        </div>
      </Card>

      <Card
        i={1}
        reduce={reduce}
        title={lure ? `Campaigns · ${lure}` : 'Campaigns'}
        sub={oneHealth ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Last {days} days · every campaign {dot(healthInk(oneHealth.word, ink), 6)}<strong style={{ color: 'var(--text)' }}>{HEALTH_WORD[oneHealth.word]}</strong></span> : `Last ${days} days`}
        action={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{lure && <button type="button" onClick={() => onView({ lure: null, page: 0 })} className="ins-go" style={{ height: 26, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 10px', borderRadius: 999, border: '1px solid var(--card-edge)', background: 'var(--ghost)', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer' }}>{lure} ✕</button>}<Segmented id="ins-camp-sort" label="Sort campaigns" value={sort} options={SORTS} onChange={(id) => onView({ sort: id, page: 0 })} reduce={reduce} /></span>}
        style={{ gridColumn: 'span 8' }}
        data-ins-camp-table
      >
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          <div role="row" style={{ flexShrink: 0, height: 28, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 8px', borderBottom: '1px solid var(--hair)', ...heads }}>
            <span /><span>Campaign</span><span>Started</span><span style={{ textAlign: 'right' }}>Emails</span><span>Hook Rate</span><span>Report Rate</span><span style={headWrap}>{GLOSSARY.gaveDetails.name}</span><span style={headWrap}>{GLOSSARY.perClick.name}</span>{!oneHealth && <span style={{ textAlign: 'left' }}>Health</span>}<span />
          </div>
          <div ref={fit} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {rows.slice(page * size, page * size + size).map((c, k) => (
              <motion.button
                key={c.id}
                type="button"
                layoutId={`camp-${c.id}`}
                className="ins-row ins-in-x"
                data-ins-campaign={c.id}
                onClick={() => open('campaign', c.id, `camp-${c.id}`)}
                aria-label={`${c.name}, started ${c.started}: Hook Rate ${pc1(c.hooked)}, Report Rate ${pc1(c.reportRate)}, ${HEALTH_WORD[c.health?.word] ?? ''}. Open the campaign`}
                style={{ '--d': `${Math.min(0.06 + 0.02 * k, 0.3)}s`, flexShrink: 0, height: ROW_H, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 8px', border: 'none', borderTop: k ? '1px solid var(--hair)' : 'none', borderRadius: 10, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
              >
                <LureTile type={c.type} size={24} />
                <span style={{ minWidth: 0, fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                <span style={{ ...small, fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{c.started}</span>
                <span className="vs-rank" style={numCell}>{num(c.delivered)}</span>
                <InlineBar value={c.hooked} max={maxHook} color={ink.bad} label={pc1(c.hooked)} grow={false} />
                <InlineBar value={c.reportRate} max={maxRep} color={ink.good} label={pc1(c.reportRate)} grow={false} />
                <span className="vs-rank" style={numCell}>{pc1(c.delivered ? c.compromised / c.delivered : null)}</span>
                <span className="vs-rank" style={numCell}>{times(c.perClick)}</span>
                {!oneHealth && <HealthWord h={c.health} ink={ink} />}
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
