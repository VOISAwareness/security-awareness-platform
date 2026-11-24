import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, achievementsFor, latestEarned } from './achievements.js';

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

// a history in time order: rules[0] first
const hist = (rules) => rules.map((r, i) => ev(r, `C${i}`, `2026-01-01T00:${String(i).padStart(2, '0')}:00Z`));

test('the report badges are hard to get', () => {
  assert.deepEqual(earned({ history: hist(Array(9).fill('Reported')) }), ['first-report']);
  assert.deepEqual(earned({ history: hist(Array(10).fill('Reported')) }), ['first-report', 'sharp-eye', 'safe-handler']);
  assert.ok(!earned({ history: hist(Array(24).fill('Reported')) }).includes('quick-reporter'));
  assert.ok(earned({ history: hist(Array(25).fill('Reported')) }).includes('quick-reporter'));
});

test('first report only when the very first action is a report', () => {
  assert.ok(earned({ history: hist(['Reported', 'Clicked']) }).includes('first-report'));
  assert.ok(!earned({ history: hist(['Clicked', 'Reported']) }).includes('first-report'));
  // read in time order, whatever order the list comes in
  assert.ok(!earned({ history: hist(['Clicked', 'Reported']).reverse() }).includes('first-report'));
});

test('a click ends safe handler', () => {
  assert.ok(!earned({ history: hist([...Array(5).fill('Reported'), 'Clicked', ...Array(10).fill('Reported')]) }).includes('safe-handler'));
});

test('training, evaluations, rank and points', () => {
  assert.deepEqual(earned({ history: hist(['Trained', 'Trained']) }), []);
  assert.deepEqual(earned({ history: hist(['Trained', 'Trained', 'Trained']) }), ['trained']);
  assert.ok(earned({ history: hist(Array(10).fill('Trained')) }).includes('lifelong-learner'));
  assert.deepEqual(earned({ history: hist(Array(4).fill('Evaluated')) }), []);
  assert.deepEqual(earned({ history: hist(Array(5).fill('Evaluated')) }), ['quiz-ace']);
  assert.deepEqual(earned({ rank: 10, points: 1000 }), ['top-10']);
  assert.deepEqual(earned({ rank: 10, points: 999 }), []);
  assert.deepEqual(earned({ rank: 11, points: 5000 }), ['point-collector']);
  assert.deepEqual(earned({ points: 1999 }), []);
});

test('comeback: 5 reports in a row after a slip', () => {
  assert.ok(earned({ history: hist(['Clicked', ...Array(5).fill('Reported')]) }).includes('comeback'));
  assert.ok(!earned({ history: hist(['Clicked', ...Array(4).fill('Reported')]) }).includes('comeback'));
  assert.ok(!earned({ history: hist(['Clicked', 'Reported', 'Reported', 'Clicked', 'Reported', 'Reported', 'Reported']) }).includes('comeback'));
  assert.ok(earned({ history: hist(['Clicked', 'Reported', 'Trained', 'Reported', 'Reported', 'Reported', 'Reported']) }).includes('comeback'));
});

test('reads the history as useMyStanding shapes it too ({ event, where })', () => {
  const history = [{ event: 'Reported', where: 'Payroll update', at: '2026-01-01T00:00:00Z' }, { event: 'Trained', where: 'Path A', at: '2026-01-02T00:00:00Z' }];
  assert.deepEqual(earned({ history }), ['first-report']);
});

test("the API's list wins over the local rules; unknown ids are ignored", () => {
  const history = hist(Array(12).fill('Reported'));
  assert.deepEqual(earned({ history, achievements: ['trained', 'not-a-badge'] }), ['trained']);
  assert.deepEqual(earned({ history, achievements: [] }), [], 'an empty list from the API means none, not "work it out"');
  assert.deepEqual(earned({ history, achievements: null }), ['first-report', 'sharp-eye', 'safe-handler'], 'no list: the local rules');
});

test('the ID card shows the hardest one earned, or none', () => {
  assert.equal(latestEarned(achievementsFor({ achievements: ['first-report', 'quick-reporter', 'sharp-eye'] })).id, 'quick-reporter');
  assert.equal(latestEarned(achievementsFor({ achievements: [] })), null);
  assert.equal(latestEarned(undefined), null);
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
