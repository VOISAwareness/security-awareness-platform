/** Tests for the sample standings and the last-seen-level memory. */
import assert from 'node:assert/strict';
import test from 'node:test';

import users from '../MasterUserData.json' with { type: 'json' };
import { LEVELS, levelFor } from './levels.js';
import { levelNotice, readLastLevel, rememberLevel } from './levelMemory.js';
import { rankUsers, sampleHistory, sampleStanding } from './sampleStanding.js';

const people = [
  { UserName: 'Ana', UserEMailID: 'ana@example.test', Department: 'Sales', GamificationPoint: 120 },
  { UserName: 'Ben', UserEMailID: 'ben@example.test', Department: 'IT', GamificationPoint: 900 },
  { UserName: 'Cy', UserEMailID: 'cy@example.test', Department: 'IT', GamificationPoint: -150 },
  { UserName: 'Di', UserEMailID: 'di@example.test', Department: 'Legal', GamificationPoint: 'oops' },
];

test('rankUsers: highest points first, junk points count as 0', () => {
  const r = rankUsers(people);
  assert.deepEqual(r.map((u) => [u.UserName, u.points, u.rank]), [['Ben', 900, 1], ['Ana', 120, 2], ['Di', 0, 3], ['Cy', -150, 4]]);
  assert.deepEqual(rankUsers(null), []);
});

test('sampleStanding: points, rank, level and progress for a person', () => {
  const s = sampleStanding(people, ' BEN@example.test ');
  assert.equal(s.points, 900);
  assert.equal(s.rank, 1);
  assert.equal(s.total, 4);
  assert.equal(s.level.id, 'L4G1');
  assert.equal(s.progress.next.id, 'L4G2');
  assert.equal(s.progress.toNext, 50);
  assert.equal(s.name, 'Ben');
  assert.ok(s.best.rank >= s.level.rank, 'best is never below the current level');
});

test('sampleStanding: someone not in the list is a New Joiner on 0 points', () => {
  const s = sampleStanding(people, 'nobody@example.test');
  assert.equal(s.points, 0);
  assert.equal(s.rank, null);
  assert.equal(s.level.id, 'L1G1');
});

test('sampleStanding: people below zero were higher before', () => {
  const s = sampleStanding(people, 'cy@example.test');
  assert.equal(s.level.id, 'LN1');
  assert.ok(s.best.rank > s.level.rank);
});

test('sample history is the same every time, and uses the live rule values', () => {
  const a = sampleHistory('ana@example.test', 120);
  assert.deepEqual(a, sampleHistory('ana@example.test', 120));
  assert.equal(a.length, 5);
  assert.ok(a.every((e) => e.what && e.where && !Number.isNaN(Date.parse(e.at))));
  const custom = sampleHistory('ana@example.test', 120, { Reported: 100 });
  assert.equal(custom.find((e) => e.event === 'Reported').points, 100);
  assert.equal(custom.find((e) => e.event === 'Trained').points, 30, 'missing rules fall back');
  assert.ok(sampleHistory('cy@example.test', -150)[0].points < 0, 'below zero, the latest change was a loss');
});

test('the bundled sample covers every level family, negatives included', () => {
  const families = new Set(users.map((u) => levelFor(u.GamificationPoint)?.family));
  for (const f of new Set(LEVELS.map((l) => l.family))) assert.ok(families.has(f), f);
  assert.ok(users.every((u) => !('CurrentBadge' in u)), 'badges are worked out, not stored');
  assert.equal(sampleStanding(users, 'vois.demo.user@vodafone.com').level.id, 'L2G2');
});

test('levelMemory: remembers per person, notices up and down', () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  assert.equal(readLastLevel(storage, 'a@x.test'), null);
  rememberLevel(storage, 'A@x.test', 'L2G3');
  assert.equal(readLastLevel(storage, 'a@x.test'), 'L2G3');
  assert.equal(readLastLevel(storage, 'b@x.test'), null);

  const up = levelNotice('L2G3', 'L3G1');
  assert.deepEqual([up.kind, up.from.id, up.to.id], ['up', 'L2G3', 'L3G1']);
  assert.equal(levelNotice('L1G1', 'L0').kind, 'down');
  assert.equal(levelNotice('L3G1', 'L3G1'), null);
  assert.equal(levelNotice(null, 'L3G1'), null, 'first visit: nothing to compare with');

  store.set('voisshield_last_level:c@x.test', 'junk');
  assert.equal(readLastLevel(storage, 'c@x.test'), null);
  const broken = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(readLastLevel(broken, 'a@x.test'), null);
  assert.doesNotThrow(() => rememberLevel(broken, 'a@x.test', 'L1G1'));
});
