import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Check, ChevronDown, Download, Search, X } from 'lucide-react';

import { countsBy, findPeople, peopleBook } from '../../services/insightsPeople';
import { Pager } from '../Leaderboard/BigPictureTables';
import { downloadXlsx, xlsxName } from '../../services/xlsx';
import { EASE, INK, num, small, themeVars, TYPE } from './insightsUi';

// The people behind a number. Every bar, row and figure on Insights opens
// this list with what was clicked as its filters; the three on the left
// (department, campaign, risk level) narrow it further, a choice at a time,
// each with how many people it holds. The list is laid out as the
// Leaderboard's: one row per person, their department under their name,
// then emails, clicked, reported and gave details away in even columns.
// Eight rows a page, numbered pages under them. "Open in the Big Picture"
// shows the same people there; Export saves them to Excel.

const PER_PAGE = 8;
const ROW_H = 46;
const COLS = 'minmax(0,1fr) 88px 88px 88px 104px';
const FILTERS = [
  { key: 'department', name: 'Department', all: 'All departments' },
  { key: 'campaign', name: 'Campaign', all: 'All campaigns' },
  { key: 'level', name: 'Risk level', all: 'Any level' },
];

function Filter({ f, value, counts, open, onOpen, onPick }) {
  const [q, setQ] = useState('');
  const shown = counts.filter((c) => !q || String(c.value).toLowerCase().includes(q.toLowerCase()));
  const total = counts.reduce((a, c) => a + c.count, 0);
  return (
    <div data-ins-people-filter={f.key}>
      <button type="button" onClick={onOpen} aria-expanded={open} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 12, border: 'none', background: open ? 'var(--base)' : 'transparent', boxShadow: open ? '0 2px 8px rgba(15,23,42,0.08)' : 'none', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: TYPE.strong, fontWeight: 600 }}>{f.name}</span>
          <span style={{ display: 'block', ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || f.all}</span>
        </span>
        <span style={{ fontSize: TYPE.label, fontWeight: 600, color: 'var(--muted)', background: 'var(--track)', borderRadius: 999, padding: '2px 8px' }}>{counts.length}</span>
        <ChevronDown size={14} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} />
      </button>
      {open && (
        <div style={{ margin: '4px 2px 8px 8px', padding: 8, borderRadius: 12, background: 'var(--base)', border: '1px solid var(--hair)' }}>
          {counts.length > 6 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 9px', marginBottom: 6, borderRadius: 8, background: 'var(--plate)' }}>
              <Search size={12} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Find a ${f.name.toLowerCase()}`} aria-label={`Find a ${f.name.toLowerCase()}`} style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 500 }} />
            </label>
          )}
          <div className="ins-scroll" style={{ maxHeight: 168, overflowY: 'auto', paddingRight: 4 }}>
            {[{ value: null, count: total }, ...shown].map((c) => {
              const on = (value ?? null) === c.value;
              return (
                <button key={c.value ?? 'all'} type="button" onClick={() => onPick(c.value)} aria-pressed={on} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 7, border: 'none', background: on ? 'rgba(230,0,0,0.06)' : 'transparent', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
                  <span aria-hidden style={{ width: 14, height: 14, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 4, border: on ? 'none' : '1.5px solid var(--tick)', background: on ? 'var(--brand-fill)' : 'transparent', color: '#FFFFFF' }}>{on && <Check size={10} strokeWidth={3.2} />}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: TYPE.body, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value ?? f.all}</span>
                  <span style={{ ...small, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{num(c.count)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const cell = (v, color) => <span role="cell" style={{ textAlign: 'center', fontSize: TYPE.figure, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: v ? color : 'var(--tick)' }}>{v}</span>;

/**
 * The list. `title` is what was clicked; `where` the tab or department it
 * was clicked on; `rows` the people behind it (services/insightsPeople.js);
 * `onBigPicture(filters)` opens them in the Big Picture, left out for
 * people who may not see it.
 */
export function PeopleList({ title, where, rows, isDark, reduce, onBigPicture, onClose }) {
  const ink = isDark ? INK.dark : INK.light;
  const [picked, setPicked] = useState({ department: null, campaign: null, level: null });
  const [open, setOpen] = useState('department');
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  // each filter's counts come from the rows the other filters leave
  const by = (skip) => rows.filter((x) => FILTERS.every((f) => f.key === skip || !picked[f.key] || (f.key === 'campaign' ? x.campaigns.includes(picked.campaign) : x[f.key] === picked[f.key])));
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, countsBy(by(f.key), f.key)])), [rows, picked]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(() => findPeople(by(null), q), [rows, picked, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const page = Math.min(at, n - 1);
  const shown = list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const pick = (key, v) => { setPicked((p) => ({ ...p, [key]: v })); setAt(0); };
  const saveAs = () => downloadXlsx(xlsxName('insights', title, 'people'), peopleBook(list, { title: `${title} · ${where}` }));

  const btn = { height: 32, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 10, fontSize: TYPE.body, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };

  return createPortal(
    <div data-ins-people-list onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ ...themeVars(isDark), position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(3px)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <motion.div role="dialog" aria-modal="true" aria-label={`People · ${title}`} initial={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduce ? 0 : 0.22, ease: EASE }} style={{ width: 'min(1060px, 100%)', maxHeight: 'calc(100vh - 32px)', display: 'grid', gridTemplateColumns: '250px minmax(0,1fr)', overflow: 'hidden', borderRadius: 18, border: '1px solid var(--card-edge)', background: 'var(--base)', boxShadow: '0 30px 70px rgba(15,23,42,0.28)', color: 'var(--text)' }}>
        <nav aria-label="Narrow the list" className="ins-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '20px 12px', background: 'var(--plate)', borderRight: '1px solid var(--hair)', overflowY: 'auto' }}>
          <h2 style={{ margin: '0 8px', fontSize: TYPE.heading, fontWeight: 700 }}>People</h2>
          <span style={{ margin: '4px 8px 12px', ...small, fontSize: TYPE.body, lineHeight: 1.4 }}>Narrow the list. Each choice adds to what you clicked.</span>
          {FILTERS.map((f) => <Filter key={f.key} f={f} value={picked[f.key]} counts={counts[f.key]} open={open === f.key} onOpen={() => setOpen((o) => (o === f.key ? null : f.key))} onPick={(v) => pick(f.key, v)} />)}
        </nav>

        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: TYPE.heading, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
              <span style={{ display: 'block', ...small, fontSize: TYPE.body, marginTop: 2 }}>{where}</span>
            </span>
            {onBigPicture && <button type="button" data-ins-people-bp onClick={() => onBigPicture(picked)} style={{ ...btn, border: '1px solid var(--card-edge)', background: 'var(--ghost)', color: 'var(--text)' }}>Open in the Big Picture <ArrowUpRight size={13} strokeWidth={2.6} aria-hidden /></button>}
            <button type="button" data-ins-people-export onClick={saveAs} style={{ ...btn, border: 'none', background: 'var(--brand-fill)', color: '#FFFFFF' }}><Download size={13} strokeWidth={2.6} aria-hidden /> Export</button>
            <button type="button" aria-label="Close" onClick={onClose} style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 999, border: 'none', background: 'var(--track)', color: 'var(--text)', cursor: 'pointer' }}><X size={15} strokeWidth={2.4} aria-hidden /></button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px', marginTop: 14, borderRadius: 10, border: '1px solid var(--hair-strong)' }}>
            <Search size={14} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
            <input value={q} onChange={(e) => { setQ(e.target.value); setAt(0); }} placeholder="Find a person" aria-label="Find a person" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: TYPE.strong, fontWeight: 500 }} />
          </label>

          <div role="table" aria-label={`People · ${title}`} style={{ marginTop: 12 }}>
            <div role="row" style={{ display: 'grid', gridTemplateColumns: COLS, padding: '0 16px 6px', fontSize: TYPE.label, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              <span role="columnheader">Person</span>
              {['Emails', 'Clicked', 'Reported', 'Gave details'].map((h) => <span key={h} role="columnheader" style={{ textAlign: 'center' }}>{h}</span>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: PER_PAGE * (ROW_H + 6) - 6 }}>
              {shown.map((x) => (
                <div key={x.id} role="row" data-ins-people-row style={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', height: ROW_H, padding: '0 16px', borderRadius: 12, border: '1px solid var(--hair-strong)', background: 'var(--base)' }}>
                  <span role="cell" style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: TYPE.strong + 1, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</span>
                    <span style={{ display: 'block', ...small, fontSize: TYPE.body, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.department}</span>
                  </span>
                  {cell(x.emails, 'var(--text)')}
                  {cell(x.clicked, ink.bad)}
                  {cell(x.reported, ink.good)}
                  {cell(x.gave, ink.severe)}
                </div>
              ))}
              {!shown.length && <p style={{ ...small, fontSize: TYPE.body, textAlign: 'center', margin: '40px 0' }}>No one matches these filters.</p>}
            </div>
          </div>

          <div style={{ marginTop: 12 }}><Pager page={page} pages={n} total={list.length} size={PER_PAGE} onPage={setAt} /></div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
