import test from 'node:test';
import assert from 'node:assert/strict';
import { createScormRuntime, installScormApi, timeToSeconds } from './scormRuntime.js';
import { choosePackageSource, launchUrlServes, servedLaunchUrl } from './packageLaunch.js';

test('times in both formats', () => {
  assert.equal(timeToSeconds('0001:02:03.5'), 3723.5);
  assert.equal(timeToSeconds('PT1H2M3S'), 3723);
  assert.equal(timeToSeconds('P1DT30M'), 88200);
  assert.equal(timeToSeconds('PT'), 0);
  assert.equal(timeToSeconds('soon'), 0);
});

test('a SCORM 1.2 course: start, report, finish', () => {
  const commits = [];
  const rt = createScormRuntime({ learner: { id: 'zara', name: 'Quinn, Zara' }, onCommit: (s) => commits.push(s) });
  const api = rt.api12;
  assert.equal(api.LMSGetValue('cmi.core.student_name'), '');
  assert.equal(api.LMSGetLastError(), '301'); // not initialized yet
  assert.equal(api.LMSInitialize(''), 'true');
  assert.equal(api.LMSGetValue('cmi.core.student_name'), 'Quinn, Zara');
  assert.equal(api.LMSGetValue('cmi.core.entry'), 'ab-initio');
  assert.equal(api.LMSSetValue('cmi.core.student_id', 'x'), 'false');
  assert.equal(api.LMSGetLastError(), '403');
  assert.equal(api.LMSSetValue('cmi.core.lesson_status', 'done'), 'false');
  assert.equal(api.LMSSetValue('cmi.core.lesson_status', 'incomplete'), 'true');
  api.LMSSetValue('cmi.core.lesson_location', 'slide-4');
  api.LMSSetValue('cmi.suspend_data', '{"q":3}');
  assert.equal(api.LMSCommit(''), 'true');
  assert.deepEqual(
    { completed: commits[0].completed, passed: commits[0].passed, location: commits[0].location },
    { completed: false, passed: null, location: 'slide-4' },
  );
  api.LMSSetValue('cmi.core.score.raw', '8');
  api.LMSSetValue('cmi.core.score.max', '10');
  api.LMSSetValue('cmi.core.lesson_status', 'passed');
  api.LMSSetValue('cmi.core.session_time', '00:05:30');
  api.LMSSetValue('cmi.interactions.0.id', 'q1');
  api.LMSSetValue('cmi.interactions.1.id', 'q2');
  assert.equal(api.LMSGetValue('cmi.interactions._count'), '2');
  assert.equal(api.LMSFinish(''), 'true');
  const last = commits.at(-1);
  assert.deepEqual(
    { v: last.version, status: last.status, completed: last.completed, passed: last.passed, score: last.score, s: last.sessionSeconds, f: last.finished },
    { v: '1.2', status: 'passed', completed: true, passed: true, score: 80, s: 330, f: true },
  );
  assert.equal(last.suspendData, '{"q":3}');
  assert.equal(api.LMSCommit(''), 'false'); // after finishing
});

test('a SCORM 2004 course: scaled score, success and completion', () => {
  const rt = createScormRuntime();
  const api = rt.api2004;
  assert.equal(api.SetValue('cmi.location', 'x'), 'false');
  assert.equal(api.GetLastError(), '132');
  assert.equal(api.Initialize(''), 'true');
  assert.equal(api.Initialize(''), 'false');
  assert.equal(api.GetLastError(), '103');
  assert.equal(api.GetValue('cmi.session_time'), '');
  assert.equal(api.GetLastError(), '405'); // write only
  assert.equal(api.SetValue('cmi.score.scaled', '1.5'), 'false');
  api.SetValue('cmi.score.scaled', '0.65');
  api.SetValue('cmi.completion_status', 'completed');
  api.SetValue('cmi.success_status', 'failed');
  api.SetValue('cmi.session_time', 'PT12M');
  assert.equal(api.Terminate(''), 'true');
  const s = rt.summary();
  assert.deepEqual(
    { v: s.version, completed: s.completed, passed: s.passed, score: s.score, secs: s.sessionSeconds },
    { v: '2004', completed: true, passed: false, score: 65, secs: 720 },
  );
  assert.equal(api.GetValue('cmi.location'), '');
  assert.equal(api.GetLastError(), '123');
});

