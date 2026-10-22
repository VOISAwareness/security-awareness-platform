import { motion } from 'framer-motion';
import { CalendarClock, ChevronLeft, ChevronRight, FileX, MailX, MousePointerClick, Users } from 'lucide-react';

import DeptCrest from '../../GlobalComponents/DeptCrest';
import { deptCode } from '../../GlobalComponents/deptCodes';
import { Chip } from '../Leaderboard/BigPictureTables';
import { TONE_TINT } from '../Leaderboard/bigPictureArt';
import { useFitRows } from '../Leaderboard/useFitRows';
import { Blocks, Card, CompareBars, Insight, Legend, LevelFlow, PillColumns, RingGauge, StackColumns, StepFunnel, TexturedTrend } from './InsightsCharts';
import { Delta, HealthChip, LureTile, Meter } from './InsightsBits';
import { EASE, STEADY_INK, TIER_WORD, change, day, didParts, eyebrow, lureShort, mins, num, openInk, pc, pc1, riskWord, small, tierInk, times } from './insightsUi';

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

const DAY = 86400000;
const LAYOUT = { type: 'spring', stiffness: 210, damping: 30, mass: 0.9 };
const pts = (c) => c && { ...c, shown: c.shown.replace('×', ' pts').replace(' min', '') };
const monthShort = (t) => new Date(t).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
const ordinal = (n) => `${n}${n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th'}`;
const scoreText = (v, tick) => (Number.isFinite(v) ? (tick ? `${Math.round(v)}` : v.toFixed(1)) : '—');

/**
 * A profile's frame: the trail and Back, a tinted band with its picture,
 * what it is and its figures, then its cards. `layoutId` is the card it grew
 * out of; `embedded` drops the frame's own edge (the Training tab).
 */
