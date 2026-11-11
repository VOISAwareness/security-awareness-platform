import { test } from 'node:test';
import assert from 'node:assert/strict';

import { bigPicture } from './bigPicture.js';
import { campaignBoard, fromBoardApi, ongoing, pictureItems } from './leaderboardData.js';

const DAY = 86400000;
const asOf = Date.UTC(2026, 10, 11);
const API = {
  asOf,
  you: 'VSLD-2',
  campaigns: [
    { id: 'C1', name: 'Payroll update', type: 'Click', started: '2026-11-06', total: 3, status: 'SENT', endsAt: asOf + 2 * DAY },
    { id: 'C2', name: 'Gift card', type: 'Reward scam', started: '2026-10-01', total: 3, status: 'SENT', endsAt: asOf - 30 * DAY },
  ],
  people: [
    { key: 'VSLD-1', name: 'Ana Costa', dept: 'Finance', points: 120, events: [[0, asOf - 4 * DAY, 0, 1, 0], [1, asOf - 40 * DAY, 1, 0, 1]] },
    { key: 'VSLD-2', name: 'Ben Iyer', dept: 'Sales', points: -40, events: [[0, asOf - 4 * DAY, 1, 0, 0]] },
    { key: 'VSLD-3', name: 'Cara Das', dept: 'Sales', points: 300, events: [[0, asOf - 5 * DAY, 0, 0, 0], [1, asOf - 40 * DAY, 0, 1, 0]] },
    { key: 'VSLD-4', name: 'Dev Rao', dept: 'Legal', points: 0, events: [] },
  ],
};

test('fromBoardApi names each event and keeps no email', () => {
  const b = fromBoardApi(API);
  assert.equal(b.people[0].events[1].campaign, 'C2');
  assert.equal(b.people[0].events[1].gave, true);
  assert.equal(b.you, 'VSLD-2');
  assert.ok(b.people.every((p) => p.email === ''));
  assert.deepEqual(fromBoardApi(null).people, []);
});

test('ongoing keeps the campaigns not yet ended', () => {
  assert.deepEqual(ongoing(fromBoardApi(API)).map((c) => c.id), ['C1']);
});

test('a campaign board ranks its recipients by the points it gave them', () => {
  const b = campaignBoard(fromBoardApi(API), 'C1', { Reported: 80, Clicked: -30 });
  assert.equal(b.total, 3); // Dev was not sent it
  assert.deepEqual([b.podium.first.name, b.podium.second.name, b.podium.third.name], ['Ana Costa', 'Cara Das', 'Ben Iyer']);
  assert.deepEqual([b.podium.first.points, b.podium.third.points], [80, -30]);
  assert.equal(b.youRank, 3);
  assert.equal(b.podium.third.levelId, 'L0'); // their overall level, from -40 points
});

test('the Big Picture counts what people really did', () => {
  const b = fromBoardApi(API);
  const r = bigPicture(pictureItems(b), b.people, { days: 30, now: asOf });
  assert.equal(r.basis.campaigns, 1);
  assert.equal(r.basis.people, 3); // the three sent C1 in the last 30 days
  assert.equal(r.points.earned, 80);
  assert.equal(r.points.lost, 30);
  const ben = r.people.find((x) => x.key === 'VSLD-2');
  assert.deepEqual([ben.clicked, ben.reported, ben.clickedTypes], [1, 0, ['Click']]);
  // the history holds every dated change in six months, the older campaign too
  assert.equal(r.history.ledger.reduce((a, x) => a + x.points, 0), 80 - 30 + 80 - 80);
  const one = bigPicture(pictureItems(b), b.people.filter((p) => p.events.some((e) => e.campaign === 'C2')), { focus: 'C2', now: asOf });
  assert.equal(one.basis.people, 2);
  assert.equal(one.people.find((x) => x.key === 'VSLD-1').gave, 1);
});
