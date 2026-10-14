/** Tests for mapping GET /leaderboard onto the board the screen draws. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { boardFromApi } from './liveLeaderboard.js';

const data = {
  total: 5,
  you: { rank: 2, points: 160, levelId: 'L2G1' },
  rows: [
    { rank: 1, name: 'Jack Roberts', department: 'Cyber Security', points: 4620, levelId: 'L7G3', you: false },
    { rank: 2, name: 'Ana Lopez', department: 'Sales', points: 160, levelId: 'L2G1', you: true },
    { rank: 3, name: 'Ben', department: '', points: 160, levelId: 'L2G1', you: false },
    { rank: 4, name: 'Nour El Din', department: '', points: null, levelId: null, you: false },
    { rank: 5, name: 'George', department: '', points: null, levelId: null, you: false },
  ],
};

test('podium, rows and the viewer', () => {
  const b = boardFromApi(data);
  assert.equal(b.total, 5);
  assert.equal(b.youRank, 2);
  assert.equal(b.podium.first.name, 'Jack Roberts');
  assert.equal(b.podium.first.pts, '4,620');
  assert.equal(b.podium.first.initials, 'JR');
  assert.equal(b.podium.second.you, true);
  assert.deepEqual(b.rows.map((r) => [r.rank, r.levelId, r.dept]), [[4, null, ''], [5, null, '']]);
  assert.deepEqual(b.rows.map((r) => [r.points, r.pts, r.hidden]), [[null, '', true], [null, '', true]], 'below zero, not ours: no points');
  assert.equal(b.podium.first.hidden, false);
  assert.deepEqual([b.rows[0].rep, b.rows[0].clk, b.rows[0].move], [null, null, 0], 'not on the server yet');
});

test('a board with fewer than three people, or nothing usable', () => {
  const b = boardFromApi({ total: 1, rows: [{ rank: 1, name: 'Solo', points: 30, levelId: 'L1G1', you: true }] });
  assert.equal(b.podium.second, null);
  assert.equal(b.rows.length, 0);
  assert.equal(b.youRank, 1);
  assert.equal(boardFromApi(null), null);
  assert.equal(boardFromApi({ rows: 'x' }), null);
  assert.equal(boardFromApi({ rows: [{ name: 'Bad', points: 'x' }] }).total, 0);
});
