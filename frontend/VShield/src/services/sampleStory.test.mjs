import assert from 'node:assert/strict';
import test from 'node:test';

import { climate, exposure } from './sampleStory.js';

test('exposure: a slip two to three months back, recovering in the last month', () => {
  assert.ok(exposure(30) > exposure(0), 'worse a month ago than now');
  assert.ok(Math.abs(exposure(60) - exposure(0)) < 0.01, 'two months ago, about where it is now');
  assert.ok(exposure(90) < exposure(0), 'better three months ago than now');
  assert.ok(exposure(700) > exposure(120), 'better than two years ago');
  assert.equal(exposure(-5), exposure(0));
  assert.equal(exposure(5000), exposure(720));
});

test('climate: each month of campaigns has its own click and report rates', () => {
  assert.deepEqual(climate(0), climate(30), 'the last 30 days are one month');
  assert.notDeepEqual(climate(30), climate(31));
  assert.ok(climate(10).report / climate(10).click >= 2, 'recovered: two reports or more per click');
  assert.ok(climate(75).report < climate(75).click, 'the slip: fewer reports than clicks');
  assert.deepEqual(climate(400), climate(150), 'before the story, one steady month');
});
