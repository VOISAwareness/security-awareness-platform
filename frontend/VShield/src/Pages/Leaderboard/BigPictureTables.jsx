import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpRight, Building2, CheckCircle2, ChevronLeft, ChevronRight, ListChecks, MousePointerClick, Search, X } from 'lucide-react';

import LevelBadge from '../../GlobalComponents/LevelBadge';
import { LEVEL_BY_ID, rankName } from '../../services/levels';
import { GROUPS, PEOPLE_FILTERS } from '../../services/bigPicture';
import { count, share } from '../../services/bigPictureFindings';
import { departmentsShown, peopleShown, standsOut } from '../../services/bigPictureViews';
import { PointsPlate } from './PointsPlate';
import { useFitRows } from './useFitRows';

// The Big Picture's lists: everyone one by one (People, for admins) and
// department by department. Built for tens of thousands: a page that fits
// the screen at a time, a few columns that matter (the export has them all),
// filters and search to find anyone, and selection that can take in every
// match, not just the page. A department opens, from anywhere on its row
// but its checkbox, to its people (admins). What they show (and what is
// selected) is what the one Export menu offers to download.

const num = (n) => Math.round(n).toLocaleString('en-US');
const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${num(Math.abs(n))}`;
const pc = (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`);
const pts = (n) => (n < 0 ? `−${num(-n)}` : num(n));
const small = { fontSize: 9.5, fontWeight: 600, color: 'var(--muted)' };
const head = { ...small, fontSize: 8.5, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' };

// The lists' rows are cards, as on the Leaderboard, a little apart; every
// column reads from its left.
const ROW_GAP = 6;
const card = (picked) => ({ boxSizing: 'border-box', borderRadius: 12, border: `1px solid ${picked ? 'var(--bp-accent)' : 'var(--row-hair)'}`, background: picked ? 'var(--bp-soft)' : 'var(--row)' });
const wash = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

const control = (isDark) => ({ height: 30, borderRadius: 9, border: '1px solid var(--hair)', background: 'var(--rail)', color: 'var(--text)', fontSize: 10.5, fontWeight: 700, padding: '0 8px', outline: 'none', colorScheme: isDark ? 'dark' : 'light', minWidth: 0 });

const action = (primary = false) => ({ height: 28, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 11px', borderRadius: 9, border: primary ? 'none' : '1px solid var(--hair)', background: primary ? 'var(--ink)' : 'var(--base)', color: primary ? 'var(--ink-on)' : 'var(--text)', fontSize: 10, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' });

// A tip that slides in when a list opens, says how it works, and goes by
// itself after a few seconds (it waits while the pointer is on it; its ×
// closes it), so it never sits on the page for good. Each shows once per
// visit (`id`). `caret` points it up at the button above its right end.
const tipsSeen = new Set();
const TIP_MS = 4500;
function Tip({ id, title, sub, caret = false }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(() => !tipsSeen.has(id));
  const [hold, setHold] = useState(false);
  useEffect(() => { tipsSeen.add(id); }, [id]);
  useEffect(() => {
    if (!open || hold) return undefined;
    const t = setTimeout(() => setOpen(false), TIP_MS);
    return () => clearTimeout(t);
  }, [open, hold]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key={id}
          role="status"
          data-bp-tip={id}
          onMouseEnter={() => setHold(true)}
          onMouseLeave={() => setHold(false)}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1], delay: reduce ? 0 : 0.3 }}
          style={{ position: 'absolute', top: 40, right: 0, zIndex: 6, width: 290, boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 8px 13px 11px', borderRadius: 12, background: 'var(--ink)', color: 'var(--ink-on)', boxShadow: '0 12px 28px rgba(15,23,42,0.24)', transformOrigin: 'top right' }}
        >
          {caret && <span aria-hidden style={{ position: 'absolute', top: -5, right: 40, width: 10, height: 10, borderRadius: 2, background: 'var(--ink)', transform: 'rotate(45deg)' }} />}
          <span aria-hidden style={{ flexShrink: 0, width: 26, height: 26, display: 'grid', placeItems: 'center', borderRadius: 8, background: 'color-mix(in srgb, var(--ink-on) 14%, transparent)' }}><MousePointerClick size={14} strokeWidth={2.4} /></span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 800, lineHeight: 1.3 }}>{title}</span>
            <span style={{ display: 'block', marginTop: 2, fontSize: 9.5, fontWeight: 600, lineHeight: 1.4, opacity: 0.75 }}>{sub}</span>
          </span>
          <button type="button" aria-label="Close the tip" onClick={() => setOpen(false)} style={{ flexShrink: 0, width: 22, height: 22, display: 'grid', placeItems: 'center', padding: 0, border: 'none', borderRadius: 6, background: 'transparent', color: 'inherit', opacity: 0.7, cursor: 'pointer' }}><X size={13} strokeWidth={2.6} /></button>
          {/* how long it stays: a thin line that runs down, and holds while hovered */}
          <motion.span aria-hidden key={hold ? 'hold' : 'run'} initial={{ scaleX: 1 }} animate={{ scaleX: hold ? 1 : 0 }} transition={{ duration: hold ? 0 : TIP_MS / 1000, ease: 'linear', delay: hold || reduce ? 0 : 0.3 }} style={{ position: 'absolute', left: 12, right: 12, bottom: 5, height: 2, borderRadius: 2, background: 'var(--bp-accent)', transformOrigin: 'left', opacity: 0.9 }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// While some are selected, a bar floats up over the foot of the list: how
// many, Select all and Clear (and `tools`). Exporting stays with the one
// Export button at the top, which counts the selection. The bar slides
// away when the selection is cleared.
const onInk = { height: 28, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 11px', borderRadius: 9, border: '1px solid color-mix(in srgb, var(--ink-on) 28%, transparent)', background: 'transparent', color: 'inherit', fontSize: 10, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' };
function SelectionBar({ n, total, noun, allIn, onAll, onClear, tools = null }) {
  const reduce = useReducedMotion();
  const word = n === 1 ? noun[0] : noun[1];
  return (
    <AnimatePresence>
      {n > 0 && (
        <motion.div
          data-bp-selection
          role="region"
          aria-label="Selected for export"
          initial={reduce ? { opacity: 0, x: '-50%' } : { opacity: 0, y: 18, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={reduce ? { opacity: 0, x: '-50%' } : { opacity: 0, y: 18, x: '-50%' }}
          transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ position: 'absolute', left: '50%', bottom: 50, zIndex: 6, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 6px 6px 12px', borderRadius: 14, background: 'var(--ink)', color: 'var(--ink-on)', boxShadow: '0 14px 32px rgba(15,23,42,0.28)', whiteSpace: 'nowrap' }}
        >
          <span data-bp-picked style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 4, fontSize: 10.5, fontWeight: 800 }}>
            <CheckCircle2 size={14} strokeWidth={2.6} aria-hidden />{count(n)} {word} selected
          </span>
          {!allIn && <button type="button" data-bp-select-all onClick={onAll} style={onInk}>Select all {count(total)}</button>}
          <button type="button" data-bp-clear onClick={onClear} style={onInk}>Clear</button>
          {tools}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// "1–12 of 30,000"  ‹ 1 2 3 … 2,500 ›, always one height (buttons or not),
// so two pagers side by side line up.
export function Pager({ page, pages, total, size, onPage, what = 'people' }) {
  const from = total ? page * size + 1 : 0;
  const to = Math.min(total, (page + 1) * size);
  const near = [...new Set([0, page - 1, page, page + 1, pages - 1])].filter((p) => p >= 0 && p < pages).sort((a, b) => a - b);
  const cell = (on) => ({ minWidth: 26, height: 26, padding: '0 6px', borderRadius: 8, border: on ? 'none' : '1px solid var(--hair)', background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--ink-on)' : 'var(--text)', fontSize: 10, fontWeight: 800, cursor: 'pointer', fontVariantNumeric: 'tabular-nums' });
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 10, borderTop: '1px solid var(--hair)' }}>
      <span style={{ ...small, lineHeight: '26px' }}><strong style={{ color: 'var(--text)' }}>{num(from)}–{num(to)}</strong> of {num(total)} {total !== 1 ? what : what === 'people' ? 'person' : what.replace(/s$/, '')}</span>
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
function SortHead({ label, k, sort, onSort, align = 'left' }) {
  const justify = { left: 'flex-start', center: 'center', right: 'flex-end' }[align];
  const on = sort.key === k;
  const Icon = sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button type="button" onClick={() => onSort(k)} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} style={{ display: 'flex', alignItems: 'center', justifyContent: justify, gap: 3, width: '100%', padding: 0, border: 'none', background: 'none', cursor: 'pointer', textAlign: align, ...head, color: on ? 'var(--text)' : 'var(--muted)', lineHeight: 1.2 }}>
      {label}
      {on && <Icon size={10} strokeWidth={3} aria-hidden style={{ flexShrink: 0 }} />}
    </button>
  );
}


// A soft chip with a dot in its colour: what stands out, or a chance.
// `width` gives every chip in a column the same size; what it says sits in
// its middle. Its tint lies on the page's own surface, so it reads the same
// on a selected (tinted) card.
export function Chip({ color, children, width, title }) {
  return (
    <span title={title} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width, maxWidth: '100%', minWidth: 0, height: 22, padding: '0 9px', boxSizing: 'border-box', borderRadius: 999, background: `linear-gradient(${wash(color, 0.13)}, ${wash(color, 0.13)}), var(--base)`, fontSize: 10, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', cursor: title ? 'help' : undefined }}>
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, flexShrink: 0, background: color }} />
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
    </span>
  );
}

// What stands out about a person (standsOut in bigPictureViews.js, as the
// export says it), on a chip as wide as the longest name, with what it
// means on hover.
const FLAG_W = 128;
function Flag({ x, ink }) {
  const s = standsOut(x);
  return s ? <Chip color={s.bad ? ink.bad : ink.good} width={FLAG_W} title={s.hint}>{s.text}</Chip> : <span style={small}>—</span>;
}

// A rank on a plate, as on the Leaderboard.
function RankPlate({ n }) {
  return <span className="vs-rank" style={{ minWidth: 32, height: 24, padding: '0 7px', boxSizing: 'border-box', borderRadius: 8, display: 'inline-grid', placeItems: 'center', fontSize: 11, fontWeight: 800, lineHeight: 1, background: 'var(--plate)', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{num(n)}</span>;
}

// One person: rank, badge (its level's name on hover), name, points, change,
// and what stands out (or `note`, when the list is about one thing). Under
// the name, their department, when the list spans departments (`dept`). A
// card, as on the Leaderboard; `flat` is a plain line, for a pane that is
// already a box. `noRank` leaves rank out; `center` sets points, change and
// what stands out in the middle of their columns. With `onPick`, the card
// itself picks the person for export (click, Enter or Space): no tick, the
// card shows it.
export function PersonRow({ x, ink, cols, rowH = 44, first = false, picked = false, note = null, noRank = false, flat = false, dept = true, center = false, onPick = null }) {
  const level = LEVEL_BY_ID[x.levelId];
  const justify = center ? 'center' : 'flex-start';
  const look = flat ? { borderTop: first ? 'none' : '1px solid var(--hair)', background: picked ? 'var(--bp-soft)' : 'transparent' } : card(picked);
  const pick = onPick ? {
    tabIndex: 0,
    'aria-selected': picked,
    title: picked ? 'Selected for export: click to leave out' : 'Click to select for export',
    onClick: onPick,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(); } },
  } : null;
  return (
    <div role="row" data-bp-person={x.key} {...pick} className={flat ? undefined : onPick ? 'lb-row bp-pick' : 'lb-row'} style={{ flexShrink: 0, height: rowH, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 12px', ...look, cursor: onPick ? 'pointer' : undefined }}>
      {!noRank && <span style={{ display: 'flex' }}><RankPlate n={x.rank} /></span>}
      <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span title={level ? rankName(level) : undefined} style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 26 }}>{level && <LevelBadge level={level} size={26} tilt={false} decorative />}</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.name || x.key}</span>
          {dept && <span style={{ display: 'block', marginTop: 1, ...small, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.dept}</span>}
        </span>
      </span>
      <span style={{ display: 'flex', justifyContent: justify }}><PointsPlate pts={pts(x.points)} compact /></span>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: justify, gap: 3, fontSize: 10.5, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
        {x.change ? <>{x.change > 0 ? <ArrowUpRight size={12} strokeWidth={3} color={ink.good} aria-hidden /> : <ArrowDownRight size={12} strokeWidth={3} color={ink.bad} aria-hidden />}{signed(x.change)}</> : <span style={small}>—</span>}
      </span>
      <span style={{ display: 'flex', justifyContent: justify, minWidth: 0 }}>{note ?? <Flag x={x} ink={ink} />}</span>
    </div>
  );
}

// rank and the person on the left, taking the room; points, change and
// what stands out at set widths against the right edge, each in the middle
// of its column under its name (as inside a finding)
const PEOPLE_COLS = '56px minmax(0,1fr) 88px 72px 140px';
const ROW_H = 46;

/**
 * Everyone, one by one. `view` holds the filters, sort and page ({ show,
 * dept, level, q, sort, page }); `selected` is a Set of person keys.
 */
export function PeopleTable({ r, view, onView, selected, onSelected, isDark, ink }) {
  const rows = useMemo(() => peopleShown(r, view), [r, view]);
  const depts = useMemo(() => [...new Set(r.people.map((x) => x.dept))].sort(), [r.people]);

  const [box, size] = useFitRows(ROW_H, 3, ROW_GAP);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(view.page || 0, pages - 1);
  const shown = rows.slice(page * size, (page + 1) * size);
  const change = (patch) => onView({ ...view, page: 0, ...patch });
  const onSort = (key) => change({ sort: { key, dir: view.sort.key === key && view.sort.dir === 'asc' ? 'desc' : 'asc' } });

  // nothing selected: Export takes everyone shown; click cards to take only them
  const allPicked = rows.length > 0 && rows.every((x) => selected.has(x.key));
  const toggle = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    onSelected(next);
  };
  return (
    <div data-bp-people style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Tip id="people" title="Click people to select them for export" sub="With none selected, Export takes everyone shown." />
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ position: 'relative', width: 200 }}>
          <span className="sr-only">Search people</span>
          <Search size={13} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input type="search" value={view.q} onChange={(e) => change({ q: e.target.value })} placeholder="Find a person" style={{ ...control(isDark), width: '100%', boxSizing: 'border-box', paddingLeft: 28, fontWeight: 600 }} />
        </label>
        <select aria-label="Show" value={view.show} onChange={(e) => change({ show: e.target.value })} style={{ ...control(isDark), width: 210 }}>
          {PEOPLE_FILTERS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <select aria-label="Department" value={view.dept} onChange={(e) => change({ dept: e.target.value })} style={{ ...control(isDark), width: 170 }}>
          <option value="all">All departments</option>
          {depts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="Level" value={view.level} onChange={(e) => change({ level: e.target.value })} style={{ ...control(isDark), width: 150 }}>
          <option value="all">All levels</option>
          {GROUPS.map((g) => <option key={g.id} value={g.id}>{g.brief}</option>)}
        </select>
      </div>

      <SelectionBar
        n={selected.size}
        total={rows.length}
        noun={['person', 'people']}
        allIn={allPicked}
        onAll={() => onSelected(new Set([...selected, ...rows.map((x) => x.key)]))}
        onClear={() => onSelected(new Set())}
      />

      <div role="table" aria-label="People" aria-rowcount={rows.length} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div role="row" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: PEOPLE_COLS, alignItems: 'center', gap: 12, padding: '0 13px 8px' }}>
          <SortHead label="Rank" k="rank" sort={view.sort} onSort={onSort} />
          <span style={head}>Person</span>
          <SortHead label="Points" k="points" sort={view.sort} onSort={onSort} align="center" />
          <SortHead label="Change" k="change" sort={view.sort} onSort={onSort} align="center" />
          <span style={{ ...head, textAlign: 'center' }}>Stands out</span>
        </div>
        <div ref={box} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
          {!rows.length && <div style={{ ...small, fontSize: 10.5, padding: '18px 12px' }}>No one matches.</div>}
          {shown.map((x) => (
            <PersonRow key={x.key} x={x} ink={ink} cols={PEOPLE_COLS} rowH={ROW_H} center dept={view.dept === 'all'} picked={selected.has(x.key)} onPick={() => toggle(x.key)} />
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
  ['perPerson', 'Points each', (d) => signed(d.perPerson)],
  ['belowZeroShare', 'Below zero', (d) => share(d.belowZero, d.people)],
  ['slippedShare', 'Slipped', (d) => share(d.slipped, d.tookPart)],
  ['reportRate', 'Reported', (d) => pc(d.reportRate)],
  ['clickRate', 'Clicked', (d) => pc(d.clickRate)],
];
const D_ROW_H = 44;

/**
 * Department by department. `view` holds { sort, q, page }; `selected` is a
 * Set of department names; `onOpen(name)` (admins only) opens its people,
 * from anywhere on the row but its checkbox.
 */
export function DepartmentTable({ r, view, onView, selected, onSelected, onOpen, isDark }) {
  const rows = useMemo(() => departmentsShown(r, view), [r, view]);
  const [box, size] = useFitRows(D_ROW_H, 3, ROW_GAP);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(view.page || 0, pages - 1);
  const shown = rows.slice(page * size, (page + 1) * size);
  // A click opens a department (admins); "Select departments" turns clicks
  // into selecting, for export, until Done. Without opening, clicks select.
  const [selecting, setSelecting] = useState(selected.size > 0);
  const picking = !onOpen || selecting;
  const cols = `minmax(0,1.7fr) repeat(6, minmax(62px,0.6fr))${onOpen ? ' 16px' : ''}`;
  const change = (patch) => onView({ ...view, page: 0, ...patch });
  const sortBy = (key) => change({ sort: { key, dir: view.sort.key === key && view.sort.dir === 'asc' ? 'desc' : 'asc' } });
  const allPicked = rows.length > 0 && rows.every((d) => selected.has(d.name));
  const toggle = (name) => {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name); else next.add(name);
    onSelected(next);
  };
  const done = () => { setSelecting(false); onSelected(new Set()); };
  const modeButton = onOpen && (selecting
    ? <button type="button" data-bp-select-done onClick={done} style={{ ...action(true), marginLeft: 'auto' }}>Done</button>
    : <button type="button" data-bp-select-mode onClick={() => setSelecting(true)} style={{ ...action(), marginLeft: 'auto' }}><ListChecks size={13} strokeWidth={2.4} aria-hidden />Select departments</button>);
  return (
    <div data-bp-departments data-bp-selecting={picking ? 'true' : undefined} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!onOpen && <Tip id="departments-pick" title="Click departments to select them for export" sub="With none selected, Export takes every department shown." />}
      {onOpen && !selecting && <Tip id="departments" caret title="Click a department to see its people" sub="To export several, use Select departments, then click the ones you want." />}
      {onOpen && selecting && <Tip id="departments-select" caret title="Click departments to select them" sub="Then take them from Export at the top. Done when you're finished." />}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ position: 'relative', width: 200 }}>
          <span className="sr-only">Search departments</span>
          <Search size={13} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input type="search" value={view.q} onChange={(e) => change({ q: e.target.value })} placeholder="Find a department" style={{ ...control(isDark), width: '100%', boxSizing: 'border-box', paddingLeft: 28, fontWeight: 600 }} />
        </label>
        <span style={small}>Least ground gained per person first</span>
        {modeButton}
      </div>
      <SelectionBar
        n={selected.size}
        total={rows.length}
        noun={['department', 'departments']}
        allIn={allPicked}
        onAll={() => onSelected(new Set([...selected, ...rows.map((d) => d.name)]))}
        onClear={() => onSelected(new Set())}
      />
      <div role="table" aria-label="Departments" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div role="row" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 13px 8px' }}>
          <SortHead label="Department" k="name" sort={view.sort} onSort={sortBy} />
          {DEPT_FIELDS.map(([k, label]) => <SortHead key={k} label={label} k={k} sort={view.sort} onSort={sortBy} />)}
          {onOpen && <span />}
        </div>
        <div ref={box} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
          {!rows.length && <div style={{ ...small, fontSize: 10.5, padding: '18px 12px' }}>No department matches.</div>}
          {shown.map((d) => {
            const on = selected.has(d.name);
            const select = picking ? {
              tabIndex: 0,
              'aria-selected': on,
              title: on ? 'Selected for export: click to leave out' : 'Click to select for export',
              onClick: () => toggle(d.name),
              onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(d.name); } },
            } : { onClick: () => onOpen(d.name), title: `See the people in ${d.name}` };
            return (
              <div key={d.name} role="row" data-bp-dept={d.name} {...select} className={picking ? 'lb-row bp-pick' : 'lb-row'} style={{ flexShrink: 0, height: D_ROW_H, display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: 12, padding: '0 12px', ...card(on), cursor: 'pointer' }}>
                {picking
                  ? <span style={{ fontSize: 11, fontWeight: 800, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                  : <button type="button" data-bp-dept-open={d.name} onClick={(e) => { e.stopPropagation(); onOpen(d.name); }} aria-label={`See the people in ${d.name}`} style={{ minWidth: 0, padding: 0, border: 'none', background: 'none', color: 'var(--text)', textAlign: 'left', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>{d.name}</button>}
                {DEPT_FIELDS.map(([k, , show]) => (
                  <span key={k} style={{ fontSize: 10.5, fontWeight: k === 'people' || k === 'perPerson' ? 800 : 600, fontVariantNumeric: 'tabular-nums' }}>{show(d)}</span>
                ))}
                {onOpen && (picking ? <span /> : <ChevronRight size={14} strokeWidth={2.4} aria-hidden style={{ justifySelf: 'end', color: 'var(--muted)' }} />)}
              </div>
            );
          })}
        </div>
        <Pager page={page} pages={pages} total={rows.length} size={size} onPage={(p) => onView({ ...view, page: p })} what="departments" />
      </div>
    </div>
  );
}

