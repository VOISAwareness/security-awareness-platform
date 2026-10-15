import assert from 'node:assert/strict';
import test from 'node:test';

import { forecast, levelFloor, likelyRange, smoothed, toNextLevel } from './bigPictureForecast.js';

const PTS = { Reported: 80, Clicked: -30, Compromised: -50 };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test('smoothed: a short record leans on the average, a long one on the person', () => {
  assert.ok(near(smoothed(0, 0, 0.2), 0.2), 'no emails: the average');
  assert.ok(near(smoothed(1, 2, 0.2), (1 + 10 * 0.2) / 12));
  assert.ok(Math.abs(smoothed(50, 100, 0.2) - 0.5) < 0.03, '100 emails: close to their own 50%');
});

test('levelFloor and toNextLevel read the level table', () => {
  assert.equal(levelFloor(165), 150, 'Aware User starts at 150');
  assert.equal(levelFloor(10), 0, 'New Joiner starts at 0');
  assert.equal(levelFloor(-50), -100, 'Level 0 starts at -100');
  assert.equal(levelFloor(-500), null, 'Critical Risk has no floor');
  assert.equal(toNextLevel(290), 10, '290 is 10 from Safe Handler at 300');
  assert.equal(toNextLevel(7000), null, 'nothing above Cyber Guardian III');
});

test('likelyRange: the expected count and its 90% range', () => {
  assert.deepEqual(likelyRange([]), { expected: 0, low: 0, high: 0 });
  assert.deepEqual(likelyRange([1, 1, 1]), { expected: 3, low: 3, high: 3 }, 'certain outcomes');
  const coin = likelyRange(Array(100).fill(0.5));
  assert.ok(near(coin.expected, 50));
  assert.ok(coin.low >= 40 && coin.low <= 42 && coin.high >= 58 && coin.high <= 60, `100 coins: about 42–58, got ${coin.low}–${coin.high}`);
  const big = likelyRange(Array(5000).fill(0.1)); // the normal approximation
  assert.ok(near(big.expected, 500, 1e-6));
  assert.ok(big.low >= 460 && big.high <= 540);
});

test('forecast: who could move after one more email, and how likely', () => {
  const people = [
    { key: 'a', points: 165, campaigns: 10, clicked: 5, reported: 0, gave: 0 }, // 15 above the floor: a click drops them
    { key: 'b', points: 200, campaigns: 10, clicked: 5, reported: 0, gave: 0 }, // 50 above: only a click with details
    { key: 'c', points: 290, campaigns: 10, clicked: 0, reported: 5, gave: 0 }, // 10 from Safe Handler: a report lifts them
    { key: 'd', points: 2000, campaigns: 10, clicked: 0, reported: 10, gave: 0 }, // far from both edges
  ];
  people[1].gave = 5; // half of everyone's clicks gave details
  const f = forecast(people, PTS);
  const C = 10 / 40; const R = 15 / 40; const G = 5 / 10;
  assert.ok(near(f.method.clickRate, C) && near(f.method.reportRate, R) && near(f.method.gaveShare, G));
  const a = f.chances.get('a');
  const b = f.chances.get('b');
  const c = f.chances.get('c');
  assert.ok(near(a.down, (5 + 10 * C) / 20), 'a: their click rate');
  assert.ok(near(b.down, ((5 + 10 * C) / 20) * G), 'b: click rate × share giving details');
  assert.ok(near(c.up, (5 + 10 * R) / 20), 'c: their report rate');
  assert.equal(f.chances.get('d').down, 0);
  assert.equal(f.down.within, 2);
  assert.equal(f.up.within, 1);
  assert.ok(near(f.down.expected, a.down + b.down));
  assert.ok(f.down.low <= f.down.expected && f.down.expected <= f.down.high);
  assert.equal(f.strong.now, 1);
  assert.ok(near(f.strong.expected, 1 + 0), 'c is Aware User (level 2): reaching Safe Handler is not Phish Catcher');
});

test('forecast: Phish Catcher or above, in and out', () => {
  const people = [
    { key: 'in', points: 740, campaigns: 0, clicked: 0, reported: 0, gave: 0 }, // Safe Handler, 10 from Phish Catcher
    { key: 'out', points: 760, campaigns: 0, clicked: 0, reported: 0, gave: 0 }, // Phish Catcher, 10 above its floor
    { key: 'other', points: 100, campaigns: 10, clicked: 2, reported: 4, gave: 0 },
  ];
  const f = forecast(people, PTS);
  const pin = f.chances.get('in').up;
  const pout = f.chances.get('out').down;
  assert.ok(pin > 0 && pout > 0);
  assert.equal(f.strong.now, 1);
  assert.ok(near(f.strong.expected, 1 + pin - pout));
  assert.ok(f.strong.low <= f.strong.expected && f.strong.expected <= f.strong.high);
});

test('forecast follows the live points rules', () => {
  const people = [{ key: 'a', points: 175, campaigns: 4, clicked: 1, reported: 1, gave: 0 }]; // 25 above the floor
  assert.ok(forecast(people, PTS).chances.get('a').down > 0, 'a −30 click drops them');
  assert.equal(forecast(people, { ...PTS, Clicked: -20, Compromised: 0 }).chances.get('a').down, 0, 'a −20 click does not');
});