export function ProfileShell({ layoutId, trail, onCrumb, onBack, tone = 'watch', art, eyebrowText, title, sub, figures, action, children, reduce, isDark, embedded = false }) {
  const tint = (isDark ? TONE_TINT.dark : TONE_TINT.light)[tone];
  const content = (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.3, delay: reduce || embedded ? 0 : 0.2 }} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!embedded && (
        <nav aria-label="Where you are" style={{ flexShrink: 0, height: 28, display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" className="ins-go" data-ins-back onClick={onBack} style={{ height: 28, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 11px 0 7px', borderRadius: 999, border: '1px solid var(--hair)', background: 'var(--base)', color: 'var(--text)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
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
                    ? <span aria-current="page" style={{ fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                    : <button type="button" className="ins-crumb" data-ins-crumb={k} onClick={() => onCrumb(k)} style={{ border: 'none', background: 'none', padding: 0, fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>{c.label}</button>}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      <motion.header initial={{ opacity: 0, y: reduce ? 0 : 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.25, ease: EASE }} style={{ flexShrink: 0, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderRadius: 16, background: tint.wash, border: `1px solid ${tint.edge}` }}>
        {art}
        <span style={{ minWidth: 0 }}>
          <span style={{ ...eyebrow, display: 'block' }}>{eyebrowText}</span>
          <span style={{ display: 'block', fontSize: 19, fontWeight: 800, letterSpacing: '-0.015em', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          {sub && <span style={{ display: 'block', ...small, marginTop: 3 }}>{sub}</span>}
        </span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'stretch', gap: 8 }}>
          {figures.map((f) => (
            <span key={f.label} style={{ minWidth: 112, padding: '8px 12px', borderRadius: 12, background: 'var(--base)', border: '1px solid var(--hair)' }}>
              <span style={{ ...eyebrow, display: 'block', fontSize: 8 }}>{f.label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                {f.node || <span className="vs-rank" style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{f.value}</span>}
                {f.delta}
              </span>
              {f.sub && <span style={{ display: 'block', ...small, fontSize: 9, marginTop: 4, whiteSpace: 'nowrap' }}>{f.sub}</span>}
            </span>
          ))}
          {action}
        </span>
      </motion.header>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>
        {children}
      </div>
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
      style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 14px 14px', borderRadius: 18, border: '1px solid var(--hair)', background: 'var(--base)', boxShadow: '0 24px 60px rgba(15,23,42,0.10)' }}
    >
      {content}
    </motion.div>
  );
}

// A row that opens something, in a list inside a profile.
function Row({ onClick, children, cols, k, reduce, height = 40, label }) {
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick: (e) => { e.stopPropagation(); onClick(); }, 'aria-label': label } : {})}
      className={onClick ? 'ins-row' : undefined}
      initial={{ opacity: 0, x: reduce ? 0 : 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.3 + 0.04 * k, ease: EASE }}
      style={{ flexShrink: 0, height, width: '100%', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 10px', margin: 0, border: 'none', borderTop: k ? '1px solid var(--hair)' : '1px solid transparent', borderRadius: 10, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </Tag>
  );
}
const nameStyle = { minWidth: 0, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const arrow = <ChevronRight className="ins-arrow" size={13} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />;

// The risk score as a ring, with its number in it.
function ScoreRing({ score, ink, reduce, size = 56 }) {
  return (
    <RingGauge value={score} size={size} stroke={size < 50 ? 4 : 6} color={ink.bad} reduce={reduce} label={`Risk score ${scoreText(score)} of 100`}>
      <span className="vs-rank" style={{ display: 'block', fontSize: size > 60 ? 18 : size < 50 ? 11 : 14, fontWeight: 900 }}>{scoreText(score)}</span>
      <span style={{ display: 'block', fontSize: size < 50 ? 6.5 : 7.5, fontWeight: 800, color: 'var(--muted)', marginTop: size < 50 ? 1 : 2 }}>/ 100</span>
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

export function RiskProfile({ ctx, frame }) {
  const { p, ink, isDark, reduce, open } = ctx;
  const colors = tierInk(isDark);
  const top = Math.ceil(Math.max(...p.trend.map((s) => s.score)) / 5) * 5 + 5;
  const dc = pts(change(p.now.score, p.before?.score, { kind: 'times', better: 'down' }));
  const hr = change(p.now.highRisk, p.before?.highRisk, { kind: 'min', better: 'down' });
  const maxDriver = Math.max(...DRIVERS.map((d) => p.now.drivers[d.id]), 1);
  const maxScore = Math.max(...p.departments.map((d) => d.score)) * 1.1;
  const [fit, size] = useFitRows(40, 3, 0);
  return (
    <ProfileShell
      {...frame}
      tone="bad"
      reduce={reduce}
      isDark={isDark}
      art={<ScoreRing score={p.now.score} ink={ink} reduce={reduce} size={64} />}
      eyebrowText="The organisation"
      title={`${riskWord(p.now.score)} · risk score ${scoreText(p.now.score)}`}
      sub={`${num(p.now.people)} people · everyone's risk level, averaged on 0 to 100`}
      figures={[
        { label: 'Change', value: dc ? dc.shown : '—', delta: null, sub: `over the last ${p.basis.days} days` },
        { label: 'At high risk', value: num(p.now.highRisk), delta: <Delta c={hr && { ...hr, shown: hr.shown.replace(' min', '') }} ink={ink} />, sub: `${pc1(p.now.highRisk / p.now.people)} of people` },
        { label: 'Moved down a level', value: num(p.now.improved), sub: `${num(p.now.slipped)} moved up` },
      ]}
    >
      <Card i={3} reduce={reduce} title="Risk over the year" sub="Thirty days at a time · lower is safer" style={{ gridColumn: 'span 7' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 4 }}>
          <TexturedTrend at={p.trend.map((s) => s.to)} values={p.trend.map((s) => s.score)} from={p.basis.end - p.basis.days * DAY} color={ink.bad} format={scoreText} top={top} pill={dc && `${dc.dir === 'down' ? '▼' : dc.dir === 'up' ? '▲' : '●'} ${dc.shown} · last ${p.basis.days} days`} reduce={reduce} tipHead={(t) => `Thirty days to ${day(t)}`} />
        </div>
      </Card>
      <Card i={4} reduce={reduce} title="Who moved between levels" sub={`From the start of the last ${p.basis.days} days to now`} action={<Legend items={[{ label: 'Down a level', color: ink.good }, { label: 'Up a level', color: ink.bad }, { label: 'Joined', color: openInk(isDark) }]} />} style={{ gridColumn: 'span 5' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 10 }}>
          {p.moved && <LevelFlow links={p.moved.links} order={['critical', 'high', 'moderate', 'low']} colors={colors} words={TIER_WORD} good={ink.good} bad={ink.bad} joinedColor={openInk(isDark)} reduce={reduce} />}
        </div>
      </Card>
      <Card i={5} reduce={reduce} title="People at risk, month by month" sub={`Moderate risk or higher · the last ${p.basis.days} days in full colour`} action={<Legend items={['critical', 'high', 'moderate'].map((t) => ({ label: TIER_WORD[t], color: colors[t] }))} />} style={{ gridColumn: 'span 5' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 12 }}>
          <StackColumns columns={p.trend.map((s) => ({ key: s.to, label: monthShort(s.to), values: s.tiers, current: s.inPeriod }))} order={['critical', 'high', 'moderate']} colors={colors} words={TIER_WORD} reduce={reduce} tipHead={(c) => `Thirty days to ${day(c.key)}`} />
        </div>
      </Card>
      <Card i={6} reduce={reduce} title="What drives it" sub="People, as things stand" style={{ gridColumn: 'span 3' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', marginTop: 6 }}>
          {DRIVERS.map((dr, k) => {
            const v = p.now.drivers[dr.id];
            const c = change(v, p.before?.drivers[dr.id], { kind: 'min', better: 'down' });
            return (
              <div key={dr.id} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr) auto', alignItems: 'center', gap: 9 }}>
                <span aria-hidden style={{ width: 28, height: 28, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--plate)' }}><dr.Icon size={13} strokeWidth={2.4} /></span>
                <Meter value={v} max={maxDriver} color={ink.bad} label={num(v)} sub={dr.label} delay={0.4 + 0.05 * k} reduce={reduce} height={4} />
                <Delta c={c && { ...c, shown: c.shown.replace(' min', '') }} ink={ink} />
              </div>
            );
          })}
        </div>
      </Card>
      <Card i={7} reduce={reduce} title="Departments" sub="The riskiest first · each opens its profile" style={{ gridColumn: 'span 4' }}>
        <div ref={fit} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          {p.departments.slice(0, size).map((d, k) => (
            <Row key={d.name} k={k} reduce={reduce} cols="22px minmax(0,1fr) 92px 12px" onClick={() => open('department', d.name)} label={`${d.name}, risk score ${scoreText(d.score)}. Open its profile`}>
              <DeptCrest code={deptCode(d.name)} size={22} compact metal={isDark ? 'steelDark' : 'steel'} />
              <span style={nameStyle}>{d.name}</span>
              <Meter value={d.score} max={maxScore} color={ink.bad} label={scoreText(d.score)} delay={0.4 + 0.04 * k} reduce={reduce} height={4} />
              {arrow}
            </Row>
          ))}
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
  const top = Math.ceil(Math.max(...d.trend, ...p.trend.map((s) => s.score)) / 5) * 5 + 5;
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
        { label: 'Risk score', node: <ScoreRing score={d.score} ink={ink} reduce={reduce} size={46} />, delta: <Delta c={dc} ink={ink} title="Against the start of the period" />, sub: `Company ${scoreText(company)}` },
        { label: 'At high risk', value: num(d.highRisk), sub: `${pc1(d.highRisk / d.people)} of its people` },
        { label: 'Trained', value: pc(c?.trainedShare), sub: c?.times ? `${c.times.toFixed(1)}× less likely to click` : '' },
      ]}
      action={canSeePeople ? (
        <button type="button" className="ins-go" data-ins-people-link onClick={seePeople} style={{ alignSelf: 'center', height: 32, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 999, border: 'none', background: 'var(--ink)', color: 'var(--ink-on)', fontSize: 10.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <Users size={13} strokeWidth={2.4} aria-hidden /> See its people
        </button>
      ) : null}
    >
      <Card i={3} reduce={reduce} title="Its risk against the company's" sub="Thirty days at a time · lower is safer" action={<Legend items={[{ label: name.length > 18 ? 'This department' : name, color: ink.bad, line: true }, { label: 'The whole company', color: 'var(--muted)', line: true, faint: true }]} />} style={{ gridColumn: 'span 7' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 4 }}>
          <TexturedTrend at={p.trend.map((s) => s.to)} values={d.trend} compare={{ label: 'The whole company', values: p.trend.map((s) => s.score) }} from={p.basis.end - p.basis.days * DAY} color={ink.bad} format={scoreText} top={top} pill={`${Math.abs(diff).toFixed(1)} pts ${diff > 0 ? 'above' : 'below'} the company`} reduce={reduce} tipHead={(t) => `Thirty days to ${day(t)}`} valueLabel={name.length > 18 ? 'This department' : name} />
        </div>
      </Card>
      <Card i={4} reduce={reduce} title="How risky its people are" sub="Its people by risk level, as things stand" style={{ gridColumn: 'span 5' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
          <Blocks parts={['low', 'moderate', 'high', 'critical'].map((t) => ({ key: t, label: `${TIER_WORD[t]} · ${num(d.tiers[t])}`, value: d.tiers[t], color: colors[t], text: num(d.tiers[t]) }))} reduce={reduce} height={28} legendCols={4} />
          <Insight tone={diff > 0 ? ink.bad : ink.good} sub={`Company-wide, ${pc(p.now.highRisk / p.now.people)} of people are at high risk`}>{pc(d.highRisk / d.people)} of {name} {d.highRisk === 1 ? 'is' : 'are'} at high risk</Insight>
        </div>
      </Card>
      <Card i={5} reduce={reduce} title="What fools this team" sub="Hook Rate by lure · each opens its profile" style={{ gridColumn: 'span 5' }}>
        {lures.length
          ? <PillColumns items={lures.map((l) => ({ key: l.type, label: lureShort(l.type), value: l.hooked, text: pc(l.hooked), tip: [l.type, `${num(l.clicked)} of ${num(l.recipients)} clicked · ${pc(l.reportRate)} reported`] }))} color={ink.bad} soft="var(--soft-bad)" reduce={reduce} onOpen={(type) => open('lure', type)} label="clicked. Open the lure" />
          : <p style={{ ...small, fontSize: 11 }}>No campaigns reached this team in the period.</p>}
      </Card>
      <Card i={6} reduce={reduce} title="Does training help here?" sub="Clicked in the period's simulations" style={{ gridColumn: 'span 4' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {c && <CompareBars rows={[{ key: 'un', label: 'Not yet trained', sub: `${num(c.untrained)} people`, value: c.untrainedRate, color: ink.bad, text: pc(c.untrainedRate) }, { key: 'tr', label: 'Completed training', sub: `${num(c.trained)} people`, value: c.trainedRate, color: ink.good, text: pc(c.trainedRate) }]} reduce={reduce} height={28} />}
        </div>
      </Card>
      <Card i={7} reduce={reduce} title="When phishing lands" sub="What its people did with the period's emails" style={{ gridColumn: 'span 3' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {camp ? <Blocks parts={didParts({ delivered: camp.recipients, reported: camp.reported, clicked: camp.clicked, compromised: camp.compromised }, ink, isDark)} reduce={reduce} height={30} legendCols={1} /> : <p style={{ ...small, fontSize: 11 }}>No emails in the period.</p>}
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
      eyebrowText="Lure"
      title={type}
      sub={`${l.campaigns} ${l.campaigns === 1 ? 'campaign' : 'campaigns'} · ${num(l.delivered)} emails in the last ${m.basis.days} days`}
      figures={[
        { label: 'Hook Rate', value: pc1(l.hooked), delta: <Delta c={vsAll} ink={ink} title="Against every lure together" />, sub: 'against every lure' },
        { label: 'Gave details', value: pc(l.gaveOfClicks), sub: 'of those who clicked' },
        { label: 'Health', node: <HealthChip h={l.health} ink={ink} />, sub: `${times(l.perClick)} reports per click` },
      ]}
    >
      <Card i={3} reduce={reduce} title="What people did with it" sub="Every email of this kind in the period" style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Blocks parts={didParts(l, ink, isDark)} reduce={reduce} height={40} legendCols={4} />
          <Insight tone={ink.bad} sub={`${pc(l.reportRate)} reported it`}>{Math.round((l.hooked || 0) * 100)} in every 100 people who got one clicked it</Insight>
        </div>
      </Card>
      <Card i={4} reduce={reduce} title="Against the other lures" sub="Hook Rate · each opens its profile" style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          {m.lures.map((x, k) => (
            <Row key={x.type} k={k} reduce={reduce} height={34} cols="24px minmax(0,1fr) minmax(0,1.6fr) 12px" onClick={x.type === type ? null : () => open('lure', x.type, null, true)} label={`${x.type}: Hook Rate ${pc1(x.hooked)}. Open its profile`}>
              <LureTile type={x.type} size={22} />
              <span style={{ ...nameStyle, color: x.type === type ? 'var(--text)' : 'var(--muted)' }}>{x.type}</span>
              <Meter value={x.hooked} max={maxHook} color={x.type === type ? ink.bad : 'var(--soft-bad)'} label={pc1(x.hooked)} delay={0.4 + 0.04 * k} reduce={reduce} height={5} />
              {x.type === type ? <span /> : arrow}
            </Row>
          ))}
        </div>
      </Card>
      <Card i={5} reduce={reduce} title="The teams it fooled most" sub="Hook Rate · each opens its department" style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          {depts.map((x, k) => (
            <Row key={x.name} k={k} reduce={reduce} height={34} cols="22px minmax(0,1fr) minmax(0,1.4fr) 12px" onClick={() => open('department', x.name)} label={`${x.name}: ${pc1(x.hooked)} clicked. Open its profile`}>
              <DeptCrest code={deptCode(x.name)} size={22} compact metal={isDark ? 'steelDark' : 'steel'} />
              <span style={nameStyle}>{x.name}</span>
              <Meter value={x.hooked} max={maxDept} color={ink.bad} label={pc1(x.hooked)} sub={`${num(x.clicked)} of ${num(x.recipients)}`} delay={0.4 + 0.04 * k} reduce={reduce} height={5} />
              {arrow}
            </Row>
          ))}
        </div>
      </Card>
      <Card i={6} reduce={reduce} title="Its campaigns" sub="Newest first · each opens its profile" style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          {camps.slice(0, 6).map((c, k) => (
            <Row key={c.id} k={k} reduce={reduce} height={46} cols="minmax(0,1.4fr) minmax(0,1fr) 92px 12px" onClick={() => open('campaign', c.id)} label={`${c.name}. Open its profile`}>
              <span style={{ minWidth: 0 }}>
                <span style={{ ...nameStyle, display: 'block' }}>{c.name}</span>
                <span style={{ ...small, display: 'block', fontSize: 9, marginTop: 2 }}>Started {c.started}</span>
              </span>
              <Meter value={c.hooked} max={maxHook} color={ink.bad} label={pc1(c.hooked)} sub="clicked" delay={0.4 + 0.04 * k} reduce={reduce} height={4} />
              <span style={{ display: 'flex', justifyContent: 'flex-end' }}><HealthChip h={c.health} ink={ink} width={86} /></span>
              {arrow}
            </Row>
          ))}
        </div>
      </Card>
    </ProfileShell>
  );
}

// -------------------------------------------------------------- campaign

// Each measure as this campaign against the average, a slim bar apiece.
function VersusBars({ groups, max, reduce }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map((g, gi) => (
        <div key={g.key}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800 }}>{g.label}</span>
            <span style={{ marginLeft: 'auto' }}>{g.delta}</span>
          </div>
          {g.rows.map((r, k) => {
            const wd = `${Math.min(1, (r.value || 0) / max) * 100}%`;
            return (
              <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '82px minmax(0,1fr) 44px', alignItems: 'center', gap: 10, marginTop: k ? 6 : 0 }}>
                <span style={{ ...small, fontSize: 9, fontWeight: k ? 600 : 800, color: k ? 'var(--muted)' : 'var(--text)' }}>{r.label}</span>
                <span style={{ height: 14, borderRadius: 7, background: 'var(--plate)', overflow: 'hidden' }}>
                  <motion.span initial={{ width: reduce ? wd : '0%' }} animate={{ width: wd }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.3 + 0.1 * (gi * 2 + k), ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 7, background: r.color }} />
                </span>
                <span className="vs-rank" style={{ fontSize: 11.5, fontWeight: 900, textAlign: 'right' }}>{r.text}</span>
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
      <Card i={3} reduce={reduce} title="What people did" sub="Every email this campaign delivered" style={{ gridColumn: 'span 7' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Blocks parts={didParts(c, ink, isDark)} reduce={reduce} height={44} legendCols={4} />
          <Insight tone={c.perClick >= 2 ? ink.good : ink.bad} sub={`Half the reports were in ${mins(c.medianReport)} after it went out`}>{times(c.perClick)} reports for every click</Insight>
        </div>
      </Card>
      <Card i={4} reduce={reduce} title="Against the average" sub={`Every campaign in the last ${m.basis.days} days`} style={{ gridColumn: 'span 5' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: 8 }}>
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
      <Card i={5} reduce={reduce} title="Its departments" sub="Clicked and reported · each opens its department" action={<Legend items={[{ label: 'Clicked', color: ink.bad }, { label: 'Reported', color: ink.good }]} />} style={{ gridColumn: 'span 12' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gridAutoRows: 'min-content', columnGap: 24, marginTop: 6 }}>
          {depts.map((x, k) => (
            <Row key={x.name} k={k > 1 ? 1 : 0} reduce={reduce} height={36} cols="22px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 12px" onClick={() => open('department', x.name)} label={`${x.name}. Open its profile`}>
              <DeptCrest code={deptCode(x.name)} size={22} compact metal={isDark ? 'steelDark' : 'steel'} />
              <span style={nameStyle}>{x.name}</span>
              <Meter value={x.clickRate} max={maxRate} color={ink.bad} label={pc1(x.clickRate)} delay={0.4 + 0.03 * k} reduce={reduce} height={4} />
              <Meter value={x.reportRate} max={maxRate} color={ink.good} label={pc1(x.reportRate)} delay={0.45 + 0.03 * k} reduce={reduce} height={4} />
              {arrow}
            </Row>
          ))}
        </div>
      </Card>
    </ProfileShell>
  );
}

// -------------------------------------------------------------- training

const STATUS = { Good: 'good', Average: 'steady', 'Needs Work': 'bad' };
const STATUS_WORD = { Good: 'Good', Average: 'Average', 'Needs Work': 'Needs work' };

export function TrainingProfile({ ctx, frame, embedded = false, training }) {
  const { p, ink, isDark, reduce, open } = ctx;
  const t = p.now.training;
  const c = p.now.cohorts;
  const tb = p.before?.training;
  const depts = [...p.departments].sort((a, b) => (b.training.completion ?? 0) - (a.training.completion ?? 0));
  const [fit, size] = useFitRows(34, 3, 0);
  return (
    <ProfileShell
      {...frame}
      embedded={embedded}
      tone="good"
      reduce={reduce}
      isDark={isDark}
      art={(
        <RingGauge value={(c?.trainedShare || 0) * 100} size={64} stroke={6} color={ink.good} reduce={reduce} label={`${pc(c?.trainedShare)} have completed their training`}>
          <span className="vs-rank" style={{ display: 'block', fontSize: 16, fontWeight: 900 }}>{pc(c?.trainedShare)}</span>
          <span style={{ display: 'block', fontSize: 7.5, fontWeight: 800, color: 'var(--muted)', marginTop: 2 }}>trained</span>
        </RingGauge>
      )}
      eyebrowText="Training"
      title={c?.times ? `Trained people are ${c.times.toFixed(1)}× less likely to click` : 'Training'}
      sub={`${pc(c?.trainedShare)} of ${num(p.now.people)} people have completed their training`}
      figures={[
        { label: 'Completed', value: pc(t.completion), delta: <Delta c={change(t.completion, tb?.completion, { kind: 'pct', better: 'up' })} ink={ink} />, sub: `of ${num(t.assigned)} assigned` },
        { label: 'Quiz score', value: Number.isFinite(t.quizScore) ? t.quizScore.toFixed(1) : '—', sub: 'average, of 100' },
        { label: 'Badges', value: num(t.badges), sub: `${num(t.points)} points earned` },
      ]}
    >
      <Card i={embedded ? 0 : 3} reduce={reduce} title="Trained against not yet trained" sub="How often each clicked in the period's simulations" style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {c && <CompareBars rows={[{ key: 'un', label: 'Not yet trained', sub: `${num(c.untrained)} people`, value: c.untrainedRate, color: ink.bad, text: pc(c.untrainedRate) }, { key: 'tr', label: 'Completed training', sub: `${num(c.trained)} people`, value: c.trainedRate, color: ink.good, text: pc(c.trainedRate) }]} reduce={reduce} height={26} />}
          {c && <Insight tone={ink.good} sub="Across every department; each has its own on its profile">Of every 100 trained people, {Math.round(c.trainedRate * 100)} clicked; of every 100 others, {Math.round(c.untrainedRate * 100)}</Insight>}
        </div>
      </Card>
      <Card i={embedded ? 1 : 4} reduce={reduce} title="From assigned to passed" sub={`Training assigned in the last ${p.basis.days} days`} style={{ gridColumn: 'span 6' }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
          <StepFunnel steps={[['assigned', 'Assigned', t.assigned], ['started', 'Started', t.started], ['completed', 'Completed', t.completed], ['passed', 'Passed', t.passed]].map(([key, label, value]) => ({ key, label, value }))} color={ink.good} reduce={reduce} />
        </div>
      </Card>
      <Card i={embedded ? 2 : 5} reduce={reduce} title="Departments" sub="The most complete first · each opens its profile" style={{ gridColumn: 'span 5' }}>
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          {depts.slice(0, 6).map((d, k) => (
            <Row key={d.name} k={k} reduce={reduce} height={34} cols="22px minmax(0,1fr) minmax(0,1.2fr) 40px 12px" onClick={() => open('department', d.name)} label={`${d.name}: ${pc(d.training.completion)} completed. Open its profile`}>
              <DeptCrest code={deptCode(d.name)} size={22} compact metal={isDark ? 'steelDark' : 'steel'} />
              <span style={nameStyle}>{d.name}</span>
              <Meter value={d.training.completion} max={1} color={ink.good} label={pc(d.training.completion)} delay={0.4 + 0.04 * k} reduce={reduce} height={4} />
              <span style={{ fontSize: 10, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Number.isFinite(d.training.quizScore) ? d.training.quizScore.toFixed(0) : '—'}</span>
              {arrow}
            </Row>
          ))}
        </div>
      </Card>
      <Card i={embedded ? 3 : 6} reduce={reduce} title="Programmes" sub="Each training programme, since it began" style={{ gridColumn: 'span 7' }}>
        <div ref={fit} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 4 }}>
          {training.programmes.slice(0, size).map((pr, k) => (
            <Row key={pr.program} k={k} reduce={reduce} height={34} cols="minmax(0,1.5fr) minmax(0,1fr) 54px 96px">
              <span style={nameStyle}>{pr.program}</span>
              <Meter value={pr.completion} max={100} color={ink.good} label={`${pr.completion}%`} sub="completed" delay={0.4 + 0.03 * k} reduce={reduce} height={4} />
              <span style={{ fontSize: 10, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{pr.pass}% <span style={{ ...small, fontSize: 8.5 }}>pass</span></span>
              <span style={{ display: 'flex', justifyContent: 'flex-end' }}><Chip color={STATUS[pr.status] === 'steady' ? STEADY_INK : ink[STATUS[pr.status]]} width={92}>{STATUS_WORD[pr.status] || pr.status}</Chip></span>
            </Row>
          ))}
        </div>
      </Card>
    </ProfileShell>
  );
}
