import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, ChevronLeft, ChevronRight, Download, Flag, KeyRound, MailOpen, MousePointerClick, Search, X } from 'lucide-react';

import { useSize } from './useSize';
import { GROUPS, TRAINING_WORD, after, findIn, groupText, groupsOf, peopleBehindBook, sampleBehind, sampleExtraClicks, when } from '../../services/peopleBehind';
import { person } from '../../services/sampleCampaigns';
import { downloadXlsx, xlsxName } from '../../services/xlsx';
import { EASE, INK, alpha, eyebrow, num, small, themeVars, TYPE } from './insightsUi';

// Insights' people dialog, for admins: on a campaign type opened inside a
// department, "See the people" lists who it reached there, in four groups
// down the left (Clicked, Gave details away, Reported, Did nothing; each
// person in one), laid out as the Targets dialog is. The list on the right
// pages to fit, finds a person by name or campaign, exports every group to
// Excel (a sheet each), and opens the same people in the Big Picture. Until
// the reports API returns people, they are the sample's
// (services/peopleBehind.js), made up from the department's figures.

const ROW_H = 40;
const GRID = 'minmax(0,1.3fr) minmax(0,1.5fr) 90px 120px';
const ICONS = { clicked: MousePointerClick, gave: KeyRound, reported: Flag, nothing: MailOpen };
const INKS = { clicked: 'bad', gave: 'severe', reported: 'good', nothing: 'context' };
const LAST = { clicked: 'Training after', gave: 'Training after', reported: 'Time to report', nothing: 'Opened it' };
const DID_AT = { clicked: 'Clicked', gave: 'Clicked', reported: 'Reported', nothing: 'Sent' };
const TRAINING_INK = { completed: 'good', started: 'caution', 'not yet': 'context' };
const peopleText = (n) => `${num(n)} ${n === 1 ? 'person' : 'people'}`;

function Chip({ color, text, ink }) {
  // the grey reads too faint as text on its own wash, so it takes the muted ink
  const fg = color === ink.context ? 'var(--muted)' : color;
  return <span style={{ display: 'inline-flex', alignItems: 'center', height: 21, padding: '0 9px', borderRadius: 7, background: alpha(color, 0.14), color: fg, fontSize: TYPE.small, fontWeight: 800, whiteSpace: 'nowrap' }}>{text}</span>;
}

