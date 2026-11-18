import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { CAMPAIGN_TYPES, TYPE_LABELS, TYPE_NAMES, typeOptions, typeShort } from './campaignTypes.js';

test('ten types of email, each with a slug, a label and a short name', () => {
  assert.deepEqual(TYPE_NAMES, ['Click', 'Data Entry', 'Attachment', 'Reply Based', 'QR Code', 'Download', 'Consent / Authorization', 'Call / Callback', 'Payment / Transaction', 'Multi-Step']);
  for (const t of CAMPAIGN_TYPES) {
    assert.match(t.slug, /^[a-z-]+$/);
    assert.equal(TYPE_LABELS[t.slug], t.label);
    assert.ok(t.short.length <= 12, t.short);
  }
});

test('the backend accepts exactly these ten (campaigns-api EMAIL_TYPES)', () => {
  const lambda = readFileSync(new URL('../../../../backend/campaigns-api/lambda_function.py', import.meta.url), 'utf8');
  const block = lambda.match(/EMAIL_TYPES = \(([\s\S]*?)\)/)[1];
  assert.deepEqual([...block.matchAll(/"([^"]+)"/g)].map((m) => m[1]), [...TYPE_NAMES]);
});

test('short names for tight labels, and older names left as they are', () => {
  assert.equal(typeShort('Consent / Authorization'), 'Consent');
  assert.equal(typeShort('Call / Callback'), 'Callback');
  assert.equal(typeShort('Credential theft'), 'Credential theft');
  assert.equal(typeShort('Finance lure'), 'Finance');
  assert.equal(typeShort('Custom'), 'Custom');
});

test("the builder's options keep a stored type from before the list", () => {
  assert.equal(typeOptions().length, 10);
  assert.equal(typeOptions('click').length, 10);
  assert.deepEqual(typeOptions('Phishing Simulation').at(-1), { value: 'Phishing Simulation', label: 'Phishing Simulation' });
});
