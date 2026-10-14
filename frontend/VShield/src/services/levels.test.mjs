/** Tests for the level table: points -> level, progress, and who sees what. */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LEVELS,
  LEVEL_BY_ID,
  canSeeBadge,
  canSeeRisk,
  higherLevel,
  isNegative,
  levelAltText,
  levelChange,
  levelFor,
  levelTitle,
  progressFor,
  rangeText,
  resolveLevel,
  riskColor,
  riskPosition,
} from './levels.js';

test('24 levels, lowest first, each band starting where the last one ends', () => {
  assert.equal(LEVELS.length, 24);
  assert.equal(LEVELS[0].id, 'LN2');
  assert.equal(LEVELS.at(-1).id, 'L7G3');
  for (let i = 1; i < LEVELS.length; i += 1) {
    assert.equal(LEVELS[i].min, LEVELS[i - 1].max, `${LEVELS[i].id} starts where ${LEVELS[i - 1].id} ends`);
    assert.equal(LEVELS[i].rank, i);
  }
  assert.equal(LEVELS[0].min, null, 'no floor under Critical Risk');
  assert.equal(LEVELS.at(-1).max, null, 'no ceiling over Cyber Guardian · Grade 3');
  assert.equal(new Set(LEVELS.map((l) => l.id)).size, 24);
});

test('a band includes its lower number, not its upper one', () => {
  const cases = [
    [0, 'L1G1'], [49, 'L1G1'], [50, 'L1G2'], [99.5, 'L1G2'], [100, 'L1G3'], [149, 'L1G3'],
    [150, 'L2G1'], [299, 'L2G3'], [300, 'L3G1'], [749, 'L3G3'], [750, 'L4G1'],
    [1150, 'L4G3'], [1299, 'L4G3'], [1300, 'L5G1'], [2199, 'L5G3'], [2200, 'L6G1'],
    [3399, 'L6G3'], [3400, 'L7G1'], [4449, 'L7G2'], [4450, 'L7G3'], [5000, 'L7G3'], [999999, 'L7G3'],
    [-1, 'L0'], [-100, 'L0'], [-101, 'LN1'], [-200, 'LN1'], [-201, 'LN2'], [-5000, 'LN2'], [-99999, 'LN2'],
  ];
  for (const [points, id] of cases) assert.equal(levelFor(points)?.id, id, `${points} pts`);
});

test('a newcomer on 0 points is a New Joiner, not Awareness Needed', () => {
  assert.equal(levelFor(0).name, 'New Joiner');
});

test('unknown totals have no level; numbers in strings are read', () => {
  for (const v of [null, undefined, '', 'abc', NaN, Infinity]) assert.equal(levelFor(v), null, String(v));
  assert.equal(levelFor('1,300').id, 'L5G1');
  assert.equal(levelFor('-30').id, 'L0');
});

test('names, labels and risk come from the table', () => {
  const l = LEVEL_BY_ID.L4G2;
  assert.deepEqual([l.level, l.grade, l.name, l.label, l.risk], [4, 2, 'Phish Catcher', 'Strong', 'Low Risk']);
  const n = LEVEL_BY_ID.LN1;
  assert.deepEqual([n.level, n.grade, n.name, n.risk], [-1, null, 'Vulnerable User', 'Very High Risk']);
});

test('titles, alt text and ranges', () => {
  assert.equal(levelTitle(LEVEL_BY_ID.L3G2), 'Level 3 · Grade 2');
  assert.equal(levelTitle(LEVEL_BY_ID.LN2), 'Level -2');
  assert.equal(levelAltText(LEVEL_BY_ID.L3G2), 'Level 3, Grade 2: Safe Handler');
  assert.equal(rangeText(LEVEL_BY_ID.L3G1), '300–449 pts');
  assert.equal(rangeText(LEVEL_BY_ID.L5G2), '1,600–1,899 pts');
  assert.equal(rangeText(LEVEL_BY_ID.L7G3), '4,450+ pts');
  assert.equal(rangeText(LEVEL_BY_ID.LN2), 'below -200 pts');
  assert.equal(rangeText(LEVEL_BY_ID.L0), '-100 to -1 pts');
  assert.equal(rangeText(LEVEL_BY_ID.LN1), '-200 to -101 pts');
  assert.equal(levelTitle(null), '');
});

