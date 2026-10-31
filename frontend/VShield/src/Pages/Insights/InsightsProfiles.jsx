import { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, CalendarClock, ChevronLeft, ChevronRight, FileX, MailX, Minus, MousePointerClick } from 'lucide-react';

import DeptCrest from '../../GlobalComponents/DeptCrest';
import { deptCode } from '../../GlobalComponents/deptCodes';
import { Blocks, Card, CompareBars, GoTo, Insight, Legend, MakeupBars, PillColumns, RingGauge, Segmented, Staircase, StepFunnel, Tip } from './InsightsCharts';
import { Delta, Fill, FitList, HealthChip, InlineBar, LureTile, Meter, Returning, RowsGrid } from './InsightsBits';
import { useSize } from './useSize';
import { TIER_WEIGHT } from '../../services/sampleOrganisation';
import { GLOSSARY } from '../../services/glossary';
import { EASE, SPANS, TIER_WORD, TINT, change, day, glow, heads, healthInk, healthTone, didParts, eyebrow, lureShort, mins, num, pc, pc1, riskInk, riskWord, small, tierInk, tierText, times, TYPE } from './insightsUi';

// Insights' profiles: where a click leads. Each grows out of the card that
// was clicked (or rises in, when there was none), with a trail at the top
// back to where it came from, a band with what it is and its key figures
// (washed in the health of what it shows, or neutral when that has none),
// and a bento of cards below, its lists running the full height on the right:
//   - Risk: the Risk Score over the year, who moved between levels, which
//     levels its points come from, related counts, each department;
//   - Campaign type: what people did with it, against the other types, each
//     department it reached, its campaigns;
//   - Campaign: what people did, against the average, its departments;
//   - Training: its Training Lift, the funnel, each department and
//     programme.
// Everything in a profile leads on: a department (its page is in
// InsightsDepartments.jsx), a campaign type, a campaign.

// the grow-in: quick and settling without a bounce, so the content it scales
// is never on show long enough to look squeezed
const LAYOUT = { type: 'tween', duration: 0.4, ease: [0.22, 1, 0.36, 1] };
const scoreText = (v, tick) => (Number.isFinite(v) ? (tick ? `${Math.round(v)}` : v.toFixed(1)) : '—');

/**
 * A profile's frame: the trail and Back, a tinted band with its picture,
 * what it is and its figures, then its cards. `layoutId` is the card it grew
 * out of; `embedded` drops the frame's own edge (the Training tab).
 */
