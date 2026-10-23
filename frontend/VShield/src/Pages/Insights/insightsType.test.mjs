import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

import { TYPE, onScale } from './insightsType.js';

const steps = Object.values(TYPE);

test('the scale climbs, and nothing is under 8px', () => {
  assert.ok(steps.length <= 10, `${steps.length} steps`);
  steps.forEach((s, i) => assert.ok(i === 0 || s > steps[i - 1], `${s} after ${steps[i - 1]}`));
  assert.ok(steps[0] >= 8);
});

test('a size worked out from a chart lands on the nearest step', () => {
  assert.equal(onScale(19), TYPE.heading);
  assert.equal(onScale(13.9), TYPE.figure);
  assert.equal(onScale(12.2), TYPE.title);
  assert.equal(onScale(4), TYPE.label);
  assert.equal(onScale(60), TYPE.display);
});

test('every size of text on the Insights page comes from the scale', () => {
  const dir = new URL('./', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => /\.jsx?$/.test(f) && f !== 'insightsType.js')) {
    const src = readFileSync(new URL(file, dir), 'utf8');
    const literal = [...src.matchAll(/fontSize[:=]\s*\{?\s*(\d[\d.]*)/g)].map((m) => m[1]);
    assert.deepEqual(literal, [], `${file} sets a font size outside the scale`);
    for (const m of src.matchAll(/font-size:\s*([\d.]+)px/g)) assert.ok(steps.includes(Number(m[1])), `${file}: font-size ${m[1]}px`);
  }
});
