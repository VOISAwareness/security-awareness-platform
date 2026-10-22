import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronRight } from 'lucide-react';

import DeptCrest from '../../GlobalComponents/DeptCrest';
import { deptCode } from '../../GlobalComponents/deptCodes';
import { Pager } from '../Leaderboard/BigPictureTables';
import { TONE_ART, TONE_TINT } from '../Leaderboard/bigPictureArt';
import CampaignMegaphone from '../../assets/LeaderboardAssets/CampaignMegaphone.png';
import { Blocks, BubbleMap, Card, CompareBars, Insight, Legend, PillColumns, RingGauge, ScoreBars, TileMap } from './InsightsCharts';
import { Explain, HealthChip, LureTile, PerClickHow } from './InsightsBits';
import { EASE, change, day, didParts, eyebrow, lureShort, num, pc, pc1, riskRamp, rolling, small, times } from './insightsUi';

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
  const tint = (isDark ? TONE_TINT.dark : TONE_TINT.light)[tone];
  return (
    <span aria-hidden style={{ width: 36, height: 36, borderRadius: 999, display: 'grid', placeItems: 'center', background: tint.wash, border: `1px solid ${tint.edge}` }}>
      <img src={TONE_ART[tone]} alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
    </span>
  );
}

// ------------------------------------------------------------- overview