test('resuming hands the course its saved state', () => {
  const rt = createScormRuntime({ saved: { suspendData: 'abc', location: '7', status: 'incomplete' } });
  rt.api12.LMSInitialize('');
  assert.equal(rt.api12.LMSGetValue('cmi.core.entry'), 'resume');
  assert.equal(rt.api12.LMSGetValue('cmi.suspend_data'), 'abc');
  assert.equal(rt.api12.LMSGetValue('cmi.core.lesson_location'), '7');
  assert.equal(rt.api12.LMSGetValue('cmi.core.lesson_status'), 'incomplete');
});

test('changes are shown as they happen, saves only on commit', () => {
  const shown = [];
  const saved = [];
  const rt = createScormRuntime({ onChange: (s) => shown.push(s.status), onCommit: (s) => saved.push(s.status) });
  rt.api12.LMSInitialize('');
  rt.api12.LMSSetValue('cmi.core.lesson_status', 'incomplete');
  assert.deepEqual(shown, ['not attempted', 'incomplete']);
  assert.deepEqual(saved, []);
  rt.api12.LMSCommit('');
  assert.deepEqual(saved, ['incomplete']);
});

test('closing the player reports once for a course that never finished', () => {
  const seen = [];
  const rt = createScormRuntime({ onCommit: (s) => seen.push(s) });
  rt.close(); // never started: nothing to report
  assert.equal(seen.length, 0);
  rt.api12.LMSInitialize('');
  rt.close();
  rt.close();
  assert.equal(seen.length, 1);
  assert.equal(seen[0].finished, true);
});

test('install and uninstall on a window', () => {
  const win = {};
  const a = createScormRuntime();
  const b = createScormRuntime();
  const offA = installScormApi(win, a);
  assert.equal(win.API, a.api12);
  const offB = installScormApi(win, b);
  offA(); // a is no longer installed: leaves b alone
  assert.equal(win.API_1484_11, b.api2004);
  offB();
  assert.equal('API' in win, false);
});

const id = 'c'.repeat(32);
const ready = { ContentStatus: 'READY', LaunchURL: `/scorm/${id}/story.html`, isLocalUrl: true, localPath: 'https://s3/zip' };
const answer = (status, headers = {}) => async () => ({ ok: status < 400, headers: new Map(Object.entries(headers)) });

test('the served copy is used only when CloudFront or S3 answers for it', async () => {
  assert.equal(servedLaunchUrl(ready), ready.LaunchURL);
  assert.equal(servedLaunchUrl({ ...ready, ContentStatus: 'PENDING' }), '');
  assert.equal(servedLaunchUrl({ ...ready, LaunchURL: 'https://evil.example/x.html' }), '');
  assert.equal(await launchUrlServes(ready.LaunchURL, answer(200, { 'x-amz-cf-id': 'abc' })), true);
  assert.equal(await launchUrlServes(ready.LaunchURL, answer(200, { 'content-type': 'text/html' })), false); // the app's index.html
  assert.equal(await launchUrlServes(ready.LaunchURL, answer(404)), false);
  assert.equal(await launchUrlServes(ready.LaunchURL, async () => { throw new Error('offline'); }), false);
  assert.deepEqual(await choosePackageSource(ready, answer(200, { server: 'AmazonS3' })), { kind: 'served', url: ready.LaunchURL });
  assert.deepEqual(await choosePackageSource(ready, answer(404)), { kind: 'zip', source: 'https://s3/zip' });
  assert.deepEqual(await choosePackageSource({}, answer(404)), { kind: 'none' });
});
