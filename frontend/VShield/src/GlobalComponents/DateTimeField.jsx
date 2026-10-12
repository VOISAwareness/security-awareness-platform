import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  addMonths,
  dateToValue,
  dayKey,
  defaultTimeFor,
  formatDateTimeLabel,
  isBeforeDay,
  minuteOptions,
  monthGrid,
  parseDateTimeValue,
  to12h,
  to24h,
  toDateTimeValue,
} from '../services/calendarDates';

const GAP = 6; // px between the field and its calendar
const EDGE = 8; // px the calendar keeps from the window's edges
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const pad = (n) => String(n).padStart(2, '0');
const dayOf = (d) => ({ year: d.getFullYear(), month: d.getMonth(), day: d.getDate() });
const monthIndex = ({ year, month }) => year * 12 + month;

// A date & time field whose whole box opens a calendar (no separate picker
// button). The value is the "YYYY-MM-DDTHH:mm" string a native datetime-local
// input gives, so it drops in where one was. The calendar is portalled to
// <body> because the wizard's panels clip overflow, and it takes on the page's
// zoom so it matches the field it belongs to.
// `disablePast` greys out days before today; `min` greys out days before it.
const DateTimeField = ({
  value,
  onChange,
  isDark = false,
  placeholder = 'Select date & time',
  ariaLabel = 'Date and time',
  min = '',
  disablePast = false,
  className = '',
}) => {
  const fieldRef = useRef(null);
  const popoverRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState({ year: 2026, month: 0 });
  // When the calendar was opened: marks "today" and bounds disablePast.
  const [openedAt, setOpenedAt] = useState(null);

  const selected = parseDateTimeValue(value);
  const label = formatDateTimeLabel(value);

  // The earliest day that can be picked, or null when any day can.
  const floorValue = (() => {
    const fromMin = parseDateTimeValue(min);
    const fromToday = disablePast && openedAt ? { ...dayOf(openedAt), hours: 0, minutes: 0 } : null;
    const later = [fromMin, fromToday].filter(Boolean).sort((a, b) => (dayKey(a) < dayKey(b) ? 1 : -1))[0];
    return later ? toDateTimeValue(later) : '';
  })();
  const floor = parseDateTimeValue(floorValue);

  const openCalendar = () => {
    const now = new Date();
    const anchor = selected || parseDateTimeValue(min) || dayOf(now);
    setOpenedAt(now);
    setView({ year: anchor.year, month: anchor.month });
    setOpen(true);
  };

  const close = useCallback((refocus) => {
    setOpen(false);
    if (refocus) fieldRef.current?.focus();
  }, []);

  // Below the field when it fits, otherwise above; always inside the window.
  const place = useCallback(() => {
    const field = fieldRef.current;
    const pop = popoverRef.current;
    if (!field || !pop) return;
    const rect = field.getBoundingClientRect();
    // The app shell and the wizard each zoom the page; match the field.
    const scale = field.offsetWidth ? rect.width / field.offsetWidth : 1;
    pop.style.zoom = String(scale);
    const box = pop.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - GAP - EDGE;
    const above = rect.top - GAP - EDGE;
    let top = box.height <= below || below >= above ? rect.bottom + GAP : rect.top - GAP - box.height;
    top = Math.max(EDGE, Math.min(top, window.innerHeight - box.height - EDGE));
    const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - box.width - EDGE));
    pop.style.top = `${top / scale}px`;
    pop.style.left = `${left / scale}px`;
    pop.style.visibility = 'visible';
  }, []);

  useLayoutEffect(() => {
    if (!open) return undefined;
    place();
    const onPointerDown = (e) => {
      if (fieldRef.current?.contains(e.target) || popoverRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(true);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, place, close]);

  const isDisabled = (cell) => isBeforeDay(cell, floorValue);

  // The day a time change applies to when no day has been picked yet.
  const fallbackDay = () => {
    const today = dayOf(openedAt || new Date());
    return floor && dayKey(floor) > dayKey(today) ? { year: floor.year, month: floor.month, day: floor.day } : today;
  };

  const pickDay = (cell) => {
    const time = selected
      ? { hours: selected.hours, minutes: selected.minutes }
      : defaultTimeFor(cell, new Date());
    onChange(toDateTimeValue({ year: cell.year, month: cell.month, day: cell.day, ...time }));
    if (!cell.inMonth) setView({ year: cell.year, month: cell.month });
  };

  const setTime = (hours, minutes) => {
    const day = selected || fallbackDay();
    onChange(toDateTimeValue({ year: day.year, month: day.month, day: day.day, hours, minutes }));
  };

  const pickNow = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    onChange(dateToValue(now));
    setView({ year: now.getFullYear(), month: now.getMonth() });
  };

  const { hour, meridiem } = selected ? to12h(selected.hours) : { hour: '', meridiem: 'AM' };
  const minutes = selected ? selected.minutes : '';
  const todayKey = openedAt ? dayKey(dayOf(openedAt)) : '';
  const selectedKey = selected ? dayKey(selected) : '';
  const prevDisabled = Boolean(floor) && monthIndex(view) <= monthIndex(floor);

  const dayClass = (cell) => {
    const key = dayKey(cell);
    if (key === selectedKey) return 'bg-[#E60000] text-white shadow-sm cursor-pointer';
    const tone = !cell.inMonth
      ? (isDark ? 'text-slate-600' : 'text-slate-300')
      : (isDark ? 'text-slate-100' : 'text-slate-800');
    const today = key === todayKey ? 'ring-1 ring-inset ring-[#E60000]/60 !text-[#E60000]' : '';
    if (isDisabled(cell)) return `${tone} ${today} opacity-35 cursor-not-allowed`;
    return `${tone} ${today} cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`;
  };

  const selectClass = `h-7 rounded-lg border px-1.5 text-[11px] font-bold outline-none cursor-pointer ${
    isDark ? 'bg-[#15161A] border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
  }`;
  const navClass = `w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
    isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
  }`;

  return (
    <>
      <button
        ref={fieldRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openCalendar())}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${ariaLabel}: ${label || 'not set'}`}
        className={`w-full h-9 px-4 rounded-xl flex items-center justify-between gap-2 shadow-2xs cursor-pointer text-left outline-none transition-shadow ${
          isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
        } ${open ? 'ring-2 ring-[#E60000]/40' : (isDark ? 'hover:ring-1 hover:ring-white/20' : 'hover:ring-1 hover:ring-slate-300')} focus-visible:ring-2 focus-visible:ring-[#E60000]/40 ${className}`}
      >
        <span className={`text-[10.5px] truncate ${label ? 'font-semibold' : 'font-normal text-slate-400'}`}>
          {label || placeholder}
        </span>
        <Calendar className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} aria-hidden="true" />
      </button>

      {open && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={`${ariaLabel} calendar`}
            style={{ position: 'fixed', top: 0, left: 0, zIndex: 9600, visibility: 'hidden' }}
            className={`w-[284px] rounded-2xl border p-3 shadow-2xl font-sans select-none ${
              isDark ? 'bg-[#1C1E24] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Month header */}
            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => setView((v) => addMonths(v, -1))}
                disabled={prevDisabled}
                aria-label="Previous month"
                className={`${navClass} ${prevDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[12.5px] font-extrabold tracking-tight" aria-live="polite">
                {MONTH_NAMES[view.month]} {view.year}
              </span>
              <button
                type="button"
                onClick={() => setView((v) => addMonths(v, 1))}
                aria-label="Next month"
                className={`${navClass} cursor-pointer`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekdays + days */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {WEEKDAY_LABELS.map((d) => (
                <span key={d} className="h-6 flex items-center justify-center text-[9.5px] font-bold uppercase tracking-wide text-slate-400">
                  {d}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {monthGrid(view.year, view.month).map((cell) => (
                <button
                  key={dayKey(cell)}
                  type="button"
                  disabled={isDisabled(cell)}
                  onClick={() => pickDay(cell)}
                  aria-label={`${cell.day} ${MONTH_NAMES[cell.month]} ${cell.year}`}
                  aria-pressed={dayKey(cell) === selectedKey}
                  className={`h-8 rounded-lg text-[11.5px] font-bold transition-colors ${dayClass(cell)}`}
                >
                  {cell.day}
                </button>
              ))}
            </div>

            {/* Time */}
            <div className={`mt-3 pt-3 border-t flex items-center gap-1.5 ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
              <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span className="text-[11px] font-bold">Time</span>
              <div className="ml-auto flex items-center gap-1">
                <select
                  aria-label="Hour"
                  value={hour}
                  onChange={(e) => setTime(to24h(Number(e.target.value), meridiem), selected ? selected.minutes : 0)}
                  className={selectClass}
                >
                  {!selected && <option value="" disabled>--</option>}
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{pad(h)}</option>
                  ))}
                </select>
                <span className="text-[11px] font-bold text-slate-400">:</span>
                <select
                  aria-label="Minutes"
                  value={minutes}
                  onChange={(e) => setTime(selected ? selected.hours : 9, Number(e.target.value))}
                  className={selectClass}
                >
                  {!selected && <option value="" disabled>--</option>}
                  {minuteOptions(selected?.minutes).map((m) => (
                    <option key={m} value={m}>{pad(m)}</option>
                  ))}
                </select>
                <div className={`flex h-7 rounded-lg border overflow-hidden ${isDark ? 'border-white/15' : 'border-slate-200'}`}>
                  {['AM', 'PM'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={selected ? meridiem === m : false}
                      onClick={() => setTime(to24h(selected ? hour : 9, m), selected ? selected.minutes : 0)}
                      className={`px-2 text-[10.5px] font-bold cursor-pointer transition-colors ${
                        selected && meridiem === m
                          ? (isDark ? 'bg-white text-black' : 'bg-black text-white')
                          : (isDark ? 'text-slate-300 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="text-[11px] font-bold text-slate-400 hover:text-[#E60000] cursor-pointer"
                >
                  Clear
                </button>
                {openedAt && !isBeforeDay(dayOf(openedAt), floorValue) && (
                  <button
                    type="button"
                    onClick={pickNow}
                    className={`text-[11px] font-bold cursor-pointer ${isDark ? 'text-slate-200 hover:text-white' : 'text-slate-600 hover:text-black'}`}
                  >
                    Now
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => close(true)}
                className="h-7 px-4 rounded-full bg-[#E60000] hover:bg-[#c50000] text-white text-[11px] font-bold cursor-pointer shadow-sm"
              >
                Done
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default DateTimeField;
