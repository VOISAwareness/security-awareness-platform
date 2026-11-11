import test from 'node:test';
import assert from 'node:assert/strict';

import {
  campaignsInPeriod,
  latestCampaign,
  longDate,
  periodRange,
  showRate,
  summariseCampaign,
  summarisePeriod,
  tally,
} from './homeDashboard.js';

const NOW = new Date(2026, 10, 11); // 11 Nov 2026: Q3 of the 2026-27 financial year

const camp = (id, start, extra = {}) => ({
  campaignId: id,
  campaignTitle: `Campaign ${id}`,
  status: 'SENT',
  startTime: start,
  endTime: '2099-01-01T00:00',
  ...extra,
});
const row = (email, extra = {}) => ({ recipientEmail: email, sendStatus: 'SENT', country: 'India', ...extra });

test('periods follow the financial year, April to March', () => {
  const q = periodRange('Current Quarter', NOW);
  assert.deepEqual([q.start.getMonth(), q.end.getMonth(), q.end.getFullYear()], [9, 0, 2027]);
  const prev = periodRange('Previous Quarter', NOW);
  assert.deepEqual([prev.start.getMonth(), prev.end.getMonth()], [6, 9]);
  const fy = periodRange('Current Financial Year', NOW);
  assert.deepEqual([fy.start.getFullYear(), fy.start.getMonth(), fy.end.getFullYear()], [2026, 3, 2027]);
  const pfy = periodRange('Previous Financial Year', NOW);
  assert.deepEqual([pfy.start.getFullYear(), pfy.end.getFullYear()], [2025, 2026]);
});

test('January to March belong to the financial year that began the April before', () => {
  const jan = new Date(2027, 0, 15);
  assert.equal(periodRange('Current Financial Year', jan).start.getFullYear(), 2026);
  const prev = periodRange('Previous Quarter', jan);
  assert.deepEqual([prev.start.getFullYear(), prev.start.getMonth()], [2026, 9]);
});

test('previous quarter is a real period of its own, not inside the current one', () => {
  const cur = periodRange('Current Quarter', NOW);
  const prev = periodRange('Previous Quarter', NOW);
  assert.ok(prev.end <= cur.start);
});

test('only sent, non-test campaigns that started in the period count', () => {
  const list = [
    camp('IN', '2026-11-01T09:00'),
    camp('OLD', '2026-08-01T09:00'),
    camp('TEST', '2026-11-02T09:00', { isTestCampaign: true }),
    camp('DRAFT', '2026-11-03T09:00', { status: 'DRAFT' }),
    camp('LIVE', '2026-10-15T09:00', { status: 'SENDING' }),
  ];
  const ids = campaignsInPeriod(list, periodRange('Current Quarter', NOW)).map((c) => c.campaignId);
  assert.deepEqual(ids, ['IN', 'LIVE']);
});

test('tally counts each person once and splits reached people into three groups', () => {
  const rows = [
    row('a@x.example', { clicked: true }),
    row('a@x.example', { clicked: true }), // duplicate row
    row('b@x.example', { reported: true, clicked: true }), // reported wins
    row('c@x.example', { opened: true }),
    row('d@x.example'),
    row('e@x.example', { sendStatus: 'FAILED' }),
  ];
  const t = tally([rows]);
  assert.equal(t.targeted, 5);
  assert.equal(t.reached, 4);
  assert.equal(t.hooked, 1);
  assert.equal(t.reported, 1);
  assert.equal(t.clicked, 2);
});

test('hooked, reported and no-interaction add up to 100%', () => {
  const c = camp('A', '2026-11-01T09:00');
  const rows = [
    row('a@x.example', { clicked: true }),
    row('b@x.example', { reported: true, clicked: true }),
    row('c@x.example', { opened: true }),
    row('d@x.example'),
  ];
  const s = summarisePeriod([c], { A: rows });
  assert.equal(s.hookRate, 25);
  assert.equal(s.reportRate, 25);
  assert.equal(s.noInteractRate, 50);
  assert.equal(s.hookRate + s.reportRate + s.noInteractRate, 100);
});

