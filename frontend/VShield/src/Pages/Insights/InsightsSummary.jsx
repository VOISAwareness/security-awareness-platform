import { useState } from 'react';

import GlobalTrophy from '../../assets/LeaderboardAssets/GlobalTrophy.png';
import { Blocks, Card, RingGauge, Sparkline, Tip } from './InsightsCharts';
import { Define, Delta, FitList, LureTile, RowsGrid } from './InsightsBits';
import { useSize } from './useSize';
import { GLOSSARY, HEALTH_WORD } from '../../services/glossary';
import { deptRows } from '../../services/deptCharts';
import { deptHealth, riskLevels, riskiest, scorecard } from '../../services/insightsSummary';
import { TIER_RULE, TIER_WORD, TINT, alpha, change, day, didParts, eyebrow, heads, healthTone, lureShort, mins, num, pc1, small, tierInk, times, TYPE } from './insightsUi';

// Insights' Summary: the programme's report page, read first and opened for
// the detail behind any part. Under the band's four measures: a scorecard of
// the rest (this period against the one before, and six months of trend),
// what people did with the emails, how people stand on risk, where the risk
// is, and training. It reports; it never says what to make of it. Rows page
// on a short window, so nothing scrolls.

const figure = { fontSize: TYPE.figure, fontWeight: 900, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' };
const clay = { flexShrink: 0, objectFit: 'contain', filter: 'drop-shadow(0 8px 12px rgba(15,23,42,0.18))' };
const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
const dot = (color, size = 8) => <span aria-hidden style={{ flexShrink: 0, width: size, height: size, borderRadius: 3, background: color }} />;
const rowBtn = { display: 'grid', alignItems: 'center', columnGap: 12, padding: '0 8px', margin: '0 -8px', border: 'none', borderRadius: 10, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' };

// A tooltip's lines: a head, then each figure's name and value.
function TipRows({ head, rows }) {
  return (
    <>
      <div style={{ fontSize: TYPE.body, fontWeight: 800, color: 'var(--text)' }}>{head}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 16, rowGap: 3, marginTop: 6 }}>
        {rows.map(([k, v]) => [
          <span key={`k-${k}`} style={{ ...small, whiteSpace: 'nowrap' }}>{k}</span>,
          <span key={`v-${k}`} className="vs-rank" style={{ fontSize: TYPE.small, fontWeight: 800, textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--text)' }}>{v}</span>,
        ])}
      </div>
    </>
  );
}

// ------------------------------------------------------------ what people did

// The Hook Rate and Report Rate, thirty days at a time over six months, on
// one axis from 0; the period's end marked. A month's figures on hover.
function TwoLines({ months, ink }) {
  const [box, { w, h }] = useSize();
  const [at, setAt] = useState(null);
  const top = Math.max(0.3, ...months.map((s) => Math.max(s.hooked || 0, s.reportRate || 0))) * 1.05;
  const pad = 6;
  const X = (i) => pad + (i * (w - pad * 2)) / Math.max(1, months.length - 1);
  const Y = (v) => pad + (1 - (v || 0) / top) * (h - pad * 2 - 12);
  const line = (k) => months.map((s, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(s[k]).toFixed(1)}`).join(' ');
  const area = (k) => `${line(k)} L${X(months.length - 1).toFixed(1)},${Y(0).toFixed(1)} L${X(0).toFixed(1)},${Y(0).toFixed(1)} Z`;
  const last = months.length - 1;
  const s = at === null ? null : months[at];
  return (
    <div ref={box} onMouseLeave={() => setAt(null)} style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0 }}>
      {w > 0 && h > 0 && (
        <svg role="img" aria-label={`Thirty days at a time over six months: Report Rate from ${pc1(months[0]?.reportRate)} to ${pc1(months[last]?.reportRate)}, Hook Rate from ${pc1(months[0]?.hooked)} to ${pc1(months[last]?.hooked)}`} width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
          <line x1={pad} x2={w - pad} y1={Y(0)} y2={Y(0)} stroke="var(--tick)" />
          <path d={area('reportRate')} fill={alpha(ink.good, 0.12)} />
          <path d={area('hooked')} fill={alpha(ink.bad, 0.1)} />
          <path d={line('reportRate')} fill="none" stroke={ink.good} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={line('hooked')} fill="none" stroke={ink.bad} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
          {at !== null && <line x1={X(at)} x2={X(at)} y1={pad} y2={Y(0)} stroke="var(--hair-strong)" strokeDasharray="3 3" />}
          {[['reportRate', ink.good], ['hooked', ink.bad]].map(([k, c]) => <circle key={k} cx={X(at ?? last)} cy={Y(months[at ?? last]?.[k])} r={3.5} fill={c} stroke="var(--base)" strokeWidth={2} />)}
          <text x={pad} y={h - 1} fontSize={TYPE.label} fill="var(--muted)">{day(months[0]?.to)}</text>
          <text x={w - pad} y={h - 1} fontSize={TYPE.label} fontWeight={800} fill="var(--text)" textAnchor="end">{day(months[last]?.to)}</text>
          {/* a month's hover strip, kept inside the chart */}
          {months.map((m, i) => { const half = w / months.length / 2; const x0 = Math.max(0, X(i) - half); return <rect key={m.to} x={x0} y={0} width={Math.min(w, X(i) + half) - x0} height={h} fill="transparent" onMouseEnter={() => setAt(i)} />; })}
        </svg>
      )}
      {s && (
        <Tip x={X(at)} y={Y(Math.max(s.hooked || 0, s.reportRate || 0))} w={w} edge={4}>
          <TipRows head={`30 days to ${day(s.to)}`} rows={[['Report Rate', pc1(s.reportRate)], ['Hook Rate', pc1(s.hooked)], ['Campaigns', num(s.campaigns)]]} />
        </Tip>
      )}
    </div>
  );
}

// --------------------------------------------------------------- scorecard

// how each kind of measure reads
const VALUE = { count: num, pct: pc1, min: mins, pts: (v) => (Number.isFinite(v) ? v.toFixed(1) : '—') };
// where each measure's detail is
const OPENS = { repeatClickers: { view: 'risk' }, completion: { view: 'training' }, quizScore: { view: 'training' } };
const SCORE_COLS = '64px minmax(0,1.5fr) minmax(58px,0.65fr) minmax(58px,0.65fr) 96px minmax(64px,1fr)';

// The report's table: each measure this period, in the period before, the
// change (coloured by whether it is better), and thirty days at a time over
// six months. A row opens where its detail is.
function Scorecard({ rows, days, ink, reduce, onOpen }) {
  const marked = rows.map((r, i) => ({ ...r, first: i === 0 || rows[i - 1].group !== r.group }));
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 8 }}>
      <div aria-hidden style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: SCORE_COLS, columnGap: 12, padding: '0 0 6px', borderBottom: '1px solid var(--hair-strong)' }}>
        {['', 'Measure', `Last ${days} days`, `${days} days before`, 'Change', 'Six months'].map((h, i) => <span key={i} style={{ ...heads, textAlign: i === 2 || i === 3 ? 'right' : 'left', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h}</span>)}
      </div>
      <FitList
        items={marked}
        rowH={25}
        what="measures"
        render={(r, k) => {
          const show = VALUE[r.kind];
          const c = change(r.now, r.before, { kind: r.kind, better: r.better });
          return (
            <button
              key={r.id}
              type="button"
              className="ins-find"
              data-ins-score={r.id}
              aria-label={`${r.label}: ${show(r.now)} in the last ${days} days, ${show(r.before)} in the ${days} days before. Open its detail`}
              onClick={stop(() => onOpen(r.id))}
              style={{ ...rowBtn, flex: '0 0 25px', gridTemplateColumns: SCORE_COLS, borderTop: k && r.first ? '1px solid var(--hair-strong)' : k ? '1px solid var(--hair)' : '1px solid transparent' }}
            >
              <span style={{ ...eyebrow, fontSize: TYPE.label }}>{r.first ? r.group : ''}</span>
              <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
                {r.term && <Define term={r.term} />}
              </span>
              <span className="vs-rank" style={{ fontSize: TYPE.body, fontWeight: 900, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{show(r.now)}</span>
              <span className="vs-rank" style={{ ...small, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{show(r.before)}</span>
              <span>{c ? <Delta c={c} ink={ink} title={`From ${show(r.before)} to ${show(r.now)}`} /> : <span style={small}>—</span>}</span>
              <Sparkline values={r.trend.map((v) => v ?? NaN)} heads={r.heads.map((t) => `30 days to ${day(t)}`)} color={ink.measure} height={20} format={show} label={`${r.label}, 30 days at a time`} reduce={reduce} />
            </button>
          );
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------- risk levels

// How people stand: one bar of the four risk levels, each level's people,
// share and change since the period began, and how many moved down or up.
function RiskLevels({ r, isDark, ink, days }) {
  const colors = tierInk(isDark);
  const total = r.people || 1;
  return (
    <>
      <div aria-hidden style={{ flexShrink: 0, display: 'flex', gap: 2, height: 10, marginTop: 10, borderRadius: 999, overflow: 'hidden' }}>
        {r.levels.map((l) => <span key={l.key} style={{ flex: `${l.now / total} 1 0`, minWidth: 4, background: colors[l.key] }} />)}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 6 }}>
        {r.levels.map((l, k) => {
          const c = change(l.now, l.before, { kind: 'count', better: l.key === 'low' ? 'up' : 'down' });
          return (
            <span key={l.key} data-ins-level={l.key} title={TIER_RULE[l.key]} style={{ flex: '1 1 0', minHeight: 24, maxHeight: 34, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto 46px 92px', alignItems: 'center', columnGap: 10, borderTop: k ? '1px solid var(--hair)' : 'none' }}>
              <span style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
                {dot(colors[l.key])}
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: TYPE.body, fontWeight: 800 }}>{TIER_WORD[l.key]}</span>
                  <span className="ins-optional" style={{ display: 'block', ...small, fontSize: TYPE.label, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{TIER_RULE[l.key]}</span>
                </span>
              </span>
              <span className="vs-rank" style={{ fontSize: TYPE.body, fontWeight: 900, textAlign: 'right' }}>{num(l.now)}</span>
              <span className="vs-rank" style={{ ...small, textAlign: 'right' }}>{pc1(l.share)}</span>
              <span style={{ justifySelf: 'end' }}>{c ? <Delta c={c} ink={ink} title={`${num(l.before)} at the start of the last ${days} days`} /> : <span style={small}>—</span>}</span>
            </span>
          );
        })}
      </div>
      <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 8, paddingTop: 8, marginTop: 6, borderTop: '1px solid var(--hair)' }}>
        {[['Moved down a level', r.lower, ink.good], ['Moved up a level', r.higher, ink.bad]].map(([k, v, color]) => (
          <span key={k} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{dot(color, 6)}<span style={{ ...eyebrow, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k}</span></span>
            <span className="vs-rank" style={figure}>{num(v)}</span>
          </span>
        ))}
      </div>
    </>
  );
}

// ------------------------------------------------------- where the risk is

// The departments by health, then the three with the highest Risk Score and
// the three campaign types clicked most, each opening its profile.
function WhereRisk({ health, top, ink, open }) {
  const healthParts = [['Protected', ink.good], ['Holding', ink.caution], ['Exposed', ink.bad]];
  const list = (title, items, render) => (
    <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <span style={{ ...eyebrow, flexShrink: 0, marginBottom: 2 }}>{title}</span>
      {items.map(render)}
    </div>
  );
  return (
    <>
      <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginTop: 8 }}>
        {healthParts.map(([k, color]) => (
          <span key={k} data-ins-health={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...small, color: 'var(--text)' }}>
            {dot(color)}<strong className="vs-rank" style={{ fontWeight: 900 }}>{num(health[k])}</strong>{HEALTH_WORD[k]}
          </span>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
        {list('Highest Risk Score', top.departments, (d) => {
          const c = Number.isFinite(d.change) ? change(d.score, d.before, { kind: 'pts', better: 'down' }) : null;
          return (
            <button key={d.name} type="button" className="ins-find" data-ins-riskiest={d.name} aria-label={`${d.name}: Risk Score ${d.score.toFixed(1)}. Open its profile`} onClick={stop(() => open('department', d.name))} style={{ ...rowBtn, flex: '1 1 0', minHeight: 24, maxHeight: 30, gridTemplateColumns: 'minmax(0,1fr) auto 92px' }}>
              <span style={{ minWidth: 0, fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
              <span className="vs-rank" style={{ fontSize: TYPE.body, fontWeight: 900 }}>{d.score.toFixed(1)}</span>
              <span style={{ justifySelf: 'end' }}>{c && <Delta c={c} ink={ink} title={`${d.before.toFixed(1)} at the start of the period`} />}</span>
            </button>
          );
        })}
        {list('Clicked most', top.lures, (l) => (
          <button key={l.type} type="button" className="ins-find" data-ins-clicked={l.type} aria-label={`${l.type}: Hook Rate ${pc1(l.hooked)}. Open its profile`} onClick={stop(() => open('lure', l.type))} style={{ ...rowBtn, flex: '1 1 0', minHeight: 24, maxHeight: 30, gridTemplateColumns: '22px minmax(0,1fr) auto 92px' }}>
            <LureTile type={l.type} size={22} />
            <span style={{ minWidth: 0, fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lureShort(l.type)}</span>
            <span className="vs-rank" style={{ fontSize: TYPE.body, fontWeight: 900 }}>{pc1(l.hooked)}</span>
            <span style={{ ...small, justifySelf: 'end', whiteSpace: 'nowrap' }}>{num(l.campaigns)} {l.campaigns === 1 ? 'campaign' : 'campaigns'}</span>
          </button>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- the view

export function SummaryView({ ctx }) {
  const { m, p, ink, isDark, reduce, open, go } = ctx;
  const days = m.basis.days;
  const n = m.now;
  const rows = deptRows(m, p);
  const card = scorecard(m, p);
  const levels = riskLevels(p);
  const health = deptHealth(rows);
  const top = riskiest(rows, m.lures);
  const c = p.now.cohorts;
  const t = p.now.training;
  // the card on what people did wears the period's health, as the corner tile does
  const tints = isDark ? TINT.dark : TINT.light;
  const spot = tints[healthTone(n.health?.word)] || tints.neutral;
  const openMeasure = (id) => { const to = OPENS[id]; if (to?.view) open(to.view); else go('campaigns'); };
  return (
    <RowsGrid data-ins-summary minRow={230} sizes={['minmax(0,1.4fr)', 'minmax(0,1fr)']}>
      {/* the measures, against the period before and over six months */}
      <Card i={0} reduce={reduce} title="KPI scorecard" sub={`Last ${days} days against the ${days} days before · six months, 30 days at a time`} style={{ gridColumn: 'span 7' }} data-ins-scorecard>
        <Scorecard rows={card} days={days} ink={ink} reduce={reduce} onOpen={openMeasure} />
      </Card>

      {/* when phishing lands, what do people do? */}
      <Card i={1} reduce={reduce} title={GLOSSARY.outcomes.name} define="outcomes" sub={`Last ${days} days`} onOpen={() => go('campaigns')} openLabel="Campaigns" style={{ gridColumn: 'span 5', border: `1px solid ${spot.edge}`, background: spot.wash }} data-ins-did>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch', gap: 16, marginTop: 8 }}>
          <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span className="vs-rank ins-big" title={`${num(n.reported)} reported ÷ ${num(n.clicked)} clicked`} style={{ display: 'block', fontSize: TYPE.display, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em' }}>{times(n.perClick)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}><span style={eyebrow}>{GLOSSARY.perClick.name}</span><Define term="perClick" /></span>
            <span className="ins-optional" style={{ ...small, marginTop: 3 }}>{num(n.reported)} reports ÷ {num(n.clicked)} clicks</span>
          </span>
          <TwoLines months={m.months} ink={ink} />
        </div>
        <div style={{ flexShrink: 0, marginTop: 10 }}>
          <Blocks parts={didParts(n, ink)} reduce={reduce} height="clamp(20px, 9cqh, 34px)" legendCols={2} />
        </div>
        <div className="ins-optional" style={{ flexShrink: 0, display: 'flex', gap: 14, marginTop: 8, ...small }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden style={{ width: 12, height: 3, borderRadius: 2, background: ink.good }} />Report Rate</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span aria-hidden style={{ width: 12, height: 3, borderRadius: 2, background: ink.bad }} />Hook Rate</span>
          <span style={{ marginLeft: 'auto' }}>30 days at a time</span>
        </div>
      </Card>


      {/* how people stand on risk */}
      <Card i={2} reduce={reduce} title={GLOSSARY.riskLevels.name} define="riskLevels" sub={`Now · ${num(levels.people)} people · change since ${day(m.basis.end - days * 86400000)}`} onOpen={() => open('risk')} openLabel="Risk" style={{ gridColumn: 'span 4' }} data-ins-levels>
        <RiskLevels r={levels} isDark={isDark} ink={ink} days={days} />
      </Card>

      {/* where the risk is */}
      <Card i={3} reduce={reduce} title="Where the risk is" sub={`${rows.length} departments by health · last ${days} days`} onOpen={() => go('departments')} openLabel="Departments" style={{ gridColumn: 'span 4' }} data-ins-where>
        <WhereRisk health={health} top={top} ink={ink} open={open} />
      </Card>

      {/* training, and how people take part */}
      <Card i={4} reduce={reduce} title="Training and engagement" sub={`Now · training assigned in the last ${days} days`} layoutId="ins-training" onOpen={() => open('training', null, 'ins-training')} openLabel="Explore" style={{ gridColumn: 'span 4' }} data-ins-training>
        <img className="ins-float ins-optional" src={GlobalTrophy} alt="" aria-hidden width={48} height={48} style={{ ...clay, position: 'absolute', right: 86, top: 6 }} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
          <RingGauge value={(c?.trainedShare || 0) * 100} size={76} stroke={8} color={ink.measure} reduce={reduce} label={`${pc1(c?.trainedShare)} of people have completed their training`}>
            <span className="vs-rank" style={{ display: 'block', fontSize: TYPE.title, fontWeight: 900 }}>{pc1(c?.trainedShare)}</span>
            <span style={{ display: 'block', ...eyebrow }}>trained</span>
          </RingGauge>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[['Assigned', t.assigned], ['Completed', t.completed], ['Passed', t.passed]].map(([k, v]) => (
              <span key={k} style={{ display: 'grid', gridTemplateColumns: '68px minmax(0,1fr) 38px', alignItems: 'center', gap: 8 }}>
                <span style={{ ...small, color: 'var(--text)', fontWeight: 700 }}>{k}</span>
                <span aria-hidden style={{ height: 8, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${t.assigned ? (v / t.assigned) * 100 : 0}%`, borderRadius: 999, background: ink.measure }} /></span>
                <span className="vs-rank" style={{ fontSize: TYPE.body, fontWeight: 800, textAlign: 'right' }}>{num(v)}</span>
              </span>
            ))}
          </div>
        </div>
        <div style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, paddingTop: 8, marginTop: 8, borderTop: '1px solid var(--hair)' }}>
          {[[GLOSSARY.trainingImpact.name, times(c?.times), 'untrained click more'], ['Badges', num(t.badges), 'awarded'], ['Points', num(t.points), 'earned in training']].map(([k, v, s]) => (
            <span key={k} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ ...eyebrow, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k}</span>
              <span className="vs-rank" style={figure}>{v}</span>
              <span style={{ ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</span>
            </span>
          ))}
        </div>
      </Card>
    </RowsGrid>
  );
}
