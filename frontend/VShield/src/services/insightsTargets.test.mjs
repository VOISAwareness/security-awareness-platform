import assert from 'node:assert/strict';
import test from 'node:test';

import { TARGETS, UNITS, checkTarget, checkTargets, pairFor, standing, targetText, targetsWith, zones } from './insightsTargets.js';

test('standing: on track up to the target, at risk up to the next edge, off track beyond', () => {
  const t = TARGETS.hookRate; // lower is better: 5%, 10%
  assert.equal(standing(0.05, t), 'on');
  assert.equal(standing(0.0501, t), 'risk');
  assert.equal(standing(0.1, t), 'risk');
  assert.equal(standing(0.104, t), 'off');
  const r = TARGETS.reportRate; // higher is better: 50%, 30%
  assert.equal(standing(0.5, r), 'on');
  assert.equal(standing(0.3, r), 'risk');
  assert.equal(standing(0.256, r), 'off');
  const c = TARGETS.trainingCompletion; // higher is better: 90%, 80%
  assert.equal(standing(0.9, c), 'on');
  assert.equal(standing(0.8, c), 'risk');
  assert.equal(standing(0.796, c), 'off');
  assert.equal(standing(null, r), null);
  assert.equal(standing(NaN, r), null);
});

test('zones: three stretches from 0 to the end of the scale, in order, the good one where better is', () => {
  for (const [name, t] of Object.entries(TARGETS)) {
    const z = zones(t);
    assert.equal(z.length, 3, name);
    assert.equal(z[0].from, 0, name);
    assert.equal(z[2].to, t.max, name);
    assert.ok(z.every((s, i) => s.from < s.to && (i === 0 || s.from === z[i - 1].to)), `${name}: contiguous`);
    assert.equal(t.better === 'down' ? z[0].standing : z[2].standing, 'on', name);
    // a value in each stretch stands where the stretch says
    z.forEach((s) => assert.equal(standing((s.from + s.to) / 2, t), s.standing, `${name} ${s.standing}`));
  }
});

test('the target as it reads', () => {
  assert.equal(targetText(TARGETS.riskScore), '≤ 20');
  assert.equal(targetText(TARGETS.reportRate, '%'), '≥ 50%');
  assert.equal(targetText(TARGETS.highRiskShare, '%'), '≤ 10%');
  assert.equal(targetText(TARGETS.firstReport, 'min'), '≤ 15 min');
});

test('every target has a unit', () => {
  assert.deepEqual(Object.keys(UNITS).sort(), Object.keys(TARGETS).sort());
});

test('checkTargets: numbers in range, the target on the better side of the at-risk edge', () => {
  for (const [key, t] of Object.entries(TARGETS)) assert.equal(checkTargets(key, t.target, t.atRisk), null, `${key} default`);
  assert.equal(checkTargets('hookRate', 0.04, 0.08), null);
  assert.match(checkTargets('hookRate', 0.08, 0.04), /below/);
  assert.match(checkTargets('hookRate', 0.05, 0.05), /below/);
  assert.match(checkTargets('reportRate', 0.3, 0.5), /above/);
  assert.match(checkTargets('hookRate', 5, 10), /0 to 100%/); // a rate is a fraction
  assert.match(checkTargets('riskScore', -1, 35), /0 to 100$/);
  assert.match(checkTargets('firstReport', 15, 2000), /1,440 min/);
  assert.match(checkTargets('hookRate', NaN, 0.1), /numbers/);
  assert.match(checkTargets('hookRate', '0.05', 0.1), /numbers/);
  assert.match(checkTargets('openRate', 0.1, 0.2), /no such/);
});

test('targetsWith: an admin\'s targets in place of the defaults, the rest unchanged', () => {
  assert.deepEqual(targetsWith(null), TARGETS);
  assert.deepEqual(targetsWith([]), TARGETS);
  const t = targetsWith({ hookRate: { target: 0.04, atRisk: 0.08 }, riskScore: { target: 15, atRisk: 45 }, openRate: { target: 0.1, atRisk: 0.2 }, reportRate: { target: 0.2, atRisk: 0.6 } });
  assert.deepEqual([t.hookRate.target, t.hookRate.atRisk, t.hookRate.better], [0.04, 0.08, 'down']);
  assert.equal(t.hookRate.max, TARGETS.hookRate.max);
  // the scale grows to show the at-risk edge, past the default's end
  assert.equal(t.riskScore.max, 45 * 1.25);
  // unknown measures are ignored; a pair that cannot stand keeps the default
  assert.equal(t.openRate, undefined);
  assert.deepEqual(t.reportRate, TARGETS.reportRate);
  assert.deepEqual(t.gaveDetails, TARGETS.gaveDetails);
  // a rate's scale never passes 100%
  assert.equal(targetsWith({ reportRate: { target: 0.95, atRisk: 0.8 } }).reportRate.max, 1);
});

test('pairFor: the at-risk edge keeps the default\'s proportion, and gives back each default', () => {
  for (const [key, t] of Object.entries(TARGETS)) assert.deepEqual(pairFor(key, t.target), { target: t.target, atRisk: t.atRisk }, key);
  assert.deepEqual(pairFor('hookRate', 0.04), { target: 0.04, atRisk: 0.08 });
  assert.deepEqual(pairFor('riskScore', 25), { target: 25, atRisk: 43.8 });
  assert.deepEqual(pairFor('reportRate', 0.6), { target: 0.6, atRisk: 0.36 });
  assert.deepEqual(pairFor('firstReport', 10), { target: 10, atRisk: 20 });
  // never past the measure's range
  assert.equal(pairFor('hookRate', 0.8).atRisk, 1);
});

test('checkTarget: a number in range that leaves room for an at-risk stretch', () => {
  for (const [key, t] of Object.entries(TARGETS)) assert.equal(checkTarget(key, t.target), null, key);
  assert.equal(checkTarget('hookRate', 0.12), null);
  assert.match(checkTarget('hookRate', 1), /below 100%/);
  assert.match(checkTarget('hookRate', 1.2), /0 to 100%/);
  assert.match(checkTarget('reportRate', 0), /above 0/);
  assert.match(checkTarget('riskScore', NaN), /0 to 100/);
  assert.match(checkTarget('firstReport', -5), /1,440 min/);
});
