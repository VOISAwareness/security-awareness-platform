/** Tests for the gamification rule helpers shared by the Engine and the wizard. */
import assert from 'node:assert/strict';
import test from 'node:test';

import { GAMIFICATION_EVENTS, eventName, formatPoints, pointsByEvent } from './gamificationPoints.js';

test('pointsByEvent maps rule rows by name, any casing', () => {
  const points = pointsByEvent([
    { EventOperation: 'Clicked', PointsAssigned: -40 },
    { EventOperation: ' reported ', PointsAssigned: '80' },
  ]);
  assert.equal(points.Clicked, -40);
  assert.equal(points.Reported, 80);
  assert.equal(points.Opened, null, 'missing rules stay unknown rather than 0');
  assert.deepEqual(Object.keys(points), GAMIFICATION_EVENTS);
});

test('pointsByEvent ignores junk rows and values', () => {
  const points = pointsByEvent([
    { EventOperation: 'Unknown', PointsAssigned: 5 },
    { EventOperation: 'Opened', PointsAssigned: 'abc' },
    { EventOperation: 'Trained', PointsAssigned: '' },
  ]);
  assert.equal(points.Opened, null);
  assert.equal(points.Trained, null);
  assert.deepEqual(pointsByEvent(null), pointsByEvent([]));
});

test('eventName and formatPoints', () => {
  assert.equal(eventName('compromised'), 'Compromised');
  assert.equal(eventName('nope'), null);
  assert.equal(formatPoints(80), '+80');
  assert.equal(formatPoints(-30), '-30');
  assert.equal(formatPoints(0), '0');
  assert.equal(formatPoints(null), '—');
});
