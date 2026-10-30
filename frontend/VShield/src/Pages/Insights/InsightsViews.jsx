import { Fragment, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

import { Pager } from '../Leaderboard/BigPictureTables';
import { Blocks, Card, Segmented, Tip } from './InsightsCharts';
import { InlineBar, LureTile } from './InsightsBits';
import { GLOSSARY, TYPE_WORD } from '../../services/glossary';
import { useSize } from './useSize';
import { useFitRows } from '../Leaderboard/useFitRows';
import { HEALTH_WORD, cardTitle, didParts, healthInk, heads, num, pc1, small, times, TYPE } from './insightsUi';

// Insights' Campaigns tab (the Summary is in InsightsSummary.jsx, the
// Departments tab in InsightsDepartments.jsx): every campaign type, then
// every campaign.
// Each card, tile and column opens its profile, most of them by growing
// into it. They show what happened; they never say what to make of it.
// Colour goes on marks by what it means (insightsUi.js); text wears the
// text inks.

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
