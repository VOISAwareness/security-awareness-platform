import { useEffect, useMemo, useRef } from 'react';
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, ChevronLeft, ChevronRight, Search, Users } from 'lucide-react';

import LevelBadge from '../../GlobalComponents/LevelBadge';
import { LEVEL_BY_ID, rankName } from '../../services/levels';
import { GROUPS, PEOPLE_FILTERS } from '../../services/bigPicture';
import { count, share } from '../../services/bigPictureFindings';
import { departmentsShown, peopleShown } from '../../services/bigPictureViews';
import { useFitRows } from './useFitRows';

// The Big Picture's lists: everyone one by one (People, for admins) and
// department by department. Built for tens of thousands: a page that fits
// the screen at a time, a few columns that matter (the export has them all),
// filters and search to find anyone, and selection that can take in every
// match, not just the page. What they show (and what is selected) is what
// the one Export menu offers to download.

const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
const pc = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);
const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };
const head = { ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' };

const control = (isDark) => ({ height: 30, borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)', fontSize: 10.5, fontWeight: 700, padding: '0 8px', outline: 'none', colorScheme: isDark ? 'dark' : 'light', minWidth: 0 });

// A checkbox that can show "some of these".
export function Tick({ checked, mixed = false, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.indeterminate = mixed && !checked; }, [mixed, checked]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} style={{ width: 14, height: 14, margin: 0, cursor: 'pointer', accentColor: 'var(--bp-accent)' }} />;
}

// "1–12 of 30,000"  ‹ 1 2 3 … 2,500 ›
export function Pager({ page, pages, total, size, onPage, what = 'people' }) {
  const from = total ? page * size + 1 : 0;
  const to = Math.min(total, (page + 1) * size);
  const near = [...new Set([0, page - 1, page, page + 1, pages - 1])].filter((p) => p >= 0 && p < pages).sort((a, b) => a - b);
  const cell = (on) => ({ minWidth: 26, height: 26, padding: '0 6px', borderRadius: 8, border: on ? 'none' : '1px solid var(--hair)', background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--ink-on)' : 'var(--text)', fontSize: 10, fontWeight: 800, cursor: 'pointer', fontVariantNumeric: 'tabular-nums' });
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 10, borderTop: '1px solid var(--hair)' }}>
      <span style={small}><strong style={{ color: 'var(--text)' }}>{num(from)}–{num(to)}</strong> of {num(total)} {what}</span>
      {pages > 1 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => onPage(page - 1)} style={{ ...cell(false), opacity: page === 0 ? 0.4 : 1 }}><ChevronLeft size={12} strokeWidth={2.8} /></button>
          {near.map((p, i) => (
            <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {i > 0 && p - near[i - 1] > 1 && <span style={small}>…</span>}
              <button type="button" aria-label={`Page ${p + 1}`} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)} style={cell(p === page)}>{num(p + 1)}</button>
            </span>
          ))}
          <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} style={{ ...cell(false), opacity: page >= pages - 1 ? 0.4 : 1 }}><ChevronRight size={12} strokeWidth={2.8} /></button>
        </span>
      )}
    </div>
  );
}

// A column heading that sorts its column; again, the other way.
function SortHead({ label, k, sort, onSort, align = 'right' }) {
  const on = sort.key === k;
  const Icon = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button type="button" onClick={() => onSort(k)} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'right' ? 'flex-end' : 'flex-start', gap: 3, width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: align, ...head, color: on ? 'var(--text)' : 'var(--muted)', lineHeight: 1.2 }}>
      {label}
      {on && <Icon size={10} strokeWidth={3} aria-hidden style={{ flexShrink: 0 }} />}
    </button>
  );
}


