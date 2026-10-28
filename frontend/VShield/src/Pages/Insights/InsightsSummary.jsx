import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

import ClayNext from '../../assets/LeaderboardAssets/ClayNext.png';
import CampaignMegaphone from '../../assets/LeaderboardAssets/CampaignMegaphone.png';
import GlobalTrophy from '../../assets/LeaderboardAssets/GlobalTrophy.png';
import regionLand from '../../assets/insights/regionLand.svg';
import regionOurs from '../../assets/insights/regionOurs.svg';
import { Blocks, Card, RingGauge, Tip } from './InsightsCharts';
import { Define, RowsGrid } from './InsightsBits';
import { useSize } from './useSize';
import { GLOSSARY, HEALTH_WORD } from '../../services/glossary';
import { deptRows } from '../../services/deptCharts';
import { deptFacts, deptHealth, pipeline, regions, waiting } from '../../services/insightsSummary';
import { SCHEDULED, SENDER_DOMAINS, STATUS_NOW } from '../../services/sampleOperations';
import { TINT, alpha, day, didParts, eyebrow, healthInk, healthTone, num, pc1, small, times, TYPE } from './insightsUi';

// Insights' Summary: everything going on in the programme on one page,
// under the band's measures. Six cards, each a few figures that open where
// the detail is: where people are (Regions), what they did with the emails,
// what waits on someone, the campaigns, the departments, and training and
// engagement. It reports; it never says what to make of it. Rows page on a
// short window, so nothing scrolls.