export function OverviewView({ ctx, list }) {
  const { m, p, ink, isDark, reduce, open, go } = ctx;
  const scores = p.departments.map((d) => d.score);
  const lo = Math.min(...scores); const hi = Math.max(...scores);
  const ramp = riskRamp(isDark, lo, hi);
  const dc = pts(change(p.now.score, p.before?.score, { kind: 'times', better: 'down' }));
  const top = Math.ceil(Math.max(...p.trend.map((s) => s.score)) / 5) * 5 + 5;
  const c = p.now.cohorts;
  const n = m.now;
  const fg = isDark ? '#0F172A' : '#FFFFFF';
  const dim = isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.62)';
  return (
    <div data-ins-overview style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gridTemplateRows: 'minmax(0,1.08fr) minmax(0,1fr)', gap: 14 }}>
      {/* are we safer? */}
      <Card i={0} reduce={reduce} title="Risk over the year" sub="Everyone's risk level, averaged · lower is safer" action={<Legend items={[{ label: 'Risk score', color: ink.bad }, { label: '3-month average', color: 'var(--text)', line: true }]} />} layoutId="ins-risk" onOpen={() => open('risk', null, 'ins-risk')} openLabel="Explore" style={{ gridColumn: 'span 5' }} data-ins-risk>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 4 }}>
          <ScoreBars at={p.trend.map((s) => s.to)} values={p.trend.map((s) => s.score)} lit={p.trend.map((s) => s.inPeriod)} line={{ label: 'Three-month average', values: rolling(p.trend.map((s) => s.score)), color: 'var(--text)' }} color={ink.bad} soft="var(--soft-bad)" format={scoreText} top={top} reduce={reduce} tipHead={(t) => `Thirty days to ${day(t)}`} />
        </div>
        <Insight tone={dc?.good === false ? ink.bad : ink.good} sub={`${num(p.now.highRisk)} people at high risk · ${num(p.now.improved)} moved down a level, ${num(p.now.slipped)} up`}>
          {dc ? `Risk is ${dc.dir === 'down' ? 'down' : dc.dir === 'up' ? 'up' : 'steady'}${dc.dir === 'flat' ? '' : ` ${dc.shown}`} in ${p.basis.days} days, at ${scoreText(p.now.score)} of 100` : `Risk is at ${scoreText(p.now.score)} of 100`}
        </Insight>
      </Card>

      {/* where is the risk? */}
      <Card i={1} reduce={reduce} title="Where the risk sits" sub="Each department · size is its people, colour its risk" onOpen={() => go('departments')} openLabel="All" style={{ gridColumn: 'span 4' }} data-ins-map>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 10 }}>
          <TileMap
            items={p.departments.map((d) => ({ key: d.name, label: d.name, short: deptCode(d.name), weight: d.people, value: d.score, text: scoreText(d.score) }))}
            fill={(t) => ramp.fill(t.value)}
            ink={(t) => ramp.ink(t.value)}
            reduce={reduce}
            layoutIdOf={(t) => `dept-${t.key}`}
            onOpen={(name) => open('department', name, `dept-${name}`)}
            tip={(t) => { const d = p.departments.find((x) => x.name === t.key); return [d.name, `Risk score ${scoreText(d.score)} · ${num(d.highRisk)} at high risk`, `${num(d.people)} people · open its profile`]; }}
          />
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, ...small, fontSize: 9 }}>
          <span>Lower risk · {scoreText(lo)}</span>
          <span aria-hidden style={{ display: 'flex', gap: 2 }}>{ramp.steps.map((s) => <span key={s} style={{ width: 18, height: 6, borderRadius: 3, background: s }} />)}</span>
          <span>{scoreText(hi)} · higher</span>
        </div>
      </Card>

      {/* when phishing lands */}
      <motion.section
        data-ins-spot
        aria-label="When phishing lands"
        initial={{ opacity: 0, y: reduce ? 0 : 16, scale: reduce ? 1 : 0.96, filter: reduce ? 'none' : 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: reduce ? 0.01 : 0.6, delay: reduce ? 0 : 0.14, ease: EASE }}
        style={{ gridColumn: 'span 3', position: 'relative', minWidth: 0, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '16px 18px 14px', borderRadius: 18, color: fg, background: isDark ? 'radial-gradient(120% 80% at 100% 0%, #E0E7FF 0%, #FFFFFF 55%)' : 'radial-gradient(120% 85% at 100% 0%, #2B2F6B 0%, #111217 52%, #0A0A0C 100%)' }}
      >
        <span aria-hidden style={{ position: 'absolute', left: -70, bottom: -90, width: 240, height: 240, borderRadius: 999, background: `radial-gradient(closest-side, ${isDark ? 'rgba(13,148,136,0.18)' : 'rgba(22,163,148,0.24)'}, transparent)` }} />
        <img className="ins-float" src={CampaignMegaphone} alt="" aria-hidden width={58} height={58} style={{ position: 'absolute', right: 10, top: 8, objectFit: 'contain', filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.35))' }} />
        <span style={{ position: 'relative', ...eyebrow, color: dim }}>When phishing lands</span>
        <span style={{ position: 'relative', display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
          <span className="vs-rank" style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em' }}>{times(n.perClick)}</span>
        </span>
        <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, marginTop: 5 }}>
          reports for every click
          <Explain label="What reports for every click means" onDark><PerClickHow n={n} days={m.basis.days} campaigns={m.basis.campaigns} ink={ink} /></Explain>
        </span>
        <span style={{ position: 'relative', fontSize: 9.5, fontWeight: 600, marginTop: 3, color: dim }}>{num(n.reported)} reported ÷ {num(n.clicked)} clicked · {num(n.delivered)} emails, last {m.basis.days} days</span>
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: 8 }}>
          <Blocks parts={didParts(n, ink, isDark)} reduce={reduce} height={30} onDark legendCols={2} />
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
          <button type="button" data-ins-spot-open onClick={() => go('campaigns')} style={{ height: 28, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 12px', borderRadius: 999, border: 'none', background: fg, color: isDark ? '#FFFFFF' : '#0A0A0C', fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}>
            See the campaigns <ArrowUpRight size={13} strokeWidth={2.6} aria-hidden />
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 800, padding: '4px 9px', borderRadius: 999, background: isDark ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.12)' }}>{n.health?.word}</span>
        </div>
      </motion.section>

      {/* what fools us */}
      <Card i={3} reduce={reduce} title="What fools us" sub="Hook Rate by lure · each opens its profile" onOpen={() => go('campaigns')} openLabel="All" style={{ gridColumn: 'span 4' }} data-ins-lures>
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
      <Card i={4} reduce={reduce} title="What changed" sub={`In the last ${m.basis.days} days · each opens where it happened`} style={{ gridColumn: 'span 5' }} data-ins-changes>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 6 }}>
          {list.slice(0, 5).map((f, k) => (
            <motion.button
              key={f.id}
              type="button"
              className="ins-find"
              data-ins-finding={f.id}
              onClick={(e) => { e.stopPropagation(); open(f.view, f.view === 'risk' || f.view === 'training' ? null : f.focus); }}
              initial={{ opacity: 0, x: reduce ? 0 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : 0.35 + 0.06 * k, ease: EASE }}
              style={{ flex: '1 1 0', minHeight: 0, maxHeight: 56, display: 'grid', gridTemplateColumns: '36px minmax(0,1fr) auto 14px', alignItems: 'center', gap: 11, padding: '0 8px', margin: '0 -8px', border: 'none', borderTop: k ? '1px solid var(--hair)' : '1px solid transparent', borderRadius: 12, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
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
      <Card i={5} reduce={reduce} title="Is training paying off?" sub="Clicked in the period's simulations" layoutId="ins-training" onOpen={() => open('training', null, 'ins-training')} openLabel="Explore" style={{ gridColumn: 'span 3' }} data-ins-training>
        {c && (
          <>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <span className="vs-rank" style={{ fontSize: 30, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>{c.times ? `${c.times.toFixed(1)}×` : '—'}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700 }}>less likely to click once trained</span>
            </span>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginTop: 8 }}>
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

// Who got safer and who got riskier over the period: a bar either side of
// zero for each department, the most improved first; each row opens its
// profile.
function ChangeRows({ rows, ink, isDark, reduce, open }) {
  const most = Math.max(...rows.map((r) => Math.abs(r.delta)), 0.1);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) minmax(0,1.25fr) 50px 12px', gap: 10, padding: '0 8px 6px', borderBottom: '1px solid var(--hair)', ...small, fontSize: 8.5, fontWeight: 800 }}>
        <span />
        <span>Department · risk now</span>
        <span style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: ink.good }}>← Safer</span><span style={{ color: ink.bad }}>Riskier →</span></span>
        <span style={{ textAlign: 'right' }}>Change</span>
        <span />
      </div>
      {rows.map((r, k) => {
        const wd = `${(Math.abs(r.delta) / most) * 50}%`;
        const tone = r.delta < -0.05 ? ink.good : r.delta > 0.05 ? ink.bad : 'var(--muted)';
        return (
          <motion.button
            key={r.name}
            type="button"
            className="ins-row"
            data-ins-change={r.name}
            onClick={() => open('department', r.name)}
            aria-label={`${r.name}: risk score ${r.score.toFixed(1)}, ${r.delta <= 0 ? 'down' : 'up'} ${Math.abs(r.delta).toFixed(1)} points. Open its profile`}
            initial={{ opacity: 0, x: reduce ? 0 : 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : 0.2 + 0.025 * k, ease: EASE }}
            style={{ flex: '1 1 0', minHeight: 0, maxHeight: 42, display: 'grid', gridTemplateColumns: '24px minmax(0,1fr) minmax(0,1.25fr) 50px 12px', alignItems: 'center', gap: 10, padding: '0 8px', border: 'none', borderTop: k ? '1px solid var(--hair)' : 'none', borderRadius: 10, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
          >
            <DeptCrest code={deptCode(r.name)} size={24} compact metal={isDark ? 'steelDark' : 'steel'} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
              <span style={{ display: 'block', ...small, fontSize: 8.5, marginTop: 1 }}>Risk score {r.score.toFixed(1)}</span>
            </span>
            <span aria-hidden style={{ position: 'relative', height: 12 }}>
              <span style={{ position: 'absolute', left: '50%', top: -4, bottom: -4, width: 1, background: 'var(--hair-strong)' }} />
              <motion.span initial={{ width: reduce ? wd : 0 }} animate={{ width: wd }} transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : 0.3 + 0.025 * k, ease: EASE }} style={{ position: 'absolute', top: 0, height: 12, [r.delta < 0 ? 'right' : 'left']: '50%', minWidth: 3, borderRadius: r.delta < 0 ? '6px 2px 2px 6px' : '2px 6px 6px 2px', background: tone }} />
            </span>
            <span className="vs-rank" style={{ textAlign: 'right', fontSize: 11.5, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{Math.abs(r.delta) < 0.05 ? '0.0' : `${r.delta < 0 ? '−' : '+'}${Math.abs(r.delta).toFixed(1)}`}</span>
            <ChevronRight className="ins-arrow" size={13} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
          </motion.button>
        );
      })}
    </div>
  );
}

export function DepartmentsView({ ctx }) {
  const { m, p, ink, isDark, reduce, open } = ctx;
  const scores = p.departments.map((d) => d.score);
  const lo = Math.min(...scores); const hi = Math.max(...scores);
  const ramp = riskRamp(isDark, lo, hi);
  const camp = Object.fromEntries(m.departments.map((d) => [d.name, d]));
  const items = p.departments.filter((d) => camp[d.name]?.recipients).map((d) => ({ key: d.name, label: d.name, code: deptCode(d.name), x: camp[d.name].clickRate, y: camp[d.name].reportRate, size: d.people, value: d.score }));
  const rows = p.departments.map((d) => ({ name: d.name, score: d.score, delta: d.score - (d.scoreBefore ?? d.score) })).sort((a, b) => a.delta - b.delta || a.name.localeCompare(b.name));
  return (
    <div data-ins-depts-view style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(12, minmax(0,1fr))', gap: 14 }}>
      <Card i={0} reduce={reduce} title="How each department behaves" sub={`Clicked against reported, last ${m.basis.days} days · each bubble opens its profile`} style={{ gridColumn: 'span 7' }} data-ins-behaviour>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', marginTop: 10 }}>
          <BubbleMap
            items={items}
            avg={{ x: m.now.hooked, y: m.now.reportRate }}
            fill={(it) => ramp.fill(it.value)}
            ink={(it) => ramp.ink(it.value)}
            axes={{ x: 'Clicked (Hook Rate)', y: 'Reported (Report Rate)' }}
            corners={[
              { title: 'Alert', sub: 'Click less, report more', tone: ink.good },
              { title: 'Speak up, but get caught', sub: 'Click more, report more' },
              { title: 'Quiet', sub: 'Click less, report less' },
              { title: 'Exposed', sub: 'Click more, report less', tone: ink.bad },
            ]}
            format={pc}
            reduce={reduce}
            layoutIdOf={(it) => `dept-${it.key}`}
            onOpen={(name) => open('department', name, `dept-${name}`)}
            tip={(it) => [it.label, `Clicked ${pc1(it.x)} · reported ${pc1(it.y)}`, `Risk score ${scoreText(it.value)} · ${num(it.size)} people`]}
          />
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, ...small, fontSize: 9 }}>
          <span>Colour: risk score, {scoreText(lo)}</span>
          <span aria-hidden style={{ display: 'flex', gap: 2 }}>{ramp.steps.map((c) => <span key={c} style={{ width: 18, height: 6, borderRadius: 3, background: c }} />)}</span>
          <span>{scoreText(hi)}</span>
          <span style={{ marginLeft: 'auto' }}>Size: its people · dashed lines: the company</span>
        </div>
      </Card>
      <Card i={1} reduce={reduce} title="Who got safer, who got riskier" sub={`Change in risk score over the last ${m.basis.days} days · each opens its profile`} style={{ gridColumn: 'span 5' }} data-ins-movers>
        <ChangeRows rows={rows} ink={ink} isDark={isDark} reduce={reduce} open={open} />
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
            className="ins-card ins-open"
            data-ins-lure={l.type}
            onClick={() => open('lure', l.type, `lure-${l.type}`)}
            initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.04 * k, ease: EASE }}
            style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 16, border: '1px solid var(--hair)', background: k === 0 ? 'var(--bad-soft)' : 'var(--base)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
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
              <motion.span initial={{ width: reduce ? `${(l.hooked / maxHook) * 100}%` : 0 }} animate={{ width: `${(l.hooked / maxHook) * 100}%` }} transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : 0.3 + 0.05 * k, ease: EASE }} style={{ display: 'block', height: '100%', borderRadius: 999, background: ink.bad }} />
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
            className="ins-card ins-open"
            data-ins-campaign={c.id}
            onClick={() => open('campaign', c.id, `camp-${c.id}`)}
            onMouseEnter={() => setHover(c.id)}
            onMouseLeave={() => setHover(null)}
            initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduce ? 0 : 0.5, delay: reduce ? 0 : 0.15 + 0.035 * k, ease: EASE }}
            style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, padding: '12px 14px', borderRadius: 16, border: '1px solid var(--hair)', background: 'var(--base)', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
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