test('progress to the next grade', () => {
  const p = progressFor(205);
  assert.equal(p.level.id, 'L2G2');
  assert.equal(p.next.id, 'L2G3');
  assert.equal(p.toNext, 45);
  assert.equal(p.pct, 10);
  assert.equal(p.isTop, false);

  const edge = progressFor(150);
  assert.deepEqual([edge.level.id, edge.toNext, edge.pct], ['L2G1', 50, 0]);

  const neg = progressFor(-30);
  assert.deepEqual([neg.level.id, neg.next.id, neg.toNext, neg.pct], ['L0', 'L1G1', 30, 70]);
});

test('the top grade has nowhere further to go', () => {
  const top = progressFor(6000);
  assert.equal(top.level.id, 'L7G3');
  assert.equal(top.next, null);
  assert.equal(top.isTop, true);
  assert.equal(top.pct, 100);
});

test('Critical Risk has no floor, but its bar still moves', () => {
  const a = progressFor(-350);
  assert.equal(a.level.id, 'LN2');
  assert.equal(a.next.id, 'LN1');
  assert.equal(a.toNext, 150);
  assert.equal(a.pct, 25);
  assert.equal(progressFor(-9000).pct, 0);
  assert.equal(progressFor(null), null);
});

test('up, down or no change; the higher of two levels', () => {
  assert.equal(levelChange('L2G3', 'L3G1'), 'up');
  assert.equal(levelChange('L1G1', 'L0'), 'down');
  assert.equal(levelChange('L4G2', 'L4G2'), null);
  assert.equal(levelChange(null, 'L4G2'), null);
  assert.equal(levelChange(LEVEL_BY_ID.L5G1, LEVEL_BY_ID.L4G3), 'down');
  assert.equal(higherLevel(LEVEL_BY_ID.L2G1, LEVEL_BY_ID.L1G3).id, 'L2G1');
  assert.equal(higherLevel(null, LEVEL_BY_ID.L0).id, 'L0');
  assert.equal(higherLevel(LEVEL_BY_ID.L0, null).id, 'L0');
});

test('resolveLevel takes an id first, else points', () => {
  assert.equal(resolveLevel({ levelId: 'L6G1', points: 0 }).id, 'L6G1');
  assert.equal(resolveLevel({ levelId: 'nope', points: 760 }).id, 'L4G1');
  assert.equal(resolveLevel({}), null);
  assert.equal(resolveLevel(), null);
});

test('negative levels and risk are seen by the person and admins only', () => {
  const neg = LEVEL_BY_ID.LN2;
  const pos = LEVEL_BY_ID.L3G1;
  assert.equal(isNegative(LEVEL_BY_ID.L0), true);
  assert.equal(isNegative(LEVEL_BY_ID.L1G1), false);

  assert.equal(canSeeBadge({ level: pos, viewerRole: 'Regular User' }), true);
  assert.equal(canSeeBadge({ level: neg, viewerRole: 'Regular User' }), false);
  assert.equal(canSeeBadge({ level: neg, viewerRole: 'Campaign Manager' }), false);
  assert.equal(canSeeBadge({ level: neg, isSelf: true, viewerRole: 'Regular User' }), true);
  assert.equal(canSeeBadge({ level: neg, viewerRole: 'Admin' }), true);
  assert.equal(canSeeBadge({ level: null, viewerRole: 'Admin' }), false);

  assert.equal(canSeeRisk({ viewerRole: 'GMT' }), false);
  assert.equal(canSeeRisk({ isSelf: true }), true);
  assert.equal(canSeeRisk({ viewerRole: 'Admin' }), true);
});

test('risk sits on a green-to-red scale; unknown has no place', () => {
  assert.equal(riskPosition(LEVEL_BY_ID.L1G2), null, 'New Joiner: Unknown');
  assert.ok(riskPosition(LEVEL_BY_ID.L7G1) < riskPosition(LEVEL_BY_ID.L4G1));
  assert.ok(riskPosition(LEVEL_BY_ID.L2G1) < riskPosition(LEVEL_BY_ID.L0));
  assert.ok(riskPosition(LEVEL_BY_ID.L0) < riskPosition(LEVEL_BY_ID.LN2));
  for (const l of LEVELS) if (l.family !== 'L1') assert.notEqual(riskPosition(l), null, l.id);
  assert.equal(riskColor(0), '#22C55E');
  assert.equal(riskColor(50), '#EAB308');
  assert.equal(riskColor(100), '#EF4444');
  assert.equal(riskColor(null), '#64748B');
  assert.equal(riskColor(140), '#EF4444');
});
