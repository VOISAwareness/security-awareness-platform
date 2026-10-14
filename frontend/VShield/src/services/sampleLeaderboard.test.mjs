/** Tests for the sample leaderboard rows and who sees which badge on them. */
import assert from 'node:assert/strict';
import test from 'node:test';

import users from '../MasterUserData.json' with { type: 'json' };
import { globalBoard, samplePointsFor, visibleLevel } from './sampleLeaderboard.js';
import { sampleStanding } from './sampleStanding.js';

test('the global board is everyone, by points, with a level each', () => {
  const b = globalBoard(users);
  const all = [b.podium.first, b.podium.second, b.podium.third, ...b.rows];
  assert.equal(b.total, users.length);
  assert.equal(all.length, users.length);
  all.forEach((r, i) => {
    assert.equal(r.rank, i + 1);
    if (i) assert.ok(all[i - 1].points >= r.points, 'highest first');
    assert.ok(r.levelId, `${r.name} has a level`);
    assert.match(r.rep, /^\d+%$/);
    assert.ok(r.move >= -3 && r.move <= 5);
  });
  assert.equal(b.podium.first.name, 'Jack Roberts');
  assert.equal(b.podium.first.levelId, 'L7G3');
  assert.equal(b.podium.first.pts, '4,620');
  assert.equal(all.at(-1).levelId, 'LN2', 'lowest is below zero');
});

test('the board and My Space agree on rank and level', () => {
  const b = globalBoard(users);
  const all = [b.podium.first, b.podium.second, b.podium.third, ...b.rows];
  for (const email of ['vois.demo.user@vodafone.com', 'george.davies@vodafone.com', 'jack.roberts@vodafone.com']) {
    const s = sampleStanding(users, email);
    const row = all.find((r) => r.email === email);
    assert.equal(row.rank, s.rank, email);
    assert.equal(row.levelId, s.level.id, email);
  }
});

test('made-up campaign people: stable, mostly low, a few below zero', () => {
  const pts = Array.from({ length: 400 }, (_, i) => samplePointsFor(i));
  assert.deepEqual(pts.slice(0, 20), Array.from({ length: 20 }, (_, i) => samplePointsFor(i)));
  const below = pts.filter((p) => p < 0).length;
  assert.ok(below > 5 && below < 60, `below zero: ${below}`);
  assert.ok(pts.filter((p) => p >= 3400).length > 0, 'some Cyber Guardians');
  assert.ok(pts.filter((p) => p < 300).length > 150, 'most low on the ladder');
});

test('negative badges are hidden from colleagues, not from the person or admins', () => {
  assert.equal(visibleLevel('LN2', { viewerRole: 'Regular User' }), null);
  assert.equal(visibleLevel('L0', { viewerRole: 'Campaign Manager' }), null);
  assert.equal(visibleLevel('LN2', { viewerRole: 'Regular User', isSelf: true }).id, 'LN2');
  assert.equal(visibleLevel('LN1', { viewerRole: 'Admin' }).id, 'LN1');
  assert.equal(visibleLevel('L3G1', { viewerRole: 'Regular User' }).id, 'L3G1');
  assert.equal(visibleLevel(null, { viewerRole: 'Admin' }), null);
  assert.equal(visibleLevel('nope', { viewerRole: 'Admin' }), null);
});
