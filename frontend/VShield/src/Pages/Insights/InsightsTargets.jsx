import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';

import { GLOSSARY } from '../../services/glossary';
import { TARGETS, UNITS, checkTargets, targetsWith, zones } from '../../services/insightsTargets';
import { EASE, INK, alpha, eyebrow, small, themeVars, TYPE } from './insightsUi';

// Insights' Targets, for admins: where each measure should be. A button by
// Export opens a dialog with the seven measures. Each has where it is on
// track and where it is off track, in the units the page shows (rates in %),
// with its scale's three stretches as they would be. Save stores them
// (PUT /insights-targets) against the version read, so a change made since
// is not lost; the page then measures against them at once.

const NAMES = {
  riskScore: GLOSSARY.riskScore.name,
  highRiskShare: GLOSSARY.highRisk.name,
  hookRate: GLOSSARY.hookRate.name,
  reportRate: GLOSSARY.reportRate.name,
  gaveDetails: GLOSSARY.gaveDetails.name,
  firstReport: 'Time to first report',
  trainingCompletion: GLOSSARY.trainingCompletion.name,
};
const ORDER = Object.keys(NAMES);
const UNIT_TEXT = { '': 'of 100', '%': '%', min: 'min' };
const COLS = 'minmax(0,1.3fr) 112px 112px minmax(0,1fr)';

// a stored value as its box shows it (a rate in %), and back
const toBox = (key, v) => (UNITS[key] === '%' ? String(Math.round(v * 1000) / 10) : String(v));
const fromBox = (key, text) => {
  const t = String(text).trim();
  if (t === '') return NaN;
  const n = Number(t);
  return UNITS[key] === '%' ? n / 100 : n;
};
const boxesOf = (targets) => Object.fromEntries(ORDER.map((k) => [k, { target: toBox(k, targets[k].target), atRisk: toBox(k, targets[k].atRisk) }]));

// what went wrong with a save, in words
function failure(e) {
  if (e?.status === 409) return 'Someone changed the targets since you opened them. Close this and open it again to see theirs.';
  if (e?.status === 403) return 'Only an admin can change the targets.';
  if (e?.status === 503) return 'The server is busy. Try again in a moment.';
  if (e?.status === 400 && e.message) return e.message;
  return 'Couldn’t reach the server, so nothing was saved.';
}

