import assert from 'node:assert/strict';
import test from 'node:test';

import { median, missionControl, missionStory } from './missionControl.js';
import { campaignReport } from './sampleReports.js';
import { CAMPAIGNS, DEPTS, person } from './sampleCampaigns.js';

const ITEMS = CAMPAIGNS.map((campaign) => ({ campaign, report: campaignReport(campaign, { depts: DEPTS, personAt: person }) }));

test('median: the middle value', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), null);
  assert.equal(median([null, 7]), 7);
});

test('the window: 30, 60 or 90 days back from the newest campaign', () => {
  const [a, b, c] = [30, 60, 90].map((days) => missionControl(ITEMS, { days }));
  assert.ok(a.basis.campaigns > 0);
  assert.ok(a.basis.campaigns < b.basis.campaigns && b.basis.campaigns <= c.basis.campaigns, 'a longer window takes in more campaigns');
  assert.ok(c.basis.campaigns <= CAMPAIGNS.length);
  assert.ok(a.response.length === a.basis.campaigns && a.learning.length === a.basis.campaigns);
});

test('the pulse adds up from the campaigns', () => {
  const m = missionControl(ITEMS, { days: 30 });
  const shown = new Set(m.response.map((x) => x.id));
  const rows = ITEMS.filter((x) => shown.has(x.campaign.id)).map((x) => x.report);
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  assert.equal(m.pulse.delivered, sum('delivered'));
  assert.equal(m.pulse.perClick, sum('reported') / sum('clicked'));
  assert.equal(m.pulse.learned, sum('trained') / sum('clicked'));
  assert.equal(m.pulse.beatClick, rows.filter((r) => r.timing.firstReport < r.timing.firstClick).length);
  assert.equal(m.pulse.firstReport, median(rows.map((r) => r.timing.firstReport)));
  assert.ok(['Protected', 'Holding', 'Exposed'].includes(m.pulse.health.word));
});

test('lures: one row per kind, the most convincing first, adding up to the whole', () => {
  const m = missionControl(ITEMS, { days: 90 });
  assert.equal(new Set(m.lures.map((l) => l.type)).size, m.lures.length);
  assert.ok(m.lures.every((l, i, all) => i === 0 || all[i - 1].hooked >= l.hooked));
  assert.equal(m.lures.reduce((a, l) => a + l.delivered, 0), m.pulse.delivered);
  assert.equal(m.lures.reduce((a, l) => a + l.campaigns, 0), m.pulse.campaigns);
  assert.ok(m.lures.every((l) => l.gaveOfClicks === null || (l.gaveOfClicks >= 0 && l.gaveOfClicks <= 1)));
});

test('the story: three chapters of three at most, each opening its view, never advice', () => {
  const m = missionControl(ITEMS, { days: 30 });
  const s = missionStory(m, { completion: 0.764, needsWork: 4 });
  for (const [view, list] of Object.entries({ lures: s.lures, response: s.response, learning: s.learning })) {
    assert.ok(list.length > 0 && list.length <= 3, view);
    assert.ok(list.every((f) => f.view === view && f.value && f.headline));
  }
  const words = Object.values(s).flat().map((f) => `${f.headline} ${f.sub}`).join(' ').toLowerCase();
  assert.ok(!/\b(should|must|recommend|consider)\b/.test(words), 'reports, never advises');
  assert.equal(missionStory(m).learning.length, 1, 'without training figures, only the learning moments');
});
