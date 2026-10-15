import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, Download, Search, Users } from 'lucide-react';

import LevelBadge from '../../GlobalComponents/LevelBadge';
import { LEVEL_BY_ID, rankName } from '../../services/levels';
import { GROUPS, PEOPLE_FILTERS } from '../../services/bigPicture';
import { departmentsCsv, peopleCsv } from '../../services/bigPictureExport';
import { csvName, downloadCsv } from '../../services/csv';

// The Big Picture's lists: everyone one by one (People, for admins) and
// department by department. Both filter, sort, select and export to CSV, so
// the people and departments behind any number can be picked out and taken
// out of the system.

const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
const pc = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);
const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };
const ROW_H = 40;

const control = (isDark) => ({ height: 30, borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)', fontSize: 10.5, fontWeight: 700, padding: '0 8px', outline: 'none', colorScheme: isDark ? 'dark' : 'light', minWidth: 0 });
const button = (primary) => ({
  height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 9, fontSize: 10.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
  border: primary ? 'none' : '1px solid var(--hair)', background: primary ? 'var(--ink)' : 'transparent', color: primary ? 'var(--ink-on)' : 'var(--text)',
});

// A checkbox that can show "some of these".
function Tick({ checked, mixed = false, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = mixed && !checked; }, [mixed, checked]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} style={{ width: 14, height: 14, margin: 0, cursor: 'pointer', accentColor: 'var(--bp-accent)' }} />;
}

// A column heading that sorts its column; again, the other way.
function SortHead({ label, k, sort, onSort, align = 'right' }) {
  const on = sort.key === k;
  const Icon = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button type="button" onClick={() => onSort(k)} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', gap: 3, width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: align, color: on ? 'var(--text)' : 'var(--muted)', fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2 }}>
      {label}
      {on && <Icon size={10} strokeWidth={3} aria-hidden style={{ flexShrink: 0 }} />}
    </button>
  );
}

const sorter = (sort, tie = 'name') => (a, b) => {
  const x = a[sort.key];
  const y = b[sort.key];
  const d = typeof x === 'string' ? x.localeCompare(String(y)) : (x ?? 0) - (y ?? 0);
  return (sort.dir === 'asc' ? d : -d) || String(a[tie]).localeCompare(String(b[tie]));
};

// What stands out about a person, worst first; shown as up to two chips.
const FLAGS = [
  { k: (x) => x.fellBelowZero, label: 'Fell below zero', bad: true },
  { k: (x) => x.nearZero, label: '1 click from below zero', bad: true },
  { k: (x) => x.nearSlip, label: '1 click from a level down', bad: true },
  { k: (x) => x.moved === 'down', label: 'Slipped a level', bad: true },
  { k: (x) => x.gave > 0, label: 'Gave details away', bad: true },
  { k: (x) => x.campaigns > 0 && x.reported === 0, label: 'Never reported', bad: true },
  { k: (x) => x.backAbove, label: 'Back above zero', bad: false },
  { k: (x) => x.nearUp, label: '1 report from a level up', bad: false },
  { k: (x) => x.moved === 'up', label: 'Climbed a level', bad: false },
];

function Flags({ x, ink }) {
  const all = FLAGS.filter((f) => f.k(x));
  if (!all.length) return <span style={small}>—</span>;
  return (
    <span title={all.map((f) => f.label).join(' · ')} style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, overflow: 'hidden' }}>
      {all.slice(0, 1).map((f) => (
        <span key={f.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 999, background: 'var(--track)', fontSize: 9, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, flexShrink: 0, background: f.bad ? ink.bad : ink.good }} />{f.label}
        </span>
      ))}
      {all.length > 1 && <span style={{ ...small, fontSize: 9, fontWeight: 800, flexShrink: 0 }}>+{all.length - 1}</span>}
    </span>
  );
}

const PEOPLE_COLS = '28px 46px minmax(0,1.6fr) minmax(0,1.1fr) minmax(0,1.3fr) 60px 62px 52px 58px 52px minmax(0,1.35fr)';

/**
 * Everyone, one by one. `view` holds the filters and sort ({ show, dept,
 * level, q, sort }); `selected` is a Set of person keys.
 */
