import assert from 'node:assert/strict';
import test from 'node:test';

import { EMAIL_TYPES, MOTIVATORS, TARGET_AUDIENCES, labelFor, labelsOf, nameOptions, namesOf, optionsWith } from './scenarioOptions.js';

test('the three lists, as agreed', () => {
  assert.deepEqual(namesOf(MOTIVATORS), ['Fear', 'Urgency', 'Curiosity', 'Authority', 'Reward', 'Recognition', 'Opportunity', 'Job Function', 'Software Update', 'Security / Account Alert', 'Financial', 'Social']);
  assert.deepEqual(namesOf(TARGET_AUDIENCES), ['All Employees', 'Managers / Leaders', 'Remote Employees', 'Office Employees', 'Hybrid Employees', 'Finance Team', 'Legal Team', 'CARE Teams', 'Business Teams', 'HR', 'Senior Leadership', 'New Joiners']);
  assert.equal(EMAIL_TYPES.length, 10);
  for (const list of [EMAIL_TYPES, MOTIVATORS, TARGET_AUDIENCES]) {
    assert.equal(new Set(list.map((x) => x.slug)).size, list.length, 'slugs are unique');
    list.forEach((x) => assert.match(x.slug, /^[a-z-]+$/));
  }
});

test('options keep a value the list does not hold, once', () => {
  assert.equal(optionsWith(MOTIVATORS).length, 12);
  assert.equal(optionsWith(MOTIVATORS, 'fear').length, 12);
  assert.deepEqual(optionsWith(MOTIVATORS, 'Fear, Feedback, Curiosity').at(-1), { value: 'Fear, Feedback, Curiosity', label: 'Fear, Feedback, Curiosity' });
});

test('labels for showing a value', () => {
  assert.equal(labelFor(TARGET_AUDIENCES, 'managers-leaders'), 'Managers / Leaders');
  assert.equal(labelFor(TARGET_AUDIENCES, 'Office users'), 'Office users');
  assert.equal(labelFor(MOTIVATORS, undefined), '');
  assert.equal(labelsOf(EMAIL_TYPES)['qr-code'], 'QR Code');
});

test('name options save the label, and keep an older value once', () => {
  assert.deepEqual(nameOptions(EMAIL_TYPES)[4], { value: 'QR Code', label: 'QR Code' });
  assert.equal(nameOptions(TARGET_AUDIENCES, 'HR').length, 12);
  assert.deepEqual(nameOptions(TARGET_AUDIENCES, 'Office Workers').at(-1), { value: 'Office Workers', label: 'Office Workers' });
});
