import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronRight } from 'lucide-react';

import DeptCrest from '../../GlobalComponents/DeptCrest';
import { deptCode } from '../../GlobalComponents/deptCodes';
import { Pager } from '../Leaderboard/BigPictureTables';
import { TONE_ART } from '../Leaderboard/bigPictureArt';
import CampaignMegaphone from '../../assets/LeaderboardAssets/CampaignMegaphone.png';
import { Blocks, Card, CompareBars, Legend, PillColumns, RingGauge, Segmented, Staircase, TileMap } from './InsightsCharts';
import { Explain, Heads, HealthChip, InlineBar, LureIcon, LureTile, MiniPager, PerClickHow, RowsGrid } from './InsightsBits';
import { useSize } from './useSize';
import { DEPT_QUESTIONS, deptOrder, deptRows, deptSays } from '../../services/deptQuestions';
import { useFitRows } from '../Leaderboard/useFitRows';
import { EASE, HEAD_H, HEALTH_WORD, SPANS, STEADY_INK, TIER_WORD, TINT, cardTitle, change, day, didParts, eyebrow, healthInk, heads, lureShort, num, pc, pc1, riskBands, riskWord, small, tierInk, tierOf, times, TYPE } from './insightsUi';

// Insights' views, one per tab:
//   - Overview: one card for each question a leader asks. Are we safer
//     (risk over the year)? Where is the risk (the department map, what
//     fools us)? When phishing lands, do people raise the alarm (what people
//     do)? Is training paying off? What changed?
//   - Departments: one question at a time (who is riskiest, who is
//     changing, reports against clicks, what fools them), one chart each;
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
          <span style={cardTitle}>Reports per click</span>
          <button type="button" className="ins-cta" data-ins-spot-open onClick={() => go('campaigns')} style={{ marginLeft: 'auto', height: 26, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 10px 0 12px', borderRadius: 999, border: 'none', background: 'var(--brand)', color: '#FFFFFF', boxShadow: '0 6px 16px rgba(230,0,0,0.22)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            See campaigns <ArrowUpRight size={12} strokeWidth={2.6} aria-hidden />
          </button>
        </header>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <span style={{ minWidth: 0 }}>
            <span className="vs-rank ins-big" style={{ display: 'block', fontSize: TYPE.display, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em' }}>{times(n.perClick)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: TYPE.body, fontWeight: 700, marginTop: 6 }}>
              reports for every click
              <Explain label="What reports for every click means"><PerClickHow n={n} days={m.basis.days} campaigns={m.basis.campaigns} ink={ink} /></Explain>
            </span>
          </span>
          <img className="ins-float ins-optional" src={CampaignMegaphone} alt="" aria-hidden width={60} height={60} style={{ marginLeft: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 8px 12px rgba(15,23,42,0.18))' }} />
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 10 }}>
          <Blocks parts={didParts(n, ink, isDark)} reduce={reduce} height={28} legendCols={2} />
        </div>
      </motion.section>

      {/* what fools us */}
      <Card i={3} reduce={reduce} title="Hook Rate by campaign type" define="hookRate" onOpen={() => go('campaigns')} openLabel="All" style={{ gridColumn: 'span 4' }} data-ins-lures>
        <PillColumns
          items={m.lures.map((l) => ({ key: l.type, label: lureShort(l.type), value: l.hooked, text: pc(l.hooked), tip: [l.type, `Hook Rate ${pc1(l.hooked)} · gave details ${pc(l.gaveOfClicks)} of clicks`, `Reported ${pc(l.reportRate)} · ${times(l.perClick)} reports per click`] }))}
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
      <Card i={5} reduce={reduce} title="Training impact" define="trainingImpact" layoutId="ins-training" onOpen={() => open('training', null, 'ins-training')} openLabel="Explore" style={{ gridColumn: 'span 3' }} data-ins-training>
        {c && (
          <>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <span className="vs-rank" style={{ fontSize: TYPE.hero, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>{c.times ? `${c.times.toFixed(1)}×` : '—'}</span>
              <span style={{ fontSize: TYPE.body, fontWeight: 700 }}>less likely to click once trained</span>
            </span>
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

// The Departments tab asks one question at a time (services/deptQuestions.js):
// who is riskiest, who is changing, reports against clicks, and what fools
// them. Each gets one chart that fills the sheet. Switching keeps every
// department's dot and name and slides them to their place in the next
// chart. Beside the chart, what it says in three sentences; pointing at a
// department shows its numbers there instead, and a click opens its
// profile. Rows page to fit a short window, so nothing scrolls.
const QUESTION = {
  risk: { define: 'riskScore', sub: () => 'Risk Score now, riskiest first' },
  change: { define: 'riskChange', sub: (days) => `Risk Score now against ${days} days ago, the most improved first` },
  reports: { define: 'reportedVsClicked', sub: () => 'Each dot a department: clicked across, reported up' },
  types: { define: 'hookRate', sub: () => 'Hook Rate for each campaign type, riskiest department first' },
};
const DQ_ROW = 22;
const DQ_COLS = 'minmax(0,190px) minmax(0,1fr) 58px';
const MOVE = { type: 'tween', duration: 0.5, ease: EASE };
const one = (v) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const moved = (v) => (!Number.isFinite(v) ? '—' : Math.abs(v) < 0.05 ? 'steady' : `${v < 0 ? '▼' : '▲'} ${Math.abs(v).toFixed(1)}`);
const nameCell = (on) => ({ minWidth: 0, fontSize: TYPE.body, fontWeight: on ? 800 : 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
const keyDot = (color) => <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: color }} />;
const TIER_RANGE = { low: 'under 20', moderate: '20–35', high: '35–60', critical: '60+' };

// The rows that fit a box (its ref first), a page at a time: all of them
// until it is measured.
function usePage(total, page) {
  const [box, { h }] = useSize();
  const size = h > 0 ? Math.max(4, Math.floor(h / DQ_ROW)) : total;
  const pages = Math.max(1, Math.ceil(total / size));
  const at = Math.min(page, pages - 1);
  return [box, { size, pages, at, from: at * size, to: at * size + size }];
}

// Who is riskiest, and who is changing: a line per department, its dot at
// its Risk Score (from 0) or at its change (either side of none).
function DeptLines({ rows, q, company, ink, isDark, reduce, hover, onHover, open, page, onPage }) {
  const colors = tierInk(isDark);
  const risk = q === 'risk';
  const list = deptOrder(rows, q);
  const [box, pg] = usePage(list.length, page);
  const top = Math.max(25, Math.ceil(Math.max(...rows.map((r) => r.score)) / 5) * 5);
  // the change either side of none, in round steps
  const most = Math.max(...rows.map((r) => Math.abs(r.change ?? 0)), 0.5);
  const step = most > 3 ? 2 : most > 1.5 ? 1 : 0.5;
  const lim = Math.ceil(most / step) * step;
  const x = (v) => (risk ? (v / top) * 100 : 50 + (v / lim) * 50);
  const ticks = risk ? Array.from({ length: top / 5 + 1 }, (_, k) => k * 5) : Array.from({ length: (2 * lim) / step + 1 }, (_, k) => k * step - lim);
  const tick = (v) => (risk || v === 0 ? `${v}` : `${v > 0 ? '+' : '−'}${Math.abs(v)}`);
  const toneOf = (r) => (risk ? colors[tierOf(r.score)] : r.change <= -0.05 ? ink.good : r.change >= 0.05 ? ink.bad : STEADY_INK);
  const move = reduce ? { duration: 0 } : MOVE;
  const slide = 'left .5s cubic-bezier(.22,1,.36,1), width .5s cubic-bezier(.22,1,.36,1)';
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 10 }}>
      <div aria-hidden style={{ flexShrink: 0, height: 18, display: 'grid', gridTemplateColumns: DQ_COLS, gap: 14, padding: '0 8px', ...heads }}>
        <span>Department</span>
        <span style={{ position: 'relative' }}>
          {ticks.filter((t) => !risk || Math.abs(t - company) > top * 0.08).map((t) => <span key={t} style={{ position: 'absolute', left: `${x(t)}%`, transform: 'translateX(-50%)', letterSpacing: 0, fontVariantNumeric: 'tabular-nums', transition: 'left .5s ease' }}>{tick(t)}</span>)}
          {risk && <span style={{ position: 'absolute', left: `${x(company)}%`, transform: 'translateX(-50%)', letterSpacing: 0, color: 'var(--text)', whiteSpace: 'nowrap' }}>Company {one(company)}</span>}
        </span>
        <span style={{ textAlign: 'right' }}>{risk ? 'Score' : 'Change'}</span>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {/* grid lines, and the company's score (or no change), behind the rows */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'grid', gridTemplateColumns: DQ_COLS, gap: 14, padding: '0 8px' }}>
          <span />
          <span style={{ position: 'relative' }}>
            {ticks.map((t) => <span key={t} style={{ position: 'absolute', top: 0, bottom: 0, left: `${x(t)}%`, width: 1, background: 'var(--grid)', transition: 'left .5s ease' }} />)}
            <span style={{ position: 'absolute', top: 0, bottom: 0, left: `${x(risk ? company : 0)}%`, borderLeft: `1.5px ${risk ? 'dashed' : 'solid'} var(--text)`, opacity: 0.45, transition: slide }} />
          </span>
          <span />
        </div>
        <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {list.slice(pg.from, pg.to).map((r) => {
            const v = risk ? r.score : (r.change ?? 0);
            const from = risk ? 0 : Math.min(0, v); const to = risk ? v : Math.max(0, v);
            const c = toneOf(r);
            const on = hover === r.name;
            return (
              <motion.button
                key={r.name}
                type="button"
                layoutId={`dept-${r.name}`}
                transition={{ layout: move }}
                data-ins-dept-row={r.name}
                onClick={() => open('department', r.name, `dept-${r.name}`)}
                onMouseEnter={() => onHover(r.name)}
                onFocus={() => onHover(r.name)}
                aria-label={`${r.name}: Risk Score ${one(r.score)}, ${moved(r.change)} on the start of the period. Open its profile`}
                style={{ flex: '1 1 0', minHeight: DQ_ROW, maxHeight: 34, display: 'grid', gridTemplateColumns: DQ_COLS, alignItems: 'center', gap: 14, padding: '0 8px', border: 'none', borderRadius: 8, background: on ? 'var(--track)' : 'transparent', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', opacity: hover && !on ? 0.6 : 1, transition: 'opacity .2s ease, background-color .15s ease' }}
              >
                <motion.span layoutId={`dq-name-${r.name}`} transition={{ layout: move }} style={nameCell(on)}>{r.name}</motion.span>
                <span aria-hidden style={{ position: 'relative', height: 12 }}>
                  <span style={{ position: 'absolute', top: 4.5, height: 3, borderRadius: 999, left: `${x(from)}%`, width: `${Math.max(0, x(to) - x(from))}%`, background: c, opacity: 0.4, transition: `${slide}, background-color .3s ease` }} />
                  <motion.span layoutId={`dq-dot-${r.name}`} transition={{ layout: move }} style={{ position: 'absolute', top: 0, left: `${x(v)}%`, width: 12, height: 12, marginLeft: -6, borderRadius: 999, background: c, boxShadow: '0 0 0 2px var(--base)' }} />
                </span>
                <span className="vs-rank" style={{ textAlign: 'right', fontSize: TYPE.strong, fontWeight: 900, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{risk ? one(r.score) : moved(r.change)}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
      <div style={{ flexShrink: 0, height: 22, display: 'flex', alignItems: 'end', gap: 12, padding: '0 8px', ...small, whiteSpace: 'nowrap' }}>
        {(risk
          ? ['low', 'moderate', 'high', 'critical'].map((t) => [`${TIER_WORD[t]} ${TIER_RANGE[t]}`, colors[t]])
          : [['Safer', ink.good], ['Riskier', ink.bad], ['Steady', STEADY_INK]]
        ).map(([w, c]) => <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>{keyDot(c)}{w}</span>)}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <span aria-hidden style={{ width: 14, borderTop: `1.5px ${risk ? 'dashed' : 'solid'} var(--text)`, opacity: 0.5 }} />{risk ? 'The company' : 'No change'}
        </span>
      </div>
      {pg.pages > 1 && <MiniPager at={pg.at} pages={pg.pages} total={list.length} per={pg.size} onAt={onPage} what="departments" />}
    </div>
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

// What the chart says, in three sentences; or, while a department is
// pointed at, its numbers.
function DeptPanel({ says, lead, row, ink, isDark, reduce }) {
  const toneInk = { good: ink.good, bad: ink.bad, watch: STEADY_INK };
  const fade = { initial: { opacity: 0, y: reduce ? 0 : 4 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduce ? 0 : 0.18, ease: EASE } };
  const fact = (label, value, extra) => (
    <span style={{ minWidth: 0, padding: '8px 10px', borderRadius: 10, background: 'var(--plate)' }}>
      <span style={{ ...eyebrow, display: 'block' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <span className="vs-rank" style={{ fontSize: TYPE.heading, fontWeight: 900, lineHeight: 1 }}>{value}</span>
        {extra}
      </span>
    </span>
  );
  return (
    <Card i={1} reduce={reduce} title={row ? 'The department' : 'What it says'} style={{ gridColumn: 'span 3' }} data-ins-dq-says>
      {row ? (
        <motion.div key={`d-${row.name}`} {...fade} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DeptCrest code={deptCode(row.name)} size={30} compact flat metal={isDark ? 'steelDark' : 'steel'} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: TYPE.title, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</span>
              <span style={{ ...small, display: 'block' }}>{num(row.people)} people</span>
            </span>
          </span>
          <span style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8 }}>
            {fact('Risk Score', one(row.score), <span style={{ ...small, fontWeight: 800, color: row.change <= -0.05 ? ink.good : row.change >= 0.05 ? ink.bad : 'var(--muted)', whiteSpace: 'nowrap' }}>{moved(row.change)}</span>)}
            {fact('At high risk', pc(row.highShare))}
            {fact('Hook Rate', pc1(row.hooked))}
            {fact('Report Rate', pc1(row.reportRate))}
          </span>
          <span className="ins-optional" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HealthChip h={row.health} ink={ink} />
            <span style={small}>{times(row.perClick)} reports per click</span>
          </span>
        </motion.div>
      ) : (
        <motion.ul key="says" {...fade} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12, margin: '10px 0 0', padding: 0, listStyle: 'none' }}>
          <li style={{ padding: '10px 12px', borderRadius: 12, background: 'var(--plate)' }}>
            <span style={{ ...eyebrow, display: 'block' }}>{lead.label}</span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 5 }}>
              <span className="vs-rank" style={{ fontSize: TYPE.number, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.025em', color: lead.color || 'var(--text)' }}>{lead.value}</span>
              <span style={small}>{lead.sub}</span>
            </span>
          </li>
          {says.map((s) => (
            <li key={s.strong + s.text} style={{ display: 'grid', gridTemplateColumns: '8px minmax(0,1fr)', gap: 10, alignItems: 'baseline', paddingBottom: 12, borderBottom: '1px solid var(--hair)' }}>
              <span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: toneInk[s.tone], transform: 'translateY(-1px)' }} />
              <span style={{ fontSize: TYPE.body, fontWeight: 600, lineHeight: 1.5, color: 'var(--muted)' }}><strong style={{ color: 'var(--text)', fontWeight: 800 }}>{s.strong}</strong>{s.text}</span>
            </li>
          ))}
          <li className="ins-optional" style={{ ...small, marginTop: 'auto' }}>Point at a department for its numbers; click it to open its profile.</li>
        </motion.ul>
      )}
    </Card>
  );
}

export function DepartmentsView({ ctx }) {
  const { m, p, ink, isDark, reduce, open, view, onView } = ctx;
  const [hover, setHover] = useState(null);
  const q = view.deptQ || 'risk';
  const rows = deptRows(m, p);
  const types = m.lures.map((l) => l.type);
  const cells = Object.fromEntries(Object.entries(m.deptLures).map(([name, list]) => [name, Object.fromEntries(list.map((x) => [x.type, x]))]));
  const says = deptSays(q, rows, { company: p.now.score, days: m.basis.days, lures: m.lures, cells });
  const dc = Number.isFinite(p.before?.score) ? p.now.score - p.before.score : null;
  const lead = {
    risk: { label: 'The company’s Risk Score', value: one(p.now.score), sub: riskWord(p.now.score) },
    change: { label: 'The company’s change', value: moved(dc), sub: `over the last ${m.basis.days} days`, color: dc === null || Math.abs(dc) < 0.05 ? null : dc < 0 ? ink.good : ink.bad },
    reports: { label: 'The company’s reports per click', value: times(m.now.perClick), sub: m.now.health ? HEALTH_WORD[m.now.health.word] : '' },
    types: { label: 'The company’s Hook Rate', value: pc1(m.now.hooked), sub: `across ${m.lures.length} campaign types` },
  }[q];
  const shared = { rows, ink, isDark, reduce, hover, onHover: setHover, open, page: view.deptPage || 0, onPage: (pg) => onView({ deptPage: pg }) };
  return (
    <div data-ins-depts-view style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: 'minmax(0,1fr)', gap: 14 }}>
      <Card
        i={0}
        reduce={reduce}
        title="Departments"
        define={QUESTION[q].define}
        sub={QUESTION[q].sub(m.basis.days)}
        action={<Segmented id="ins-dq" label="Question" value={q} options={DEPT_QUESTIONS} onChange={(id) => { setHover(null); onView({ deptQ: id, deptPage: 0 }); }} reduce={reduce} />}
        style={{ gridColumn: 'span 9' }}
        onMouseLeave={() => setHover(null)}
        data-ins-dq-card
      >
        {q === 'risk' || q === 'change' ? <DeptLines {...shared} q={q} company={p.now.score} />
          : q === 'reports' ? <DeptScatter {...shared} />
            : <DeptHeat {...shared} types={types} cells={cells} />}
      </Card>
      <DeptPanel says={says} lead={lead} row={rows.find((r) => r.name === hover) || null} ink={ink} isDark={isDark} reduce={reduce} />
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
const ROW_H = 46;

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
          <Heads cols={LURE_COLS} pad={8}><span /><span>Campaign type</span><span>Hook Rate</span><span style={{ textAlign: 'right', whiteSpace: 'normal', lineHeight: 1.15 }}>Reports per click</span><span style={{ textAlign: 'right' }}>Campaigns</span><span /></Heads>
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
          <Heads cols={CAMP_COLS} pad={8}><span /><span>Campaign</span><span style={{ textAlign: 'right' }}>Emails</span><span>Hook Rate</span><span>Report Rate</span><span style={{ textAlign: 'right', whiteSpace: 'normal', lineHeight: 1.15 }}>Gave details away</span><span style={{ textAlign: 'right', whiteSpace: 'normal', lineHeight: 1.15 }}>Reports per click</span><span style={{ textAlign: 'right' }}>Health</span><span /></Heads>
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
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                  <span style={{ display: 'block', ...small, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.type} · {day(c.started)}</span>
                </span>
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
