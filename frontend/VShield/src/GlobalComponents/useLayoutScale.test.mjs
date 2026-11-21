import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutScaleFor, BASE_LAYOUT_SCALE } from './useLayoutScale.js';

test('small windows and phones keep the base scale', () => {
  for (const [w, h] of [[390, 844], [768, 1024], [1280, 720], [1366, 768]]) {
    assert.equal(layoutScaleFor(w, h), BASE_LAYOUT_SCALE, `${w}x${h}`);
  }
});

test('bigger windows grow with the smaller of the two ratios', () => {
  assert.equal(layoutScaleFor(1536, 864), 1.012); // a 1080p laptop at 125%
  assert.equal(layoutScaleFor(1920, 1080), 1.265);
  assert.equal(layoutScaleFor(2560, 1080), 1.266); // ultrawide: held by its height
});

test('growth stops at 1.5 times', () => {
  assert.equal(layoutScaleFor(2560, 1440), 1.35); // 32-inch QHD, or 4K at 150%
  assert.equal(layoutScaleFor(3840, 2160), 1.35);
});
