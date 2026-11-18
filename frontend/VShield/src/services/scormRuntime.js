/**
 * The SCORM run-time API a course talks to while it plays.
 *
 * A SCORM course looks for an object named `API` (SCORM 1.2) or
 * `API_1484_11` (SCORM 2004) on its parent windows, and reports through it:
 * where the learner is, the course's own saved state (suspend data), whether
 * it is complete, passed, and the score. This is that object, for both
 * versions, kept in memory; `summary()` turns what the course said into one
 * shape the app can save (My Training) or show.
 *
 * The course must be on the app's own origin to reach window.parent, which is
 * why packages are served at /scorm/<id>/... (services/packageLaunch.js).
 *
 * Pure (no React, no DOM besides the window it is installed on), so
 * `node --test` covers it.
 */

const TRUE = 'true';
const FALSE = 'false';

// Error codes each version's courses expect.
const ERR12 = { none: '0', general: '101', notInitialized: '301', readOnly: '403', writeOnly: '404', badValue: '405', notImplemented: '401' };
const ERR2004 = {
  none: '0',
  general: '101',
  alreadyInitialized: '103',
  terminated: '104',
  beforeInit: '122',
  afterTerminate: '123',
  getBeforeInit: '122',
  setBeforeInit: '132',
  commitBeforeInit: '142',
  readOnly: '404',
  writeOnly: '405',
  badValue: '406',
  notImplemented: '401',
};
const MESSAGES = {
  0: 'No error',
  101: 'General exception',
  103: 'Already initialized',
  104: 'Content instance terminated',
  122: 'Retrieve data before initialization',
  123: 'Retrieve data after termination',
  132: 'Store data before initialization',
  142: 'Commit before initialization',
  301: 'Not initialized',
  401: 'Not implemented',
  403: 'Element is read only',
  404: 'Element is write only / read only',
  405: 'Incorrect data type / write only',
  406: 'Data model element type mismatch',
};

const READ_ONLY_12 = new Set([
  'cmi.core.student_id', 'cmi.core.student_name', 'cmi.core.credit', 'cmi.core.entry', 'cmi.core.total_time',
  'cmi.core.lesson_mode', 'cmi.launch_data', 'cmi.comments_from_lms', 'cmi.student_data.mastery_score',
]);
const WRITE_ONLY_12 = new Set(['cmi.core.exit', 'cmi.core.session_time']);
const READ_ONLY_2004 = new Set([
  'cmi.learner_id', 'cmi.learner_name', 'cmi.credit', 'cmi.entry', 'cmi.total_time', 'cmi.mode',
  'cmi.launch_data', 'cmi.completion_threshold', 'cmi.scaled_passing_score', 'cmi.time_limit_action',
  'cmi.max_time_allowed',
]);
const WRITE_ONLY_2004 = new Set(['cmi.exit', 'cmi.session_time']);
const STATUS_12 = new Set(['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted']);
const COMPLETION_2004 = new Set(['completed', 'incomplete', 'not attempted', 'unknown']);
const SUCCESS_2004 = new Set(['passed', 'failed', 'unknown']);
const MAX_SUSPEND = 64000; // SCORM 2004 4th ed. allows 64,000 characters

/** "HH:MM:SS.SS" (1.2) or ISO 8601 "PT1H2M3.5S" (2004) as seconds; 0 if neither. */
export function timeToSeconds(value) {
  const text = String(value || '').trim();
  const clock = text.match(/^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  if (clock) return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]);
  const iso = text.match(/^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (iso && text !== 'P' && text !== 'PT') {
    const [, d, h, m, s] = iso.map((x) => Number(x || 0));
    return d * 86400 + h * 3600 + m * 60 + s;
  }
  return 0;
}

const num = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

/** A raw score on min..max (default 0..100) as 0..100. */
function percent(raw, min, max) {
  if (raw === null) return null;
  const lo = min ?? 0;
  const hi = max ?? 100;
  if (hi <= lo) return null;
  return Math.max(0, Math.min(100, Math.round(((raw - lo) * 100) / (hi - lo))));
}

/** The highest n used in "<prefix>.n.xxx" keys, plus one. */
function countOf(data, prefix) {
  let count = 0;
  const re = new RegExp(`^${prefix.replace(/\./g, '\\.')}\\.(\\d+)\\.`);
  Object.keys(data).forEach((key) => {
    const m = key.match(re);
    if (m) count = Math.max(count, Number(m[1]) + 1);
  });
  return count;
}