export function ProfileShell({ layoutId, trail, onCrumb, onBack, tone = 'watch', art, eyebrowText, title, sub, figures, action, children, reduce, isDark, embedded = false }) {
  const tint = (isDark ? TINT.dark : TINT.light)[tone];
  const content = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.22, delay: reduce || embedded ? 0 : 0.08 }} style={{ flex: 1, minHeight: 0, containerType: 'size', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!embedded && (
        <nav aria-label="Where you are" style={{ flexShrink: 0, height: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="ins-go" data-ins-back onClick={onBack} style={{ height: 28, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 11px 0 7px', borderRadius: 999, border: '1px solid var(--card-edge)', background: 'var(--ghost)', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer' }}>
            <ChevronLeft size={14} strokeWidth={2.6} aria-hidden /> Back
          </button>
          <span aria-hidden style={{ width: 1, height: 16, background: 'var(--hair)' }} />
          <ol style={{ display: 'flex', alignItems: 'center', gap: 6, margin: 0, padding: 0, listStyle: 'none', minWidth: 0 }}>
            {trail.map((c, k) => {
              const last = k === trail.length - 1;
              return (
                <li key={`${c.label}-${k}`} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  {k > 0 && <ChevronRight size={12} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)', flexShrink: 0 }} />}
                  {last
                    ? <span aria-current="page" style={{ fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                    : <button type="button" className="ins-crumb" data-ins-crumb={k} onClick={() => onCrumb(k)} style={{ border: 'none', background: 'none', padding: 0, fontSize: TYPE.body, fontWeight: 700, color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>{c.label}</button>}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <motion.header initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 0.06, ease: EASE }} className="ins-prof-head" style={{ flexShrink: 0, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderRadius: 16, background: tint.wash, border: `1px solid ${tint.edge}` }}>
        {art}
        <span style={{ minWidth: 0 }}>
          <span style={{ ...eyebrow, display: 'block' }}>{eyebrowText}</span>
          <span style={{ display: 'block', fontSize: TYPE.heading, fontWeight: 800, letterSpacing: '-0.015em', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          {sub && <span style={{ display: 'block', ...small, marginTop: 3 }}>{sub}</span>}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'stretch', gap: 8 }}>
          {figures.map((f) => (
            <span key={f.label} style={{ minWidth: 112, padding: '8px 12px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--card-edge)' }}>
              <span style={{ ...eyebrow, display: 'block' }}>{f.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                {f.node || <span className="vs-rank" style={{ fontSize: TYPE.heading, fontWeight: 900, lineHeight: 1 }}>{f.value}</span>}
                {f.delta}
              </span>
              {f.sub && <span className="ins-prof-sub" style={{ display: 'block', ...small, marginTop: 4, whiteSpace: 'nowrap' }}>{f.sub}</span>}
            </span>
          ))}
          {action}
        </span>
      </motion.header>
      <RowsGrid>
        {children}
      </RowsGrid>
    </motion.div>
  );
  if (embedded) return content;
  return (
    <motion.div
      layoutId={layoutId || undefined}
      data-ins-profile
      initial={layoutId ? false : { opacity: 0, scale: reduce ? 1 : 0.97, y: reduce ? 0 : 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ layout: reduce ? { duration: 0 } : LAYOUT, duration: reduce ? 0 : 0.35, ease: EASE }}
      style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 14px 14px', borderRadius: 18, border: '1px solid var(--card-edge)', background: 'var(--card)', boxShadow: 'var(--lift)' }}
    >
      {content}
    </motion.div>
  );
}

// A row in a list inside a profile; with `onClick` it opens something.
function Row({ onClick, children, cols, k, height = 30, label }) {
  const back = useContext(Returning.Context);
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick: (e) => { e.stopPropagation(); onClick(); }, 'aria-label': label } : {})}
      data-ins-list-row
      className={[onClick && 'ins-row', !back && 'ins-in-x'].filter(Boolean).join(' ') || undefined}
      style={{ '--d': `${Math.min(0.04 + 0.015 * k, 0.15)}s`, flexShrink: 0, height, width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 10px', margin: 0, border: 'none', borderTop: k ? '1px solid var(--hair)' : '1px solid transparent', borderRadius: 10, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </Tag>
  );
}
const nameStyle = { minWidth: 0, fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
// Column names over a list of Rows, on the same grid and padding.
function RowHeads({ cols, children }) {
  return <div aria-hidden style={{ flexShrink: 0, height: 26, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 10px', marginTop: 6, borderBottom: '1px solid var(--hair)', ...heads }}>{children}</div>;
}
const arrow = <ChevronRight className="ins-arrow" size={13} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />;
// A bar's entrance delay for the k-th row: short, so a list settles at once.
const rowDelay = (k) => Math.min(0.1 + 0.02 * k, 0.2);
// The lighter step of a colour, for the second of two bars of one measure:
// mixed with white, so on the dark theme it never darkens into severe's deep red.
const lighter = (c) => `color-mix(in srgb, ${c} 50%, #FFFFFF)`;

/**
 * Cards stacked in rows of their own inside one column of a profile, so the
 * list beside them can run the profile's full height. The rows take turns
 * when the column is short, as a profile's rows do. `style` carries the
 * column's span; `sizes` the rows' heights.
 */
function Stack({ style, sizes, children }) {
  return (
    <div style={{ ...style, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <RowsGrid sizes={sizes}>{children}</RowsGrid>
    </div>
  );
}

// The risk score as a ring, with its number in it (and "/ 100" where there is room).
function ScoreRing({ score, isDark, reduce, size = 56 }) {
  const tone = riskInk(score, isDark);
  return (
    <RingGauge value={score} size={size} stroke={size < 50 ? 4 : 6} color={tone} reduce={reduce} label={`${GLOSSARY.riskScore.name} ${scoreText(score)} of 100`}>
      <span className="vs-rank" style={{ display: 'block', fontSize: size > 60 ? TYPE.heading : size < 50 ? TYPE.strong : TYPE.figure, fontWeight: 900, textShadow: glow(tone, isDark, 0.35) }}>{scoreText(score)}</span>
      {size >= 50 && <span style={{ display: 'block', fontSize: TYPE.label, fontWeight: 800, color: 'var(--muted)', marginTop: 2 }}>/ 100</span>}
    </RingGauge>
  );
}

// Text only a screen reader hears.
const unseen = { position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 };

/**
 * A change as a profile figure, said the way a Delta chip says it: the
 * arrow and the signed size in the text ink, the colour of its verdict on
 * the ring round the arrow (good when it went the better way, bad when not,
 * context when it held), and "better" or "worse" for a screen reader.
 */
function ChangeFigure({ now, before, better, ink, unit }) {
  if (!Number.isFinite(now) || !Number.isFinite(before)) return <span className="vs-rank" style={{ fontSize: TYPE.heading, fontWeight: 900, lineHeight: 1 }}>—</span>;
  const d = now - before;
  const flat = Math.abs(d) < 0.05;
  const good = (d < 0) === (better === 'down');
  const tone = flat ? ink.context : good ? ink.good : ink.bad;
  const Icon = flat ? Minus : d > 0 ? ArrowUp : ArrowDown;
  return (
    <span data-ins-change={flat ? 'flat' : d > 0 ? 'up' : 'down'} data-ins-delta={flat ? 'flat' : good ? 'better' : 'worse'} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span aria-hidden style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 999, display: 'grid', placeItems: 'center', background: `color-mix(in srgb, ${tone} 16%, var(--base))`, boxShadow: `inset 0 0 0 2px ${tone}`, color: 'var(--text)' }}><Icon size={13} strokeWidth={3} /></span>
      <span className="vs-rank" style={{ fontSize: TYPE.heading, fontWeight: 900, lineHeight: 1, whiteSpace: 'nowrap' }}>
        {flat ? 'No change' : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(1)}`}
        {!flat && <span style={{ fontSize: TYPE.body, fontWeight: 800, marginLeft: 3 }}>{unit}</span>}
      </span>
      <span style={unseen}>{flat ? ', no change' : good ? ', better' : ', worse'}</span>
    </span>
  );
}

// Counts that sit beside the Risk Score: two of them are in it (the score
// comes from people's phishing record), two are training and are not.
const DRIVERS = [
  { id: 'repeatClickers', label: 'Repeat clickers', Icon: MousePointerClick, group: 'score' },
  { id: 'neverReported', label: 'Never reported', Icon: MailX, group: 'score' },
  { id: 'overdueTraining', label: 'Training overdue', Icon: CalendarClock, group: 'training' },
  { id: 'quizFailures', label: 'Failed the quiz again', Icon: FileX, group: 'training' },
];
const DRIVER_GROUPS = [
  { id: 'score', label: `In the ${GLOSSARY.riskScore.name}` },
  { id: 'training', label: 'Training, not in the score' },
];

// ------------------------------------------------------------------ risk

// The points each level adds to a risk score: its people's share times
// its weight (moderate 33, high 67, critical 100); low adds none.
function makeupOf(step, colors) {
  // colors is tierInk(isDark), the same object every call, so it names its theme
  const inks = tierText(colors === tierInk(true));
  return ['moderate', 'high', 'critical'].map((t) => ({ key: t, label: TIER_WORD[t], value: ((step.tiers[t] * TIER_WEIGHT[t]) / step.people) * 100, color: colors[t], ink: inks[t] }));
}

// Each risk level as a tile, the riskiest first: its people now, their
// share of everyone, and the change over the period on a chip, `good` when
// it is good news (fewer at risk, more at low), `bad` when not, `context`
// when it held. Two by two; four across when two rows would be too short
// and four fit. Hover or focus a tile for where its people were before.
const LEVEL_GAP = 8;
function LevelTiles({ moved, colors, ink, reduce, days }) {
  const [box, { w, h }] = useSize();
  const [hover, setHover] = useState(null);
  // no entrance for those who ask for less motion, or on a view the reader comes back to
  const back = useContext(Returning.Context);
  const still = Boolean(reduce || back);
  const sumOf = (pick) => moved.links.filter(pick).reduce((a, l) => a + l.n, 0);
  const levels = ['critical', 'high', 'moderate', 'low'].map((k) => ({ k, now: sumOf((l) => l.to === k), was: sumOf((l) => l.from === k), stayed: sumOf((l) => l.from === k && l.to === k) }));
  const everyone = levels.reduce((a, lv) => a + lv.now, 0) || 1;
  const four = (h - LEVEL_GAP) / 2 < 64 && (w - 3 * LEVEL_GAP) / 4 >= 112;
  const cols = four ? 4 : 2;
  const tw = (w - LEVEL_GAP * (cols - 1)) / cols;
  const th = four ? h : (h - LEVEL_GAP) / 2;
  const bar = four || th >= 80;
  const big = th >= 120;
  const shown = hover === null ? null : levels[hover];
  const chip = (d, good) => (
    <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 3, height: 20, padding: '0 7px', borderRadius: 999, background: d === 0 ? 'var(--chip)' : good ? 'var(--good-soft)' : 'var(--bad-soft)', fontSize: TYPE.small, fontWeight: 800, whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ fontSize: TYPE.label, color: d === 0 ? ink.context : good ? ink.good : ink.bad }}>{d > 0 ? '▲' : d < 0 ? '▼' : '●'}</span>{num(Math.abs(d))}
    </span>
  );
  return (
    <div ref={box} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gridAutoRows: 'minmax(0,1fr)', gap: LEVEL_GAP, marginTop: 10 }} onMouseLeave={() => setHover(null)}>
      {w > 0 && levels.map((lv, i) => {
        const d = lv.now - lv.was;
        const good = lv.k === 'low' ? d > 0 : d < 0;
        const share = lv.now / everyone;
        // a narrow tile names its level in a word; the card says it is risk
        const word = tw >= 180 ? `${TIER_WORD[lv.k]} risk` : TIER_WORD[lv.k];
        const name = <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden' }}><span aria-hidden style={{ flexShrink: 0, width: 8, height: 8, borderRadius: 3, background: colors[lv.k] }} />{word}</span>;
        const count = <span className="vs-rank" style={{ fontSize: big ? TYPE.hero : TYPE.number, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.025em' }}>{num(lv.now)}</span>;
        const of = <span style={{ ...small, whiteSpace: 'nowrap' }}>{pc(share)} of people</span>;
        return (
          <motion.div
            key={lv.k}
            data-ins-level={lv.k}
            tabIndex={0}
            role="group"
            aria-label={`${word}: ${num(lv.now)} people now, ${pc(share)} of people; ${num(lv.was)} ${days} days ago, ${num(lv.stayed)} of them still at this level`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            initial={still ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: still ? 0 : 0.3, delay: still ? 0 : 0.04 * i, ease: EASE }}
            style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: big ? 10 : 7, padding: four ? '10px 12px' : '8px 11px', borderRadius: 14, background: hover === i ? 'var(--track)' : 'var(--plate)', transition: 'background .15s ease', cursor: 'default' }}
          >
            {four ? name : <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>{name}{chip(d, good)}</span>}
            {four ? count : <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>{count}{of}</span>}
            {bar && (
              <span aria-hidden style={{ flexShrink: 0, height: 5, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
                <Fill width={`${share * 100}%`} color={colors[lv.k]} delay={0.1 + 0.03 * i} reduce={reduce} returning={still} />
              </span>
            )}
            {four && <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>{of}{chip(d, good)}</span>}
          </motion.div>
        );
      })}
      {shown && (
        <Tip x={(hover % cols) * (tw + LEVEL_GAP) + tw / 2} y={Math.floor(hover / cols) * (th + LEVEL_GAP)} w={w} edge={6}>
          <div style={{ fontSize: TYPE.body, fontWeight: 800 }}>{TIER_WORD[shown.k]} risk</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 5, fontSize: TYPE.body, fontWeight: 700 }}>Now<strong style={{ marginLeft: 'auto' }}>{num(shown.now)}</strong></div>
          <div style={{ display: 'flex', gap: 12, marginTop: 3, fontSize: TYPE.body, fontWeight: 700 }}>{days} days ago<strong style={{ marginLeft: 'auto' }}>{num(shown.was)}</strong></div>
          <div style={{ ...small, marginTop: 3 }}>{num(shown.stayed)} of them still at this level</div>
        </Tip>
      )}
    </div>
  );
}

// How many moved down a level and how many up, as two chips that also say
// which colour is which.
function MoveChips({ moved, ink }) {
  const chip = (glyph, n, word, tone, soft) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 9px', borderRadius: 999, background: soft, fontSize: TYPE.small, fontWeight: 800, whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ fontSize: TYPE.label, color: tone }}>{glyph}</span>{num(n)} {word}
    </span>
  );
  return (
    <span style={{ display: 'inline-flex', gap: 6 }}>
      {chip('▼', moved.down, 'safer', ink.good, 'var(--good-soft)')}
      {chip('▲', moved.up, 'riskier', ink.bad, 'var(--bad-soft)')}
    </span>
  );
}

export function RiskProfile({ ctx, frame }) {
  const { p, ink, isDark, reduce, open } = ctx;
  const colors = tierInk(isDark);
  const hr = change(p.now.highRisk, p.before?.highRisk, { kind: 'min', better: 'down' });
  const maxDriver = Math.max(...DRIVERS.map((d) => p.now.drivers[d.id]), 1);
  const [span, setSpan] = useState(12);
  const shownTrend = p.trend.slice(-span);
  const makeup = [['now', 'Now', p.trend.at(-1)], ['year', 'A year ago', p.trend.at(-13) || p.trend[0]]].map(([key, label, st]) => ({ key, label, total: st.score, parts: makeupOf(st, colors) }));
  const biggest = makeup[0].parts.reduce((a, x) => (x.value > a.value ? x : a));
  const maxScore = Math.max(...p.departments.map((d) => d.score)) * 1.1;
  const days = p.basis.days;
  // a narrow drivers card drops its icons, so every name reads in full
  const [driversBox, { w: driversW }] = useSize();
  const icons = driversW >= 500;
  return (
    <ProfileShell
      {...frame}
      tone="neutral"
      reduce={reduce}
      isDark={isDark}
      art={<ScoreRing score={p.now.score} isDark={isDark} reduce={reduce} size={64} />}
      eyebrowText="The organisation"
      title={`${riskWord(p.now.score)} · ${GLOSSARY.riskScore.name} ${scoreText(p.now.score)}`}
      sub={`${num(p.now.people)} people · everyone's risk level, averaged on 0 to 100`}
      figures={[
        { label: `Change, last ${days} days`, node: <ChangeFigure now={p.now.score} before={p.before?.score} better="down" ink={ink} unit="pts" />, sub: `${scoreText(p.before?.score)} → ${scoreText(p.now.score)}` },
        { label: GLOSSARY.highRisk.name, value: num(p.now.highRisk), delta: <Delta c={hr && { ...hr, shown: hr.shown.replace(' min', '') }} ink={ink} title={`Against ${days} days ago`} />, sub: `${pc1(p.now.highRisk / p.now.people)} of people` },
        { label: 'Moved down a level', value: num(p.now.improved), sub: `${num(p.now.slipped)} moved up` },
      ]}
    >
      <Stack style={{ gridColumn: 'span 8' }}>
        <Card i={3} reduce={reduce} title={`${GLOSSARY.riskScore.name} over time`} define="riskScore" action={<Segmented id="ins-range-risk" label="Time span" value={span} options={SPANS} onChange={setSpan} reduce={reduce} />} style={{ gridColumn: 'span 7' }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
            <Staircase at={shownTrend.map((s) => s.to)} values={shownTrend.map((s) => s.score)} lit={shownTrend.map((s) => s.inPeriod)} start={ink.context} good={ink.good} bad={ink.bad} format={scoreText} reduce={reduce} tipHead={(t) => `30 days to ${day(t)}`} valueLabel={GLOSSARY.riskScore.name} />
          </div>
        </Card>
        <Card i={4} reduce={reduce} title="Risk levels" define="riskLevels" action={p.moved && <MoveChips moved={p.moved} ink={ink} />} style={{ gridColumn: 'span 5' }} data-ins-moved>
          {p.moved && <LevelTiles moved={p.moved} colors={colors} ink={ink} reduce={reduce} days={days} />}
        </Card>
        <Card i={5} reduce={reduce} title="Score breakdown" define="scoreBreakdown" sub="Now vs a year ago" action={<Legend items={['moderate', 'high', 'critical'].map((t) => ({ label: TIER_WORD[t], color: colors[t] }))} />} style={{ gridColumn: 'span 5' }} data-ins-makeup>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 8 }}>
            <MakeupBars rows={makeup} max={Math.max(...makeup.map((r) => r.total)) * 1.04} reduce={reduce} format={scoreText} />
            <Insight tone={colors[biggest.key]} sub={`A year ago they added ${scoreText(makeup[1].parts.find((x) => x.key === biggest.key).value)}`}>{biggest.label}-risk people add {scoreText(biggest.value)} of the {scoreText(makeup[0].total)} points</Insight>
          </div>
        </Card>
        <Card i={6} reduce={reduce} title="Risk drivers" define="riskDrivers" style={{ gridColumn: 'span 7' }} data-ins-drivers>
          <div ref={driversBox} style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', marginTop: 6 }}>
            {DRIVER_GROUPS.map((g, gi) => (
              <div key={g.id} data-ins-driver-group={g.id} style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', gap: 14, padding: gi ? '0 0 0 18px' : '0 18px 0 0', borderLeft: gi ? '1px solid var(--hair)' : 'none' }}>
                <span style={heads}>{g.label}</span>
                {DRIVERS.filter((dr) => dr.group === g.id).map((dr, k) => {
                  const v = p.now.drivers[dr.id];
                  const c = change(v, p.before?.drivers[dr.id], { kind: 'min', better: 'down' });
                  return (
                    <div key={dr.id} style={{ display: 'grid', gridTemplateColumns: icons ? '28px minmax(0,1fr) auto' : 'minmax(0,1fr) auto', alignItems: 'center', gap: 9 }}>
                      {icons && <span aria-hidden style={{ width: 28, height: 28, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--plate)' }}><dr.Icon size={13} strokeWidth={2.4} /></span>}
                      <Meter value={v} max={maxDriver} color={ink.measure} label={num(v)} sub={dr.label} delay={rowDelay(gi * 2 + k)} reduce={reduce} height={4} />
                      <Delta c={c && { ...c, shown: c.shown.replace(' min', '') }} ink={ink} title={`Against ${days} days ago`} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      </Stack>
      <Card i={7} reduce={reduce} title="Departments" sub={`${GLOSSARY.riskScore.name}, riskiest first`} style={{ gridColumn: 'span 4' }} data-ins-risk-depts>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          <FitList items={p.departments} rowH={30} what="departments" render={(d, k) => (
            <Row key={d.name} k={k} cols="22px minmax(0,1fr) 92px 12px" onClick={() => open('department', d.name)} label={`${d.name}, ${GLOSSARY.riskScore.name} ${scoreText(d.score)}. Open its profile`}>
              <DeptCrest code={deptCode(d.name)} size={22} compact flat metal={isDark ? 'steelDark' : 'steel'} />
              <span style={nameStyle}>{d.name}</span>
              <Meter value={d.score} max={maxScore} color={riskInk(d.score, isDark)} label={scoreText(d.score)} delay={rowDelay(k)} reduce={reduce} height={4} />
              {arrow}
            </Row>
          )} />
        </div>
      </Card>
    </ProfileShell>
  );
}

// ------------------------------------------------------------------ lure

export function LureProfile({ ctx, frame, type }) {
  // `scope`: the department it was opened in (its part of every campaign);
  // `company`: the company's figures, to set it against
  const { m, ink, isDark, reduce, open, scope, company, canSeePeople, seePeople } = ctx;
  // the campaigns sit two to a row where both names fit, else one
  const [campsBox, { w: campsW }] = useSize();
  const pair = campsW >= 880;
  const l = m.lures.find((x) => x.type === type);
  if (!l) return null;
  const depts = m.lureDepts[type] || [];
  const camps = m.campaigns.filter((c) => c.type === type);
  const vsAll = change(l.hooked, m.now.hooked, { kind: 'pct', better: 'down' });
  const maxHook = Math.max(...m.lures.map((x) => x.hooked || 0)) * 1.08;
  const maxDept = Math.max(...depts.map((x) => x.hooked || 0), 0.01) * 1.08;
  // the campaigns' row is as tall as two columns of them need (up to three rows); the charts take the rest
  const campRows = Math.min(3, Math.max(1, Math.ceil(camps.length / (pair ? 2 : 1))));
  return (
    <ProfileShell
      {...frame}
      tone={healthTone(l.health?.word)}
      reduce={reduce}
      isDark={isDark}
      art={<LureTile type={type} size={54} tone="var(--base)" />}
      eyebrowText={scope ? `Campaign type · ${scope}` : 'Campaign type'}
      title={type}
      sub={`${l.campaigns} ${l.campaigns === 1 ? 'campaign' : 'campaigns'} · ${num(l.delivered)} emails${scope ? ` to ${scope}` : ''} in the last ${m.basis.days} days`}
      figures={[
        { label: GLOSSARY.hookRate.name, value: pc1(l.hooked), delta: <Delta c={vsAll} ink={ink} title="Against every campaign type together" />, sub: 'against every type' },
        // the same base as the Hook Rate and the blocks below: the emails delivered
        { label: GLOSSARY.gaveDetails.name, value: pc1(l.delivered ? l.compromised / l.delivered : null), sub: 'of emails delivered' },
        { label: GLOSSARY.health.name, node: <HealthChip h={l.health} ink={ink} />, sub: `${GLOSSARY.perClick.name} ${times(l.perClick)}` },
      ]}
    >
      <Stack style={{ gridColumn: 'span 8' }} sizes={['minmax(0,1fr)', `minmax(0,${84 + campRows * 44}px)`]}>
        <Card i={3} reduce={reduce} title="What people did" define="outcomes" style={{ gridColumn: 'span 6' }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center' }}>
            <Blocks parts={didParts(l, ink, isDark)} reduce={reduce} height={34} legendCols={2} />
            <Insight tone={ink.bad} sub={`${pc(l.reportRate)} reported it`}>{Math.round((l.hooked || 0) * 100)} in every 100 people{scope ? ` in ${scope}` : ''} who got one clicked it</Insight>
          </div>
        </Card>
        <Card i={4} reduce={reduce} title="All campaign types" define="hookRate" sub={GLOSSARY.hookRate.name} style={{ gridColumn: 'span 6' }}>
          <PillColumns
            items={m.lures.map((x) => ({ key: x.type, label: lureShort(x.type), value: x.hooked, text: pc1(x.hooked), tip: [x.type, `${num(x.clicked)} of ${num(x.delivered)} clicked · ${pc1(x.reportRate)} reported`] }))}
            lit={type}
            color={ink.bad}
            format={pc1}
            reduce={reduce}
            onOpen={(key) => { if (key !== type) open('lure', key, null, true); }}
            label="clicked. Open its profile"
          />
        </Card>
        <Card i={6} reduce={reduce} title="Campaigns" sub="Newest first" style={{ gridColumn: 'span 12' }} data-ins-lure-campaigns>
          <div ref={campsBox} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <FitList items={camps} rowH={44} cols={pair ? 2 : 1} what="campaigns" style={{ display: 'grid', gridTemplateColumns: `repeat(${pair ? 2 : 1}, minmax(0,1fr))`, gridAutoRows: 'min-content', columnGap: 24, marginTop: 4 }} render={(c, k) => (
              <Row key={c.id} k={pair ? (k > 1 ? 1 : 0) : k} height={44} cols="minmax(0,1.8fr) minmax(0,1fr) auto 12px" onClick={() => open('campaign', c.id)} label={`${c.name}: ${GLOSSARY.hookRate.name} ${pc1(c.hooked)}. Open its profile`}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ ...nameStyle, display: 'block' }}>{c.name}</span>
                  <span style={{ ...small, display: 'block', marginTop: 2 }}>Started {c.started}</span>
                </span>
                <Meter value={c.hooked} max={maxHook} color={ink.bad} label={pc1(c.hooked)} sub="clicked" delay={rowDelay(k)} reduce={reduce} height={4} />
                <span style={{ display: 'flex', justifyContent: 'flex-end' }}><HealthChip h={c.health} ink={ink} width={100} /></span>
                {arrow}
              </Row>
            )} />
          </div>
        </Card>
      </Stack>
      {scope ? (
        <AgainstCard i={5} reduce={reduce} ink={ink} title={`${scope} against the company`} sub={`${type}, the last ${m.basis.days} days`} us={l} them={company.lures.find((x) => x.type === type)} usLabel={scope} themLabel="The company" action={canSeePeople && <GoTo label="See the people" onClick={() => seePeople({ dept: scope, lure: type })} data-ins-see-people />} style={{ gridColumn: 'span 4' }} data-ins-lure-against />
      ) : (
        <Card i={5} reduce={reduce} title="Departments" define="hookRate" sub={`${GLOSSARY.hookRate.name}, highest first`} style={{ gridColumn: 'span 4' }} data-ins-lure-depts>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 4 }}>
            <FitList items={depts} rowH={30} what="departments" render={(x, k) => (
              <Row key={x.name} k={k} cols="22px minmax(0,1fr) minmax(0,1fr) 12px" onClick={() => open('department', x.name)} label={`${x.name}: ${GLOSSARY.hookRate.name} ${pc1(x.hooked)}, ${num(x.clicked)} of ${num(x.recipients)} clicked. Open its profile`}>
                <DeptCrest code={deptCode(x.name)} size={22} compact flat metal={isDark ? 'steelDark' : 'steel'} />
                <span style={nameStyle}>{x.name}</span>
                <Meter value={x.hooked} max={maxDept} color={ink.bad} label={pc1(x.hooked)} sub={`${num(x.clicked)} of ${num(x.recipients)}`} delay={rowDelay(k)} reduce={reduce} height={4} />
                {arrow}
              </Row>
            )} />
          </div>
        </Card>
      )}
    </ProfileShell>
  );
}

// -------------------------------------------------------------- campaign

// Each measure as this campaign against the average, a slim bar apiece. On
// a short card the change chips give way (the band at the top has them).
function VersusBars({ groups, max, reduce, labelW = 82 }) {
  return (
    <div className="ins-vs" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map((g, gi) => (
        <div key={g.key}>
          <div className="ins-vs-head" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: TYPE.body, fontWeight: 800 }}>{g.label}</span>
            <span className="ins-optional" style={{ marginLeft: 'auto' }}>{g.delta}</span>
          </div>
          {g.rows.map((r, k) => {
            const wd = `${Math.min(1, (r.value || 0) / max) * 100}%`;
            return (
              <div key={r.key} className="ins-vs-row" style={{ display: 'grid', gridTemplateColumns: `${labelW}px minmax(0,1fr) 44px`, alignItems: 'center', gap: 10, marginTop: k ? 6 : 0 }}>
                <span style={{ ...small, fontWeight: k ? 600 : 800, color: k ? 'var(--muted)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
                <span className="ins-vs-bar" style={{ height: 14, borderRadius: 7, background: 'var(--plate)', overflow: 'hidden' }}>
                  <Fill width={wd} color={r.color} delay={0.1 + 0.05 * (gi * 2 + k)} reduce={reduce} radius={7} />
                </span>
                <span className="vs-rank" style={{ fontSize: TYPE.strong, fontWeight: 900, textAlign: 'right' }}>{r.text}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Inside a department (Insights' scope): in place of the list of
// departments, the department's Hook Rate, Report Rate and details given
// away beside those of everyone (`them`), each with the difference.
function AgainstCard({ i, reduce, ink, title, sub, us, them, usLabel, themLabel, action, ...rest }) {
  const gave = (x) => (x?.delivered ? x.compromised / x.delivered : null);
  const rows = [
    { key: 'h', label: GLOSSARY.hookRate.name, a: us.hooked, b: them?.hooked, color: ink.bad, better: 'down' },
    { key: 'r', label: GLOSSARY.reportRate.name, a: us.reportRate, b: them?.reportRate, color: ink.good, better: 'up' },
    { key: 'g', label: GLOSSARY.gaveDetails.name, a: gave(us), b: gave(them), color: ink.severe, better: 'down' },
  ];
  return (
    <Card i={i} reduce={reduce} title={title} sub={sub} action={action} {...rest}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 6 }}>
        <VersusBars
          reduce={reduce}
          labelW={104}
          max={Math.max(0.01, ...rows.flatMap((x) => [x.a || 0, x.b || 0])) * 1.1}
          groups={rows.map((x) => ({ key: x.key, label: x.label, delta: <Delta c={change(x.a, x.b, { kind: 'pct', better: x.better })} ink={ink} title={`Against ${themLabel.toLowerCase()}`} />, rows: [{ key: 'u', label: usLabel, value: x.a, color: x.color, text: pc1(x.a) }, { key: 't', label: themLabel, value: x.b, color: ink.context, text: pc1(x.b) }] }))}
        />
      </div>
    </Card>
  );
}

// A campaign's departments: its name, then its Hook Rate and Report Rate.
const CAMP_DEPT_COLS = '22px minmax(0,1.3fr) minmax(0,1fr) minmax(0,1fr) 12px';

export function CampaignProfile({ ctx, frame, id }) {
  const { m, ink, isDark, reduce, open, scope, company } = ctx;
  const c = m.campaigns.find((x) => x.id === id);
  if (!c) return null;
  const avg = m.now;
  const depts = [...c.departments].sort((a, b) => (b.clickRate ?? 0) - (a.clickRate ?? 0));
  const maxRate = Math.max(...depts.map((x) => Math.max(x.clickRate || 0, x.reportRate || 0)), 0.01) * 1.08;
  const hook = change(c.hooked, avg.hooked, { kind: 'pct', better: 'down' });
  const report = change(c.reportRate, avg.reportRate, { kind: 'pct', better: 'up' });
  return (
    <ProfileShell
      {...frame}
      tone={healthTone(c.health?.word)}
      reduce={reduce}
      isDark={isDark}
      art={<LureTile type={c.type} size={54} tone="var(--base)" />}
      eyebrowText={`Campaign · ${c.type}${scope ? ` · ${scope}` : ''}`}
      title={c.name}
      sub={`Started ${c.started} · ${num(c.delivered)} emails delivered${scope ? ` to ${scope}` : ''}`}
      figures={[
        { label: GLOSSARY.hookRate.name, value: pc1(c.hooked), delta: <Delta c={hook} ink={ink} title="Against the period's average" />, sub: 'against the average' },
        { label: GLOSSARY.reportRate.name, value: pc1(c.reportRate), delta: <Delta c={report} ink={ink} title="Against the period's average" />, sub: 'against the average' },
        { label: GLOSSARY.health.name, node: <HealthChip h={c.health} ink={ink} />, sub: `First report after ${mins(c.firstReport)}` },
      ]}
    >
      <Stack style={{ gridColumn: 'span 7' }} sizes={['minmax(0,1.2fr)', 'minmax(0,0.8fr)']}>
        <Card i={3} reduce={reduce} title="What people did" define="outcomes" style={{ gridColumn: 'span 12' }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center' }}>
            <Blocks parts={didParts(c, ink, isDark)} reduce={reduce} height={40} legendCols={4} />
            <Insight tone={healthInk(c.health?.word, ink)} sub={`Half the reports were in ${mins(c.medianReport)} after it went out`}>{GLOSSARY.perClick.name} {times(c.perClick)}</Insight>
          </div>
        </Card>
        <Card i={4} reduce={reduce} title="Compared with average" define="vsAverage" style={{ gridColumn: 'span 12' }}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 6 }}>
            <VersusBars
              reduce={reduce}
              max={Math.max(c.hooked, avg.hooked, c.reportRate, avg.reportRate) * 1.1}
              groups={[
                { key: 'h', label: GLOSSARY.hookRate.name, delta: <Delta c={hook} ink={ink} />, rows: [{ key: 'c', label: 'This campaign', value: c.hooked, color: ink.bad, text: pc1(c.hooked) }, { key: 'a', label: scope ? 'Its average' : 'The average', value: avg.hooked, color: ink.context, text: pc1(avg.hooked) }] },
                { key: 'r', label: GLOSSARY.reportRate.name, delta: <Delta c={report} ink={ink} />, rows: [{ key: 'c', label: 'This campaign', value: c.reportRate, color: ink.good, text: pc1(c.reportRate) }, { key: 'a', label: scope ? 'Its average' : 'The average', value: avg.reportRate, color: ink.context, text: pc1(avg.reportRate) }] },
              ]}
            />
          </div>
        </Card>
      </Stack>
      {scope ? (
        <AgainstCard i={5} reduce={reduce} ink={ink} title={`${scope} against the whole campaign`} sub={`Everyone ${c.name} went to`} us={c} them={company.campaigns.find((x) => x.id === id)} usLabel={scope} themLabel="Whole campaign" style={{ gridColumn: 'span 5' }} data-ins-campaign-against />
      ) : (
        <Card i={5} reduce={reduce} title="Departments" sub={`${GLOSSARY.hookRate.name}, highest first`} style={{ gridColumn: 'span 5' }} data-ins-campaign-depts>
          <RowHeads cols={CAMP_DEPT_COLS}><span /><span>Department</span><span>{GLOSSARY.hookRate.name}</span><span>{GLOSSARY.reportRate.name}</span><span /></RowHeads>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <FitList items={depts} rowH={30} what="departments" render={(x, k) => (
              <Row key={x.name} k={k} cols={CAMP_DEPT_COLS} onClick={() => open('department', x.name)} label={`${x.name}: ${GLOSSARY.hookRate.name} ${pc1(x.clickRate)}, ${GLOSSARY.reportRate.name} ${pc1(x.reportRate)}. Open its profile`}>
                <DeptCrest code={deptCode(x.name)} size={22} compact flat metal={isDark ? 'steelDark' : 'steel'} />
                <span style={nameStyle}>{x.name}</span>
                <Meter value={x.clickRate} max={maxRate} color={ink.bad} label={pc1(x.clickRate)} delay={rowDelay(k)} reduce={reduce} height={4} />
                <Meter value={x.reportRate} max={maxRate} color={ink.good} label={pc1(x.reportRate)} delay={rowDelay(k)} reduce={reduce} height={4} />
                {arrow}
              </Row>
            )} />
          </div>
        </Card>
      )}
    </ProfileShell>
  );
}

// -------------------------------------------------------------- training

// The columns of the training lists: plain numbers, in the measure ink.
const DEPT_COLS = '20px minmax(0,1.5fr) minmax(0,1fr) 30px 12px';
const PROG_COLS = 'minmax(0,1.5fr) minmax(0,1fr) 56px';
const quiz = (v) => (Number.isFinite(v) ? v.toFixed(0) : '—');

export function TrainingProfile({ ctx, frame, embedded = false, training }) {
  const { p, ink, isDark, reduce, open } = ctx;
  const t = p.now.training;
  const c = p.now.cohorts;
  const tb = p.before?.training;
  const days = p.basis.days;
  const depts = [...p.departments].sort((a, b) => (b.training.completion ?? 0) - (a.training.completion ?? 0));
  return (
    <ProfileShell
      {...frame}
      embedded={embedded}
      tone="neutral"
      reduce={reduce}
      isDark={isDark}
      art={(
        <RingGauge value={(c?.trainedShare || 0) * 100} size={64} stroke={6} color={ink.measure} reduce={reduce} label={`${pc(c?.trainedShare)} of people have completed their training, all time`}>
          <span className="vs-rank" style={{ display: 'block', fontSize: TYPE.heading, fontWeight: 900 }}>{pc(c?.trainedShare)}</span>
          <span style={{ display: 'block', fontSize: TYPE.label, fontWeight: 800, color: 'var(--muted)', marginTop: 2 }}>trained</span>
        </RingGauge>
      )}
      eyebrowText="Training"
      title={c?.times ? `${GLOSSARY.trainingImpact.name} · ${c.times.toFixed(1)}×` : 'Training'}
      sub={`Trained, all time: ${pc(c?.trainedShare)} of ${num(p.now.people)} people`}
      figures={[
        { label: `Completed, last ${days} days`, value: pc(t.completion), delta: <Delta c={change(t.completion, tb?.completion, { kind: 'pct', better: 'up' })} ink={ink} title={`Against the ${days} days before`} />, sub: `of ${num(t.assigned)} assigned` },
        { label: 'Quiz score', value: Number.isFinite(t.quizScore) ? t.quizScore.toFixed(1) : '—', sub: 'average, of 100' },
        { label: 'Badges', value: num(t.badges), sub: `${num(t.points)} points earned` },
      ]}
    >
      <Stack style={{ gridColumn: 'span 4' }} sizes={['minmax(0,0.8fr)', 'minmax(0,1.2fr)']}>
        <Card i={embedded ? 0 : 3} reduce={reduce} title={GLOSSARY.trainingImpact.name} define="trainingImpact" sub={`${GLOSSARY.hookRate.name} in simulations`} style={{ gridColumn: 'span 12' }} data-ins-lift>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', gap: 6, marginTop: 8 }}>
            {c && <CompareBars rows={[{ key: 'un', label: 'Not yet trained', sub: `${num(c.untrained)} people`, value: c.untrainedRate, color: ink.bad, text: pc(c.untrainedRate) }, { key: 'tr', label: 'Completed training', sub: `${num(c.trained)} people`, value: c.trainedRate, color: lighter(ink.bad), text: pc(c.trainedRate) }]} reduce={reduce} height={26} />}
            {c && <Insight tone={ink.bad} sub="Across every department">Of every 100 trained people, {Math.round(c.trainedRate * 100)} clicked; of every 100 others, {Math.round(c.untrainedRate * 100)}</Insight>}
          </div>
        </Card>
        <Card i={embedded ? 1 : 4} reduce={reduce} title="Training progress" define="trainingProgress" sub={`Assigned in the last ${days} days`} style={{ gridColumn: 'span 12' }} data-ins-funnel>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
            <StepFunnel steps={[['assigned', 'Assigned', t.assigned], ['started', 'Started', t.started], ['completed', 'Completed', t.completed], ['passed', 'Passed', t.passed]].map(([key, label, value]) => ({ key, label, value }))} color={ink.measure} reduce={reduce} />
          </div>
        </Card>
      </Stack>
      <Card i={embedded ? 2 : 5} reduce={reduce} title="Departments" sub="Most complete first" style={{ gridColumn: 'span 4' }} data-ins-train-depts>
        <RowHeads cols={DEPT_COLS}><span /><span>Department</span><span>Completed</span><span style={{ textAlign: 'right' }}>Quiz</span><span /></RowHeads>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <FitList items={depts} rowH={28} what="departments" render={(d, k) => (
            <Row key={d.name} k={k} height={28} cols={DEPT_COLS} onClick={() => open('department', d.name)} label={`${d.name}: ${pc(d.training.completion)} completed, quiz ${quiz(d.training.quizScore)}. Open its profile`}>
              <DeptCrest code={deptCode(d.name)} size={20} compact flat metal={isDark ? 'steelDark' : 'steel'} />
              <span style={nameStyle}>{d.name}</span>
              <InlineBar value={d.training.completion} max={1} color={ink.measure} label={pc(d.training.completion)} delay={rowDelay(k)} reduce={reduce} />
              <span className="vs-rank" style={{ fontSize: TYPE.strong, fontWeight: 900, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{quiz(d.training.quizScore)}</span>
              {arrow}
            </Row>
          )} />
        </div>
      </Card>
      <Card i={embedded ? 3 : 6} reduce={reduce} title="Programmes" sub="Most complete first" style={{ gridColumn: 'span 4' }} data-ins-programmes>
        <RowHeads cols={PROG_COLS}><span>Programme</span><span>Completed</span><span style={{ textAlign: 'right' }}>Pass rate</span></RowHeads>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <FitList items={[...training.programmes].sort((a, b) => b.completion - a.completion)} rowH={28} what="programmes" render={(pr, k) => (
            <Row key={pr.program} k={k} height={28} cols={PROG_COLS}>
              <span style={nameStyle}>{pr.program}</span>
              <InlineBar value={pr.completion} max={100} color={ink.measure} label={`${pr.completion}%`} delay={rowDelay(k)} reduce={reduce} />
              <span className="vs-rank" style={{ fontSize: TYPE.strong, fontWeight: 900, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pr.pass}%</span>
            </Row>
          )} />
        </div>
      </Card>
    </ProfileShell>
  );
}
