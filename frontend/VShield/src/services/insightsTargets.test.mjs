import assert from 'node:assert/strict';
import test from 'node:test';

import { TARGETS, standing, targetText, zones } from './insightsTargets.js';

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
