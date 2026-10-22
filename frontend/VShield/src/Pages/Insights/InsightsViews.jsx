import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronRight } from 'lucide-react';

import DeptCrest from '../../GlobalComponents/DeptCrest';
import { deptCode } from '../../GlobalComponents/deptCodes';
import { Pager } from '../Leaderboard/BigPictureTables';
import { TONE_ART } from '../Leaderboard/bigPictureArt';
import CampaignMegaphone from '../../assets/LeaderboardAssets/CampaignMegaphone.png';
import { Blocks, Card, CompareBars, Legend, PillColumns, RingGauge, RiskRing, Segmented, Staircase, TileMap } from './InsightsCharts';
import { Explain, Fill, HealthChip, LureTile, PerClickHow } from './InsightsBits';
import { EASE, SPANS, TIER_WORD, TINT, cardTitle, change, day, didParts, lureShort, num, pc, pc1, riskBands, small, times } from './insightsUi';

// Insights' views, one per tab:
//   - Overview: one card for each question a leader asks. Are we safer
//     (risk over the year)? Where is the risk (the department map, what
//     fools us)? When phishing lands, do people raise the alarm (what people
//     do)? Is training paying off? What changed?
//   - Departments: every department as a card, the riskiest first;
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
    <div data-ins-overview style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: 'minmax(0,1.08fr) minmax(0,1fr)', gap: 14 }}>
      {/* are we safer? */}
      <Card i={0} reduce={reduce} title="Risk score over time" action={<Segmented id="ins-range-ov" label="Time span" value={span} options={SPANS} onChange={setSpan} reduce={reduce} />} layoutId="ins-risk" onOpen={() => open('risk', null, 'ins-risk')} openLabel="Explore" style={{ gridColumn: 'span 5' }} data-ins-risk>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 8 }}>
          <Staircase at={shownTrend.map((s) => s.to)} values={shownTrend.map((s) => s.score)} lit={shownTrend.map((s) => s.inPeriod)} start={ink.neutral} good={ink.good} bad={ink.bad} format={scoreText} reduce={reduce} tipHead={(t) => `Thirty days to ${day(t)}`} />
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <Legend items={[{ label: 'Fell', color: ink.good }, { label: 'Rose', color: ink.bad }]} />
          <span style={{ marginLeft: 'auto', ...small, fontSize: 9.5 }}>{dc ? <>Last {p.basis.days} days: <strong style={{ color: 'var(--text)' }}>{dc.dir === 'down' ? 'down' : dc.dir === 'up' ? 'up' : 'steady'}{dc.dir === 'flat' ? '' : ` ${dc.shown}`}</strong></> : null}</span>
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
            tip={(t) => { const d = p.departments.find((x) => x.name === t.key); return [d.name, `Risk score ${scoreText(d.score)} · ${num(d.highRisk)} at high risk`, `${num(d.people)} people · open its profile`]; }}
          />
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, ...small, fontSize: 9 }}>
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
        style={{ gridColumn: 'span 3', position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 18px 14px', borderRadius: 18, color: 'var(--text)', border: `1px solid ${spot.edge}`, background: spot.wash }}
      >
        <header style={{ position: 'relative', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={cardTitle}>Reports per click</span>
          <button type="button" className="ins-cta" data-ins-spot-open onClick={() => go('campaigns')} style={{ marginLeft: 'auto', height: 26, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 10px 0 12px', borderRadius: 999, border: 'none', background: 'var(--brand)', color: '#FFFFFF', boxShadow: '0 6px 16px rgba(230,0,0,0.22)', fontSize: 10, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            See campaigns <ArrowUpRight size={12} strokeWidth={2.6} aria-hidden />
          </button>
        </header>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <span style={{ minWidth: 0 }}>
            <span className="vs-rank" style={{ display: 'block', fontSize: 42, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em' }}>{times(n.perClick)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, marginTop: 6 }}>
              reports for every click
              <Explain label="What reports for every click means"><PerClickHow n={n} days={m.basis.days} campaigns={m.basis.campaigns} ink={ink} /></Explain>
            </span>
          </span>
          <img className="ins-float" src={CampaignMegaphone} alt="" aria-hidden width={60} height={60} style={{ marginLeft: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 8px 12px rgba(15,23,42,0.18))' }} />
        </div>
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 10 }}>
          <Blocks parts={didParts(n, ink, isDark)} reduce={reduce} height={28} legendCols={2} />
        </div>
      </motion.section>

      {/* what fools us */}
      <Card i={3} reduce={reduce} title="Click rate by lure" onOpen={() => go('campaigns')} openLabel="All" style={{ gridColumn: 'span 4' }} data-ins-lures>
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
                <span style={{ display: 'block', fontSize: 11, fontWeight: 800, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</span>
                <span style={{ display: 'block', ...small, fontSize: 9, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.sub}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 22, padding: '0 9px', borderRadius: 999, background: f.tone === 'good' ? 'var(--good-soft)' : f.tone === 'bad' ? 'var(--bad-soft)' : 'var(--chip)', fontSize: 9.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: f.tone === 'good' ? ink.good : f.tone === 'bad' ? ink.bad : 'var(--muted)' }} />{f.chip}
              </span>
              <ChevronRight className="ins-arrow" size={14} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
            </motion.button>
          ))}
        </div>
      </Card>

      {/* is training paying off? */}
      <Card i={5} reduce={reduce} title="Training impact" layoutId="ins-training" onOpen={() => open('training', null, 'ins-training')} openLabel="Explore" style={{ gridColumn: 'span 3' }} data-ins-training>
        {c && (
          <>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <span className="vs-rank" style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>{c.times ? `${c.times.toFixed(1)}×` : '—'}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700 }}>less likely to click once trained</span>
            </span>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 8 }}>
              <CompareBars rows={[{ key: 'un', label: 'Not yet trained', value: c.untrainedRate, color: ink.bad, text: pc(c.untrainedRate) }, { key: 'tr', label: 'Completed training', value: c.trainedRate, color: ink.good, text: pc(c.trainedRate) }]} reduce={reduce} height={24} />
            </div>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <RingGauge value={c.trainedShare * 100} size={36} stroke={4} color={ink.good} reduce={reduce} label={`${pc(c.trainedShare)} trained`} />
              <span style={{ ...small, fontSize: 9.5 }}><strong style={{ color: 'var(--text)' }}>{pc(c.trainedShare)}</strong> of people have completed their training</span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------- departments

// Reported against clicked, a row per department: an orange dot where its
// clicks sit, a teal dot where its reports sit, on one scale, joined; the
// best habit (most reports over clicks) first. Each row grows into the
// department's profile; hover shows its numbers.
function HabitRows({ rows, ink, isDark, open }) {
  const [hover, setHover] = useState(null);
  const top = Math.ceil(Math.max(...rows.flatMap((r) => [r.clicked, r.reported]), 0.1) * 10) / 10;
  const ticks = Array.from({ length: Math.round(top * 10) + 1 }, (_, k) => k / 10);
  const at = (v) => `${(v / top) * 100}%`;
  const COLS = '24px minmax(0,1.05fr) minmax(0,2.4fr) 58px 12px';
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }} onMouseLeave={() => setHover(null)}>
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: COLS, gap: 12, padding: '0 8px 6px', borderBottom: '1px solid var(--hair)', ...small, fontSize: 8.5, fontWeight: 800 }}>
        <span />
        <span>Department</span>
        <span style={{ position: 'relative', height: 12 }}>{ticks.map((t) => <span key={t} style={{ position: 'absolute', left: at(t), transform: t === 0 ? 'none' : t === top ? 'translateX(-100%)' : 'translateX(-50%)', fontWeight: 600 }}>{pc(t)}</span>)}</span>
        <span style={{ textAlign: 'right' }} title="Reported minus clicked, in points">Gap</span>
        <span />
      </div>
      {rows.map((r, k) => {
        const on = hover === r.name;
        const lo = Math.min(r.clicked, r.reported); const hi = Math.max(r.clicked, r.reported);
        const gap = Math.round((r.reported - r.clicked) * 100);
        return (
          <motion.button
            key={r.name}
            type="button"
            layoutId={`dept-${r.name}`}
            className="ins-row ins-in-x"
            data-ins-habit={r.name}
            onClick={() => open('department', r.name, `dept-${r.name}`)}
            onMouseEnter={() => setHover(r.name)}
            onFocus={() => setHover(r.name)}
            aria-label={`${r.name}: reported ${pc1(r.reported)}, clicked ${pc1(r.clicked)}. Open its profile`}
            style={{ '--d': `${Math.min(0.08 + 0.015 * k, 0.32)}s`, flex: '1 1 0', minHeight: 0, maxHeight: 42, display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', gap: 12, padding: '0 8px', border: 'none', borderTop: k ? '1px solid var(--hair)' : 'none', borderRadius: 10, background: on ? 'var(--plate)' : 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
          >
            <DeptCrest code={deptCode(r.name)} size={24} compact flat metal={isDark ? 'steelDark' : 'steel'} />
            <span style={{ minWidth: 0, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
            <span aria-hidden style={{ position: 'relative', height: 16 }}>
              {ticks.map((t) => <span key={t} style={{ position: 'absolute', left: at(t), top: -6, bottom: -6, width: 1, background: 'var(--grid)' }} />)}
              <span className="ins-grow-x" style={{ '--d': `${Math.min(0.15 + 0.015 * k, 0.4)}s`, position: 'absolute', top: 5, height: 6, left: at(lo), width: at(hi - lo), transformOrigin: r.reported >= r.clicked ? 'left' : 'right', borderRadius: 999, background: r.reported >= r.clicked ? 'var(--soft-good)' : 'var(--soft-bad)', transition: 'left .5s ease, width .5s ease' }} />
              {[['clicked', ink.bad], ['reported', ink.good]].map(([key, c]) => (
                <span key={key} className="ins-pop" style={{ '--d': `${(key === 'clicked' ? 0.15 : 0.3) + Math.min(0.015 * k, 0.24)}s`, position: 'absolute', top: 2, left: at(r[key]), width: 12, height: 12, marginLeft: -6, borderRadius: 999, background: c, boxShadow: '0 0 0 2px var(--base)', transition: 'left .5s ease' }}>
                  {on && <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', [key === 'reported' ? 'bottom' : 'top']: 15, fontSize: 9, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap' }}>{pc(r[key])}</span>}
                </span>
              ))}
            </span>
            <span className="vs-rank" style={{ textAlign: 'right', fontSize: 11.5, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{gap > 0 ? '+' : gap < 0 ? '−' : ''}{Math.abs(gap)}<span style={{ ...small, fontSize: 8.5, marginLeft: 2 }}>pts</span></span>
            <ChevronRight className="ins-arrow" size={13} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
          </motion.button>
        );
      })}
    </div>
  );
}

export function DepartmentsView({ ctx }) {
  const { m, p, ink, isDark, reduce, open } = ctx;
  const camp = Object.fromEntries(m.departments.map((d) => [d.name, d]));
  const habits = p.departments.filter((d) => camp[d.name]?.recipients).map((d) => ({ name: d.name, clicked: camp[d.name].clickRate, reported: camp[d.name].reportRate })).sort((a, b) => (b.reported - b.clicked) - (a.reported - a.clicked) || a.name.localeCompare(b.name));
  const ring = p.departments.filter((d) => Number.isFinite(d.scoreBefore)).map((d) => ({ key: d.name, label: d.name, code: deptCode(d.name), now: d.score, before: d.scoreBefore }));
  return (
    <div data-ins-depts-view style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gap: 14 }}>
      <Card i={0} reduce={reduce} title="Reported vs clicked" sub="Best first" action={<Legend items={[{ label: 'Reported', color: ink.good }, { label: 'Clicked', color: ink.bad }]} />} style={{ gridColumn: 'span 7' }} data-ins-behaviour>
        <HabitRows rows={habits} ink={ink} isDark={isDark} open={open} />
      </Card>
      <Card i={1} reduce={reduce} title="Risk change by department" sub="Closer to the centre is safer" action={<Legend items={[{ label: 'Safer', color: ink.good }, { label: 'Riskier', color: ink.bad }]} />} style={{ gridColumn: 'span 5' }} data-ins-movers>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 6 }}>
          <RiskRing items={ring} whole={{ now: p.now.score, before: p.before?.score }} good={ink.good} bad={ink.bad} neutral={ink.neutral} days={m.basis.days} onOpen={(name) => open('department', name)} tipHead={(it) => it.label} />
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 14px', marginTop: 8, ...small, fontSize: 9 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, border: `1.5px solid ${ink.neutral}`, boxSizing: 'border-box' }} />{m.basis.days} days ago</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span aria-hidden style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--muted)' }} />now</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span aria-hidden style={{ width: 14, borderTop: '1.5px dashed var(--text)', opacity: 0.6 }} />the company</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span aria-hidden style={{ width: 10, height: 8, borderRadius: 3, background: ink.bad, opacity: 0.3 }} />moderate risk, 20 and over</span>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------- lures & campaigns