const DAY = 86400000;
const dot = (color, size = 8) => <span aria-hidden style={{ flexShrink: 0, width: size, height: size, borderRadius: 3, background: color }} />;
const figure = { fontSize: TYPE.figure, fontWeight: 900, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', color: 'var(--text)' };
const clay = { flexShrink: 0, objectFit: 'contain', filter: 'drop-shadow(0 8px 12px rgba(15,23,42,0.18))' };
const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

// Each country's centre on the map, as a share of its width and height; and
// the short name on its tag. The map (regionLand.svg: every country in view;
// regionOurs.svg: the company's) is Natural Earth's 1:110m countries (public
// domain, via world-atlas) on a Mercator projection, 640 x 330, drawn once;
// each is a mask, so it takes the theme's colours.
const MAP_AT = { India: [77.5, 72], 'United Kingdom': [20.3, 17.2], Germany: [29.3, 23.2], Egypt: [42.9, 66.5], Italy: [30.7, 39.8], Spain: [19.7, 44.1], Albania: [36.1, 42.6] };
const SHORT = { 'United Kingdom': 'UK' };
// tags beside the dots that have room, to the left or the right
const TAG_SIDE = { India: 'right', 'United Kingdom': 'left', Egypt: 'right', Spain: 'left' };
const mask = (url) => ({ position: 'absolute', inset: 0, WebkitMaskImage: `url(${url})`, maskImage: `url(${url})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' });

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

// ----------------------------------------------------------------- regions

// The company's countries on a map: a dot each, its size the people there,
// its colour its health, its figures on hover; beside it, each country's Hook
// Rate and Report Rate.
function Regions({ list, ink }) {
  const [mapBox, { w }] = useSize();
  const [listBox, { h }] = useSize();
  const [hover, setHover] = useState(null);
  const most = Math.max(...list.map((r) => r.people), 1);
  const fit = h > 0 ? Math.max(3, Math.floor((h - 20) / 25)) : list.length;
  const shown = list.find((r) => r.name === hover);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0,1.85fr) minmax(0,1fr)', gap: 14, alignItems: 'center', marginTop: 8 }}>
      <div ref={mapBox} onMouseLeave={() => setHover(null)} style={{ position: 'relative', width: '100%', maxHeight: '100%', aspectRatio: '640 / 330', alignSelf: 'center', borderRadius: 12, background: 'var(--plate)' }}>
        <span aria-hidden style={{ ...mask(regionLand), background: 'var(--track)' }} />
        <span aria-hidden style={{ ...mask(regionOurs), background: 'var(--tick)' }} />
        {list.map((r) => {
          const [x, y] = MAP_AT[r.name] || [50, 50];
          const size = Math.round(9 + 15 * Math.sqrt(r.people / most));
          const c = healthInk(r.health?.word, ink);
          const side = TAG_SIDE[r.name];
          return (
            <span key={r.name}>
              <span aria-hidden style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: size * 2.2, height: size * 2.2, margin: `${-size * 1.1}px 0 0 ${-size * 1.1}px`, borderRadius: 999, background: `radial-gradient(circle, ${alpha(c, 0.3)} 0%, ${alpha(c, 0)} 70%)`, pointerEvents: 'none' }} />
              <button
                type="button"
                data-ins-region={r.name}
                aria-label={`${r.name}: ${num(r.people)} people, Hook Rate ${pc1(r.hooked)}, Report Rate ${pc1(r.reportRate)}, ${HEALTH_WORD[r.health?.word] ?? 'no emails'}`}
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={() => setHover(r.name)}
                onFocus={() => setHover(r.name)}
                onBlur={() => setHover(null)}
                style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: size, height: size, margin: `${-size / 2}px 0 0 ${-size / 2}px`, padding: 0, borderRadius: 999, border: '2px solid var(--base)', background: c, boxShadow: '0 2px 6px rgba(15,23,42,0.25)', cursor: 'default', zIndex: hover === r.name ? 2 : 1 }}
              />
              {side && w > 260 && (
                <span aria-hidden style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `translate(${side === 'left' ? `calc(-100% - ${size / 2 + 6}px)` : `${size / 2 + 6}px`}, -50%)`, padding: '2px 6px', borderRadius: 999, background: 'var(--glass)', boxShadow: '0 1px 3px rgba(15,23,42,0.15)', fontSize: TYPE.label, fontWeight: 800, whiteSpace: 'nowrap', color: 'var(--text)', pointerEvents: 'none' }}>
                  {SHORT[r.name] || r.name} · {pc1(r.hooked)}
                </span>
              )}
            </span>
          );
        })}
        {shown && w > 0 && (
          <Tip x={(MAP_AT[shown.name]?.[0] ?? 50) / 100 * w} y={(MAP_AT[shown.name]?.[1] ?? 50) / 100 * (w * 330 / 640)} w={w} edge={4}>
            <TipRows head={shown.name} rows={[['People', num(shown.people)], ['Emails delivered', num(shown.delivered)], ['Hook Rate', pc1(shown.hooked)], ['Report Rate', pc1(shown.reportRate)], [GLOSSARY.perClick.name, times(shown.perClick)], ['Health', HEALTH_WORD[shown.health?.word] ?? '—']]} />
          </Tip>
        )}
      </div>
      <div ref={listBox} style={{ minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'safe center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 46px 46px', columnGap: 8, alignItems: 'center' }}>
          <span style={{ ...eyebrow, paddingBottom: 5 }}>Country</span>
          <span style={{ ...eyebrow, paddingBottom: 5, textAlign: 'right' }}>Hook</span>
          <span style={{ ...eyebrow, paddingBottom: 5, textAlign: 'right' }}>Report</span>
          {list.slice(0, fit).map((r) => [
            <span key={`n-${r.name}`} style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, height: 25, borderTop: '1px solid var(--hair)', fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap' }}>
              {dot(healthInk(r.health?.word, ink))}
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{SHORT[r.name] || r.name}</span>
            </span>,
            <span key={`h-${r.name}`} className="vs-rank" style={{ height: 25, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid var(--hair)', fontSize: TYPE.body, fontWeight: 800 }}>{pc1(r.hooked)}</span>,
            <span key={`r-${r.name}`} className="vs-rank" style={{ height: 25, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', borderTop: '1px solid var(--hair)', fontSize: TYPE.body, fontWeight: 600 }}>{pc1(r.reportRate)}</span>,
          ])}
        </div>
        {fit < list.length && <span style={{ ...small, marginTop: 4 }}>and {list.length - fit} more on the map</span>}
      </div>
    </div>
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

// ------------------------------------------------------------------ waiting

function Waiting({ list, ink, onGo }) {
  const [box, { h }] = useSize();
  const fit = h > 0 ? Math.max(3, Math.floor(h / 40)) : list.length;
  return (
    <div ref={box} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', marginTop: 6 }}>
      {list.slice(0, fit).map((w, k) => (
        <button
          key={w.id}
          type="button"
          className="ins-find"
          data-ins-waiting={w.id}
          aria-label={`${w.label}: ${num(w.count)}. Open ${w.where}`}
          onClick={stop(() => onGo(w.to))}
          style={{ flex: '1 1 0', minHeight: 0, maxHeight: 46, display: 'grid', gridTemplateColumns: '26px minmax(0,1fr) auto 14px', alignItems: 'center', columnGap: 10, padding: '0 8px', margin: '0 -8px', border: 'none', borderTop: k ? '1px solid var(--hair)' : '1px solid transparent', borderRadius: 12, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
        >
          <span aria-hidden style={{ width: 26, height: 26, borderRadius: 8, background: alpha(ink[w.tone] || ink.context, 0.14), boxShadow: `inset 0 0 0 2px ${ink[w.tone] || ink.context}` }} />
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.label}</span>
            <span style={{ display: 'block', ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.where}</span>
          </span>
          <span className="vs-rank" style={figure}>{num(w.count)}</span>
          <ChevronRight className="ins-arrow" size={14} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- the view

export function SummaryView({ ctx }) {
  const { m, p, ink, isDark, reduce, open, go, nav } = ctx;
  const days = m.basis.days;
  const n = m.now;
  const rows = deptRows(m, p);
  const places = regions(m.campaigns, p.now.people);
  const flow = pipeline(STATUS_NOW, m.basis.campaigns);
  const waits = waiting({ flow, drivers: p.now.drivers, rows, domains: SENDER_DOMAINS });
  const health = deptHealth(rows);
  const facts = deptFacts(rows);
  const c = p.now.cohorts;
  const t = p.now.training;
  // the card on what people did wears the period's health, as the corner tile does
  const tints = isDark ? TINT.dark : TINT.light;
  const spot = tints[healthTone(n.health?.word)] || tints.neutral;
  const toneInk = (tone) => (tone === 'measure' ? ink.measure : ink[tone] || ink.context);
  const goTo = (to) => (to.route ? nav(to.route) : to.view ? open(to.view) : go(to.tab));
  const flowSent = flow.reduce((a, s) => a + s.count, 0) || 1;
  const top = m.lures[0];
  const healthParts = [['Protected', ink.good], ['Holding', ink.caution], ['Exposed', ink.bad]].map(([k, color]) => ({ key: k, label: HEALTH_WORD[k], value: health[k], color, text: num(health[k]) }));
  const FACT = {
    highest: (r) => ({ what: 'Highest Risk Score', span: `${r.score.toFixed(1)}`, by: Number.isFinite(r.change) ? `${r.change > 0 ? '▲' : '▼'} ${Math.abs(r.change).toFixed(1)} pts` : null, good: r.change < 0 }),
    fell: (r) => ({ what: 'Largest fall', span: `${r.before.toFixed(1)} → ${r.score.toFixed(1)}`, by: `▼ ${Math.abs(r.change).toFixed(1)} pts`, good: true }),
    rose: (r) => ({ what: 'Largest rise', span: `${r.before.toFixed(1)} → ${r.score.toFixed(1)}`, by: `▲ ${r.change.toFixed(1)} pts`, good: false }),
    lowestReport: (r) => ({ what: 'Lowest Report Rate', span: `Hook ${pc1(r.hooked)}`, by: pc1(r.reportRate), good: false }),
  };
  return (
    <RowsGrid data-ins-summary minRow={230} sizes={['minmax(0,1.1fr)', 'minmax(0,1fr)']}>
      {/* where are people, and how do they do? */}
      <Card i={0} reduce={reduce} title="Regions" sub={`Last ${days} days · dot size: people · colour: health`} style={{ gridColumn: 'span 5' }} data-ins-regions>
        <Regions list={places} ink={ink} />
      </Card>

      {/* when phishing lands, what do people do? */}
      <Card i={1} reduce={reduce} title={GLOSSARY.outcomes.name} define="outcomes" sub={`Last ${days} days`} onOpen={() => go('campaigns')} openLabel="Campaigns" style={{ gridColumn: 'span 4', border: `1px solid ${spot.edge}`, background: spot.wash }} data-ins-did>
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

      {/* what is waiting on someone now? */}
      <Card i={2} reduce={reduce} title="Waiting on someone" sub="Now · each opens where it is handled" style={{ gridColumn: 'span 3' }} data-ins-waiting-card>
        <img className="ins-float ins-optional" src={ClayNext} alt="" aria-hidden width={46} height={46} style={{ ...clay, position: 'absolute', right: 12, top: 8 }} />
        <Waiting list={waits} ink={ink} onGo={goTo} />
      </Card>

      {/* the campaigns, by where they are */}
      <Card i={3} reduce={reduce} title="Campaigns" sub={`By status now · sent: last ${days} days`} onOpen={() => go('campaigns')} openLabel="All" style={{ gridColumn: 'span 4' }} data-ins-campaigns-card>
        <img className="ins-float ins-optional" src={CampaignMegaphone} alt="" aria-hidden width={50} height={50} style={{ ...clay, position: 'absolute', right: 70, top: 6 }} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-evenly', gap: 8, marginTop: 8 }}>
          <div>
            <div aria-hidden style={{ display: 'flex', gap: 2, height: 10, borderRadius: 999, overflow: 'hidden' }}>
              {flow.filter((s) => s.count).map((s) => <span key={s.key} title={`${s.label}: ${s.count}`} style={{ flex: `${s.count / flowSent} 1 0`, minWidth: 6, background: s.key === 'SENT' ? toneInk('measure') : s.tone === 'measure' ? alpha(ink.measure, 0.55) : toneInk(s.tone) }} />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${flow.length}, minmax(0,1fr))`, gap: 4, marginTop: 7 }}>
              {flow.map((s) => (
                <span key={s.key} data-ins-status={s.key} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="vs-rank" style={figure}>{num(s.count)}</span>
                  <span style={{ ...small, fontSize: TYPE.label, lineHeight: 1.2, display: 'flex', gap: 4 }}>{dot(s.key === 'SENT' ? toneInk('measure') : s.tone === 'measure' ? alpha(ink.measure, 0.55) : toneInk(s.tone), 6)}<span style={{ minWidth: 0 }}>{s.label}</span></span>
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, paddingTop: 8, borderTop: '1px solid var(--hair)' }}>
            {[['Sent', num(n.sent), `${num(m.basis.campaigns)} campaigns`], ['Delivered', pc1(n.deliveryRate), `${num(n.delivered)} emails`], ['Opened', pc1(n.openRate), `${num(n.opened)} emails`, 'openRate'], ['Most clicked', top ? pc1(top.hooked) : '—', top?.type || '—']].map(([k, v, s, term]) => (
              <span key={k} style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={eyebrow}>{k}</span>{term && <Define term={term} />}</span>
                <span className="vs-rank" style={figure}>{v}</span>
                <span style={{ ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</span>
              </span>
            ))}
          </div>
          <div className="ins-optional" style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8, borderTop: '1px solid var(--hair)' }}>
            <span style={eyebrow}>Next up</span>
            {SCHEDULED.slice(0, 2).map((s) => (
              <span key={s.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: TYPE.body }}>
                <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><strong style={{ fontWeight: 800 }}>{s.name}</strong> <span style={{ color: 'var(--muted)' }}>· {s.type}</span></span>
                <span style={{ ...small, whiteSpace: 'nowrap' }}>{day(m.basis.end + s.inDays * DAY)}</span>
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* the departments, at a glance: the Departments tab has them all */}
      <Card i={4} reduce={reduce} title="Departments" sub={`${rows.length} by health · last ${days} days`} onOpen={() => go('departments')} openLabel="All" style={{ gridColumn: 'span 4' }} data-ins-departments-card>
        <div style={{ flexShrink: 0, marginTop: 10 }}>
          <Blocks parts={healthParts} reduce={reduce} height="clamp(20px, 9cqh, 30px)" legendCols={3} legendText />
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'safe center', marginTop: 8 }}>
          {facts.map(({ id, row }, k) => {
            const f = FACT[id](row);
            return (
              <button
                key={id}
                type="button"
                className="ins-find"
                data-ins-fact={id}
                aria-label={`${f.what}: ${row.name}, ${f.span}${f.by ? `, ${f.by}` : ''}. Open its profile`}
                onClick={stop(() => open('department', row.name))}
                style={{ flex: '1 1 0', minHeight: 0, maxHeight: 46, display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto auto', alignItems: 'center', columnGap: 10, padding: '0 8px', margin: '0 -8px', border: 'none', borderTop: k ? '1px solid var(--hair)' : '1px solid transparent', borderRadius: 12, background: 'none', color: 'var(--text)', textAlign: 'left', cursor: 'pointer' }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', ...eyebrow }}>{f.what}</span>
                  <span style={{ display: 'block', fontSize: TYPE.body, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</span>
                </span>
                <span className="vs-rank" style={{ ...small, whiteSpace: 'nowrap' }}>{f.span}</span>
                {f.by && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 20, padding: '0 8px', borderRadius: 999, background: `color-mix(in srgb, ${f.good ? ink.good : ink.bad} 14%, var(--base))`, fontSize: TYPE.small, fontWeight: 800, whiteSpace: 'nowrap' }}>{dot(f.good ? ink.good : ink.bad, 6)}{f.by}</span>}
              </button>
            );
          })}
        </div>
      </Card>

      {/* training, and how people take part */}
      <Card i={5} reduce={reduce} title="Training and engagement" sub={`Now · training assigned in the last ${days} days`} layoutId="ins-training" onOpen={() => open('training', null, 'ins-training')} openLabel="Explore" style={{ gridColumn: 'span 4' }} data-ins-training>
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