/**
 * A run-time for one play of one course.
 *
 * @param {object} options
 * @param {{id?: string, name?: string}} [options.learner]
 * @param {object} [options.saved] what an earlier play left: {suspendData, location, status}
 * @param {(summary: object) => void} [options.onCommit] called when the course
 *   commits or finishes, with summary() (what to save)
 * @param {(summary: object) => void} [options.onChange] called whenever the
 *   course starts or sets a value (what to show; not for saving)
 */
export function createScormRuntime({ learner = {}, saved = {}, onCommit, onChange } = {}) {
  const resuming = Boolean(saved.suspendData || saved.location);
  const data = {
    // SCORM 1.2
    'cmi.core.student_id': String(learner.id || ''),
    'cmi.core.student_name': String(learner.name || ''),
    'cmi.core.lesson_location': String(saved.location || ''),
    'cmi.core.credit': 'credit',
    'cmi.core.lesson_status': STATUS_12.has(saved.status) ? saved.status : 'not attempted',
    'cmi.core.entry': resuming ? 'resume' : 'ab-initio',
    'cmi.core.score.raw': '',
    'cmi.core.score.min': '',
    'cmi.core.score.max': '',
    'cmi.core.total_time': '0000:00:00',
    'cmi.core.lesson_mode': 'normal',
    'cmi.suspend_data': String(saved.suspendData || ''),
    'cmi.launch_data': '',
    'cmi.comments': '',
    'cmi.comments_from_lms': '',
    // SCORM 2004
    'cmi.learner_id': String(learner.id || ''),
    'cmi.learner_name': String(learner.name || ''),
    'cmi.location': String(saved.location || ''),
    'cmi.credit': 'credit',
    'cmi.completion_status': COMPLETION_2004.has(saved.status) ? saved.status : 'unknown',
    'cmi.success_status': 'unknown',
    'cmi.entry': resuming ? 'resume' : 'ab-initio',
    'cmi.mode': 'normal',
    'cmi.total_time': 'PT0S',
    'cmi.score.scaled': '',
    'cmi.score.raw': '',
    'cmi.score.min': '',
    'cmi.score.max': '',
    'cmi.progress_measure': '',
  };
  let version = null; // '1.2' or '2004', from whichever API the course calls
  let state = 'new'; // new -> running -> finished
  let lastError = '0';
  let commits = 0;

  const fail = (code, result = FALSE) => {
    lastError = code;
    return result;
  };
  const ok = (result = TRUE) => {
    lastError = '0';
    return result;
  };

  function summary() {
    const v = version || '1.2';
    let completed;
    let passed = null;
    let score;
    let location;
    if (v === '2004') {
      completed = data['cmi.completion_status'] === 'completed';
      if (data['cmi.success_status'] === 'passed') passed = true;
      if (data['cmi.success_status'] === 'failed') passed = false;
      const scaled = num(data['cmi.score.scaled']);
      score = scaled !== null
        ? Math.max(0, Math.min(100, Math.round(scaled * 100)))
        : percent(num(data['cmi.score.raw']), num(data['cmi.score.min']), num(data['cmi.score.max']));
      location = data['cmi.location'];
    } else {
      const status = data['cmi.core.lesson_status'];
      completed = status === 'completed' || status === 'passed' || status === 'failed';
      if (status === 'passed') passed = true;
      if (status === 'failed') passed = false;
      score = percent(num(data['cmi.core.score.raw']), num(data['cmi.core.score.min']), num(data['cmi.core.score.max']));
      location = data['cmi.core.lesson_location'];
    }
    return {
      version: v,
      status: v === '2004' ? data['cmi.completion_status'] : data['cmi.core.lesson_status'],
      completed: Boolean(completed || passed === true),
      passed,
      score,
      location: location || '',
      suspendData: data['cmi.suspend_data'] || '',
      sessionSeconds: Math.round(timeToSeconds(v === '2004' ? data['cmi.session_time'] : data['cmi.core.session_time'])),
      finished: state === 'finished',
    };
  }

  const changed = () => {
    if (onChange) {
      try {
        onChange(summary());
      } catch {
        // showing progress must never break the course
      }
    }
  };

  const report = () => {
    commits += 1;
    if (onCommit) {
      try {
        onCommit(summary());
      } catch {
        // a saving problem is the app's to show; the course carries on
      }
    }
  };

  // --- shared steps ------------------------------------------------------

  function initialize(v, errs) {
    if (state === 'running') return fail(v === '2004' ? errs.alreadyInitialized : errs.general);
    if (state === 'finished' && v === '2004') return fail(errs.terminated);
    version = v;
    state = 'running';
    changed();
    return ok();
  }

  function finish(v, errs) {
    if (state !== 'running') return fail(v === '2004' ? (state === 'new' ? errs.beforeInit : errs.afterTerminate) : errs.notInitialized);
    state = 'finished';
    report();
    return ok();
  }

  function commit(v, errs) {
    if (state !== 'running') return fail(v === '2004' ? (state === 'new' ? errs.commitBeforeInit : errs.afterTerminate) : errs.notInitialized);
    report();
    return ok();
  }

  function getValue(v, errs, key) {
    if (state !== 'running') return fail(v === '2004' ? (state === 'new' ? errs.getBeforeInit : errs.afterTerminate) : errs.notInitialized, '');
    const k = String(key || '');
    const writeOnly = v === '2004' ? WRITE_ONLY_2004 : WRITE_ONLY_12;
    if (writeOnly.has(k)) return fail(errs.writeOnly, '');
    if (k.endsWith('._count')) return ok(String(countOf(data, k.slice(0, -'._count'.length))));
    if (k.endsWith('._children') || k.endsWith('._version')) {
      if (k === 'cmi._version') return ok(v === '2004' ? '1.0' : '3.4');
      return fail(errs.notImplemented, '');
    }
    if (k in data) return ok(String(data[k]));
    if (/^cmi\.(interactions|objectives)\.\d+\./.test(k)) return ok('');
    return fail(errs.notImplemented, '');
  }

  function setValue(v, errs, key, value) {
    if (state !== 'running') return fail(v === '2004' ? (state === 'new' ? errs.setBeforeInit : errs.afterTerminate) : errs.notInitialized);
    const k = String(key || '');
    const text = value === null || value === undefined ? '' : String(value);
    const readOnly = v === '2004' ? READ_ONLY_2004 : READ_ONLY_12;
    if (readOnly.has(k) || k.endsWith('._count') || k.endsWith('._children')) return fail(errs.readOnly);
    if (k === 'cmi.core.lesson_status' && !STATUS_12.has(text)) return fail(errs.badValue);
    if (k === 'cmi.completion_status' && !COMPLETION_2004.has(text)) return fail(errs.badValue);
    if (k === 'cmi.success_status' && !SUCCESS_2004.has(text)) return fail(errs.badValue);
    if (k === 'cmi.suspend_data' && text.length > MAX_SUSPEND) return fail(errs.badValue);
    if (/score\.(raw|min|max|scaled)$/.test(k) && text !== '' && num(text) === null) return fail(errs.badValue);
    if (k === 'cmi.score.scaled' && text !== '' && Math.abs(num(text)) > 1) return fail(errs.badValue);
    if (!k.startsWith('cmi.')) return fail(errs.notImplemented);
    data[k] = text;
    changed();
    return ok();
  }

  const errorString = (code) => MESSAGES[Number(code)] || 'Unknown error';

  // --- the two APIs ------------------------------------------------------

  const api12 = {
    LMSInitialize: () => initialize('1.2', ERR12),
    LMSFinish: () => finish('1.2', ERR12),
    LMSGetValue: (key) => getValue('1.2', ERR12, key),
    LMSSetValue: (key, value) => setValue('1.2', ERR12, key, value),
    LMSCommit: () => commit('1.2', ERR12),
    LMSGetLastError: () => lastError,
    LMSGetErrorString: errorString,
    LMSGetDiagnostic: (code) => errorString(code || lastError),
  };

  const api2004 = {
    Initialize: () => initialize('2004', ERR2004),
    Terminate: () => finish('2004', ERR2004),
    GetValue: (key) => getValue('2004', ERR2004, key),
    SetValue: (key, value) => setValue('2004', ERR2004, key, value),
    Commit: () => commit('2004', ERR2004),
    GetLastError: () => lastError,
    GetErrorString: errorString,
    GetDiagnostic: (code) => errorString(code || lastError),
  };

  return {
    api12,
    api2004,
    summary,
    /** Whether the course has started talking to the API. */
    get started() {
      return state !== 'new';
    },
    get finished() {
      return state === 'finished';
    },
    get commits() {
      return commits;
    },
    /** Close the session for the course (when the player is closed without
     *  the course finishing): reports once more, so nothing is lost. */
    close() {
      if (state === 'running') {
        state = 'finished';
        report();
      }
    },
  };
}

/**
 * Put a run-time's APIs on a window (the app's), where a course in an iframe
 * finds them through window.parent. Returns a function that takes them off
 * again (only if they are still this run-time's).
 */
export function installScormApi(win, runtime) {
  if (!win) return () => {};
  win.API = runtime.api12;
  win.API_1484_11 = runtime.api2004;
  return () => {
    if (win.API === runtime.api12) delete win.API;
    if (win.API_1484_11 === runtime.api2004) delete win.API_1484_11;
  };
}
