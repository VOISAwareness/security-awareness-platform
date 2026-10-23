import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { CAMPAIGN_TYPES, TYPE_LABELS, TYPE_NAMES, typeOptions, typeShort } from './campaignTypes.js';
import { CAMPAIGNS, PAST_CAMPAIGNS } from './sampleCampaigns.js';

test('six types, each with a slug, a label and a short name', () => {
  assert.deepEqual(TYPE_NAMES, ['Data Entry', 'Click', 'Credential theft', 'Helpdesk impersonation', 'Reward scam', 'Travel scam']);
  for (const t of CAMPAIGN_TYPES) {
    assert.match(t.slug, /^[a-z-]+$/);
    assert.equal(TYPE_LABELS[t.slug], t.label);
    assert.ok(t.short.length <= 12, t.short);
  }
});

test('the seeded scenarios use only these types', () => {
  const seeded = JSON.parse(readFileSync(new URL('../Pages/Scenarios/ScenariosData.json', import.meta.url), 'utf8'));
  const list = Array.isArray(seeded) ? seeded : Object.values(seeded).flat();
  const types = new Set(list.map((s) => s.campaignType).filter(Boolean));
  assert.ok(types.size > 0);
  for (const type of types) assert.ok(TYPE_NAMES.includes(type), type);
});

test('the sample campaigns use only these types, and all six of them', () => {
  const used = new Set([...CAMPAIGNS, ...PAST_CAMPAIGNS].map((c) => c.type));
  assert.deepEqual([...used].sort(), [...TYPE_NAMES].sort());
});

test('short names for tight labels, and older names left as they are', () => {
  assert.equal(typeShort('Credential theft'), 'Credentials');
  assert.equal(typeShort('Helpdesk impersonation'), 'Helpdesk');
  assert.equal(typeShort('Finance lure'), 'Finance');
  assert.equal(typeShort('Custom'), 'Custom');
});

test("the builder's options keep a stored type from before the list", () => {
  assert.equal(typeOptions().length, 6);
  assert.equal(typeOptions('click').length, 6);
  assert.deepEqual(typeOptions('Phishing Simulation').at(-1), { value: 'Phishing Simulation', label: 'Phishing Simulation' });
});
