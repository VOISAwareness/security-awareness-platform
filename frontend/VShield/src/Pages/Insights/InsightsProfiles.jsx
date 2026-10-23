import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, ChevronLeft, ChevronRight, FileX, MailX, MousePointerClick, Users } from 'lucide-react';

import DeptCrest from '../../GlobalComponents/DeptCrest';
import { deptCode } from '../../GlobalComponents/deptCodes';
import { Chip } from '../Leaderboard/BigPictureTables';
import { Blocks, Card, CompareBars, Donut, GapBars, Insight, Legend, MakeupBars, PillColumns, RingGauge, Segmented, Staircase, StepFunnel } from './InsightsCharts';
import { Delta, Fill, FitList, HealthChip, InlineBar, LureTile, Meter, RowsGrid } from './InsightsBits';
import { TIER_WEIGHT } from '../../services/sampleOrganisation';
import { GLOSSARY } from '../../services/glossary';
import { EASE, SPANS, STEADY_INK, TIER_RULE, TIER_TEXT, TIER_WORD, TINT, change, day, glow, heads, didParts, eyebrow, lureShort, mins, num, pc, pc1, riskInk, riskWord, small, tierInk, times, TYPE } from './insightsUi';

// Insights' profiles: where a click leads. Each grows out of the card that
// was clicked (or rises in, when there was none), with a trail at the top
// back to where it came from, a tinted band with what it is and its key
// figures, and a bento of cards below:
//   - Risk: the risk score over the year, who moved between levels, the
//     people at risk month by month, what drives it, each department;
//   - Department: its risk against the company's, where its people stand,
//     what fools the team, its training, how it handles phishing;
//   - Lure: what people did with it, against the other lures, the teams it
//     fooled most, its campaigns;
//   - Campaign: what people did, against the average, its departments;
//   - Training: trained against untrained, the funnel, each department and
//     programme.
// Everything in a profile leads on: a department, a lure, a campaign.

// the grow-in: quick and settling without a bounce, so the content it scales
// is never on show long enough to look squeezed
const LAYOUT = { type: 'tween', duration: 0.4, ease: [0.22, 1, 0.36, 1] };
const pts = (c) => c && { ...c, shown: c.shown.replace('×', ' pts').replace(' min', '') };
const ordinal = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
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

