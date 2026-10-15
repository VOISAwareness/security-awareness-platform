import assert from 'node:assert/strict';
import test from 'node:test';

import { bigPicture } from './bigPicture.js';
import { findings, story, whereThey } from './bigPictureFindings.js';
import { campaignReport } from './sampleReports.js';

const DEPTS = ['Finance', 'HR', 'Cyber', 'CARE'];
const TYPES = ['Credential theft', 'Business lure', 'IT lure'];
const CAMPAIGNS = Array.from({ length: 8 }, (_, k) => ({ id: `C${k}`, name: `Campaign ${k}`, type: TYPES[k % 3], started: `${20 - k * 2} Oct`, total: 800, seed: k + 1 }));
const ITEMS = CAMPAIGNS.map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: (i) => ({ name: `P${i}`, dept: DEPTS[i % 4] }) }) }));
const PEOPLE = Array.from({ length: 200 }, (_, i) => ({ key: `p${i}`, name: `Person ${i}`, dept: DEPTS[i % 4], points: [-150, -20, 10, 60, 160, 310, 740, 1290, 2600, 4500][i % 10] + (i % 7) * 3 }));

test('whereThey says where people sit', () => {
  const at = (...depts) => depts.map((dept) => ({ dept }));
  assert.equal(whereThey(at('CARE', 'CARE')), 'all in CARE');
  assert.equal(whereThey(at('CARE', 'CARE', 'HR')), '2 in CARE and 1 in HR');
  assert.equal(whereThey(at('CARE', 'CARE', 'HR', 'IT', 'Legal')), '2 in CARE, 1 in HR and 2 more departments');
  assert.equal(whereThey([]), '');
});

test('the story: three parts of three at most, each line complete, never advice', () => {
  const r = bigPicture(ITEMS, PEOPLE);
  const s = story(r);
  for (const part of ['wrong', 'right', 'next']) {
    assert.ok(s[part].length > 0 && s[part].length <= 3, part);
    assert.ok(s[part].every((x) => x.value && x.headline && x.detail && 'link' in x && !('weight' in x)), part);
  }
  assert.ok(s.wrong.every((x) => x.tone === 'bad'));
  assert.ok(s.right.every((x) => x.tone === 'good'));
  assert.ok(s.next.some((x) => x.id === 'outlook'));
  const below = s.wrong.find((x) => x.id === 'belowZero');
  assert.equal(below.value, String(r.people.filter((x) => x.belowZero).length));
  assert.deepEqual(findings(r), [...s.wrong, ...s.right, ...s.next]);
  assert.ok(findings(r).every((x) => !/\b(should|recommend|suggest|target|send)\b/i.test(`${x.headline} ${x.detail}`)), 'reports, never advises');
});

test('one campaign: "in this campaign", no 30-day outlook, one-click split in two', () => {
  const r = bigPicture(ITEMS, PEOPLE, { focus: 'C2' });
  const s = story(r, { campaign: true });
  const all = findings(r, { campaign: true });
  assert.ok(!all.some((x) => /30 days/.test(`${x.headline} ${x.detail}`)));
  assert.ok(!s.next.some((x) => x.id === 'outlook' || x.id === 'oneClick'));
  assert.ok(all.some((x) => /in this campaign/.test(x.headline)));
});