function Row({ x, group, ink }) {
  const col = ink[INKS[group]];
  const last = group === 'reported'
    ? <span className="vs-rank" style={{ fontSize: TYPE.strong, fontWeight: 900 }}>{after(x.minutes)}</span>
    : group === 'nothing'
      ? (x.opened ? <Chip color={ink.context} text="Opened" ink={ink} /> : <span style={{ ...small, fontWeight: 700 }}>Not opened</span>)
      : <Chip color={ink[TRAINING_INK[x.training]]} text={TRAINING_WORD[x.training]} ink={ink} />;
  return (
    <div role="row" data-ins-people-row style={{ display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', columnGap: 14, height: ROW_H, padding: '0 14px', borderTop: '1px solid var(--row-hair)' }}>
      <span role="cell" style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
        <span aria-hidden style={{ width: 26, height: 26, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 999, background: alpha(col, 0.14), color: group === 'nothing' ? 'var(--muted)' : col, fontSize: TYPE.small, fontWeight: 800 }}>{x.initials}</span>
        <span style={{ fontSize: TYPE.strong, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</span>
      </span>
      <span role="cell" style={{ minWidth: 0, lineHeight: 1.3 }}>
        <span style={{ display: 'block', fontSize: TYPE.body, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.campaign.name}</span>
        <span style={{ display: 'block', ...small }}>{DID_AT[group]} {when(x.at)}</span>
      </span>
      <span role="cell" className="vs-rank" style={{ textAlign: 'center', fontSize: TYPE.strong, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>{x.clicks}</span>
      <span role="cell">{last}</span>
    </div>
  );
}

/**
 * The dialog. `campaigns`: the campaign type's campaigns as the department
 * sees them (Insights' scoped rows); `hookRate`: the department's, for the
 * sample's clicks on other types; `onBigPicture` opens the Big Picture's
 * People on the same people (left out, the button is too).
 */
export function PeopleDialog({ type, department, days, campaigns, hookRate, isDark, reduce, onBigPicture, onClose }) {
  const ink = isDark ? INK.dark : INK.light;
  const groups = useMemo(() => groupsOf(sampleBehind(campaigns, { department, personAt: person, extraClicks: sampleExtraClicks(department, hookRate ?? 0.1) })), [campaigns, department, hookRate]);
  const [group, setGroup] = useState(() => GROUPS.find((g) => groups[g].length) || GROUPS[0]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [body, { h }] = useSize();
  const nav = useRef(null);

  // focus the group on show when it opens; give it back to what opened it on close
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const from = document.activeElement;
    nav.current?.querySelector('[aria-selected="true"]')?.focus();
    const key = (e) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); if (from && from.isConnected) from.focus(); };
  }, []);

  const per = Math.max(1, Math.floor((h || ROW_H * 8) / ROW_H));
  const list = findIn(groups[group], q);
  const pages = Math.max(1, Math.ceil(list.length / per));
  const at = Math.min(page, pages - 1);
  const shown = list.slice(at * per, at * per + per);
  const pick = (g) => { setGroup(g); setPage(0); };
  const t = groupText(group, type);
  const exportAll = () => downloadXlsx(xlsxName('insights', type, department, 'people'), peopleBehindBook(groups, { type, department, days }));
  const pagerBtn = { height: 28, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '0 10px', borderRadius: 9, border: '1px solid var(--card-edge)', background: 'var(--ghost)', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 800 };

  return createPortal(
    <div data-ins-people-dialog onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ ...themeVars(isDark), position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(3px)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ins-people-title"
        initial={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
        style={{ width: 'min(1040px, 100%)', height: 'min(600px, calc(100vh - 32px))', display: 'grid', gridTemplateColumns: '230px minmax(0,1fr)', overflow: 'hidden', borderRadius: 18, border: '1px solid var(--card-edge)', background: 'var(--base)', boxShadow: '0 30px 70px rgba(15,23,42,0.28)', color: 'var(--text)' }}
      >
        <nav aria-label="What people did" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '22px 14px', background: 'var(--plate)', borderRight: '1px solid var(--hair)', minWidth: 0 }}>
          <h2 id="ins-people-title" style={{ margin: '0 8px', fontSize: TYPE.heading, fontWeight: 900, overflowWrap: 'anywhere' }}>{type}</h2>
          <span style={{ margin: '3px 8px 14px', ...small, fontSize: TYPE.body, fontWeight: 700 }}>{department}</span>
          <div ref={nav} role="tablist" aria-orientation="vertical" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {GROUPS.map((g) => {
              const sel = g === group;
              const col = ink[INKS[g]];
              const Icon = ICONS[g];
              return (
                <button key={g} type="button" role="tab" aria-selected={sel} aria-controls="ins-people-panel" data-ins-people-group={g} onClick={() => pick(g)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 12, border: 'none', background: sel ? 'var(--base)' : 'transparent', boxShadow: sel ? '0 2px 8px rgba(15,23,42,0.08)' : 'none', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                  <span aria-hidden style={{ width: 30, height: 30, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 9, background: alpha(col, sel ? 0.18 : 0.12), color: g === 'nothing' ? 'var(--muted)' : col }}><Icon size={15} strokeWidth={2.3} /></span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: TYPE.strong, fontWeight: 800 }}>{groupText(g, type).name}</span>
                    <span style={{ display: 'block', ...small }}>{peopleText(groups[g].length)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        <div style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '22px 22px 18px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: TYPE.heading, fontWeight: 900 }}>{t.name}</h3>
              <span style={{ display: 'block', ...small, fontSize: TYPE.body, marginTop: 3 }}>{t.what}</span>
            </div>
            {onBigPicture && (
              <button type="button" data-ins-people-bp onClick={onBigPicture} style={{ height: 32, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 12px 0 14px', borderRadius: 10, border: '1px solid var(--card-edge)', background: 'var(--ghost)', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Open in the Big Picture <ArrowUpRight size={13} strokeWidth={2.6} aria-hidden />
              </button>
            )}
            <button type="button" data-ins-people-export onClick={exportAll} title="Every group, a sheet each, in one Excel file" style={{ height: 32, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--brand-fill)', color: '#FFFFFF', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer' }}>
              <Download size={13} strokeWidth={2.6} aria-hidden /> Export
            </button>
            <button type="button" aria-label="Close" onClick={onClose} style={{ width: 32, height: 32, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 999, border: 'none', background: 'var(--track)', color: 'var(--text)', cursor: 'pointer' }}><X size={15} strokeWidth={2.4} aria-hidden /></button>
          </div>

          <div id="ins-people-panel" role="tabpanel" aria-label={t.name} style={{ flex: 1, minHeight: 0, marginTop: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 14, border: '1px solid var(--hair-strong)' }}>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 14px', borderBottom: '1px solid var(--hair)' }}>
              <span style={{ fontSize: TYPE.strong, fontWeight: 800 }} aria-live="polite">{peopleText(list.length)} <span style={{ ...small, fontSize: TYPE.strong }}>· newest first</span></span>
              <label style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={13} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 10, color: 'var(--muted)' }} />
                <input type="search" data-ins-people-find value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Find a person" aria-label="Find a person or campaign" style={{ width: 220, height: 30, boxSizing: 'border-box', padding: '0 10px 0 28px', borderRadius: 9, border: '1px solid var(--hair-strong)', background: 'var(--base)', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 600, outline: 'none' }} />
              </label>
            </div>
            <div role="table" aria-label={`${t.name}: ${peopleText(list.length)}`} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <div role="row" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: GRID, alignItems: 'center', columnGap: 14, height: 30, padding: '0 14px', background: 'var(--plate)' }}>
                <span role="columnheader" style={eyebrow}>Person</span>
                <span role="columnheader" style={eyebrow}>Campaign</span>
                <span role="columnheader" style={{ ...eyebrow, textAlign: 'center' }}>All clicks</span>
                <span role="columnheader" style={eyebrow}>{LAST[group]}</span>
              </div>
              <div ref={body} role="rowgroup" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {shown.map((x) => <Row key={x.key} x={x} group={group} ink={ink} />)}
                {!list.length && (
                  <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 20, textAlign: 'center', ...small, fontSize: TYPE.body }}>
                    {q.trim() ? `No one here matches “${q.trim()}”.` : `No one in ${department} did this with a ${type} email in the last ${days} days.`}
                  </div>
                )}
              </div>
            </div>
          </div>

          <footer style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 14, marginTop: 12, borderTop: '1px solid var(--hair)' }}>
            <span data-ins-people-showing style={{ flex: 1, ...small, fontSize: TYPE.body }}>
              {list.length ? <>Showing <strong style={{ color: 'var(--text)' }}>{num(at * per + 1)}–{num(at * per + shown.length)}</strong> of <strong style={{ color: 'var(--text)' }}>{num(list.length)}</strong></> : 'Showing no one'}
            </span>
            {pages > 1 && (
              <>
                <button type="button" data-ins-people-prev onClick={() => setPage(at - 1)} disabled={at === 0} style={{ ...pagerBtn, cursor: at === 0 ? 'not-allowed' : 'pointer', opacity: at === 0 ? 0.45 : 1 }}><ChevronLeft size={13} strokeWidth={2.6} aria-hidden /> Previous</button>
                <span style={{ ...small, fontSize: TYPE.body, padding: '0 4px' }}>Page {at + 1} of {pages}</span>
                <button type="button" data-ins-people-next onClick={() => setPage(at + 1)} disabled={at >= pages - 1} style={{ ...pagerBtn, cursor: at >= pages - 1 ? 'not-allowed' : 'pointer', opacity: at >= pages - 1 ? 0.45 : 1 }}>Next <ChevronRight size={13} strokeWidth={2.6} aria-hidden /></button>
              </>
            )}
          </footer>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
