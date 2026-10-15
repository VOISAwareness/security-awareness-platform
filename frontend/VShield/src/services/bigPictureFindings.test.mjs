import assert from 'node:assert/strict';
import test from 'node:test';

import { bigPicture } from './bigPicture.js';
import { findings, whereThey } from './bigPictureFindings.js';
import { campaignReport } from './sampleReports.js';

const DEPTS = ['Finance', 'HR', 'Cyber', 'CARE'];
const TYPES = ['Credential theft', 'Business lure', 'IT lure'];
const CAMPAIGNS = Array.from({ length: 8 }, (_, k) => ({ id: `C${k}`, name: `Campaign ${k}`, type: TYPES[k % 3], started: `${20 - k * 2} Oct`, total: 800, seed: k + 1 }));
const ITEMS = CAMPAIGNS.map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: (i) => ({ name: `P${i}`, dept: DEPTS[i % 4] }) }) }));
const PEOPLE = Array.from({ length: 200 }, (_, i) => ({ key: `p${i}`, name: `Person ${i}`, dept: DEPTS[i % 4], points: [-150, -20, 10, 60, 160, 310, 760, 1290, 2600, 4500][i % 10] + (i % 7) * 3 }));

test('whereThey says where people sit', () => {
  const at = (...depts) => depts.map((dept) => ({ dept }));
  assert.equal(whereThey(at('CARE', 'CARE')), 'all in CARE');
  assert.equal(whereThey(at('CARE', 'CARE', 'HR')), '2 in CARE and 1 in HR');
  assert.equal(whereThey(at('CARE', 'CARE', 'HR', 'IT', 'Legal')), '2 in CARE, 1 in HR and 2 more departments');
  assert.equal(whereThey([]), '');
});

test('findings: concerns first, then good news, six at most, each a full line', () => {
  const r = bigPicture(ITEMS, PEOPLE);
  const f = findings(r);
  assert.ok(f.length > 0 && f.length <= 6);
  const firstGood = f.findIndex((x) => x.tone === 'good');
  assert.ok(firstGood === -1 || f.slice(firstGood).every((x) => x.tone === 'good'), 'good news last');
  assert.ok(f.some((x) => x.tone === 'good'), 'some good news');
  assert.ok(f.every((x) => x.value && x.headline && x.detail && 'link' in x && !('weight' in x)));
  const below = f.find((x) => x.id === 'belowZero');
  assert.equal(below.value, String(r.people.filter((x) => x.belowZero).length));
  assert.ok(f.every((x) => !/\b(should|recommend|suggest|target|send)\b/i.test(`${x.headline} ${x.detail}`)), 'reports, never advises');
});

test('one campaign reads "in this campaign"', () => {
  const r = bigPicture(ITEMS, PEOPLE, { focus: 'C2' });
  const f = findings(r, { campaign: true });
  assert.ok(f.some((x) => /in this campaign/.test(x.headline) || /campaign/.test(x.detail)));
  assert.ok(!f.some((x) => /30 days/.test(`${x.headline} ${x.detail}`)));
});