// A row that opens something, in a list inside a profile.
function Row({ onClick, children, cols, k, height = 40, label }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick: (e) => { e.stopPropagation(); onClick(); }, 'aria-label': label } : {})}
      className={onClick ? 'ins-row ins-in-x' : 'ins-in-x'}
      style={{ '--d': `${Math.min(0.12 + 0.02 * k, 0.32)}s`, flexShrink: 0, height, width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 10px', margin: 0, border: 'none', borderTop: k ? '1px solid var(--hair)' : '1px solid transparent', borderRadius: 10, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </Tag>
  );
}
const nameStyle = { minWidth: 0, fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
// Column names over a list of Rows, on the same grid and padding.
function RowHeads({ cols, children }) {
  return <div aria-hidden style={{ flexShrink: 0, height: 26, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 10px', marginTop: 8, borderBottom: '1px solid var(--hair)', ...heads }}>{children}</div>;
}
const arrow = <ChevronRight className="ins-arrow" size={13} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />;

// The risk score as a ring, with its number in it (and "/ 100" where there is room).
function ScoreRing({ score, isDark, reduce, size = 56 }) {
  const tone = riskInk(score, isDark);
  return (
    <RingGauge value={score} size={size} stroke={size < 50 ? 4 : 6} color={tone} reduce={reduce} label={`Risk Score ${scoreText(score)} of 100`}>
      <span className="vs-rank" style={{ display: 'block', fontSize: size > 60 ? TYPE.heading : size < 50 ? TYPE.strong : TYPE.figure, fontWeight: 900, textShadow: glow(tone, isDark, 0.35) }}>{scoreText(score)}</span>
      {size >= 50 && <span style={{ display: 'block', fontSize: TYPE.label, fontWeight: 800, color: 'var(--muted)', marginTop: 2 }}>/ 100</span>}
    </RingGauge>
  );
}

const DRIVERS = [
  { id: 'repeatClickers', label: 'Repeat clickers', Icon: MousePointerClick },
  { id: 'neverReported', label: 'Never reported', Icon: MailX },
  { id: 'overdueTraining', label: 'Overdue training', Icon: CalendarClock },
  { id: 'quizFailures', label: 'Failed the quiz again', Icon: FileX },
];

// ------------------------------------------------------------------ risk

// The points each level adds to a risk score: its people's share times
// its weight (moderate 33, high 67, critical 100); low adds none.
function makeupOf(step, colors) {
  return ['moderate', 'high', 'critical'].map((t) => ({ key: t, label: TIER_WORD[t], value: ((step.tiers[t] * TIER_WEIGHT[t]) / step.people) * 100, color: colors[t], ink: TIER_TEXT[t] }));
}

// Each risk level as a tile, the riskiest first: its people now, their
// share of everyone, and the change since the start of the period, teal
// when it is good news (fewer at risk, more at low) and orange when not.
function LevelTiles({ moved, colors, ink, reduce }) {
  const sumOf = (pick) => moved.links.filter(pick).reduce((a, l) => a + l.n, 0);
  const levels = ['critical', 'high', 'moderate', 'low'].map((k) => ({ k, now: sumOf((l) => l.to === k), was: sumOf((l) => l.from === k), stayed: sumOf((l) => l.from === k && l.to === k) }));
  const everyone = levels.reduce((a, lv) => a + lv.now, 0) || 1;
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, marginTop: 12 }}>
      {levels.map((lv, i) => {
        const d = lv.now - lv.was;
        const good = lv.k === 'low' ? d > 0 : d < 0;
        const tone = d === 0 ? STEADY_INK : good ? ink.good : ink.bad;
        return (
          <motion.div
            key={lv.k}
            data-ins-level={lv.k}
            title={`${num(lv.was)} at the start, ${num(lv.stayed)} of them still ${TIER_WORD[lv.k].toLowerCase()}`}
            initial={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduce ? 0 : 0.45, delay: reduce ? 0 : 0.12 + 0.05 * i, ease: EASE }}
            style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6, padding: '11px 12px', borderRadius: 14, background: 'var(--plate)' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap' }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 3, background: colors[lv.k] }} />{TIER_WORD[lv.k]} risk</span>
            <span className="vs-rank" style={{ fontSize: TYPE.number, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.025em' }}>{num(lv.now)}</span>
            <span aria-hidden style={{ height: 5, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
              <Fill width={`${(lv.now / everyone) * 100}%`} color={colors[lv.k]} delay={0.3 + 0.06 * i} reduce={reduce} />
            </span>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
              <span style={{ ...small, whiteSpace: 'nowrap' }}>{pc(lv.now / everyone)} of people</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, height: 20, padding: '0 7px', borderRadius: 999, background: d === 0 ? 'var(--chip)' : good ? 'var(--good-soft)' : 'var(--bad-soft)', fontSize: TYPE.small, fontWeight: 800, whiteSpace: 'nowrap' }}>
                <span aria-hidden style={{ fontSize: TYPE.label, color: tone }}>{d > 0 ? '▲' : d < 0 ? '▼' : '●'}</span>{num(Math.abs(d))}
              </span>
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

// How many moved down a level and how many up, as two chips that also say
// which colour is which.
function MoveChips({ moved, ink }) {
  const chip = (arrow, n, word, tone, soft) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 9px', borderRadius: 999, background: soft, fontSize: TYPE.small, fontWeight: 800, whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ fontSize: TYPE.label, color: tone }}>{arrow}</span>{num(n)} {word}
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
  const dc = pts(change(p.now.score, p.before?.score, { kind: 'times', better: 'down' }));
  const hr = change(p.now.highRisk, p.before?.highRisk, { kind: 'min', better: 'down' });
  const maxDriver = Math.max(...DRIVERS.map((d) => p.now.drivers[d.id]), 1);
  const [span, setSpan] = useState(12);
  const shownTrend = p.trend.slice(-span);
  const makeup = [['now', 'Now', p.trend.at(-1)], ['year', 'A year ago', p.trend.at(-13) || p.trend[0]]].map(([key, label, st]) => ({ key, label, total: st.score, parts: makeupOf(st, colors) }));
  const biggest = makeup[0].parts.reduce((a, x) => (x.value > a.value ? x : a));
  const maxScore = Math.max(...p.departments.map((d) => d.score)) * 1.1;
  return (
    <ProfileShell
      {...frame}
      tone="watch"
      reduce={reduce}
      isDark={isDark}
      art={<ScoreRing score={p.now.score} isDark={isDark} reduce={reduce} size={64} />}
      eyebrowText="The organisation"
      title={`${riskWord(p.now.score)} · risk score ${scoreText(p.now.score)}`}
      sub={`${num(p.now.people)} people · everyone's risk level, averaged on 0 to 100`}
      figures={[
        { label: 'Change', value: dc ? dc.shown : '—', delta: null, sub: `over the last ${p.basis.days} days` },
        { label: 'At high risk', value: num(p.now.highRisk), delta: <Delta c={hr && { ...hr, shown: hr.shown.replace(' min', '') }} ink={ink} />, sub: `${pc1(p.now.highRisk / p.now.people)} of people` },
        { label: 'Moved down a level', value: num(p.now.improved), sub: `${num(p.now.slipped)} moved up` },
      ]}
    >
      <Card i={3} reduce={reduce} title="Risk Score over time" define="riskScore" action={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}><Legend items={[{ label: 'Fell', color: ink.good }, { label: 'Rose', color: ink.bad }]} /><Segmented id="ins-range-risk" label="Time span" value={span} options={SPANS} onChange={setSpan} reduce={reduce} /></span>} style={{ gridColumn: 'span 7' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
          <Staircase at={shownTrend.map((s) => s.to)} values={shownTrend.map((s) => s.score)} lit={shownTrend.map((s) => s.inPeriod)} start={ink.neutral} good={ink.good} bad={ink.bad} format={scoreText} reduce={reduce} tipHead={(t) => `Thirty days to ${day(t)}`} />
        </div>
      </Card>
      <Card i={4} reduce={reduce} title="Risk levels" define="riskLevels" action={p.moved && <MoveChips moved={p.moved} ink={ink} />} style={{ gridColumn: 'span 5' }} data-ins-moved>
        {p.moved && <LevelTiles moved={p.moved} colors={colors} ink={ink} reduce={reduce} />}
      </Card>
      <Card i={5} reduce={reduce} title="Score breakdown" define="scoreBreakdown" sub="Now vs a year ago" action={<Legend items={['moderate', 'high', 'critical'].map((t) => ({ label: TIER_WORD[t], color: colors[t] }))} />} style={{ gridColumn: 'span 5' }} data-ins-makeup>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 8 }}>
          <MakeupBars rows={makeup} max={Math.max(...makeup.map((r) => r.total)) * 1.04} reduce={reduce} format={scoreText} />
          <Insight tone={colors[biggest.key]} sub={`A year ago they added ${scoreText(makeup[1].parts.find((x) => x.key === biggest.key).value)}`}>{biggest.label}-risk people add {scoreText(biggest.value)} of the {scoreText(makeup[0].total)} points</Insight>
        </div>
      </Card>
      <Card i={6} reduce={reduce} title="Risk drivers" define="riskDrivers" style={{ gridColumn: 'span 3' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', marginTop: 6 }}>
          {DRIVERS.map((dr, k) => {
            const v = p.now.drivers[dr.id];
            const c = change(v, p.before?.drivers[dr.id], { kind: 'min', better: 'down' });
            return (
              <div key={dr.id} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr) auto', alignItems: 'center', gap: 9 }}>
                <span aria-hidden style={{ width: 28, height: 28, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--plate)' }}><dr.Icon size={13} strokeWidth={2.4} /></span>
                <Meter value={v} max={maxDriver} color={ink.neutral} label={num(v)} sub={dr.label} delay={0.4 + 0.05 * k} reduce={reduce} height={4} />
                <Delta c={c && { ...c, shown: c.shown.replace(' min', '') }} ink={ink} />
              </div>
            );
          })}
        </div>
      </Card>
      <Card i={7} reduce={reduce} title="Departments" sub="Riskiest first" style={{ gridColumn: 'span 4' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          <FitList items={p.departments} rowH={40} what="departments" render={(d, k) => (
            <Row key={d.name} k={k} reduce={reduce} cols="22px minmax(0,1fr) 92px 12px" onClick={() => open('department', d.name)} label={`${d.name}, risk score ${scoreText(d.score)}. Open its profile`}>
              <DeptCrest code={deptCode(d.name)} size={22} compact flat metal={isDark ? 'steelDark' : 'steel'} />
              <span style={nameStyle}>{d.name}</span>
              <Meter value={d.score} max={maxScore} color={riskInk(d.score, isDark)} label={scoreText(d.score)} delay={0.4 + 0.04 * k} reduce={reduce} height={4} />
              {arrow}
            </Row>
          )} />
        </div>
      </Card>
    </ProfileShell>
  );
}

// ------------------------------------------------------------ department

export function DepartmentProfile({ ctx, frame, name }) {
  const { m, p, ink, isDark, reduce, open, canSeePeople, seePeople } = ctx;
  const d = p.departments.find((x) => x.name === name);
  if (!d) return null;
  const camp = m.departments.find((x) => x.name === name);
  const lures = m.deptLures[name] || [];
  const colors = tierInk(isDark);
  const rank = p.departments.indexOf(d) + 1;
  const dc = pts(change(d.score, d.scoreBefore, { kind: 'times', better: 'down' }));
  const company = p.now.score;
  const diff = d.score - company;
  const c = d.cohorts;
  return (
    <ProfileShell
      {...frame}
      tone={diff > 0 ? 'bad' : 'good'}
      reduce={reduce}
      isDark={isDark}
      art={<DeptCrest code={deptCode(name)} size={58} metal={isDark ? 'steelDark' : 'steel'} />}
      eyebrowText="Department"
      title={name}
      sub={`${num(d.people)} people · the ${ordinal(rank)} highest risk of ${p.departments.length} departments`}
      figures={[
        { label: 'Risk Score', node: <ScoreRing score={d.score} isDark={isDark} reduce={reduce} size={46} />, delta: <Delta c={dc} ink={ink} title="Against the start of the period" />, sub: `Company ${scoreText(company)}` },
        { label: 'At high risk', value: num(d.highRisk), sub: `${pc1(d.highRisk / d.people)} of its people` },
        { label: 'Trained', value: pc(c?.trainedShare), sub: c?.times ? `${GLOSSARY.trainingImpact.name} ${c.times.toFixed(1)}×` : '' },
      ]}
      action={canSeePeople ? (
        <button type="button" className="ins-cta" data-ins-people-link onClick={seePeople} style={{ alignSelf: 'center', height: 32, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 13px', borderRadius: 999, border: 'none', background: 'var(--brand)', color: '#FFFFFF', boxShadow: '0 6px 16px rgba(230,0,0,0.22)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Users size={13} strokeWidth={2.4} aria-hidden /> See its people
        </button>
      ) : null}
    >
      <Card i={3} reduce={reduce} title="Compared with company" define="vsCompany" action={<Legend items={[{ label: 'Riskier than the company', color: ink.bad }, { label: 'Safer', color: ink.good }]} />} style={{ gridColumn: 'span 7' }} data-ins-gap>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 4 }}>
          <GapBars at={p.trend.slice(-12).map((s) => s.to)} values={d.trend.slice(-12)} base={p.trend.slice(-12).map((s) => s.score)} lit={p.trend.slice(-12).map((s) => s.inPeriod)} good={ink.good} bad={ink.bad} reduce={reduce} tipHead={(t) => `Thirty days to ${day(t)}`} valueLabel={name.length > 18 ? 'This department' : name} baseLabel="The whole company" />
        </div>
      </Card>
      <Card i={4} reduce={reduce} title="People by risk level" define="riskLevels" style={{ gridColumn: 'span 5' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
          <Donut
            label={`${name}: ${['low', 'moderate', 'high', 'critical'].map((t) => `${num(d.tiers[t])} ${TIER_WORD[t].toLowerCase()} risk`).join(', ')}`}
            parts={['low', 'moderate', 'high', 'critical'].map((t) => ({ key: t, label: `${TIER_WORD[t]} risk`, value: d.tiers[t], color: colors[t], title: TIER_RULE[t] }))}
          >
            <span className="vs-rank" style={{ fontSize: TYPE.number, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.025em' }}>{pc(d.highRisk / d.people)}</span>
            <span style={{ ...small, fontWeight: 700, marginTop: 4 }}>at high risk</span>
            <span style={{ ...small, fontSize: TYPE.label, marginTop: 2 }}>company {pc(p.now.highRisk / p.now.people)}</span>
          </Donut>
        </div>
      </Card>
      <Card i={5} reduce={reduce} title="Hook Rate by campaign type" define="hookRate" style={{ gridColumn: 'span 5' }}>
        {lures.length
          ? <PillColumns items={lures.map((l) => ({ key: l.type, label: lureShort(l.type), value: l.hooked, text: pc(l.hooked), tip: [l.type, `${num(l.clicked)} of ${num(l.recipients)} clicked · ${pc(l.reportRate)} reported`] }))} color={ink.bad} soft="var(--soft-bad)" reduce={reduce} onOpen={(type) => open('lure', type)} label="clicked. Open the lure" />
          : <p style={{ ...small, fontSize: TYPE.body }}>No campaigns reached this team in the period.</p>}
      </Card>
      <Card i={6} reduce={reduce} title="Training impact" define="trainingImpact" style={{ gridColumn: 'span 4' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center' }}>
          {c && <CompareBars rows={[{ key: 'un', label: 'Not yet trained', sub: `${num(c.untrained)} people`, value: c.untrainedRate, color: ink.bad, text: pc(c.untrainedRate) }, { key: 'tr', label: 'Completed training', sub: `${num(c.trained)} people`, value: c.trainedRate, color: ink.good, text: pc(c.trainedRate) }]} reduce={reduce} height={28} />}
        </div>
      </Card>
      <Card i={7} reduce={reduce} title="What people did" define="outcomes" style={{ gridColumn: 'span 3' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center' }}>
          {camp ? <Blocks parts={didParts({ delivered: camp.recipients, reported: camp.reported, clicked: camp.clicked, compromised: camp.compromised }, ink, isDark)} reduce={reduce} height={26} legendCols={2} /> : <p style={{ ...small, fontSize: TYPE.body }}>No emails in the period.</p>}
        </div>
      </Card>
    </ProfileShell>
  );
}

// ------------------------------------------------------------------ lure

export function LureProfile({ ctx, frame, type }) {
  const { m, ink, isDark, reduce, open } = ctx;
  const l = m.lures.find((x) => x.type === type);
  if (!l) return null;
  const depts = (m.lureDepts[type] || []).slice(0, 6);
  const camps = m.campaigns.filter((c) => c.type === type);
  const vsAll = change(l.hooked, m.now.hooked, { kind: 'pct', better: 'down' });
  const maxHook = Math.max(...m.lures.map((x) => x.hooked || 0)) * 1.08;
  const maxDept = Math.max(...depts.map((x) => x.hooked || 0), 0.01) * 1.08;
  return (
    <ProfileShell
      {...frame}
      tone="bad"
      reduce={reduce}
      isDark={isDark}
      art={<LureTile type={type} size={54} tone="var(--base)" />}
      eyebrowText="Campaign type"
      title={type}
      sub={`${l.campaigns} ${l.campaigns === 1 ? 'campaign' : 'campaigns'} · ${num(l.delivered)} emails in the last ${m.basis.days} days`}
      figures={[
        { label: 'Hook Rate', value: pc1(l.hooked), delta: <Delta c={vsAll} ink={ink} title="Against every campaign type together" />, sub: 'against every type' },
        { label: 'Gave details away', value: pc(l.gaveOfClicks), sub: 'of those who clicked' },
        { label: 'Health', node: <HealthChip h={l.health} ink={ink} />, sub: `${GLOSSARY.perClick.name} ${times(l.perClick)}` },
      ]}
    >
      <Card i={3} reduce={reduce} title="What people did" define="outcomes" style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center' }}>
          <Blocks parts={didParts(l, ink, isDark)} reduce={reduce} height={40} legendCols={4} />
          <Insight tone={ink.bad} sub={`${pc(l.reportRate)} reported it`}>{Math.round((l.hooked || 0) * 100)} in every 100 people who got one clicked it</Insight>
        </div>
      </Card>
      <Card i={4} reduce={reduce} title="All campaign types" define="hookRate" sub="Hook Rate" style={{ gridColumn: 'span 6' }}>
        <PillColumns
          items={m.lures.map((x) => ({ key: x.type, label: lureShort(x.type), value: x.hooked, text: pc1(x.hooked), tip: [x.type, `${num(x.clicked)} of ${num(x.delivered)} clicked · ${pc(x.reportRate)} reported`] }))}
          lit={type}
          color={ink.bad}
          soft="var(--soft-bad)"
          reduce={reduce}
          onOpen={(key) => { if (key !== type) open('lure', key, null, true); }}
          label="clicked. Open its profile"
        />
      </Card>
      <Card i={5} reduce={reduce} title="Most affected departments" define="hookRate" sub="Hook Rate" style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          <FitList items={depts} rowH={34} what="departments" render={(x, k) => (
            <Row key={x.name} k={k} reduce={reduce} height={34} cols="22px minmax(0,1fr) minmax(0,1.4fr) 12px" onClick={() => open('department', x.name)} label={`${x.name}: ${pc1(x.hooked)} clicked. Open its profile`}>
              <DeptCrest code={deptCode(x.name)} size={22} compact flat metal={isDark ? 'steelDark' : 'steel'} />
              <span style={nameStyle}>{x.name}</span>
              <Meter value={x.hooked} max={maxDept} color={ink.bad} label={pc1(x.hooked)} sub={`${num(x.clicked)} of ${num(x.recipients)}`} delay={0.4 + 0.04 * k} reduce={reduce} height={5} />
              {arrow}
            </Row>
          )} />
        </div>
      </Card>
      <Card i={6} reduce={reduce} title="Campaigns" sub="Newest first" style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          <FitList items={camps} rowH={46} what="campaigns" render={(c, k) => (
            <Row key={c.id} k={k} reduce={reduce} height={46} cols="minmax(0,1.4fr) minmax(0,1fr) 112px 12px" onClick={() => open('campaign', c.id)} label={`${c.name}. Open its profile`}>
              <span style={{ minWidth: 0 }}>
                <span style={{ ...nameStyle, display: 'block' }}>{c.name}</span>
                <span style={{ ...small, display: 'block', marginTop: 2 }}>Started {c.started}</span>
              </span>
              <Meter value={c.hooked} max={maxHook} color={ink.bad} label={pc1(c.hooked)} sub="clicked" delay={0.4 + 0.04 * k} reduce={reduce} height={4} />
              <span style={{ display: 'flex', justifyContent: 'flex-end' }}><HealthChip h={c.health} ink={ink} /></span>
              {arrow}
            </Row>
          )} />
        </div>
      </Card>
    </ProfileShell>
  );
}

// -------------------------------------------------------------- campaign

// Each measure as this campaign against the average, a slim bar apiece. On
// a short card the change chips give way (the band at the top has them).
function VersusBars({ groups, max, reduce }) {
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
              <div key={r.key} className="ins-vs-row" style={{ display: 'grid', gridTemplateColumns: '82px minmax(0,1fr) 44px', alignItems: 'center', gap: 10, marginTop: k ? 6 : 0 }}>
                <span style={{ ...small, fontWeight: k ? 600 : 800, color: k ? 'var(--muted)' : 'var(--text)' }}>{r.label}</span>
                <span className="ins-vs-bar" style={{ height: 14, borderRadius: 7, background: 'var(--plate)', overflow: 'hidden' }}>
                  <Fill width={wd} color={r.color} delay={0.25 + 0.08 * (gi * 2 + k)} reduce={reduce} radius={7} />
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

export function CampaignProfile({ ctx, frame, id }) {
  const { m, ink, isDark, reduce, open } = ctx;
  const c = m.campaigns.find((x) => x.id === id);
  if (!c) return null;
  const avg = m.now;
  const depts = [...c.departments].sort((a, b) => (b.clickRate ?? 0) - (a.clickRate ?? 0));
  const maxRate = Math.max(...depts.map((x) => Math.max(x.clickRate || 0, x.reportRate || 0)), 0.01) * 1.08;
  return (
    <ProfileShell
      {...frame}
      tone={c.health?.word === 'Exposed' ? 'bad' : 'good'}
      reduce={reduce}
      isDark={isDark}
      art={<LureTile type={c.type} size={54} tone="var(--base)" />}
      eyebrowText={`Campaign · ${c.type}`}
      title={c.name}
      sub={`Started ${c.started} · ${num(c.delivered)} emails delivered`}
      figures={[
        { label: 'Hook Rate', value: pc1(c.hooked), delta: <Delta c={change(c.hooked, avg.hooked, { kind: 'pct', better: 'down' })} ink={ink} title="Against the period's average" />, sub: 'against the average' },
        { label: 'Report Rate', value: pc1(c.reportRate), delta: <Delta c={change(c.reportRate, avg.reportRate, { kind: 'pct', better: 'up' })} ink={ink} title="Against the period's average" />, sub: 'against the average' },
        { label: 'Health', node: <HealthChip h={c.health} ink={ink} />, sub: `First report after ${mins(c.firstReport)}` },
      ]}
    >
      <Card i={3} reduce={reduce} title="What people did" define="outcomes" style={{ gridColumn: 'span 7' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center' }}>
          <Blocks parts={didParts(c, ink, isDark)} reduce={reduce} height={44} legendCols={4} />
          <Insight tone={c.perClick >= 2 ? ink.good : ink.bad} sub={`Half the reports were in ${mins(c.medianReport)} after it went out`}>{GLOSSARY.perClick.name} {times(c.perClick)}</Insight>
        </div>
      </Card>
      <Card i={4} reduce={reduce} title="Compared with average" define="vsAverage" style={{ gridColumn: 'span 5' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 8 }}>
          <VersusBars
            reduce={reduce}
            max={Math.max(c.hooked, avg.hooked, c.reportRate, avg.reportRate) * 1.1}
            groups={[
              { key: 'h', label: 'Hook Rate', delta: <Delta c={change(c.hooked, avg.hooked, { kind: 'pct', better: 'down' })} ink={ink} />, rows: [{ key: 'c', label: 'This campaign', value: c.hooked, color: ink.bad, text: pc1(c.hooked) }, { key: 'a', label: 'The average', value: avg.hooked, color: STEADY_INK, text: pc1(avg.hooked) }] },
              { key: 'r', label: 'Report Rate', delta: <Delta c={change(c.reportRate, avg.reportRate, { kind: 'pct', better: 'up' })} ink={ink} />, rows: [{ key: 'c', label: 'This campaign', value: c.reportRate, color: ink.good, text: pc1(c.reportRate) }, { key: 'a', label: 'The average', value: avg.reportRate, color: STEADY_INK, text: pc1(avg.reportRate) }] },
            ]}
          />
        </div>
      </Card>
      <Card i={5} reduce={reduce} title="Departments" action={<Legend items={[{ label: 'Clicked', color: ink.bad }, { label: 'Reported', color: ink.good }]} />} style={{ gridColumn: 'span 12' }}>
        <FitList items={depts} rowH={36} cols={2} what="departments" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gridAutoRows: 'min-content', columnGap: 24, marginTop: 6 }} render={(x, k) => (
            <Row key={x.name} k={k > 1 ? 1 : 0} reduce={reduce} height={36} cols="22px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 12px" onClick={() => open('department', x.name)} label={`${x.name}. Open its profile`}>
              <DeptCrest code={deptCode(x.name)} size={22} compact flat metal={isDark ? 'steelDark' : 'steel'} />
              <span style={nameStyle}>{x.name}</span>
              <Meter value={x.clickRate} max={maxRate} color={ink.bad} label={pc1(x.clickRate)} delay={0.4 + 0.03 * k} reduce={reduce} height={4} />
              <Meter value={x.reportRate} max={maxRate} color={ink.good} label={pc1(x.reportRate)} delay={0.45 + 0.03 * k} reduce={reduce} height={4} />
              {arrow}
            </Row>
          )} />
      </Card>
    </ProfileShell>
  );
}

// -------------------------------------------------------------- training

const STATUS = { Good: 'good', Average: 'steady', 'Needs Work': 'bad' };
const DEPT_COLS = '22px minmax(0,1fr) minmax(0,1.1fr) 40px 12px';
const PROG_COLS = 'minmax(0,1.4fr) minmax(0,1.2fr) 64px 96px';
const STATUS_WORD = { Good: 'Good', Average: 'Average', 'Needs Work': 'Needs work' };

export function TrainingProfile({ ctx, frame, embedded = false, training }) {
  const { p, ink, isDark, reduce, open } = ctx;
  const t = p.now.training;
  const c = p.now.cohorts;
  const tb = p.before?.training;
  const depts = [...p.departments].sort((a, b) => (b.training.completion ?? 0) - (a.training.completion ?? 0));
  return (
    <ProfileShell
      {...frame}
      embedded={embedded}
      tone="good"
      reduce={reduce}
      isDark={isDark}
      art={(
        <RingGauge value={(c?.trainedShare || 0) * 100} size={64} stroke={6} color={ink.good} reduce={reduce} label={`${pc(c?.trainedShare)} have completed their training`}>
          <span className="vs-rank" style={{ display: 'block', fontSize: TYPE.heading, fontWeight: 900 }}>{pc(c?.trainedShare)}</span>
          <span style={{ display: 'block', fontSize: TYPE.label, fontWeight: 800, color: 'var(--muted)', marginTop: 2 }}>trained</span>
        </RingGauge>
      )}
      eyebrowText="Training"
      title={c?.times ? `${GLOSSARY.trainingImpact.name} · ${c.times.toFixed(1)}×` : 'Training'}
      sub={`${pc(c?.trainedShare)} of ${num(p.now.people)} people have completed their training`}
      figures={[
        { label: 'Completed', value: pc(t.completion), delta: <Delta c={change(t.completion, tb?.completion, { kind: 'pct', better: 'up' })} ink={ink} />, sub: `of ${num(t.assigned)} assigned` },
        { label: 'Quiz score', value: Number.isFinite(t.quizScore) ? t.quizScore.toFixed(1) : '—', sub: 'average, of 100' },
        { label: 'Badges', value: num(t.badges), sub: `${num(t.points)} points earned` },
      ]}
    >
      <Card i={embedded ? 0 : 3} reduce={reduce} title="Trained vs untrained" define="trainingImpact" sub="Hook Rate in simulations" style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', gap: 6, marginTop: 10 }}>
          {c && <CompareBars rows={[{ key: 'un', label: 'Not yet trained', sub: `${num(c.untrained)} people`, value: c.untrainedRate, color: ink.bad, text: pc(c.untrainedRate) }, { key: 'tr', label: 'Completed training', sub: `${num(c.trained)} people`, value: c.trainedRate, color: ink.good, text: pc(c.trainedRate) }]} reduce={reduce} height={26} />}
          {c && <Insight tone={ink.good} sub="Across every department; each has its own on its profile">Of every 100 trained people, {Math.round(c.trainedRate * 100)} clicked; of every 100 others, {Math.round(c.untrainedRate * 100)}</Insight>}
        </div>
      </Card>
      <Card i={embedded ? 1 : 4} reduce={reduce} title="Training progress" define="trainingProgress" style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
          <StepFunnel steps={[['assigned', 'Assigned', t.assigned], ['started', 'Started', t.started], ['completed', 'Completed', t.completed], ['passed', 'Passed', t.passed]].map(([key, label, value]) => ({ key, label, value }))} color={ink.good} reduce={reduce} />
        </div>
      </Card>
      <Card i={embedded ? 2 : 5} reduce={reduce} title="Departments" sub="Most complete first" style={{ gridColumn: 'span 5' }} data-ins-train-depts>
        <RowHeads cols={DEPT_COLS}><span /><span>Department</span><span>Completed</span><span style={{ textAlign: 'right' }}>Quiz</span><span /></RowHeads>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <FitList items={depts} rowH={34} what="departments" render={(d, k) => (
            <Row key={d.name} k={k} reduce={reduce} height={34} cols={DEPT_COLS} onClick={() => open('department', d.name)} label={`${d.name}: ${pc(d.training.completion)} completed, quiz ${Number.isFinite(d.training.quizScore) ? d.training.quizScore.toFixed(0) : '—'}. Open its profile`}>
              <DeptCrest code={deptCode(d.name)} size={22} compact flat metal={isDark ? 'steelDark' : 'steel'} />
              <span style={nameStyle}>{d.name}</span>
              <InlineBar value={d.training.completion} max={1} color={ink.good} label={pc(d.training.completion)} delay={0.4 + 0.03 * k} reduce={reduce} />
              <span className="vs-rank" style={{ fontSize: TYPE.strong, fontWeight: 900, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Number.isFinite(d.training.quizScore) ? d.training.quizScore.toFixed(0) : '—'}</span>
              {arrow}
            </Row>
          )} />
        </div>
      </Card>
      <Card i={embedded ? 3 : 6} reduce={reduce} title="Programmes" style={{ gridColumn: 'span 7' }} data-ins-programmes>
        <RowHeads cols={PROG_COLS}><span>Programme</span><span>Completed</span><span style={{ textAlign: 'right' }}>Pass rate</span><span style={{ textAlign: 'right' }}>Status</span></RowHeads>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <FitList items={training.programmes} rowH={34} what="programmes" render={(pr, k) => (
            <Row key={pr.program} k={k} reduce={reduce} height={34} cols={PROG_COLS}>
              <span style={nameStyle}>{pr.program}</span>
              <InlineBar value={pr.completion} max={100} color={ink.good} label={`${pr.completion}%`} delay={0.4 + 0.03 * k} reduce={reduce} />
              <span className="vs-rank" style={{ fontSize: TYPE.strong, fontWeight: 900, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pr.pass}%</span>
              <span style={{ display: 'flex', justifyContent: 'flex-end' }}><Chip color={STATUS[pr.status] === 'steady' ? STEADY_INK : ink[STATUS[pr.status]]} width={92}>{STATUS_WORD[pr.status] || pr.status}</Chip></span>
            </Row>
          )} />
        </div>
      </Card>
    </ProfileShell>
  );
}
