import assert from 'node:assert/strict';
import test from 'node:test';

import { campaignReport } from './sampleReports.js';
import { MOTIVATORS, briefText, daysSince, nextMove } from './nextMove.js';

const DEPTS = ['AIDA', 'CARE', 'Finance', 'Network', 'Supply', 'Cyber', 'Cloud', 'IT Ops', 'Procurement', 'HR'];
const TYPES = ['Credential theft', 'Finance lure', 'IT lure', 'HR lure'];
const personAt = (i) => ({ name: `Person ${i}`, dept: DEPTS[i % DEPTS.length] });
const CAMPAIGNS = Array.from({ length: 12 }, (_, k) => ({ id: `C${k}`, name: `Campaign ${k}`, type: TYPES[k % TYPES.length], started: `${12 - k} Oct`, total: 600 + k * 97, seed: k + 1 }));
const ITEMS = CAMPAIGNS.map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt }) }));
const BOARD = {
  total: 6,
  podium: { first: { pts: '900', dept: 'HR' }, second: { pts: '420', dept: 'Finance' }, third: { pts: '310', dept: 'Finance' } },
  rows: [{ pts: '120', dept: 'Finance' }, { pts: '-60', dept: 'Finance' }, { pts: null, hidden: true, dept: 'Finance' }],
};

test('daysSince reads "6 Oct" against now', () => {
  assert.equal(daysSince('6 Oct', Date.UTC(2026, 9, 14)), 8);
  assert.equal(daysSince('30 Sep', Date.UTC(2026, 9, 14)), 14);
});

test('nextMove ranks every choice and picks the top one', () => {
  const m = nextMove(ITEMS, BOARD);
  for (const key of ['who', 'what', 'how', 'hard']) {
    assert.ok(m[key].length > 0, key);
    assert.ok(m[key].every((o, i, all) => i === 0 || all[i - 1].score >= o.score), `${key} ranked`);
    assert.equal(m.choice[key].id, m[key][0].id, `${key} defaults to the top`);
  }
  assert.deepEqual(m.how.map((h) => h.id).sort(), [...MOTIVATORS].sort());
  assert.deepEqual(m.hard.map((h) => h.id).sort(), ['Easy', 'Hard', 'Medium']);
  assert.ok(m.outcome.audience > 0 && m.outcome.pointsOnOffer === m.outcome.audience * 80);
  assert.ok(['who', 'what', 'how'].every((k) => m[k].every((o) => o.value >= 0 && o.avg > 0)), 'value and avg to draw');
  assert.ok(['who', 'what', 'how', 'hard'].every((k) => m[k].every((o) => o.hero.value && o.hero.caption && o.note)), 'every card has its number and note');
  const mix = m.choice.hard.mix;
  assert.ok(Math.abs(mix.low + mix.mid + mix.high - 1) < 1e-9, 'the level mix adds up');
  assert.ok(m.outcome.goal >= m.basis.average.report);
});

test('nextMove honours the admin’s own picks, and the lure follows the department', () => {
  const m = nextMove(ITEMS, BOARD);
  const other = m.who[m.who.length - 1].id;
  const p = nextMove(ITEMS, BOARD, { pick: { who: other, how: 'Fear', hard: 'Hard' } });
  assert.equal(p.choice.who.id, other);
  assert.equal(p.choice.how.id, 'Fear');
  assert.equal(p.choice.hard.id, 'Hard');
  assert.ok(p.what[0].facts[0].startsWith(other));
});

test('a follow-up plans from one campaign: who clicked first, the same lure flagged, Easy', () => {
  const m = nextMove(ITEMS, BOARD, { focus: 'C1' });
  assert.equal(m.basis.campaigns, 1);
  assert.equal(m.choice.who.id, 'clicked:C1');
  assert.equal(m.outcome.audience, ITEMS[1].report.clicked);
  assert.equal(m.choice.hard.id, 'Easy');
  assert.match(m.what.find((w) => w.id === 'Finance lure').facts[1], /same trick again/);
  assert.match(briefText(m, 'Next move'), /^Next move\nWho: Everyone who clicked/);
});

test('difficulty reads the target department’s levels', () => {
  const strong = {
    total: 4,
    podium: { first: { pts: '3,000', levelId: 'L6G1', dept: 'X' }, second: { pts: '2,000', levelId: 'L5G2', dept: 'X' }, third: { pts: '1,000', levelId: 'L4G2', dept: 'X' } },
    rows: [{ pts: '-150', levelId: 'LN1', dept: 'Y' }],
  };
  const items = ITEMS.map(({ campaign, report }) => ({ campaign, report: { ...report, departments: [
    { name: 'X', recipients: 100, reported: 60, clicked: 5 },
    { name: 'Y', recipients: 100, reported: 10, clicked: 30 },
  ] } }));
  assert.equal(nextMove(items, strong, { pick: { who: 'X' } }).choice.hard.id, 'Hard');
  assert.equal(nextMove(items, strong, { pick: { who: 'Y' } }).choice.hard.id, 'Easy');
  assert.equal(nextMove(items, strong).choice.who.id, 'Y', 'the weaker team comes first');
});