const DEPT_PEOPLE_COLS = PEOPLE_COLS;
// what the department's row said, kept in its header
const DEPT_STATS = [
  ['People', (d) => count(d.people)],
  ['Points each', (d) => signed(d.perPerson)],
  ['Reported', (d) => pc(d.reportRate)],
  ['Clicked', (d) => pc(d.clickRate)],
];

/**
 * One department opened (admins): its people, bottom of the board first,
 * with the People tab's columns (rank, the person, points, change, what
 * stands out), searchable and a page at a time. `view` is { q, page }; the
 * back button (or Esc) returns to the departments.
 */
export function DepartmentPeople({ r, name, view, onView, onBack, isDark, ink }) {
  const d = r.departments.find((x) => x.name === name);
  const rows = useMemo(() => peopleShown(r, { show: 'all', dept: name, level: 'all', q: view.q, sort: { key: 'points', dir: 'asc' } }), [r, name, view.q]);
  const [box, size] = useFitRows(ROW_H, 3, ROW_GAP);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(view.page || 0, pages - 1);
  const shown = rows.slice(page * size, (page + 1) * size);
  const backRef = useRef(null);
  useEffect(() => { backRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);
  return (
    <div data-bp-dept-people={name} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ flexShrink: 0, height: 56, display: 'flex', alignItems: 'center', gap: 12, padding: '0 6px 0 10px', borderRadius: 14, background: 'var(--plate)' }}>
        <button ref={backRef} type="button" data-bp-back onClick={onBack} aria-label="Back to the departments" title="Back to the departments (Esc)" className="bp-row" style={{ flexShrink: 0, width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 10, border: '1px solid var(--row-hair)', background: 'var(--base)', color: 'var(--text)', cursor: 'pointer' }}>
          <ChevronLeft size={16} strokeWidth={2.6} aria-hidden />
        </button>
        <span aria-hidden style={{ flexShrink: 0, width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 9, background: 'var(--bp-soft)', color: 'var(--bp-ink)' }}><Building2 size={15} strokeWidth={2.4} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...head, letterSpacing: '0.1em' }}>Department</div>
          <div style={{ marginTop: 2, fontSize: 13.5, fontWeight: 800, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        </div>
        {d && (
          <dl style={{ marginLeft: 'auto', marginTop: 0, marginBottom: 0, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
            {DEPT_STATS.map(([label, show], i) => (
              <div key={label} data-bp-dept-stat={label} style={{ minWidth: 76, padding: '0 16px', borderLeft: i ? '1px solid var(--row-hair)' : 'none' }}>
                <dt style={head}>{label}</dt>
                <dd className="vs-rank" style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 800, lineHeight: 1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{show(d)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ position: 'relative', width: 200 }}>
          <span className="sr-only">Find a person in {name}</span>
          <Search size={13} strokeWidth={2.4} aria-hidden style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input type="search" value={view.q} onChange={(e) => onView({ ...view, q: e.target.value, page: 0 })} placeholder="Find a person" style={{ ...control(isDark), width: '100%', boxSizing: 'border-box', paddingLeft: 28, fontWeight: 600 }} />
        </label>
        <span style={small}>Fewest points first</span>
      </div>
      <div role="table" aria-label={`People in ${name}`} aria-rowcount={rows.length} style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <div role="row" style={{ flexShrink: 0, display: 'grid', gridTemplateColumns: DEPT_PEOPLE_COLS, alignItems: 'center', gap: 12, padding: '0 13px 8px', ...head }}>
          <span>Rank</span><span>Person</span><span style={{ textAlign: 'center' }}>Points</span><span style={{ textAlign: 'center' }}>Change</span><span style={{ textAlign: 'center' }}>Stands out</span>
        </div>
        <div ref={box} style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: ROW_GAP }}>
          {!rows.length && <div style={{ ...small, fontSize: 10.5, padding: '18px 12px' }}>No one matches.</div>}
          {shown.map((x) => <PersonRow key={x.key} x={x} ink={ink} cols={DEPT_PEOPLE_COLS} rowH={ROW_H} center dept={false} />)}
        </div>
        <Pager page={page} pages={pages} total={rows.length} size={size} onPage={(p) => onView({ ...view, page: p })} />
      </div>
    </div>
  );
}
