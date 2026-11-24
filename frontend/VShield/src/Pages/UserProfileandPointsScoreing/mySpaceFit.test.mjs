import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_SCREEN_HEIGHT, mySpaceGrowth } from './mySpaceFit.js';

test('the 14-inch laptop with the taskbar showing is drawn as designed', () => {
  assert.equal(mySpaceGrowth(FIRST_SCREEN_HEIGHT, 1279), 1);
  assert.equal(mySpaceGrowth(600, 1279), 1, 'never smaller than designed');
});

test('extra height grows the page instead of stretching it', () => {
  assert.equal(mySpaceGrowth(675, 1279), 1.075, 'the taskbar hidden');
  assert.equal(mySpaceGrowth(828, 1619), 1.318, 'a 1080p monitor');
});

test('the width keeps it in check, and it grows at most 1.6 times', () => {
  assert.equal(mySpaceGrowth(900, 1265), 1.1, 'a tall, narrow window');
  assert.equal(mySpaceGrowth(1400, 2400), 1.6);
  assert.equal(mySpaceGrowth(0, 0), 1);
});
