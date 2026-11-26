import assert from 'node:assert/strict';
import test from 'node:test';

import { canRedo, canUndo, moveTo, newHistory, recordStep } from './pageHistory.js';

test('steps can be undone and redone', () => {
  let h = newHistory('a');
  h = recordStep(h, 'b');
  h = recordStep(h, 'c');
  assert.deepEqual([h.stack, h.index], [['a', 'b', 'c'], 2]);
  h = moveTo(h, h.index - 1);
  assert.equal(h.stack[h.index], 'b');
  assert.equal(canUndo(h) && canRedo(h), true);
  h = moveTo(h, h.index + 1);
  assert.equal(h.stack[h.index], 'c');
  assert.equal(canRedo(h), false);
  assert.equal(moveTo(h, 3), null);
  assert.equal(moveTo(newHistory('x'), -1), null);
});

test('a new step after an undo drops what could be redone', () => {
  let h = recordStep(recordStep(newHistory('a'), 'b'), 'c');
  h = moveTo(h, 1);
  h = recordStep(h, 'd');
  assert.deepEqual(h.stack, ['a', 'b', 'd']);
  assert.equal(canRedo(h), false);
});

test('the same content is not a step', () => {
  const h = recordStep(newHistory('a'), 'b');
  assert.equal(recordStep(h, 'b'), h);
});

test('typing close together is one step; a pause or another action starts a new one', () => {
  let h = newHistory('');
  h = recordStep(h, 'H', { typing: true, now: 1000 });
  h = recordStep(h, 'He', { typing: true, now: 1300 });
  h = recordStep(h, 'Hel', { typing: true, now: 1600 });
  assert.deepEqual(h.stack, ['', 'Hel']);
  h = recordStep(h, 'Hel!', { typing: true, now: 4000 }); // after a pause
  assert.deepEqual(h.stack, ['', 'Hel', 'Hel!']);
  h = recordStep(h, 'Hel!<b>', { now: 4100 }); // a toolbar action
  h = recordStep(h, 'Hel!<b>x', { typing: true, now: 4200 }); // typing right after it is its own step
  assert.deepEqual(h.stack, ['', 'Hel', 'Hel!', 'Hel!<b>', 'Hel!<b>x']);
});

test('the oldest steps fall away past the limit', () => {
  let h = newHistory('0');
  for (let i = 1; i <= 5; i += 1) h = recordStep(h, String(i), { max: 3 });
  assert.deepEqual([h.stack, h.index], [['3', '4', '5'], 2]);
});

test('the input history is never changed', () => {
  const h = newHistory('a');
  recordStep(h, 'b');
  assert.deepEqual(h, newHistory('a'));
});
