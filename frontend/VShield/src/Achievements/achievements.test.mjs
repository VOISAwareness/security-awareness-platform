import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, achievementsFor } from './achievements.js';

const ev = (rule, campaignId, at) => ({ rule, campaignId, at, delta: 0 });
const earned = (standing) => achievementsFor(standing).filter((a) => a.earned).map((a) => a.id);

test('ten achievements, each with a name, how to earn it and a picture name', () => {
  assert.equal(ACHIEVEMENTS.length, 10);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, 10);
  for (const a of ACHIEVEMENTS) assert.ok(a.name && a.how && a.image === a.id, a.id);
});

test('nothing earned with no standing, or a broken one', () => {
  assert.deepEqual(earned(undefined), []);
  assert.deepEqual(earned({ history: 'x', points: 'y' }), []);
});

test('reports: first, 3 and 5', () => {
  const reports = (n) => ({ history: Array.from({ length: n }, (_, i) => ev('Reported', `C${i}`, `2026-0${i + 1}-01`)) });
  assert.deepEqual(earned(reports(1)), ['first-report']);
  assert.deepEqual(earned(reports(3)), ['first-report', 'sharp-eye', 'safe-handler']);
  assert.ok(earned(reports(5)).includes('quick-reporter'));
});

test('safe handler needs 3 campaigns and no click or given details', () => {
  const clean = [ev('Opened', 'A'), ev('Opened', 'B'), ev('Reported', 'C')];
  assert.ok(earned({ history: clean }).includes('safe-handler'));
  assert.ok(!earned({ history: [...clean, ev('Clicked', 'D')] }).includes('safe-handler'));
});

test('training, evaluation, rank and points', () => {
  assert.deepEqual(earned({ history: [ev('Trained', 'A')] }), ['trained']);
  assert.ok(earned({ history: [ev('Trained', 'A'), ev('Trained', 'B'), ev('Trained', 'C')] }).includes('lifelong-learner'));
  assert.deepEqual(earned({ history: [ev('Evaluated', 'A')] }), ['quiz-ace']);
  assert.deepEqual(earned({ rank: 10 }), ['top-10']);
  assert.deepEqual(earned({ rank: 11 }), []);
  assert.deepEqual(earned({ points: 500 }), ['point-collector']);
});

test('comeback: a report after a click, not before', () => {
  assert.ok(earned({ history: [ev('Clicked', 'A', '2026-01-01'), ev('Reported', 'B', '2026-02-01')] }).includes('comeback'));
  assert.ok(!earned({ history: [ev('Reported', 'A', '2026-01-01'), ev('Clicked', 'B', '2026-02-01')] }).includes('comeback'));
});

test('reads the history as useMyStanding shapes it too ({ event, where })', () => {
  const history = [{ event: 'Reported', where: 'Payroll update' }, { event: 'Trained', where: 'Path A' }];
  assert.deepEqual(earned({ history }), ['first-report', 'trained']);
});

test("the API's list wins over the local rules; unknown ids are ignored", () => {
  const history = [{ rule: 'Reported' }, { rule: 'Reported' }, { rule: 'Reported' }];
  assert.deepEqual(earned({ history, achievements: ['trained', 'not-a-badge'] }), ['trained']);
  assert.deepEqual(earned({ history, achievements: [] }), [], 'an empty list from the API means none, not "work it out"');
  assert.deepEqual(earned({ history, achievements: null }), ['first-report', 'sharp-eye'], 'no list: the local rules');
});

test('the card shows 4: the earned ones first, then the next to earn', async () => {
  const { previewOf, PREVIEW_COUNT } = await import('./achievements.js');
  assert.equal(PREVIEW_COUNT, 4);
  const list = achievementsFor({ achievements: ['quiz-ace', 'top-10'] });
  assert.deepEqual(previewOf(list).map((a) => a.id), ['quiz-ace', 'top-10', 'first-report', 'sharp-eye']);
  assert.deepEqual(previewOf(achievementsFor({})).map((a) => a.id), ['first-report', 'sharp-eye', 'quick-reporter', 'safe-handler']);
  const allEarned = achievementsFor({ achievements: ACHIEVEMENTS.map((a) => a.id) });
  assert.equal(previewOf(allEarned).length, 4);
  assert.equal(previewOf(list, 0).length, 0);
  assert.deepEqual(previewOf(undefined), []);
});

test('every achievement has a picture in assets/clay/achievements, and every picture has a row', async () => {
  const { readdirSync } = await import('node:fs');
  const dir = new URL('../assets/clay/achievements/', import.meta.url);
  const pictures = readdirSync(dir).filter((f) => /\.(webp|png)$/i.test(f)).map((f) => f.replace(/\.(webp|png)$/i, ''));
  assert.deepEqual([...pictures].sort(), ACHIEVEMENTS.map((a) => a.image).sort());
});