const PER_PAGE = 8;

export function CampaignsView({ ctx }) {
  const { m, ink, isDark, reduce, open, view, onView } = ctx;
  const [hover, setHover] = useState(null);
  const pages = Math.max(1, Math.ceil(m.campaigns.length / PER_PAGE));
  const page = Math.min(view.page || 0, pages - 1);
  const maxHook = Math.max(...m.lures.map((l) => l.hooked || 0), 0.01);
  return (
    <div data-ins-camps-view style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ flexShrink: 0, ...small }}>Every kind of lure, the most convincing first · each opens its profile</span>
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: `repeat(${Math.max(m.lures.length, 4)}, minmax(0,1fr))`, gap: 10 }}>
        {m.lures.map((l, k) => (
          <motion.button
            key={l.type}
            type="button"
            layoutId={`lure-${l.type}`}
            className="ins-card ins-open ins-rise"
            data-ins-lure={l.type}
            onClick={() => open('lure', l.type, `lure-${l.type}`)}
            style={{ '--d': `${0.04 * k}s`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 16, border: '1px solid var(--card-edge)', background: k === 0 ? 'var(--bad-soft)' : 'var(--card)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LureTile type={l.type} size={28} tone={k === 0 ? 'var(--base)' : undefined} />
              <span style={{ minWidth: 0, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.type}</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span className="vs-rank" style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{pc1(l.hooked)}</span>
              <span style={small}>clicked</span>
            </span>
            <span aria-hidden style={{ height: 5, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
              <Fill width={`${(l.hooked / maxHook) * 100}%`} color={ink.bad} delay={0.25 + 0.04 * k} reduce={reduce} />
            </span>
            <span style={{ ...small, fontSize: 9 }}>{l.campaigns} {l.campaigns === 1 ? 'campaign' : 'campaigns'} · {times(l.perClick)} reports per click</span>
          </motion.button>
        ))}
      </div>
      <span style={{ flexShrink: 0, ...small, marginTop: 2 }}>Every campaign in the last {m.basis.days} days, newest first · what people did with it</span>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gridTemplateRows: 'repeat(2, minmax(0,1fr))', gap: 12 }}>
        {m.campaigns.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).map((c, k) => (
          <motion.button
            key={c.id}
            type="button"
            layoutId={`camp-${c.id}`}
            className="ins-card ins-open ins-rise"
            data-ins-campaign={c.id}
            onClick={() => open('campaign', c.id, `camp-${c.id}`)}
            onMouseEnter={() => setHover(c.id)}
            onMouseLeave={() => setHover(null)}
            style={{ '--d': `${0.1 + 0.025 * k}s`, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, padding: '12px 14px', borderRadius: 16, border: '1px solid var(--card-edge)', background: 'var(--card)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
          >
            <span style={{ display: 'flex', alignItems: 'flex-start', gap: 9, width: '100%' }}>
              <LureTile type={c.type} size={28} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ display: 'block', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                <span style={{ display: 'block', ...small, fontSize: 9, marginTop: 2 }}>{c.type} · {c.started}</span>
              </span>
              <HealthChip h={c.health} ink={ink} width={84} />
            </span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
              <span><span className="vs-rank" style={{ fontSize: 20, fontWeight: 900 }}>{pc1(c.hooked)}</span> <span style={small}>clicked</span></span>
              <span><span className="vs-rank" style={{ fontSize: 20, fontWeight: 900 }}>{times(c.perClick)}</span> <span style={small}>reports per click</span></span>
            </span>
            <span style={{ width: '100%' }}><Blocks parts={didParts(c, ink, isDark)} reduce={reduce} height={12} /></span>
            <span style={{ ...small, fontSize: 9, opacity: hover === c.id ? 1 : 0.85 }}>{num(c.delivered)} emails delivered</span>
          </motion.button>
        ))}
      </div>
      <Pager page={page} pages={pages} total={m.campaigns.length} size={PER_PAGE} onPage={(pg) => onView({ page: pg })} what="campaigns" />
    </div>
  );
}