// What stands out about a person: the first that applies.
const FLAGS = [
  [(x) => x.fellBelowZero, 'Fell below zero', true],
  [(x) => x.belowZero, 'Below zero', true],
  [(x) => x.nearZero, '1 click from below zero', true],
  [(x) => x.nearSlip, '1 click from a level down', true],
  [(x) => x.moved === 'down', 'Slipped a level', true],
  [(x) => x.gave > 0, 'Gave details away', true],
  [(x) => x.campaigns > 0 && x.reported === 0, 'Never reported', true],
  [(x) => x.backAbove, 'Back above zero', false],
  [(x) => x.moved === 'up', 'Climbed a level', false],
  [(x) => x.nearUp, '1 report from a level up', false],
];
function Flag({ x, ink }) {
  const f = FLAGS.find(([test]) => test(x));
  if (!f) return <span style={small}>—</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0, fontSize: 10, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, flexShrink: 0, background: f[2] ? ink.bad : ink.good }} />{f[1]}
    </span>
  );
}

// One person: rank, badge, name with department and level, points, change, what stands out.
export function PersonRow({ x, ink, cols, tick = null, rowH = 44, first = false, picked = false }) {
  const level = LEVEL_BY_ID[x.levelId];
  return (
    <div role="row" data-bp-person={x.key} style={{ height: rowH, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 12px', borderTop: first ? 'none' : '1px solid var(--hair)', background: picked ? 'var(--bp-soft)' : 'transparent' }}>
      {tick}
      <span style={{ ...small, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>#{num(x.rank)}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {level ? <LevelBadge level={level} size={24} tilt={false} decorative /> : <span style={{ width: 19 }} />}
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name || x.key}</span>
          <span style={{ display: 'block', ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.dept} · {rankName(level)}</span>
        </span>
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{num(x.points)}</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, fontSize: 10.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {x.change ? <>{x.change > 0 ? <ArrowUpRight size={11} strokeWidth={3} color={ink.good} aria-hidden /> : <ArrowDownRight size={11} strokeWidth={3} color={ink.bad} aria-hidden />}{signed(x.change)}</> : <span style={small}>—</span>}
      </span>
      <Flag x={x} ink={ink} />
    </div>
  );
}

const PEOPLE_COLS = '18px 52px minmax(0,2.2fr) 70px 66px minmax(0,1.3fr)';
const ROW_H = 44;

/**
 * Everyone, one by one. `view` holds the filters, sort and page ({ show,
 * dept, level, q, sort, page }); `selected` is a Set of person keys.
 */
export function PeopleTable({ r, view, onView, selected, onSelected, isDark, ink }) {
  const rows = useMemo(() => peopleShown(r, view), [r, view]);
  const counts = useMemo(() => Object.fromEntries(PEOPLE_FILTERS.map((f) => [f.id, r.people.filter(f.test).length])), [r.people]);
  const depts = useMemo(() => [...new Set(r.people.map((x) => x.dept))].sort(), [r.people]);

  const [box, size] = useFitRows(ROW_H);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(view.page || 0, pages - 1);
  const shown = rows.slice(page * size, (page + 1) * size);
  const change = (patch) => onView({ ...view, page: 0, ...patch });
  const onSort = (key) => change({ sort: { key, dir: view.sort.key === key && view.sort.dir === 'asc' ? 'desc' : 'asc' } });

  const pagePicked = shown.length > 0 && shown.every((x) => selected.has(x.key));
  const allPicked = rows.length > 0 && rows.every((x) => selected.has(x.key));
  const togglePage = () => {
    const next = new Set(selected);
    shown.forEach((x) => (pagePicked ? next.delete(x.key) : next.add(x.key)));
    onSelected(next);
  };
  const toggle = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    onSelected(next);
  };
  return (
    <div data-bp-people style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ position: 'relative', width: 200 }}>
          <span className="sr-only">Search people</span>
          <Search size={13} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input type="search" value={view.q} onChange={(e) => change({ q: e.target.value })} placeholder="Find a person" style={{ ...control(isDark), width: '100%', boxSizing: 'border-box', paddingLeft: 28, fontWeight: 600 }} />
        </label>
        <select aria-label="Show" value={view.show} onChange={(e) => change({ show: e.target.value })} style={{ ...control(isDark), width: 210 }}>
          {PEOPLE_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label} · {count(counts[f.id])}</option>)}
        </select>
        <select aria-label="Department" value={view.dept} onChange={(e) => change({ dept: e.target.value })} style={{ ...control(isDark), width: 170 }}>
          <option value="all">All departments</option>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="Level" value={view.level} onChange={(e) => change({ level: e.target.value })} style={{ ...control(isDark), width: 150 }}>
          <option value="all">All levels</option>
          {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.brief}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', ...small, whiteSpace: 'nowrap' }}>
          {selected.size > 0
            ? <><strong style={{ color: 'var(--text)' }}>{count(selected.size)}</strong> selected · <button type="button" onClick={() => onSelected(new Set())} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...small, fontWeight: 800, textDecoration: 'underline' }}>Clear</button></>
            : 'Tick people to export only them'}
        </span>
      </div>

      {pagePicked && !allPicked && rows.length > shown.length && (
        <div style={{ flexShrink: 0, ...small, fontSize: 10, padding: '6px 12px', borderRadius: 9, background: 'var(--bp-soft)', color: 'var(--text)' }}>
          All {shown.length} on this page are selected. <button type="button" data-bp-select-all onClick={() => onSelected(new Set([...selected, ...rows.map((x) => x.key)]))} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', fontSize: 10, fontWeight: 800, color: 'var(--text)', textDecoration: 'underline' }}>Select all {count(rows.length)} that match</button>
        </div>
      )}

      <div role="table" aria-label="People" aria-rowcount={rows.length} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div role="row" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: PEOPLE_COLS, alignItems: 'center', gap: 12, padding: '0 12px 8px', borderBottom: '1px solid var(--hair)' }}>
          <Tick checked={pagePicked} mixed={shown.some((x) => selected.has(x.key))} onChange={togglePage} label="Select everyone on this page" />
          <SortHead label="Rank" k="rank" sort={view.sort} onSort={onSort} align="left" />
          <span style={head}>Person</span>
          <SortHead label="Points" k="points" sort={view.sort} onSort={onSort} />
          <SortHead label="Change" k="change" sort={view.sort} onSort={onSort} />
          <span style={head}>Stands out</span>
        </div>
        <div ref={box} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {!rows.length && <div style={{ ...small, fontSize: 10.5, padding: '18px 12px' }}>No one matches.</div>}
          {shown.map((x, i) => (
            <PersonRow key={x.key} x={x} ink={ink} cols={PEOPLE_COLS} first={i === 0} picked={selected.has(x.key)} tick={<Tick checked={selected.has(x.key)} onChange={() => toggle(x.key)} label={`Select ${x.name || x.key}`} />} />
          ))}
        </div>
        <Pager page={page} pages={pages} total={rows.length} size={size} onPage={(p) => onView({ ...view, page: p })} />
      </div>
    </div>
  );
}

