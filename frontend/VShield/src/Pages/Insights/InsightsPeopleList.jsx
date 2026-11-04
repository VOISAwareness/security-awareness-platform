import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArrowUpRight, Check, ChevronDown, Download, Search, X } from 'lucide-react';

import { findPeople, peopleBook, peopleFor } from '../../services/insightsPeople';
import { Pager } from '../Leaderboard/BigPictureTables';
import { downloadXlsx, xlsxName } from '../../services/xlsx';
import { EASE, INK, num, small, themeVars, TYPE } from './insightsUi';

// The people behind a number. Every bar, row and figure on Insights opens
// this list on the people table with what was clicked already chosen in the
// three filters on the left (department, campaign, risk level), ticked so
// they can be seen and unticked; what has no filter of its own (who
// clicked, a reason they are at risk, a training step, a month) holds for
// the whole list and shows under the title. Each filter takes any number
// of choices, each with how many people it holds. The list is laid out as the
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

const summary = (f, value) => (!value.length ? f.all : value.length === 1 ? value[0] : `${value.length} selected`);

function Filter({ f, value, counts, open, onOpen, onPick, onClear }) {
  const [q, setQ] = useState('');
  // what is chosen first, then the rest by how many people they hold
  const all = [...value.filter((v) => !counts.some((c) => c.value === v)).map((v) => ({ value: v, count: 0 })), ...counts]
    .sort((a, b) => Number(value.includes(b.value)) - Number(value.includes(a.value)) || b.count - a.count);
  const shown = all.filter((c) => !q || String(c.value).toLowerCase().includes(q.toLowerCase()));
  const box = (on) => <span aria-hidden style={{ width: 14, height: 14, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 4, border: on ? 'none' : '1.5px solid var(--tick)', background: on ? 'var(--brand-fill)' : 'transparent', color: '#FFFFFF' }}>{on && <Check size={10} strokeWidth={3.2} />}</span>;
  const rowStyle = (on) => ({ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', borderRadius: 7, border: 'none', background: on ? 'rgba(230,0,0,0.06)' : 'transparent', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' });
  return (
    <div data-ins-people-filter={f.key} data-ins-picked={value.join('|')}>
      <button type="button" onClick={onOpen} aria-expanded={open} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', borderRadius: 12, border: 'none', background: open ? 'var(--base)' : 'transparent', boxShadow: open ? '0 2px 8px rgba(15,23,42,0.08)' : 'none', color: 'var(--text)', font: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: TYPE.strong, fontWeight: 700 }}>{f.name}</span>
          <span style={{ display: 'block', ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: value.length ? 'var(--brand)' : 'var(--muted)', fontWeight: value.length ? 700 : 500 }}>{summary(f, value)}</span>
        </span>
        <span style={{ fontSize: TYPE.label, fontWeight: 700, color: 'var(--muted)', background: 'var(--track)', borderRadius: 999, padding: '2px 8px' }}>{value.length ? `${value.length}/${all.length}` : all.length}</span>
        <ChevronDown size={14} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s ease' }} />
      </button>
      {open && (
        <div style={{ margin: '4px 2px 8px 8px', padding: 8, borderRadius: 12, background: 'var(--base)', border: '1px solid var(--hair)' }}>
          {all.length > 6 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, height: 28, padding: '0 9px', marginBottom: 6, borderRadius: 8, background: 'var(--plate)' }}>
              <Search size={12} strokeWidth={2.4} aria-hidden style={{ color: 'var(--muted)' }} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Find a ${f.name.toLowerCase()}`} aria-label={`Find a ${f.name.toLowerCase()}`} style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 500 }} />
            </label>
          )}
          <div className="ins-scroll" style={{ maxHeight: 168, overflowY: 'auto', paddingRight: 4 }}>
            <button type="button" onClick={onClear} aria-pressed={!value.length} style={rowStyle(!value.length)}>
              {box(!value.length)}
              <span style={{ flex: 1, minWidth: 0, fontSize: TYPE.body, fontWeight: 700 }}>{f.all}</span>
            </button>
            {shown.map((c) => {
              const on = value.includes(c.value);
              return (
                <button key={c.value} type="button" data-ins-option={c.value} onClick={() => onPick(c.value)} aria-pressed={on} style={rowStyle(on)}>
                  {box(on)}
                  <span style={{ flex: 1, minWidth: 0, fontSize: TYPE.body, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.value}</span>
                  <span style={{ ...small, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{num(c.count)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const cell = (v, color) => <span role="cell" style={{ textAlign: 'center', fontSize: TYPE.figure, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: v ? color : 'var(--tick)' }}>{v}</span>;

// how many of `rows` hold each value of `key`; a campaign counts those
// whose record for it passes `did`
function countsOf(rows, key, did) {
  const n = new Map();
  const add = (v) => n.set(v, (n.get(v) || 0) + 1);
  rows.forEach((x) => {
    if (key !== 'campaign') { if (x[key]) add(x[key]); return; }
    x.records.forEach((r) => { if (!did || (did === 'twice' ? true : r[did] > 0)) add(r.campaign); });
  });
  return [...n.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)));
}

/**
 * The list. `title` is what was clicked; `where` the tab or department it
 * was clicked on; `rows` the people table (services/insightsPeople.js);
 * `picked` the department(s), campaign(s) and level(s) it opens with;
 * `fixed` what else holds ({ did, driver, step, programme, month }) and
 * `notes` how that reads; `onBigPicture(picked)` opens them in the Big
 * Picture, left out for people who may not see it.
 */
export function PeopleList({ title, where, rows, picked: start = {}, fixed = {}, notes = [], types = {}, isDark, reduce, onBigPicture, onClose }) {
  const ink = isDark ? INK.dark : INK.light;
  const [picked, setPicked] = useState(() => ({ department: [], campaign: [], level: [], ...start }));
  const [open, setOpen] = useState(() => FILTERS.find((f) => start[f.key]?.length)?.key ?? 'department');
  const [q, setQ] = useState('');
  const [at, setAt] = useState(0);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape') close.current(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  // each filter's counts come from the people the other filters leave
  const under = (skip) => peopleFor(rows, { ...fixed, ...Object.fromEntries(FILTERS.map((f) => [f.key, f.key === skip ? [] : picked[f.key]])) }, { types });
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.key, countsOf(under(f.key), f.key, fixed.did)])), [rows, picked, fixed, types]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(() => findPeople(under(null), q), [rows, picked, fixed, types, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const n = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const page = Math.min(at, n - 1);
  const shown = list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const pick = (key, v) => { setPicked((p) => ({ ...p, [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v] })); setAt(0); };
  const clear = (key) => { setPicked((p) => ({ ...p, [key]: [] })); setAt(0); };
  const saveAs = () => downloadXlsx(xlsxName('insights', title, 'people'), peopleBook(list, { title: `${title} · ${where}` }));

  const btn = { height: 32, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', borderRadius: 10, fontSize: TYPE.body, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' };

  return createPortal(
    <div data-ins-people-list onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ ...themeVars(isDark), position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(3px)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <motion.div role="dialog" aria-modal="true" aria-label={`People · ${title}`} initial={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: reduce ? 0 : 0.22, ease: EASE }} style={{ width: 'min(1060px, 100%)', maxHeight: 'calc(100vh - 32px)', display: 'grid', gridTemplateColumns: '250px minmax(0,1fr)', overflow: 'hidden', borderRadius: 18, border: '1px solid var(--card-edge)', background: 'var(--base)', boxShadow: '0 30px 70px rgba(15,23,42,0.28)', color: 'var(--text)' }}>
        <nav aria-label="Narrow the list" className="ins-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '20px 12px', background: 'var(--plate)', borderRight: '1px solid var(--hair)', overflowY: 'auto' }}>
          <h2 style={{ margin: '0 8px', fontSize: TYPE.heading, fontWeight: 800 }}>People</h2>
          <span style={{ margin: '4px 8px 12px', ...small, fontSize: TYPE.body, lineHeight: 1.4 }}>Chosen from what you clicked. Untick to widen.</span>
          {FILTERS.map((f) => <Filter key={f.key} f={f} value={picked[f.key]} counts={counts[f.key]} open={open === f.key} onOpen={() => setOpen((o) => (o === f.key ? null : f.key))} onPick={(v) => pick(f.key, v)} onClear={() => clear(f.key)} />)}
        </nav>

        <div style={{ minHeight: 0, display: 'flex', flexDirection: 'column', padding: '20px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: TYPE.heading, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
              <span data-ins-people-where style={{ display: 'block', ...small, fontSize: TYPE.body, marginTop: 2 }}>{[where, ...notes].join(' · ')}</span>
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
            <div role="row" style={{ display: 'grid', gridTemplateColumns: COLS, padding: '0 16px 6px', fontSize: TYPE.label, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              <span role="columnheader">Person</span>
              {['Emails', 'Clicked', 'Reported', 'Gave details'].map((h) => <span key={h} role="columnheader" style={{ textAlign: 'center' }}>{h}</span>)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: PER_PAGE * (ROW_H + 6) - 6 }}>
              {shown.map((x) => (
                <div key={x.id} role="row" data-ins-people-row style={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', height: ROW_H, padding: '0 16px', borderRadius: 12, border: '1px solid var(--hair-strong)', background: 'var(--base)' }}>
                  <span role="cell" style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: TYPE.strong + 1, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name}</span>
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
