import { Fragment, startTransition, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronRight } from 'lucide-react';

import DeptCrest from '../../GlobalComponents/DeptCrest';
import { deptCode } from '../../GlobalComponents/deptCodes';
import { Pager } from '../Leaderboard/BigPictureTables';
import { TONE_ART } from '../Leaderboard/bigPictureArt';
import CampaignMegaphone from '../../assets/LeaderboardAssets/CampaignMegaphone.png';
import { Blocks, Card, CompareBars, Legend, PillColumns, RingGauge, RiskRing, Segmented, Staircase, TileMap } from './InsightsCharts';
import { Explain, Heads, HealthChip, InlineBar, LureTile, PerClickHow } from './InsightsBits';
import { useFitRows } from '../Leaderboard/useFitRows';
import { EASE, SPANS, TIER_WORD, TINT, cardTitle, change, day, didParts, heads, lureShort, num, pc, pc1, riskBands, small, tierInk, times } from './insightsUi';

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

// Each department's people by risk level, the most at high risk first: one
// bar split low, moderate, high and critical, and the share at high risk or
// worse.
const TIER_COLS = '22px minmax(0,1fr) minmax(0,1.9fr) 44px';
function TierRows({ rows, colors, isDark, open }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
      <Heads cols={TIER_COLS} pad={8}><span /><span>Department</span><span>People by level</span><span style={{ textAlign: 'right' }}>High+</span></Heads>
      {rows.map((d, k) => {
        const all = d.tiers.low + d.tiers.moderate + d.tiers.high + d.tiers.critical || 1;
        const high = (d.tiers.high + d.tiers.critical) / all;
        return (
          <button
            key={d.name}
            type="button"
            className="ins-row ins-in-x"
            data-ins-tiers={d.name}
            onClick={() => open('department', d.name)}
            title={['low', 'moderate', 'high', 'critical'].map((t) => `${TIER_WORD[t]} ${num(d.tiers[t])}`).join(' · ')}
            aria-label={`${d.name}: ${pc(high)} at high risk or worse. Open its profile`}
            style={{ '--d': `${Math.min(0.08 + 0.015 * k, 0.32)}s`, flex: '1 1 0', minHeight: 0, maxHeight: 40, display: 'grid', gridTemplateColumns: TIER_COLS, alignItems: 'center', gap: 14, padding: '0 8px', border: 'none', borderTop: k ? '1px solid var(--hair)' : 'none', borderRadius: 10, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
          >
            <DeptCrest code={deptCode(d.name)} size={22} compact flat metal={isDark ? 'steelDark' : 'steel'} />
            <span style={{ minWidth: 0, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
            <span aria-hidden className="ins-grow-x" style={{ '--d': `${Math.min(0.15 + 0.015 * k, 0.4)}s`, display: 'flex', gap: 2, height: 12, transformOrigin: 'left' }}>
              {['low', 'moderate', 'high', 'critical'].map((t) => <span key={t} style={{ flex: `${d.tiers[t]} 1 0`, minWidth: 3, borderRadius: 4, background: colors[t] }} />)}
            </span>
            <span className="vs-rank" style={{ textAlign: 'right', fontSize: 11.5, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{pc(high)}</span>
          </button>
        );
      })}
    </div>
  );
}

// Which lure fools which department: a cell for each, its click rate, the
// more clicks the deeper the amber; blank where a lure never reached the
// department. A department opens its profile; a lure's heading opens its.
function LureGrid({ rows, types, cells, ink, open }) {
  const all = rows.flatMap((d) => types.map((t) => cells[d.name]?.[t]?.hooked).filter(Number.isFinite));
  const top = Math.max(...all, 0.01);
  const cols = `minmax(0,1.5fr) repeat(${types.length}, minmax(0,1fr))`;
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: cols, gap: 3, paddingBottom: 6, borderBottom: '1px solid var(--hair)' }}>
        <span style={{ ...heads, alignSelf: 'center' }}>Department</span>
        {types.map((t) => <button key={t} type="button" className="ins-crumb" data-ins-grid-lure={t} onClick={() => open('lure', t)} style={{ ...heads, border: 'none', background: 'none', padding: 0, cursor: 'pointer', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lureShort(t)}</button>)}
      </div>
      <div className="ins-fade" style={{ '--d': '0.12s', flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: cols, gridAutoRows: 'minmax(0,1fr)', gap: 3, paddingTop: 6 }}>
        {rows.map((d) => (
          <Fragment key={d.name}>
            <button type="button" className="ins-crumb" onClick={() => open('department', d.name)} style={{ minWidth: 0, border: 'none', background: 'none', padding: 0, textAlign: 'left', fontSize: 10.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>{d.name}</button>
            {types.map((t) => {
              const c = cells[d.name]?.[t];
              if (!c) return <span key={t} aria-label={`${d.name}, ${t}: no emails`} style={{ borderRadius: 6, background: 'var(--plate)', display: 'grid', placeItems: 'center', fontSize: 9, color: 'var(--muted)' }}>—</span>;
              const k = c.hooked / top;
              return <span key={t} title={`${d.name} · ${t}: ${num(c.clicked)} of ${num(c.recipients)} clicked`} style={{ borderRadius: 6, background: `color-mix(in srgb, ${ink.bad} ${Math.round(10 + k * 80)}%, var(--base))`, display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{pc(c.hooked)}</span>;
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// Builds its chart once it scrolls into view: the tab opens without the
// cards below the fold, and they animate in when they are seen.
function Reveal({ children }) {
  const [el, setEl] = useState(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!el || seen) return undefined;
    if (typeof IntersectionObserver === 'undefined') { startTransition(() => setSeen(true)); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) startTransition(() => setSeen(true)); }, { rootMargin: '0px 0px -60px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [el, seen]);
  return <div ref={setEl} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{seen && children}</div>;
}

export function DepartmentsView({ ctx }) {
  const { m, p, ink, isDark, reduce, open } = ctx;
  const camp = Object.fromEntries(m.departments.map((d) => [d.name, d]));
  const habits = p.departments.filter((d) => camp[d.name]?.recipients).map((d) => ({ name: d.name, clicked: camp[d.name].clickRate, reported: camp[d.name].reportRate })).sort((a, b) => (b.reported - b.clicked) - (a.reported - a.clicked) || a.name.localeCompare(b.name));
  const ring = p.departments.filter((d) => Number.isFinite(d.scoreBefore)).map((d) => ({ key: d.name, label: d.name, code: deptCode(d.name), now: d.score, before: d.scoreBefore }));
  const highShare = (d) => d.highRisk / (d.people || 1);
  const mostHigh = [...p.departments].sort((a, b) => highShare(b) - highShare(a) || a.name.localeCompare(b.name));
  const cells = Object.fromEntries(Object.entries(m.deptLures).map(([name, list]) => [name, Object.fromEntries(list.map((x) => [x.type, x]))]));
  return (
    <div data-ins-depts-view style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: 'minmax(0,1fr) minmax(0,1fr)', gap: 14 }}>
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
      <Card i={2} reduce={reduce} title="People by risk level" sub="Most at high risk first" action={<Legend items={['low', 'moderate', 'high', 'critical'].map((t) => ({ label: TIER_WORD[t], color: tierInk(isDark)[t] }))} />} style={{ gridColumn: 'span 5' }} data-ins-tier-rows>
        <Reveal><TierRows rows={mostHigh} colors={tierInk(isDark)} isDark={isDark} open={open} /></Reveal>
      </Card>
      <Card i={3} reduce={reduce} title="Click rate by lure and department" sub="Most clicks first · deeper amber is more clicks" style={{ gridColumn: 'span 7' }} data-ins-lure-grid>
        <Reveal><LureGrid rows={m.departments} types={m.lures.map((l) => l.type)} cells={cells} ink={ink} open={open} /></Reveal>
      </Card>
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
const LURE_COLS = '26px minmax(0,1fr) minmax(0,1.3fr) 40px 32px 14px';
const CAMP_COLS = '26px minmax(0,2.1fr) 54px minmax(0,1.2fr) minmax(0,1.2fr) 72px 56px 100px 12px';
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
      <Card i={0} reduce={reduce} title="Click rate by lure" sub={lure ? 'Showing one lure · click it again for all' : 'Pick one to see only its campaigns'} style={{ gridColumn: 'span 4' }} data-ins-lure-rank>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          <Heads cols={LURE_COLS} pad={8}><span /><span>Lure</span><span>Click rate</span><span style={{ textAlign: 'right' }}>Per click</span><span style={{ textAlign: 'right' }}>Runs</span><span /></Heads>
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
                aria-label={`${l.type}: ${pc1(l.hooked)} clicked. ${on ? 'Show every lure' : 'Show only its campaigns'}`}
                onClick={() => onView({ lure: on ? null : l.type, page: 0 })}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onView({ lure: on ? null : l.type, page: 0 }); } }}
                style={{ '--d': `${0.08 + 0.03 * k}s`, flexShrink: 0, height: ROW_H, display: 'grid', gridTemplateColumns: LURE_COLS, alignItems: 'center', gap: 14, padding: '0 8px', borderTop: k ? '1px solid var(--hair)' : 'none', borderRadius: 10, background: on ? 'var(--plate)' : 'none', boxShadow: on ? 'inset 3px 0 0 var(--brand)' : 'none', cursor: 'pointer', outline: 'none' }}
              >
                <LureTile type={l.type} size={24} />
                <span style={{ minWidth: 0, fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.type}</span>
                <InlineBar value={l.hooked} max={maxLure} color={k === 0 ? ink.bad : 'var(--soft-bad)'} label={pc1(l.hooked)} grow={false} />
                <span className="vs-rank" style={{ textAlign: 'right', fontSize: 11, fontWeight: 900 }}>{times(l.perClick)}</span>
                <span className="vs-rank" style={{ textAlign: 'right', fontSize: 11, fontWeight: 900 }}>{l.campaigns}</span>
                <button type="button" aria-label={`Open ${l.type}`} data-ins-lure-open={l.type} onClick={(e) => { e.stopPropagation(); open('lure', l.type); }} style={{ width: 14, height: 24, padding: 0, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><ChevronRight size={13} strokeWidth={2.4} aria-hidden /></button>
              </div>
            );
          })}
          <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--hair)' }}>
            <span style={{ ...cardTitle, fontSize: 11.5, marginBottom: 10 }}>What people did{lure ? ` · ${lureShort(lure)}` : ''}</span>
            <Blocks key={lure || 'all'} parts={didParts(shownLure || m.now, ink, isDark)} reduce={reduce} height={24} legendCols={2} />
          </div>
        </div>
      </Card>

      <Card i={1} reduce={reduce} title={lure ? `Campaigns · ${lure}` : 'Campaigns'} action={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{lure && <button type="button" onClick={() => onView({ lure: null, page: 0 })} className="ins-go" style={{ height: 26, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 10px', borderRadius: 999, border: '1px solid var(--card-edge)', background: 'var(--ghost)', color: 'var(--text)', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>{lure} ✕</button>}<Segmented id="ins-camp-sort" label="Sort campaigns" value={sort} options={SORTS} onChange={(id) => onView({ sort: id, page: 0 })} reduce={reduce} /></span>} style={{ gridColumn: 'span 8' }} data-ins-camp-table>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
          <Heads cols={CAMP_COLS} pad={8}><span /><span>Campaign</span><span style={{ textAlign: 'right' }}>Emails</span><span>Clicked</span><span>Reported</span><span style={{ textAlign: 'right' }}>Gave details</span><span style={{ textAlign: 'right' }}>Per click</span><span style={{ textAlign: 'right' }}>Health</span><span /></Heads>
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
                  <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                  <span style={{ display: 'block', ...small, fontSize: 9, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.type} · {day(c.started)}</span>
                </span>
                <span className="vs-rank" style={{ textAlign: 'right', fontSize: 11, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{num(c.delivered)}</span>
                <InlineBar value={c.hooked} max={maxHook} color={ink.bad} label={pc1(c.hooked)} grow={false} />
                <InlineBar value={c.reportRate} max={maxRep} color={ink.good} label={pc1(c.reportRate)} grow={false} />
                <span className="vs-rank" style={{ textAlign: 'right', fontSize: 11, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{pc1(c.delivered ? c.compromised / c.delivered : null)}</span>
                <span className="vs-rank" style={{ textAlign: 'right', fontSize: 11, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{times(c.perClick)}</span>
                <span style={{ display: 'flex', justifyContent: 'flex-end' }}><HealthChip h={c.health} ink={ink} width={96} /></span>
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