// The departments table: [key, heading, how to show it].
const DEPT_FIELDS = [
  ['people', 'People', (d) => count(d.people)],
  ['perPerson', 'Points each', null],
  ['belowZeroShare', 'Below zero', (d) => share(d.belowZero, d.people)],
  ['slippedShare', 'Slipped', (d) => share(d.slipped, d.tookPart)],
  ['reportRate', 'Reported', (d) => pc(d.reportRate)],
  ['clickRate', 'Clicked', (d) => pc(d.clickRate)],
];
const D_ROW_H = 42;

/**
 * Department by department. `view` holds { sort, q, page }; `selected` is a
 * Set of department names; `onPeople(name)` (admins only) opens its people.
 */
export function DepartmentTable({ r, view, onView, selected, onSelected, onPeople, isDark, ink }) {
  const rows = useMemo(() => departmentsShown(r, view), [r, view]);
  const [box, size] = useFitRows(D_ROW_H);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(view.page || 0, pages - 1);
  const shown = rows.slice(page * size, (page + 1) * size);
  const maxPer = Math.max(1, ...r.departments.map((d) => Math.abs(d.perPerson)));
  const twoWay = r.departments.some((d) => d.perPerson < 0) && r.departments.some((d) => d.perPerson > 0); // else the bars start at the left
  const cols = `18px minmax(0,1.8fr) 64px 120px repeat(4, 74px)${onPeople ? ' 72px' : ''}`;
  const change = (patch) => onView({ ...view, page: 0, ...patch });
  const sortBy = (key) => change({ sort: { key, dir: view.sort.key === key && view.sort.dir === 'asc' ? 'desc' : 'asc' } });
  const allPicked = rows.length > 0 && rows.every((d) => selected.has(d.name));
  const toggleAll = () => onSelected(allPicked ? new Set() : new Set(rows.map((d) => d.name)));
  const toggle = (name) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name); else next.add(name);
    onSelected(next);
  };
  return (
    <div data-bp-departments style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ position: 'relative', width: 200 }}>
          <span className="sr-only">Search departments</span>
          <Search size={13} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input type="search" value={view.q} onChange={(e) => change({ q: e.target.value })} placeholder="Find a department" style={{ ...control(isDark), width: '100%', boxSizing: 'border-box', paddingLeft: 28, fontWeight: 600 }} />
        </label>
        <span style={small}>Least ground gained per person first</span>
        <span style={{ marginLeft: 'auto', ...small, whiteSpace: 'nowrap' }}>
          {selected.size > 0
            ? <><strong style={{ color: 'var(--text)' }}>{selected.size}</strong> selected · <button type="button" onClick={() => onSelected(new Set())} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', ...small, fontWeight: 800, textDecoration: 'underline' }}>Clear</button></>
            : 'Tick departments to export only them'}
        </span>
      </div>
      <div role="table" aria-label="Departments" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div role="row" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 12px 8px', borderBottom: '1px solid var(--hair)' }}>
          <Tick checked={allPicked} mixed={selected.size > 0} onChange={toggleAll} label="Select every department" />
          <SortHead label="Department" k="name" sort={view.sort} onSort={sortBy} align="left" />
          {DEPT_FIELDS.map(([k, label]) => <SortHead key={k} label={label} k={k} sort={view.sort} onSort={sortBy} />)}
          {onPeople && <span />}
        </div>
        <div ref={box} style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {!rows.length && <div style={{ ...small, fontSize: 10.5, padding: '18px 12px' }}>No department matches.</div>}
          {shown.map((d, i) => {
            const on = selected.has(d.name);
            return (
              <div key={d.name} role="row" data-bp-dept={d.name} style={{ height: D_ROW_H, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 12px', borderTop: i ? '1px solid var(--hair)' : 'none', background: on ? 'var(--bp-soft)' : 'transparent' }}>
                <Tick checked={on} onChange={() => toggle(d.name)} label={`Select ${d.name}`} />
                <span style={{ fontSize: 11, fontWeight: 800, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                {DEPT_FIELDS.map(([k, , show]) => (k === 'perPerson' ? (
                  <span key={k} style={{ display: 'grid', gridTemplateColumns: '1fr 40px', alignItems: 'center', gap: 6 }}>
                    <span aria-hidden style={{ position: 'relative', height: 6, borderRadius: 999, background: twoWay ? 'none' : 'var(--track)' }}>
                      {twoWay && <span style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'var(--hair)' }} />}
                      <span style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 4, background: d.perPerson >= 0 ? ink.good : ink.bad, ...(!twoWay ? { left: 0 } : d.perPerson >= 0 ? { left: '50%' } : { right: '50%' }), width: `${Math.max(2, (Math.abs(d.perPerson) / maxPer) * (twoWay ? 50 : 100))}%` }} />
                    </span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{signed(d.perPerson)}</span>
                  </span>
                ) : (
                  <span key={k} style={{ fontSize: 10.5, fontWeight: k === 'people' ? 800 : 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{show(d)}</span>
                )))}
                {onPeople && (
                  <button type="button" onClick={() => onPeople(d.name)} aria-label={`See the people in ${d.name}`} style={{ justifySelf: 'end', display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 8px', borderRadius: 8, border: '1px solid var(--hair)', background: 'transparent', color: 'var(--text)', fontSize: 9.5, fontWeight: 800, cursor: 'pointer' }}>
                    <Users size={11} strokeWidth={2.6} aria-hidden />People
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <Pager page={page} pages={pages} total={rows.length} size={size} onPage={(p) => onView({ ...view, page: p })} what="departments" />
      </div>
    </div>
  );
}