export function PeopleTable({ r, view, onView, selected, onSelected, scopeName, isDark, ink }) {
  const filter = PEOPLE_FILTERS.find((f) => f.id === view.show) || PEOPLE_FILTERS[0];
  const q = view.q.trim().toLowerCase();
  const rows = useMemo(() => {
    let list = r.people.filter(filter.test);
    if (view.dept !== 'all') list = list.filter((x) => x.dept === view.dept);
    if (view.level !== 'all') list = list.filter((x) => x.groupNow === view.level);
    if (q) list = list.filter((x) => x.name.toLowerCase().includes(q) || x.email.toLowerCase().includes(q));
    // on equal values, keep board order: bottom first when the lowest points lead
    const byBoard = view.sort.key === 'points' && view.sort.dir === 'asc' ? (a, b) => b.rank - a.rank : (a, b) => a.rank - b.rank;
    const primary = sorter(view.sort, 'rank');
    return [...list].sort((a, b) => {
      const x = a[view.sort.key] ?? 0;
      const y = b[view.sort.key] ?? 0;
      return x !== y ? primary(a, b) : byBoard(a, b);
    });
  }, [r.people, filter, view.dept, view.level, q, view.sort]);
  const counts = useMemo(() => Object.fromEntries(PEOPLE_FILTERS.map((f) => [f.id, r.people.filter(f.test).length])), [r.people]);
  const depts = useMemo(() => [...new Set(r.people.map((x) => x.dept))].sort(), [r.people]);

  // Only the rows in sight are drawn, so a campaign of thousands scrolls freely.
  const box = useRef(null);
  const [scroll, setScroll] = useState(0);
  const [height, setHeight] = useState(320);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const change = (patch) => {
    onView({ ...view, ...patch });
    if (box.current) box.current.scrollTop = 0;
    setScroll(0);
  };
  const onSort = (key) => change({ sort: { key, dir: view.sort.key === key && view.sort.dir === 'asc' ? 'desc' : 'asc' } });
  const first = Math.max(0, Math.floor(scroll / ROW_H) - 6);
  const last = Math.min(rows.length, Math.ceil((scroll + height) / ROW_H) + 6);

  const shownPicked = rows.filter((x) => selected.has(x.key)).length;
  const allPicked = rows.length > 0 && shownPicked === rows.length;
  const toggleAll = () => {
    const next = new Set(selected);
    rows.forEach((x) => (allPicked ? next.delete(x.key) : next.add(x.key)));
    onSelected(next);
  };
  const toggle = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    onSelected(next);
  };
  const exportRows = (list, what) => downloadCsv(csvName('big picture', scopeName, what), peopleCsv(list));

  return (
    <div data-bp-people style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <select aria-label="Show" value={view.show} onChange={(e) => change({ show: e.target.value })} style={{ ...control(isDark), width: 220 }}>
          {PEOPLE_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label} ({num(counts[f.id])})</option>)}
        </select>
        <select aria-label="Department" value={view.dept} onChange={(e) => change({ dept: e.target.value })} style={{ ...control(isDark), width: 170 }}>
          <option value="all">All departments</option>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="Level" value={view.level} onChange={(e) => change({ level: e.target.value })} style={{ ...control(isDark), width: 150 }}>
          <option value="all">All levels</option>
          {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
        <label style={{ position: 'relative', flex: 1, minWidth: 110, maxWidth: 200 }}>
          <span className="sr-only">Search people</span>
          <Search size={13} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input type="search" value={view.q} onChange={(e) => change({ q: e.target.value })} placeholder="Name or email" style={{ ...control(isDark), width: '100%', boxSizing: 'border-box', paddingLeft: 28, fontWeight: 600 }} />
        </label>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {selected.size > 0 && (
            <>
              <span style={{ ...small, whiteSpace: 'nowrap' }}><strong style={{ color: 'var(--text)' }}>{num(selected.size)}</strong> selected · <button type="button" onClick={() => onSelected(new Set())} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...small, fontWeight: 800, textDecoration: 'underline' }}>Clear</button></span>
              <button type="button" data-bp-export-selected onClick={() => exportRows(r.people.filter((x) => selected.has(x.key)), 'selected people')} style={button(true)}><Download size={13} strokeWidth={2.6} aria-hidden />Export selected</button>
            </>
          )}
          <button type="button" data-bp-export-list onClick={() => exportRows(rows, view.show === 'all' ? 'people' : filter.label)} disabled={!rows.length} style={{ ...button(selected.size === 0), opacity: rows.length ? 1 : 0.5 }}>
            <Download size={13} strokeWidth={2.6} aria-hidden />Export list ({num(rows.length)})
          </button>
        </span>
      </div>

      <div role="table" aria-label="People" aria-rowcount={rows.length + 1} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--hair)', borderRadius: 12, overflow: 'hidden' }}>
        <div role="row" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: PEOPLE_COLS, alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--track)' }}>
          <Tick checked={allPicked} mixed={shownPicked > 0} onChange={toggleAll} label="Select everyone shown" />
          <SortHead label="Rank" k="rank" sort={view.sort} onSort={onSort} align="left" />
          <span style={{ ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Person</span>
          <span style={{ ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Department</span>
          <span style={{ ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Level</span>
          <SortHead label="Points" k="points" sort={view.sort} onSort={onSort} />
          <SortHead label="Change" k="change" sort={view.sort} onSort={onSort} />
          <SortHead label="Emails" k="campaigns" sort={view.sort} onSort={onSort} />
          <SortHead label="Reported" k="reported" sort={view.sort} onSort={onSort} />
          <SortHead label="Clicked" k="clicked" sort={view.sort} onSort={onSort} />
          <span style={{ ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Stands out</span>
        </div>
        <div ref={box} className="lb-scroll" onScroll={(e) => setScroll(e.currentTarget.scrollTop)} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', position: 'relative' }}>
          {!rows.length && <div style={{ ...small, fontSize: 10.5, padding: '18px 14px' }}>No one matches these filters.</div>}
          <div style={{ height: rows.length * ROW_H, position: 'relative' }}>
            {rows.slice(first, last).map((x, k) => {
              const i = first + k;
              const level = LEVEL_BY_ID[x.levelId];
              const on = selected.has(x.key);
              const Move = x.change > 0 ? ArrowUpRight : ArrowDownRight;
              return (
                <div key={x.key} role="row" data-bp-person={x.key} style={{ position: 'absolute', top: i * ROW_H, left: 0, right: 0, height: ROW_H, display: 'grid', gridTemplateColumns: PEOPLE_COLS, alignItems: 'center', gap: 10, padding: '0 12px', borderTop: i ? '1px solid var(--hair)' : 'none', background: on ? 'var(--bp-soft)' : 'transparent' }}>
                  <Tick checked={on} onChange={() => toggle(x.key)} label={`Select ${x.name || x.key}`} />
                  <span style={{ fontSize: 10.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{num(x.rank)}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name || x.key}</span>
                    {x.email && <span style={{ display: 'block', ...small, fontSize: 9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.email}</span>}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.dept}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    {level && <LevelBadge level={level} size={22} tilt={false} decorative />}
                    <span style={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rankName(level)}</span>
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(x.points)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, fontSize: 10.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {x.change !== 0 && <Move size={11} strokeWidth={3} color={x.change > 0 ? ink.good : ink.bad} aria-hidden />}
                    {x.change ? signed(x.change) : '0'}
                  </span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{x.campaigns}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{x.reported}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{x.clicked}{x.gave > 0 && <span style={small}> ({x.gave} gave)</span>}</span>
                  <Flags x={x} ink={ink} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// The departments table's columns: [key, heading].
const DEPT_FIELDS = [
  ['people', 'People'], ['avgPoints', 'Avg points'], ['net', 'Gained or lost'], ['climbed', 'Climbed'], ['slipped', 'Slipped'],
  ['belowZero', 'Below zero'], ['fellBelowZero', 'Fell below 0'], ['nearZero', '1 click to below 0'], ['nearSlip', '1 click to level down'],
  ['nearUp', '1 report to level up'], ['reportRate', 'Report rate'], ['clickRate', 'Click rate'],
];

/**
 * Department by department. `selected` is a Set of department names;
 * `onPeople(name)` (admins only) opens People on that department.
 */
export function DepartmentTable({ r, sort, onSort, selected, onSelected, onPeople, scopeName, ink }) {
  const rows = useMemo(() => [...r.departments].sort(sorter(sort)), [r.departments, sort]);
  const maxNet = Math.max(1, ...rows.map((d) => Math.abs(d.net)));
  const cols = `28px minmax(0,1.7fr) repeat(${DEPT_FIELDS.length}, minmax(0,1fr))${onPeople ? ' 64px' : ''}`;
  const allPicked = rows.length > 0 && rows.every((d) => selected.has(d.name));
  const toggleAll = () => onSelected(allPicked ? new Set() : new Set(rows.map((d) => d.name)));
  const toggle = (name) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name); else next.add(name);
    onSelected(next);
  };
  const sortBy = (key) => onSort({ key, dir: sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc' });
  const exportRows = (list, what) => downloadCsv(csvName('big picture', scopeName, what), departmentsCsv(list));
  const cell = (d, key) => {
    if (key === 'net') {
      return (
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{signed(d.net)}</span>
          <span aria-hidden style={{ width: `${Math.max(6, (Math.abs(d.net) / maxNet) * 100)}%`, height: 4, borderRadius: 4, background: d.net >= 0 ? ink.good : ink.bad }} />
        </span>
      );
    }
    if (key === 'reportRate' || key === 'clickRate') return <span style={{ fontSize: 10.5, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pc(d[key])}</span>;
    return <span style={{ fontSize: 10.5, fontWeight: key === 'people' ? 800 : 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: d[key] ? 'var(--text)' : 'var(--muted)' }}>{num(d[key])}</span>;
  };

  return (
    <div data-bp-departments style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ ...small, fontSize: 10.5 }}><strong style={{ color: 'var(--text)' }}>{rows.length}</strong> departments · click a heading to sort</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {selected.size > 0 && (
            <>
              <span style={{ ...small, whiteSpace: 'nowrap' }}><strong style={{ color: 'var(--text)' }}>{selected.size}</strong> selected · <button type="button" onClick={() => onSelected(new Set())} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...small, fontWeight: 800, textDecoration: 'underline' }}>Clear</button></span>
              <button type="button" onClick={() => exportRows(rows.filter((d) => selected.has(d.name)), 'selected departments')} style={button(true)}><Download size={13} strokeWidth={2.6} aria-hidden />Export selected</button>
            </>
          )}
          <button type="button" data-bp-export-departments onClick={() => exportRows(rows, 'departments')} style={button(selected.size === 0)}><Download size={13} strokeWidth={2.6} aria-hidden />Export table</button>
        </span>
      </div>
      <div role="table" aria-label="Departments" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid var(--hair)', borderRadius: 12, overflow: 'hidden' }}>
        <div role="row" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--track)' }}>
          <Tick checked={allPicked} mixed={selected.size > 0} onChange={toggleAll} label="Select every department" />
          <SortHead label="Department" k="name" sort={sort} onSort={sortBy} align="left" />
          {DEPT_FIELDS.map(([k, label]) => <SortHead key={k} label={label} k={k} sort={sort} onSort={sortBy} />)}
          {onPeople && <span />}
        </div>
        <div className="lb-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
          {rows.map((d, i) => {
            const on = selected.has(d.name);
            return (
              <div key={d.name} role="row" data-bp-dept={d.name} style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 8, minHeight: 38, padding: '4px 12px', borderTop: i ? '1px solid var(--hair)' : 'none', background: on ? 'var(--bp-soft)' : 'transparent' }}>
                <Tick checked={on} onChange={() => toggle(d.name)} label={`Select ${d.name}`} />
                <span style={{ fontSize: 10.5, fontWeight: 800, lineHeight: 1.25, minWidth: 0, overflowWrap: 'anywhere' }}>{d.name}</span>
                {DEPT_FIELDS.map(([k]) => <span key={k} style={{ display: 'flex', justifyContent: 'flex-end' }}>{cell(d, k)}</span>)}
                {onPeople && (
                  <button type="button" onClick={() => onPeople(d.name)} aria-label={`See the people in ${d.name}`} style={{ justifySelf: 'end', display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 8px', borderRadius: 8, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--text)', fontSize: 9.5, fontWeight: 800, cursor: 'pointer' }}>
                    <Users size={11} strokeWidth={2.6} aria-hidden />People
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
