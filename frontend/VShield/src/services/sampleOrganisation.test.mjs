import assert from 'node:assert/strict';
import test from 'node:test';

import { TIERS, organisation, riskScore } from './sampleOrganisation.js';

const END = Date.UTC(2026, 9, 6);
const ORG = organisation({ end: END });

test('riskScore: everyone low is 0, everyone critical is 100', () => {
  assert.equal(riskScore({ low: 10 }), 0);
  assert.equal(riskScore({ critical: 4 }), 100);
  assert.equal(Math.round(riskScore({ low: 1, moderate: 1, high: 1, critical: 1 })), 50);
  assert.equal(riskScore({}), null);
});

test('the organisation: twelve thirty-day steps to the end, the same every time', () => {
  assert.equal(ORG.length, 12);
  assert.equal(ORG.at(-1).to, END);
  assert.ok(ORG.every((s, i, all) => i === 0 || s.to - all[i - 1].to === 30 * 86400000));
  assert.deepEqual(organisation({ end: END }), ORG);
});

test('every step adds up from its departments, and no count is negative', () => {
  for (const s of ORG) {
    assert.equal(s.people, s.departments.reduce((a, d) => a + d.people, 0));
    for (const t of TIERS) assert.equal(s.tiers[t], s.departments.reduce((a, d) => a + d.tiers[t], 0), t);
    assert.equal(TIERS.reduce((a, t) => a + s.tiers[t], 0), s.people);
    assert.ok(s.departments.every((d) => TIERS.every((t) => d.tiers[t] >= 0)));
    const tr = s.training;
    assert.ok(tr.assigned >= tr.started && tr.started >= tr.completed && tr.completed >= tr.passed);
    assert.ok(Object.values(s.drivers).every((n) => n >= 0));
    assert.equal(s.cohorts.trained + s.cohorts.untrained, s.people);
    assert.ok(s.cohorts.trainedClicks / s.cohorts.trained < s.cohorts.untrainedClicks / s.cohorts.untrained, 'the trained click less');
  }
});

test('a month shows the same numbers however many months are asked for', () => {
  assert.deepEqual(organisation({ end: END, steps: 24 }).slice(-12), ORG);
});

test('the sample improves over the year, as the programme is meant to', () => {
  assert.ok(riskScore(ORG.at(-1).tiers) < riskScore(ORG[0].tiers));
});