test('no interaction is not forced to zero when people did nothing', () => {
  const s = summarisePeriod([camp('A', '2026-11-01T09:00')], { A: [row('a@x.example'), row('b@x.example', { clicked: true })] });
  assert.equal(s.noInteractRate, 50);
});

test('rates with nobody to divide by are null, never 0 or 100', () => {
  const s = summarisePeriod([], {});
  assert.equal(s.total, 0);
  for (const k of ['reachRate', 'openRate', 'compromisedRate', 'trainedRate', 'reportRate', 'hookRate', 'noInteractRate']) {
    assert.equal(s[k], null, k);
  }
  assert.equal(showRate(null), '—');
  assert.equal(showRate(12.5, 1), '12.5%');
  assert.equal(showRate(0), '0%');
});

test('active plus closed equals total, and campaigns still loading are not in the rates', () => {
  const live = camp('L', '2026-11-01T09:00', { status: 'SENDING' });
  const done = camp('D', '2026-10-05T09:00', { endTime: '2026-10-06T09:00' });
  const s = summarisePeriod([live, done], { L: [row('a@x.example', { clicked: true })] });
  assert.equal(s.total, 2);
  assert.equal(s.active + s.closed, 2);
  assert.equal(s.evaluated, 1);
  assert.equal(s.waiting, 1);
  assert.equal(s.hookRate, 100);
});

test('trained rate is trained clickers over clickers; compromised is over reached', () => {
  const rows = [
    row('a@x.example', { clicked: true, trained: true }),
    row('b@x.example', { clicked: true, compromised: true }),
    row('c@x.example'),
    row('d@x.example'),
  ];
  const s = summarisePeriod([camp('A', '2026-11-01T09:00')], { A: rows });
  assert.equal(s.trainedRate, 50);
  assert.equal(s.compromisedRate, 25);
  assert.equal(s.openRate, 50);
});

test('the latest campaign is the newest sent one, test campaigns ignored', () => {
  const list = [
    camp('OLD', '2026-08-01T09:00'),
    camp('NEW', '2026-11-05T09:00'),
    camp('TEST', '2026-11-09T09:00', { isTestCampaign: true }),
  ];
  assert.equal(latestCampaign(list).campaignId, 'NEW');
  assert.equal(latestCampaign([]), null);
});

test('the latest campaign card has counts, percentages and hook rate per country', () => {
  const rows = [
    row('a@x.example', { clicked: true, country: 'UK' }),
    row('b@x.example', { reported: true, country: 'UK' }),
    row('c@x.example', { opened: true, country: 'India' }),
    row('d@x.example', { country: 'India' }),
    row('e@x.example', { country: 'Unknown' }),
  ];
  const c = summariseCampaign(camp('A', '2026-11-05T09:00'), rows);
  assert.equal(c.sent, 5);
  assert.equal(c.opened, 3);
  assert.equal(c.openPercent, 60);
  assert.equal(c.clicked, 1);
  assert.equal(c.reported, 1);
  assert.equal(c.hookRate, 20);
  assert.deepEqual(c.locations.map((l) => [l.name, l.hookRate]), [['UK', 50], ['India', 0]]);
  assert.equal(summariseCampaign(null, []), null);
  assert.equal(summariseCampaign(camp('A', '2026-11-05T09:00'), undefined).loaded, false);
});

test('long dates read like the screen shows them', () => {
  assert.equal(longDate(new Date(2026, 3, 21)), '21st April 2026, Tuesday');
  assert.equal(longDate(new Date(2026, 3, 11)), '11th April 2026, Saturday');
  assert.equal(longDate(new Date(2026, 3, 2)), '2nd April 2026, Thursday');
  assert.equal(longDate(null), '—');
});
