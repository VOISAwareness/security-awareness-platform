import assert from 'node:assert/strict';
import test from 'node:test';
import { unzipSync, strFromU8 } from 'fflate';

import { GROUPS, after, findIn, groupText, groupsOf, peopleBehindBook, sampleBehind, sampleExtraClicks, when } from './peopleBehind.js';
import { scopeItems } from './scope.js';
import { insights } from './insights.js';
import { campaignReport } from './sampleReports.js';
import { CAMPAIGNS, DEPTS, PAST_CAMPAIGNS, person } from './sampleCampaigns.js';

const ITEMS = [...CAMPAIGNS, ...PAST_CAMPAIGNS].map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: person }) }));
const DEPT = 'Cyber Security';
const m = insights(scopeItems(ITEMS, { department: DEPT }), { days: 90 });
const TYPE = m.lures[0].type;
const camps = m.campaigns.filter((c) => c.type === TYPE);
const people = sampleBehind(camps, { department: DEPT, personAt: person });
const groups = groupsOf(people);

test('sampleBehind: the groups add up to the department\'s figures, as What people did splits them', () => {
  const l = m.lures.find((x) => x.type === TYPE);
  assert.equal(people.length, l.delivered);
  assert.equal(groups.gave.length, l.compromised);
  assert.equal(groups.clicked.length, l.clicked - l.compromised);
  assert.equal(groups.reported.length, l.reported);
  assert.equal(groups.nothing.length, l.delivered - l.reported - l.clicked);
  assert.ok(people.every((x) => x.department === DEPT && GROUPS.includes(x.did)));
});

test('sampleBehind: the same people every time, each once per campaign', () => {
  assert.deepEqual(sampleBehind(camps, { department: DEPT, personAt: person }), people);
  camps.forEach((c) => {
    const names = people.filter((x) => x.campaign.id === c.id).map((x) => x.name);
    assert.equal(new Set(names).size, names.length);
  });
  assert.equal(new Set(people.map((x) => x.key)).size, people.length);
});

test('sampleBehind: times follow the figures; training only after a click', () => {
  camps.forEach((c) => {
    const mine = people.filter((x) => x.campaign.id === c.id);
    const rep = mine.filter((x) => x.did === 'reported').map((x) => x.minutes).sort((a, b) => a - b);
    if (rep.length) assert.equal(rep[0], c.firstReport);
    const clk = mine.filter((x) => x.did === 'clicked' || x.did === 'gave').map((x) => x.minutes).sort((a, b) => a - b);
    if (clk.length) assert.equal(clk[0], c.firstClick);
    assert.equal(mine.filter((x) => x.training === 'completed').length, Math.min(c.clicked, c.trained));
    mine.forEach((x) => {
      if (x.did === 'nothing') { assert.equal(x.at, x.sentAt); assert.equal(x.training, null); assert.equal(typeof x.opened, 'boolean'); }
      else assert.ok(x.at >= x.sentAt);
      if (x.did === 'reported') assert.equal(x.training, null);
    });
  });
});

test('sampleBehind: past the sample\'s 576 names, a middle initial keeps them apart', () => {
  const big = sampleBehind([{ id: 'X', name: 'Big', started: '8 Sep', delivered: 700, clicked: 0, compromised: 0, reported: 0, opened: 0, trained: 0 }], { department: 'Finance Operations', personAt: person });
  assert.equal(big.length, 700);
  assert.equal(new Set(big.map((x) => x.name)).size, 700);
});

test('sampleBehind: clicks count every click in the period, these campaigns and other types', () => {
  people.forEach((x) => {
    const here = people.filter((y) => y.name === x.name && (y.did === 'clicked' || y.did === 'gave')).length;
    assert.equal(x.clicks, here);
  });
  const extra = sampleExtraClicks(DEPT, 0.2);
  const more = sampleBehind(camps, { department: DEPT, personAt: person, extraClicks: extra });
  more.forEach((x, k) => assert.equal(x.clicks, people[k].clicks + extra(x.name)));
  assert.ok(more.some((x) => x.did === 'nothing' && x.clicks > 0));
});

test('groupsOf: newest first in each group; findIn matches a name or a campaign', () => {
  GROUPS.forEach((g) => groups[g].forEach((x, k) => { if (k) assert.ok(groups[g][k - 1].at >= x.at); }));
  const one = groups.reported[0];
  assert.ok(findIn(groups.reported, one.name.toUpperCase()).includes(one));
  assert.equal(findIn(groups.reported, '   ').length, groups.reported.length);
  assert.equal(findIn(groups.reported, 'zzzz no one').length, 0);
  assert.equal(findIn(people, camps[0].name.slice(0, 6)).length >= 1, true);
});

test('groupText, when and after read as the dialog shows them', () => {
  assert.equal(groupText('clicked', 'Travel scam').what, 'Clicked the link in a Travel scam email, and gave no details away.');
  assert.equal(groupText('gave', 'Travel scam').name, 'Gave details away');
  assert.equal(when(Date.UTC(2026, 8, 8, 9, 31)), '8 Sep, 09:31');
  assert.equal(after(12), '12 min');
  assert.equal(after(125), '2 h 5 min');
  assert.equal(after(120), '2 h');
  assert.equal(after(27 * 60), '1 d 3 h');
  assert.equal(after(null), '—');
});

test('peopleBehindBook: one sheet per group, its people and no more', () => {
  const book = unzipSync(peopleBehindBook(groups, { type: TYPE, department: DEPT, days: 90 }));
  const wb = strFromU8(book['xl/workbook.xml']);
  ['Clicked', 'Gave details away', 'Reported', 'Did nothing'].forEach((n) => assert.ok(wb.includes(`name="${n}"`), n));
  const sheet = strFromU8(book['xl/worksheets/sheet3.xml']);
  assert.ok(sheet.includes('Minutes to report'));
  groups.reported.slice(0, 3).forEach((x) => assert.ok(sheet.includes(x.name)));
  assert.ok(!strFromU8(book['xl/worksheets/sheet1.xml']).includes('@'), 'no email addresses');
});