const when = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** The button by Export that opens the dialog; admins only. */
export function TargetsButton({ onClick, label = true }) {
  return (
    <button
      type="button"
      className="ins-go"
      data-ins-targets
      onClick={onClick}
      title="Set where each measure should be"
      aria-label="Targets: set where each measure should be"
      style={{ flexShrink: 0, height: 30, display: 'inline-flex', alignItems: 'center', gap: 6, padding: label ? '0 12px 0 10px' : '0 9px', borderRadius: 10, border: '1px solid var(--card-edge)', background: 'var(--ghost)', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
    >
      <SlidersHorizontal size={13} strokeWidth={2.4} aria-hidden />
      {label && 'Targets'}
    </button>
  );
}

// a measure's three stretches, as the edges in its boxes would make them
function Stretches({ k, target, atRisk, ok, ink }) {
  const tone = { on: ink.good, risk: ink.caution, off: ink.bad };
  if (!ok) return <span aria-hidden style={{ display: 'block', height: 8, borderRadius: 999, background: 'var(--track)' }} />;
  const t = targetsWith({ [k]: { target, atRisk } })[k];
  return (
    <span aria-hidden style={{ display: 'flex', gap: 2, height: 8 }}>
      {zones(t).map((z) => <span key={z.standing} style={{ flex: `${Math.max(0, z.to - z.from) * 1000} 1 0`, borderRadius: 999, background: alpha(tone[z.standing], 0.7) }} />)}
    </span>
  );
}

function Box({ id, value, onChange, unit, sign, bad, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {sign && <span aria-hidden style={{ width: 10, fontSize: TYPE.strong, fontWeight: 800, color: 'var(--muted)', textAlign: 'right' }}>{sign}</span>}
      <input
        id={id}
        inputMode="decimal"
        aria-label={label}
        aria-invalid={bad || undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 52, height: 30, boxSizing: 'border-box', padding: '0 8px', borderRadius: 8, border: `1px solid ${bad ? 'var(--bad-edge)' : 'var(--hair-strong)'}`, background: 'var(--base)', color: 'var(--text)', fontSize: TYPE.strong, fontWeight: 800, fontVariantNumeric: 'tabular-nums', textAlign: 'right', outline: 'none' }}
      />
      <span style={{ ...small, fontWeight: 700, whiteSpace: 'nowrap' }}>{unit}</span>
    </span>
  );
}

/**
 * The dialog. `saved` is what GET /insights-targets returned ({ targets,
 * version, modifiedBy, modifiedAt }, and `failed` if it could not be read);
 * `onSave(targets)` stores the seven and throws what went wrong.
 */
export function TargetsEditor({ saved, isDark, reduce, onSave, onClose }) {
  const inForce = targetsWith(saved.targets);
  const [boxes, setBoxes] = useState(() => boxesOf(inForce));
  const [state, setState] = useState({ busy: false, error: null });
  const first = useRef(null);
  const ink = isDark ? INK.dark : INK.light;

  const values = Object.fromEntries(ORDER.map((k) => [k, { target: fromBox(k, boxes[k].target), atRisk: fromBox(k, boxes[k].atRisk) }]));
  const problems = Object.fromEntries(ORDER.map((k) => [k, checkTargets(k, values[k].target, values[k].atRisk)]));
  const bad = ORDER.some((k) => problems[k]);
  const changed = ORDER.some((k) => values[k].target !== inForce[k].target || values[k].atRisk !== inForce[k].atRisk);
  const close = () => { if (!state.busy) onClose(); };
  // the first box takes the focus once; Escape closes unless a save is under way
  const busy = useRef(false);
  useEffect(() => { busy.current = state.busy; }, [state.busy]);
  useEffect(() => { first.current?.querySelector('input')?.focus(); }, []);
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape' && !busy.current) onClose(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const save = async () => {
    setState({ busy: true, error: null });
    try {
      await onSave(values);
      onClose();
    } catch (e) {
      setState({ busy: false, error: failure(e) });
    }
  };
  const set = (k, edge) => (v) => setBoxes((b) => ({ ...b, [k]: { ...b[k], [edge]: v } }));
  const last = saved.modifiedBy && when(saved.modifiedAt);
  const note = saved.failed ? 'Couldn’t load the saved targets, so these are the defaults.' : last ? `Last changed by ${saved.modifiedBy} on ${last}` : 'These are the default targets.';

  return createPortal(
    <div data-ins-targets-dialog onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }} style={{ ...themeVars(isDark), '--bad-edge': ink.bad, position: 'fixed', inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(15,23,42,0.42)', backdropFilter: 'blur(3px)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ins-targets-title"
        initial={{ opacity: 0, y: reduce ? 0 : 10, scale: reduce ? 1 : 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
        style={{ width: 'min(680px, 100%)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', boxSizing: 'border-box', padding: '20px 22px 18px', borderRadius: 18, border: '1px solid var(--card-edge)', background: 'var(--base)', boxShadow: '0 30px 70px rgba(15,23,42,0.28)', color: 'var(--text)' }}
      >
        <header style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ minWidth: 0 }}>
            <h2 id="ins-targets-title" style={{ margin: 0, fontSize: TYPE.heading, fontWeight: 900, letterSpacing: '-0.01em' }}>Targets</h2>
            <span style={{ display: 'block', ...small, fontSize: TYPE.body, marginTop: 3 }}>Where each measure should be. Insights measures the company and every department against these.</span>
          </span>
          <button type="button" aria-label="Close" onClick={close} style={{ marginLeft: 'auto', flexShrink: 0, width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 999, border: 'none', background: 'var(--track)', color: 'var(--text)', cursor: 'pointer' }}><X size={15} strokeWidth={2.4} aria-hidden /></button>
        </header>

        <div aria-hidden style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 14, alignItems: 'end', marginTop: 16, padding: '0 0 7px', borderBottom: '1px solid var(--hair-strong)' }}>
          <span style={eyebrow}>Measure</span>
          <span style={eyebrow}>On track</span>
          <span style={eyebrow}>Off track past</span>
          <span style={{ display: 'flex', gap: 9, ...small, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {[['on', 'On track'], ['risk', 'At risk'], ['off', 'Off track']].map(([k, w]) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><i style={{ width: 8, height: 8, borderRadius: 3, background: alpha({ on: ink.good, risk: ink.caution, off: ink.bad }[k], 0.7) }} />{w}</span>)}
          </span>
        </div>

        <div ref={first}>
          {ORDER.map((k) => {
            const down = TARGETS[k].better === 'down';
            const u = UNIT_TEXT[UNITS[k]];
            const problem = problems[k];
            return (
              <div key={k} data-ins-target-row={k} style={{ padding: '9px 0', borderBottom: '1px solid var(--row-hair)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: COLS, columnGap: 14, alignItems: 'center' }}>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: TYPE.strong, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{NAMES[k]}</span>
                    <span style={{ ...small }}>{down ? 'Lower is better' : 'Higher is better'}</span>
                  </span>
                  <Box id={`ins-target-${k}`} value={boxes[k].target} onChange={set(k, 'target')} unit={u} sign={down ? '≤' : '≥'} bad={Boolean(problem)} label={`${NAMES[k]}: on track ${down ? 'at or below' : 'at or above'}, ${u}`} />
                  <Box value={boxes[k].atRisk} onChange={set(k, 'atRisk')} unit={u} sign={down ? '>' : '<'} bad={Boolean(problem)} label={`${NAMES[k]}: off track ${down ? 'above' : 'below'}, ${u}`} />
                  <Stretches k={k} target={values[k].target} atRisk={values[k].atRisk} ok={!problem} ink={ink} />
                </div>
                {problem && <div role="alert" style={{ marginTop: 5, fontSize: TYPE.small, fontWeight: 700, color: ink.bad }}>{problem}</div>}
              </div>
            );
          })}
        </div>

        <footer style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
          <span style={{ ...small, minWidth: 0, flex: '1 1 200px' }}>{note}</span>
          <button type="button" onClick={() => setBoxes(boxesOf(TARGETS))} disabled={state.busy} style={{ height: 32, padding: '0 10px', border: 'none', background: 'transparent', color: 'var(--muted)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>Reset to defaults</button>
          <button type="button" onClick={close} disabled={state.busy} style={{ height: 32, padding: '0 14px', borderRadius: 10, border: '1px solid var(--card-edge)', background: 'var(--ghost)', color: 'var(--text)', fontSize: TYPE.body, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
          <button type="button" data-ins-targets-save onClick={save} disabled={bad || !changed || state.busy} style={{ height: 32, padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--brand)', color: '#FFFFFF', fontSize: TYPE.body, fontWeight: 800, cursor: bad || !changed || state.busy ? 'not-allowed' : 'pointer', opacity: bad || !changed ? 0.45 : 1 }}>{state.busy ? 'Saving…' : 'Save targets'}</button>
        </footer>
        {state.error && <div role="alert" data-ins-targets-error style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: alpha(ink.bad, 0.1), fontSize: TYPE.body, fontWeight: 700, color: 'var(--text)' }}>{state.error}</div>}
      </motion.div>
    </div>,
    document.body,
  );
}
