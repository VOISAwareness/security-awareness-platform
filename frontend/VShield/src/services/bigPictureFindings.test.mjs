import assert from 'node:assert/strict';
import test from 'node:test';

import { bigPicture } from './bigPicture.js';
import { breakdown, count, findings, share, story, whereThey } from './bigPictureFindings.js';
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

test('share and count read cleanly at any size', () => {
  assert.equal(share(0, 100), '0%');
  assert.equal(share(1, 30000), '<1%');
  assert.equal(share(4, 104), '3.8%');
  assert.equal(share(42, 100), '42%');
  assert.equal(count(940), '940');
  assert.equal(count(4213), '4,213');
  assert.equal(count(12430), '12.4k');
  assert.equal(count(30000), '30k');
  assert.equal(count(250000), '250k');
});

test('the story: three parts of three at most, each line complete, never advice', () => {
  const r = bigPicture(ITEMS, PEOPLE);
  const s = story(r);
  for (const part of ['wrong', 'right', 'next']) {
    assert.ok(s[part].length > 0 && s[part].length <= 3, part);
    assert.ok(s[part].every((x) => x.value && x.headline && x.sub && x.detail && 'link' in x && !('weight' in x)), part);
  }
  assert.ok(s.wrong.every((x) => x.tone === 'bad'));
  assert.ok(s.right.every((x) => x.tone === 'good'));
  assert.ok(s.next.every((x) => ['mayDrop', 'mayClimb', 'strongNext'].includes(x.id)));
  assert.ok(s.next.some((x) => x.id === 'strongNext'));
  const below = s.wrong.find((x) => x.id === 'belowZero');
  assert.equal(below.count, r.people.filter((x) => x.belowZero).length);
  assert.equal(below.value, share(below.count, r.people.length));
  assert.deepEqual(findings(r), [...s.wrong, ...s.right, ...s.next]);
  assert.ok(findings(r).every((x) => !/\b(should|recommend|suggest|target|send)\b/i.test(`${x.headline} ${x.sub} ${x.detail}`)), 'reports, never advises');
});

test('one campaign: "in this campaign", and the same forecast', () => {
  const r = bigPicture(ITEMS, PEOPLE, { focus: 'C2' });
  const s = story(r, { campaign: true });
  const all = findings(r, { campaign: true });
  assert.ok(!all.some((x) => /30 days/.test(`${x.headline} ${x.detail}`)));
  assert.ok(s.next.every((x) => ['mayDrop', 'mayClimb', 'strongNext'].includes(x.id)));
  assert.ok(!all.some((x) => /last 30 days/.test(x.detail)));
});

test('breakdown: the people behind a finding, by department', () => {
  const r = bigPicture(ITEMS, PEOPLE);
  const all = findings(r);
  const below = all.find((x) => x.id === 'belowZero');
  const b = breakdown(r, below);
  assert.equal(b.kind, 'count');
  assert.equal(b.people.length, below.count);
  assert.ok(b.people.every((x) => x.belowZero));
  assert.equal(b.departments.reduce((a, d) => a + d.value, 0), b.people.length);
  assert.ok(b.departments.every((d) => d.share > 0 && d.share <= 1 && d.value <= d.size));
  assert.ok(b.departments.every((d, i, l) => i === 0 || l[i - 1].value >= d.value), 'most people first');
});

test('breakdown: a team finding marks the team among every department', () => {
  const r = bigPicture(ITEMS, PEOPLE);
  const team = findings(r).find((x) => x.link?.dept);
  const b = breakdown(r, team);
  assert.equal(b.departments.length, r.departments.length);
  assert.equal(b.departments.filter((d) => d.mark).length, 1);
  assert.equal(b.people.length, r.people.length, 'everyone, so any department can be opened');
  assert.ok(['points', 'rate'].includes(b.kind));
});

test('breakdown: a campaign finding works the same way', () => {
  const r = bigPicture(ITEMS, PEOPLE, { focus: 'C1' });
  const f = findings(r, { campaign: true }).find((x) => x.link?.show);
  const b = breakdown(r, f);
  assert.ok(b.people.length > 0);
  assert.equal(b.departments.reduce((a, d) => a + d.value, 0), b.people.length);
});
